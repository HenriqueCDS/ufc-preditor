"""Aggregates behind the web "Estatisticas" page (mirrors notebook section 2.4, EDA).

Offline step, like training: re-run after updating data/*.csv and commit the JSON.

    cd backend && python -m ml.eda
"""
import json
from pathlib import Path

import pandas as pd

from .data_prep import load_and_clean_fighters, load_and_clean_fights

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / 'data'
OUTPUT_PATH = REPO_ROOT / 'web' / 'src' / 'data' / 'eda-stats.json'

CORR_FEATURES = [
    'Height_cm', 'Reach_cm', 'Win_Rate', 'Total_Fights',
    'SLpM', 'Str_Acc_f', 'SApM', 'Str_Def_f', 'TD_Avg', 'Sub_Avg',
]
SUMMARY_FEATURES = ['Win_Rate', 'SLpM', 'SApM', 'TD_Avg', 'Sub_Avg', 'Reach_cm']
PROFILE_BINS = [0, 0.40, 0.60, 0.75, 1.01]
PROFILE_LABELS = ['Iniciante (<40%)', 'Medio (40-60%)', 'Bom (60-75%)', 'Elite (>75%)']


def _counts(series):
    return {str(k): int(v) for k, v in series.items()}


def compute_eda_stats(data_dir=DATA_DIR):
    fighters = load_and_clean_fighters(data_dir / 'ufc_fighters_final.csv')
    fights, _ = load_and_clean_fights(data_dir / 'ufc_gold_dataset_final.csv')

    total = len(fights)
    year = fights['Event_Date'].dt.year

    target = fights['target'].value_counts().sort_index()
    methods = fights['Method'].value_counts()
    weight_classes = fights['Weight_Class_Cat'].value_counts()
    timeline = year.value_counts().sort_index()

    top4 = methods.head(4).index
    period = (year // 5 * 5).astype('Int64')
    by_period = (
        fights[fights['Method'].isin(top4)]
        .groupby([period[fights['Method'].isin(top4)], 'Method'])
        .size()
        .unstack(fill_value=0)
    )

    corr = fighters[CORR_FEATURES].corr().round(2)

    profile = pd.cut(fighters['Win_Rate'], bins=PROFILE_BINS, labels=PROFILE_LABELS,
                     include_lowest=True)
    scatter = {
        label: fighters.loc[profile == label, ['SLpM', 'SApM']].round(2).values.tolist()
        for label in PROFILE_LABELS
    }

    described = fighters[SUMMARY_FEATURES].describe().round(2)

    return {
        'summary': {
            'fights': total,
            'fighters': len(fighters),
            'yearFrom': int(year.min()),
            'yearTo': int(year.max()),
            'fighter1WinRate': round(float(fights['target'].mean()), 4),
        },
        'target': {'fighter2': int(target.get(0, 0)), 'fighter1': int(target.get(1, 0))},
        'methods': _counts(methods.head(8)),
        'weightClasses': _counts(weight_classes),
        'timeline': {str(int(y)): int(n) for y, n in timeline.items()},
        'methodsByPeriod': {
            'periods': [f'{int(p)}+' for p in by_period.index],
            'series': {m: [int(v) for v in by_period[m]] for m in top4},
        },
        'correlation': {'features': CORR_FEATURES, 'matrix': corr.values.tolist()},
        'scatter': scatter,
        'describe': {
            col: {stat: float(described.loc[stat, col])
                  for stat in ['mean', 'std', 'min', '50%', 'max']}
            for col in SUMMARY_FEATURES
        },
    }


def main():
    stats = compute_eda_stats()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(stats, ensure_ascii=False, separators=(',', ':')),
                           encoding='utf-8')
    print(f'Wrote {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
