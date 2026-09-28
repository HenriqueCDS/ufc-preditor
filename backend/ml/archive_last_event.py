"""Snapshot do ultimo evento concluido: o que o modelo previu vs. o que
aconteceu.

Roda no workflow de CI ENTRE finalize.py (DATA/ ja tem o resultado novo) e
train.py (retreino): o modelo carregado aqui ainda e o da semana anterior,
que nunca viu o resultado deste evento -- e por isso a previsao registrada
e honesta (fora da amostra), nao um "acerto" por vazamento de dados.

    cd backend && python -m ml.archive_last_event

Le DATA/ufc_gold_dataset_final.csv direto (nao artifacts/fights.csv, que so
e atualizado pelo proximo passo do pipeline, o retreino) e escreve
backend/ml/artifacts/last_event.json.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .data_prep import load_and_clean_fights
from .predict import ARTIFACTS_DIR, Predictor

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
GOLD_CSV = REPO_ROOT / 'DATA' / 'ufc_gold_dataset_final.csv'
OUT_PATH = ARTIFACTS_DIR / 'last_event.json'
UPCOMING_PATH = ARTIFACTS_DIR / 'upcoming.json'


def _find_event_meta(event_date_iso):
    """Best-effort: o evento pode ainda estar em upcoming.json (scrape_upcoming
    roda depois, no mesmo workflow ou no de domingo) -- se estiver, pegamos
    id/nome/local de la, o que deixa o frontend linkar a lista de proximos
    eventos direto para este mesmo card. Sem match, seguimos sem eles (nao e
    obrigatorio)."""
    if not UPCOMING_PATH.exists():
        return None, None, None
    try:
        data = json.loads(UPCOMING_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None, None, None
    for event in data.get('events', []):
        if event.get('date') == event_date_iso:
            return event.get('id'), event.get('name'), event.get('location')
    return None, None, None


def build_last_event():
    if not GOLD_CSV.exists():
        print(f'[archive_last_event] {GOLD_CSV} nao existe -- nada a arquivar.')
        return None

    fights_clean, _ = load_and_clean_fights(GOLD_CSV)
    fights_clean = fights_clean.dropna(subset=['Event_Date'])
    if fights_clean.empty:
        print('[archive_last_event] Nenhuma luta com data valida -- nada a arquivar.')
        return None

    last_date = fights_clean['Event_Date'].max()
    last_date_iso = last_date.strftime('%Y-%m-%d')
    card = fights_clean[fights_clean['Event_Date'] == last_date]

    predictor = Predictor()
    fights = []
    for _, row in card.iterrows():
        f1, f2 = row['Fighter_1'], row['Fighter_2']
        item = {
            'fighter1': f1,
            'fighter2': f2,
            'weight_class': row['Weight_Class'],
            'status': 'ok',
            'missing': [],
            'prediction': None,
            'result': {
                'winner': row['Winner'],
                'method': row['Method'],
                'round': int(row['End_Round']) if pd.notna(row['End_Round']) else None,
                'time': row['End_Time'] if pd.notna(row['End_Time']) else None,
            },
            'correct': None,
        }
        missing = [n for n in (f1, f2) if n not in predictor.fighters.index]
        if missing:
            item['status'] = 'no_data'
            item['missing'] = missing
        else:
            prediction = predictor.predict_fight(f1, f2, row['Weight_Class'])
            item['prediction'] = prediction
            item['correct'] = prediction['predicted_winner'] == row['Winner']
        fights.append(item)

    event_id, name, location = _find_event_meta(last_date_iso)
    return {
        'event_date': last_date_iso,
        'id': event_id,
        'name': name,
        'location': location,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'fights': fights,
    }


def _unchanged(new_snapshot):
    """Compara ignorando `generated_at`, senao todo run regravaria o arquivo
    mesmo sem nenhum evento novo (o cron roda toda semana)."""
    if not OUT_PATH.exists():
        return False
    try:
        old = json.loads(OUT_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return False
    old = {**old, 'generated_at': None}
    new = {**new_snapshot, 'generated_at': None}
    return old == new


def main():
    snapshot = build_last_event()
    if snapshot is None:
        return 0
    if _unchanged(snapshot):
        print(f'[archive_last_event] Ultimo evento ({snapshot["event_date"]}) sem mudancas.')
        return 0
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding='utf-8')
    n_ok = sum(1 for f in snapshot['fights'] if f['status'] == 'ok')
    n_correct = sum(1 for f in snapshot['fights'] if f['correct'])
    print(f'[archive_last_event] {snapshot["event_date"]}: {n_correct}/{n_ok} acertos ({len(snapshot["fights"])} lutas no card).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
