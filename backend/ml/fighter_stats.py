"""Per-fighter career statistics for the web "Estatisticas" page.

Pure functions over the artifacts' `fighters` / `fights` tables (no I/O, no
prints); exposed through `Predictor.fighter_stats`.
"""
import pandas as pd

from .features import STAT_INFO

PERCENTILE_POOL_MIN_FIGHTS = 3  # ignore debutants/imputed rows when ranking
HISTORY_SIZE = 10

_STRIKE_STATS = [
    'Sig_Landed', 'Sig_Att', 'TD_Landed', 'TD_Att', 'Sub_Att', 'KD', 'Ctrl_Sec',
    'Head', 'Body', 'Leg', 'Distance', 'Clinch', 'Ground',
]


def method_group(method):
    m = str(method)
    if m.startswith('KO') or m.startswith('TKO'):
        return 'ko_tko'
    if m.startswith('Submission'):
        return 'submission'
    if m.startswith('Decision'):
        return 'decision'
    return 'other'


def _fighter_log(fights, name):
    """One row per fight of `name`, with own (`*`) and opponent (`opp_*`) stats."""
    frames = []
    for side, other in (('F1', 'F2'), ('F2', 'F1')):
        rows = fights[fights[f'Fighter_{side[1]}'] == name]
        if rows.empty:
            continue
        log = pd.DataFrame({
            'date': rows['Event_Date'],
            'opponent': rows[f'Fighter_{other[1]}'],
            'won': (rows['target'] == 1) if side == 'F1' else (rows['target'] == 0),
            'method': rows['Method'],
            'round': rows['End_Round'],
            'weight_class': rows['Weight_Class_Cat'],
            'fight_sec': rows['Total_Fight_Time_Sec'],
        })
        for stat in _STRIKE_STATS:
            log[stat] = rows[f'{side}_{stat}']
        log['opp_Sig_Landed'] = rows[f'{other}_Sig_Landed']
        log['opp_Sig_Att'] = rows[f'{other}_Sig_Att']
        frames.append(log)
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames).sort_values('date').reset_index(drop=True)


def _streaks(won):
    current = best = run = 0
    for w in won:
        run = run + 1 if w else 0
        best = max(best, run)
        current = run
    return current, best


def _ratio(num, den):
    return round(float(num) / float(den), 4) if den else None


def _percentiles(fighters, row):
    pool = fighters[fighters['Total_Fights'] >= PERCENTILE_POOL_MIN_FIGHTS]
    out = []
    for key, (label, _, _, direction) in STAT_INFO.items():
        if direction == 'neutro':
            continue
        value = float(row[key])
        # "baixo e melhor": rank by how many fighters are worse (higher SApM)
        share = (pool[key] >= value) if direction == 'baixo e melhor' else (pool[key] <= value)
        out.append({
            'key': key, 'label': label, 'value': value,
            'percentile': round(float(share.mean()) * 100, 1),
            'direction': direction,
        })
    return out


def build_fighter_stats(name, fighters, fights):
    row = fighters.loc[name]
    log = _fighter_log(fights, name)

    profile = {
        'height_cm': float(row['Height_cm']),
        'reach_cm': float(row['Reach_cm']),
        'weight_lbs': float(row['Weight_lbs']),
        'age': float(row['Age']),
    }
    percentiles = _percentiles(fighters, row)

    if log.empty:
        return {'name': name, 'profile': profile, 'percentiles': percentiles,
                'record': None, 'striking': None, 'by_year': [], 'history': []}

    wins = log[log['won']]
    losses = log[~log['won']]
    current_streak, best_streak = _streaks(log['won'])
    win_groups = wins['method'].map(method_group)
    loss_groups = losses['method'].map(method_group)
    groups = ['ko_tko', 'submission', 'decision', 'other']

    record = {
        'fights': len(log),
        'wins': len(wins),
        'losses': len(losses),
        'win_rate': _ratio(len(wins), len(log)),
        'finish_rate': _ratio(win_groups.isin(['ko_tko', 'submission']).sum(), len(wins)),
        'current_streak': current_streak,
        'best_streak': best_streak,
        'wins_by': {g: int((win_groups == g).sum()) for g in groups},
        'losses_by': {g: int((loss_groups == g).sum()) for g in groups},
    }

    total = log[_STRIKE_STATS + ['opp_Sig_Landed', 'opp_Sig_Att']].sum()
    minutes = log['fight_sec'].sum() / 60
    landed_zones = total['Head'] + total['Body'] + total['Leg']
    landed_positions = total['Distance'] + total['Clinch'] + total['Ground']
    striking = {
        'sig_landed': int(total['Sig_Landed']),
        'sig_attempted': int(total['Sig_Att']),
        'sig_accuracy': _ratio(total['Sig_Landed'], total['Sig_Att']),
        'sig_absorbed': int(total['opp_Sig_Landed']),
        'sig_defense': (None if not total['opp_Sig_Att']
                        else round(1 - float(total['opp_Sig_Landed']) / float(total['opp_Sig_Att']), 4)),
        'knockdowns': int(total['KD']),
        'td_landed': int(total['TD_Landed']),
        'td_attempted': int(total['TD_Att']),
        'td_accuracy': _ratio(total['TD_Landed'], total['TD_Att']),
        'sub_attempts': int(total['Sub_Att']),
        'control_avg_sec': round(float(total['Ctrl_Sec']) / len(log), 1),
        'avg_fight_min': round(float(minutes) / len(log), 1),
        'targets': {k.lower(): _ratio(total[k], landed_zones) for k in ('Head', 'Body', 'Leg')},
        'positions': {k.lower(): _ratio(total[k], landed_positions)
                      for k in ('Distance', 'Clinch', 'Ground')},
    }

    years = pd.to_datetime(log['date'], errors='coerce').dt.year
    by_year = [
        {'year': int(y), 'wins': int(g['won'].sum()), 'losses': int((~g['won']).sum())}
        for y, g in log.groupby(years)
    ]

    history = [
        {
            'date': str(r['date'])[:10],
            'opponent': r['opponent'],
            'result': 'W' if r['won'] else 'L',
            'method': r['method'],
            'round': int(r['round']) if pd.notna(r['round']) else None,
            'weight_class': r['weight_class'],
        }
        for _, r in log.iloc[::-1].head(HISTORY_SIZE).iterrows()
    ]

    return {'name': name, 'profile': profile, 'percentiles': percentiles,
            'record': record, 'striking': striking, 'by_year': by_year, 'history': history}
