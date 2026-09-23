"""Pure inference layer built on top of the artifacts produced by
`ml.train`. No prints, no plotting -- everything returns dicts/lists so
any web framework can call it directly.

Usage:
    from ml.predict import Predictor
    predictor = Predictor()          # load artifacts once, reuse across requests
    predictor.predict_fight("Conor McGregor", "Dustin Poirier")
"""
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .data_prep import extract_weight_class
from .features import ALL_FEATURES, STAT_INFO, build_feature_row

ARTIFACTS_DIR = Path(__file__).resolve().parent / 'artifacts'


class ArtifactsNotFoundError(RuntimeError):
    """Raised when ml/artifacts/ is missing -- run `python -m ml.train` first."""


class FighterNotFoundError(ValueError):
    pass


class Predictor:
    def __init__(self, artifacts_dir=ARTIFACTS_DIR):
        artifacts_dir = Path(artifacts_dir)
        if not (artifacts_dir / 'model.joblib').exists():
            raise ArtifactsNotFoundError(
                f'Nenhum artefato em {artifacts_dir}. Rode "python -m ml.train" primeiro.'
            )
        self.model = joblib.load(artifacts_dir / 'model.joblib')
        self.wc_le = joblib.load(artifacts_dir / 'weight_class_encoder.joblib')
        self.fighters = pd.read_parquet(artifacts_dir / 'fighters.parquet').set_index('Fighter_Name')
        self.fights = pd.read_parquet(artifacts_dir / 'fights.parquet')

    def search_fighter(self, name, top_n=5):
        name_lower = name.lower().strip()
        matches = [n for n in self.fighters.index if name_lower in n.lower()]
        return matches[:top_n]

    def _current_streak(self, fighter_name):
        f1_fights = self.fights[self.fights['Fighter_1'] == fighter_name]
        f2_fights = self.fights[self.fights['Fighter_2'] == fighter_name]
        rows = [(row['Event_Date'], row['target'] == 1) for _, row in f1_fights.iterrows()]
        rows += [(row['Event_Date'], row['target'] == 0) for _, row in f2_fights.iterrows()]
        if not rows:
            return 0
        rows.sort(key=lambda r: r[0])
        streak = 0
        for _, won in reversed(rows):
            if not won:
                break
            streak += 1
        return streak

    def _get_fighter(self, name):
        if name not in self.fighters.index:
            raise FighterNotFoundError(f'Lutador nao encontrado: "{name}"')
        return self.fighters.loc[name]

    def predict_fight(self, fighter1_name, fighter2_name, weight_class='Lightweight'):
        f1 = self._get_fighter(fighter1_name)
        f2 = self._get_fighter(fighter2_name)

        streak_f1 = self._current_streak(fighter1_name)
        streak_f2 = self._current_streak(fighter2_name)

        wc_cat = extract_weight_class(weight_class)
        wc_label = wc_cat if wc_cat in self.wc_le.classes_ else 'Other'
        wc_enc = int(self.wc_le.transform([wc_label])[0]) if wc_label in self.wc_le.classes_ else 0

        x = np.array([build_feature_row(f1, f2, streak_f1 - streak_f2, wc_enc)])
        prob_f1 = float(self.model.predict_proba(x)[0, 1])
        prob_f2 = 1 - prob_f1
        winner = fighter1_name if prob_f1 >= 0.5 else fighter2_name
        confidence = max(prob_f1, prob_f2)

        return {
            'fighter1': fighter1_name,
            'fighter2': fighter2_name,
            'prob_fighter1': round(prob_f1, 4),
            'prob_fighter2': round(prob_f2, 4),
            'predicted_winner': winner,
            'confidence': round(confidence, 4),
            'confidence_level': 'ALTA' if confidence >= 0.70 else 'MEDIA' if confidence >= 0.60 else 'BAIXA',
            'streak_f1': int(streak_f1),
            'streak_f2': int(streak_f2),
            'weight_class': weight_class,
        }

    def predict_card(self, fights_list):
        """fights_list: list of {'f1', 'f2', 'weight_class'?}. Skips fights
        with an unknown fighter instead of raising."""
        results = []
        for fight in fights_list:
            try:
                results.append(self.predict_fight(
                    fight['f1'], fight['f2'], fight.get('weight_class', 'Lightweight'),
                ))
            except FighterNotFoundError:
                continue
        results.sort(key=lambda r: r['confidence'], reverse=True)
        return results

    def compare_fighters(self, fighter1_name, fighter2_name):
        def find(name):
            name_l = name.strip().lower()
            exact = [n for n in self.fighters.index if n.lower() == name_l]
            if exact:
                return exact[0]
            partial = [n for n in self.fighters.index if name_l in n.lower()]
            return partial[0] if partial else None

        name1, name2 = find(fighter1_name), find(fighter2_name)
        if name1 is None:
            raise FighterNotFoundError(f'Lutador nao encontrado: "{fighter1_name}"')
        if name2 is None:
            raise FighterNotFoundError(f'Lutador nao encontrado: "{fighter2_name}"')

        s1, s2 = self.fighters.loc[name1], self.fighters.loc[name2]
        adv = {1: 0, 2: 0}
        stats = []
        for col, (label, explanation, fmt, direction) in STAT_INFO.items():
            v1, v2 = float(s1[col]), float(s2[col])
            if v1 == v2:
                winner = 0
            elif direction == 'baixo e melhor':
                winner = 1 if v1 < v2 else 2
            else:
                winner = 1 if v1 > v2 else 2
            if winner:
                adv[winner] += 1
            stats.append({
                'key': col, 'label': label, 'explanation': explanation,
                'direction': direction, 'value_f1': v1, 'value_f2': v2, 'winner': winner,
            })

        return {
            'fighter1': name1,
            'fighter2': name2,
            'stats': stats,
            'advantage_f1': adv[1],
            'advantage_f2': adv[2],
        }
