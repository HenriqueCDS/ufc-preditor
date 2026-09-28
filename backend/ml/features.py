"""Differential + composite feature engineering, shared by training
(vectorized, whole dataset) and live inference (single fight).

Mirrors notebook cells 26-29 and the feature-building block inside
predict_fight (cell 48).
"""
import numpy as np
import pandas as pd

from .data_prep import FIGHTER_FEATURES

ENGINEERED_FEATURES = [
    'DIFF_Efficiency', 'DIFF_TD_Success', 'DIFF_Grappling_Ctrl',
    'DIFF_Strike_Ratio', 'DIFF_Weighted_Exp', 'DIFF_Streak',
]

DIFF_FEATURES = [f'DIFF_{feat}' for feat in FIGHTER_FEATURES]
ALL_FEATURES = DIFF_FEATURES + ENGINEERED_FEATURES + ['Weight_Class_Enc']

# Height/reach/weight/age barely move over a career, so the current snapshot
# from fighters_clean is used for every historical fight too. Everything else
# in FIGHTER_FEATURES is a career aggregate (win rate, SLpM, ...) and DOES
# move fight to fight -- for those, training must use only what happened
# strictly before each fight (see compute_prior_career_stats), never the
# fighter's final/current numbers, or the model leaks the outcome of fights
# that happened after the one it's trying to predict.
PHYSICAL_FEATURES = ['Height_cm', 'Weight_lbs', 'Reach_cm', 'Age']
PRIOR_CAREER_FEATURES = [f for f in FIGHTER_FEATURES if f not in PHYSICAL_FEATURES]

# column -> (label, explicação, formato, direção)
STAT_INFO = {
    'Win_Rate':     ('Taxa de Vitorias', 'Porcentagem de lutas vencidas na carreira',
                      '{:.1%}', 'alto e melhor'),
    'Total_Fights': ('Total de Lutas', 'Experiencia no octagono -- numero total de lutas',
                      '{:.0f}', 'contexto'),
    'Height_cm':    ('Altura (cm)', 'Altura em centimetros',
                      '{:.0f}', 'neutro'),
    'Reach_cm':     ('Alcance (cm)', 'Envergadura dos bracos -- alcance maior = vantagem',
                      '{:.0f}', 'alto e melhor'),
    'SLpM':         ('Golpes/min (ofensivo)', 'Golpes significativos dados por minuto',
                      '{:.2f}', 'alto e melhor'),
    'Str_Acc_f':    ('Precisao de Golpes', 'Porcentagem de golpes que acertam o alvo',
                      '{:.1%}', 'alto e melhor'),
    'SApM':         ('Golpes Recebidos/min', 'Golpes significativos absorvidos por minuto',
                      '{:.2f}', 'baixo e melhor'),
    'Str_Def_f':    ('Defesa de Golpes', 'Porcentagem de ataques adversarios bloqueados',
                      '{:.1%}', 'alto e melhor'),
    'TD_Avg':       ('Derrubadas/luta', 'Media de takedowns aplicados por luta',
                      '{:.2f}', 'alto e melhor'),
    'TD_Acc_f':     ('Precisao de Derrubadas', 'Taxa de tentativas de takedown bem-sucedidas',
                      '{:.1%}', 'alto e melhor'),
    'TD_Def_f':     ('Defesa de Derrubadas', 'Porcentagem de tentativas adversarias defendidas',
                      '{:.1%}', 'alto e melhor'),
    'Sub_Avg':      ('Finalizacoes Tentadas/luta', 'Media de tentativas de finalizacao por luta',
                      '{:.2f}', 'contexto'),
}


def compute_streak(fights_df, fighter_col, result_col='target', date_col='Event_Date'):
    """Win streak of `fighter_col` going into each fight, computed
    temporally (no data leakage: only fights strictly before are counted)."""
    df_temp = fights_df[[fighter_col, result_col, date_col]].copy()
    df_temp[date_col] = pd.to_datetime(df_temp[date_col], errors='coerce')
    df_temp = df_temp.sort_values(date_col).reset_index(drop=True)

    if fighter_col == 'Fighter_1':
        df_temp['won'] = (df_temp[result_col] == 1).astype(int)
    else:
        df_temp['won'] = (df_temp[result_col] == 0).astype(int)

    streak_map = {}
    streaks = []
    for _, row in df_temp.iterrows():
        fighter = row[fighter_col]
        current_streak = streak_map.get(fighter, 0)
        streaks.append(current_streak)
        streak_map[fighter] = current_streak + 1 if row['won'] == 1 else 0

    return pd.Series(streaks, index=df_temp.index)


def _fighter_appearances(fights_clean):
    """Long format: one row per (fighter, fight) appearance, own + opponent
    raw counts for that single fight. Base for the point-in-time cumulative
    stats in compute_prior_career_stats."""
    raw_cols = {
        'Own_Sig_Landed': 'Sig_Landed', 'Own_Sig_Att': 'Sig_Att',
        'Opp_Sig_Landed': 'Sig_Landed', 'Opp_Sig_Att': 'Sig_Att',
        'Own_TD_Landed': 'TD_Landed', 'Own_TD_Att': 'TD_Att',
        'Opp_TD_Landed': 'TD_Landed', 'Opp_TD_Att': 'TD_Att',
        'Own_Sub_Att': 'Sub_Att',
    }
    perspectives = []
    for role, other in (('F1', 'F2'), ('F2', 'F1')):
        perspectives.append(pd.DataFrame({
            'Fighter': fights_clean[f'Fighter_{role[1]}'],
            'Event_Date': fights_clean['Event_Date'],
            'Fight_Idx': fights_clean.index,
            'Role': role,
            'Own_Sig_Landed': fights_clean[f'{role}_Sig_Landed'],
            'Own_Sig_Att': fights_clean[f'{role}_Sig_Att'],
            'Opp_Sig_Landed': fights_clean[f'{other}_Sig_Landed'],
            'Opp_Sig_Att': fights_clean[f'{other}_Sig_Att'],
            'Own_TD_Landed': fights_clean[f'{role}_TD_Landed'],
            'Own_TD_Att': fights_clean[f'{role}_TD_Att'],
            'Opp_TD_Landed': fights_clean[f'{other}_TD_Landed'],
            'Opp_TD_Att': fights_clean[f'{other}_TD_Att'],
            'Own_Sub_Att': fights_clean[f'{role}_Sub_Att'],
            'Fight_Time_Sec': fights_clean['Total_Fight_Time_Sec'],
            'Won': (fights_clean['target'] == (1 if role == 'F1' else 0)).astype(int),
        }))
    log = pd.concat(perspectives, ignore_index=True)
    return log.sort_values(['Fighter', 'Event_Date', 'Fight_Idx'], kind='stable').reset_index(drop=True)


def compute_prior_career_stats(fights_clean):
    """For each fight, each fighter's PRIOR_CAREER_FEATURES computed only
    from that fighter's fights strictly before Event_Date -- no leakage from
    fights that happen later (including the fight itself).

    Returns (f1_prior, f2_prior): DataFrames indexed like fights_clean, with
    columns 'F1_<feat>' / 'F2_<feat>' for feat in PRIOR_CAREER_FEATURES.
    """
    log = _fighter_appearances(fights_clean)

    cum_cols = [
        'Own_Sig_Landed', 'Own_Sig_Att', 'Opp_Sig_Landed', 'Opp_Sig_Att',
        'Own_TD_Landed', 'Own_TD_Att', 'Opp_TD_Landed', 'Opp_TD_Att',
        'Own_Sub_Att', 'Fight_Time_Sec', 'Won',
    ]
    by_fighter = log.groupby('Fighter')
    cum = by_fighter[cum_cols].cumsum()
    prior = cum.groupby(log['Fighter']).shift(1)  # totals strictly before this fight
    prior['Total_Fights'] = by_fighter.cumcount()  # count of prior fights (0 for a debut)

    minutes = prior['Fight_Time_Sec'] / 60
    prior['Win_Rate'] = prior['Won'] / prior['Total_Fights']
    prior['SLpM'] = prior['Own_Sig_Landed'] / minutes
    prior['Str_Acc_f'] = prior['Own_Sig_Landed'] / prior['Own_Sig_Att']
    prior['SApM'] = prior['Opp_Sig_Landed'] / minutes
    prior['Str_Def_f'] = 1 - (prior['Opp_Sig_Landed'] / prior['Opp_Sig_Att'])
    prior['TD_Avg'] = prior['Own_TD_Landed'] / prior['Total_Fights']
    prior['TD_Acc_f'] = prior['Own_TD_Landed'] / prior['Own_TD_Att']
    prior['TD_Def_f'] = 1 - (prior['Opp_TD_Landed'] / prior['Opp_TD_Att'])
    prior['Sub_Avg'] = prior['Own_Sub_Att'] / prior['Total_Fights']

    prior = prior[PRIOR_CAREER_FEATURES].replace([np.inf, -np.inf], np.nan)
    # A debut (Total_Fights == 0) or a fighter with e.g. zero prior takedown
    # attempts has an undefined ratio -- impute with the population median,
    # same convention as load_and_clean_fighters.
    for col in PRIOR_CAREER_FEATURES:
        prior[col] = prior[col].fillna(prior[col].median())
    prior['Fight_Idx'] = log['Fight_Idx']
    prior['Role'] = log['Role']

    f1_prior = (
        prior[prior['Role'] == 'F1'].set_index('Fight_Idx')[PRIOR_CAREER_FEATURES].add_prefix('F1_')
    )
    f2_prior = (
        prior[prior['Role'] == 'F2'].set_index('Fight_Idx')[PRIOR_CAREER_FEATURES].add_prefix('F2_')
    )
    return f1_prior, f2_prior


def _composite_features(f1, f2, streak_diff):
    """f1, f2: mapping with FIGHTER_FEATURES keys (dict or pandas Series)."""
    return {
        'DIFF_Efficiency': (
            (f1['SLpM'] * f1['Str_Acc_f'] - f1['SApM'] * (1 - f1['Str_Def_f'])) -
            (f2['SLpM'] * f2['Str_Acc_f'] - f2['SApM'] * (1 - f2['Str_Def_f']))
        ),
        'DIFF_TD_Success': (f1['TD_Avg'] * f1['TD_Acc_f']) - (f2['TD_Avg'] * f2['TD_Acc_f']),
        'DIFF_Grappling_Ctrl': (
            (f1['TD_Def_f'] * 0.5 + f1['Sub_Avg'] * 0.5) -
            (f2['TD_Def_f'] * 0.5 + f2['Sub_Avg'] * 0.5)
        ),
        'DIFF_Strike_Ratio': (
            (f1['SLpM'] / (f1['SApM'] + 0.001)) - (f2['SLpM'] / (f2['SApM'] + 0.001))
        ),
        'DIFF_Weighted_Exp': (
            (f1['Win_Rate'] * np.log1p(f1['Total_Fights'])) -
            (f2['Win_Rate'] * np.log1p(f2['Total_Fights']))
        ),
        'DIFF_Streak': streak_diff,
    }


def build_feature_row(f1, f2, streak_diff, weight_class_enc):
    """Single ordered feature vector (list[float]), matching ALL_FEATURES,
    for one live fight prediction."""
    row = {f'DIFF_{feat}': f1[feat] - f2[feat] for feat in FIGHTER_FEATURES}
    row.update(_composite_features(f1, f2, streak_diff))
    row['Weight_Class_Enc'] = weight_class_enc
    return [row[f] for f in ALL_FEATURES]


def build_fight_features(fighters_clean, fights_clean):
    """Merge fighter stats into each fight and engineer DIFF_/composite
    features. One row per real fight (no mirroring yet), in the same
    chronological order as fights_clean -- callers that need a time-based
    train/val/test split must split this BEFORE calling mirror_augment, so a
    fight and its mirrored twin never end up on both sides of the split.

    Physical attributes (height/reach/weight/age) come from the fighter's
    current snapshot; career-performance attributes (win rate, SLpM, ...)
    come from compute_prior_career_stats, i.e. only what happened strictly
    before that fight.

    Returns df with columns ALL_FEATURES + 'target' (+ helper cols dropped
    by the caller via ALL_FEATURES / 'target' selection).
    """
    fights_clean = fights_clean.copy()
    fights_clean['streak_F1'] = compute_streak(fights_clean, 'Fighter_1')
    fights_clean['streak_F2'] = compute_streak(fights_clean, 'Fighter_2')
    f1_prior, f2_prior = compute_prior_career_stats(fights_clean)

    fighters_idx = fighters_clean.set_index('Fighter_Name')
    base_cols = ['Fighter_1', 'Fighter_2', 'target', 'Weight_Class_Enc', 'streak_F1', 'streak_F2']
    df = fights_clean[base_cols].copy()

    # .map() (not .merge) so unmatched names become NaN instead of silently
    # fanning a row out or reindexing df -- keeps row order/index aligned
    # with f1_prior/f2_prior, which are keyed by this same original index.
    for prefix, name_col in (('F1_', 'Fighter_1'), ('F2_', 'Fighter_2')):
        for feat in PHYSICAL_FEATURES:
            df[f'{prefix}{feat}'] = df[name_col].map(fighters_idx[feat])

    df = df.join(f1_prior).join(f2_prior)
    required = [f'{p}{f}' for p in ('F1_', 'F2_') for f in PHYSICAL_FEATURES]
    df = df.dropna(subset=required).reset_index(drop=True)

    for feat in FIGHTER_FEATURES:
        df[f'DIFF_{feat}'] = df[f'F1_{feat}'] - df[f'F2_{feat}']

    df['DIFF_Efficiency'] = (
        (df['F1_SLpM'] * df['F1_Str_Acc_f'] - df['F1_SApM'] * (1 - df['F1_Str_Def_f'])) -
        (df['F2_SLpM'] * df['F2_Str_Acc_f'] - df['F2_SApM'] * (1 - df['F2_Str_Def_f']))
    )
    df['DIFF_TD_Success'] = (df['F1_TD_Avg'] * df['F1_TD_Acc_f']) - (df['F2_TD_Avg'] * df['F2_TD_Acc_f'])
    df['DIFF_Grappling_Ctrl'] = (
        (df['F1_TD_Def_f'] * 0.5 + df['F1_Sub_Avg'] * 0.5) -
        (df['F2_TD_Def_f'] * 0.5 + df['F2_Sub_Avg'] * 0.5)
    )
    df['DIFF_Strike_Ratio'] = (
        (df['F1_SLpM'] / (df['F1_SApM'] + 0.001)) - (df['F2_SLpM'] / (df['F2_SApM'] + 0.001))
    )
    df['DIFF_Weighted_Exp'] = (
        (df['F1_Win_Rate'] * np.log1p(df['F1_Total_Fights'])) -
        (df['F2_Win_Rate'] * np.log1p(df['F2_Total_Fights']))
    )
    df['DIFF_Streak'] = df['streak_F1'] - df['streak_F2']
    return df


def mirror_augment(df, seed=42):
    """Augment by positional symmetry (F1 vs F2 <-> F2 vs F1), which doubles
    the rows and balances the target to ~50/50.

    Call this separately per split (train/val/test), never before splitting:
    mirroring a fight and then letting the original land in train while its
    mirrored twin lands in test (or vice versa) leaks the test fight's
    outcome into training.
    """
    df_swap = df.copy()
    df_swap['target'] = 1 - df_swap['target']
    for col in DIFF_FEATURES + ENGINEERED_FEATURES:
        df_swap[col] = -df_swap[col]

    return (
        pd.concat([df, df_swap], ignore_index=True)
        .sample(frac=1, random_state=seed)
        .reset_index(drop=True)
    )
