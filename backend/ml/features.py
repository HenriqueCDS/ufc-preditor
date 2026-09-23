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


def build_training_dataset(fighters_clean, fights_clean, seed=42):
    """Merge fighter stats into each fight, engineer DIFF_/composite
    features, and augment by positional symmetry (F1 vs F2 <-> F2 vs F1),
    which doubles the rows and balances the target to ~50/50.

    Returns df_aug with columns ALL_FEATURES + 'target'.
    """
    fights_clean = fights_clean.copy()
    fights_clean['streak_F1'] = compute_streak(fights_clean, 'Fighter_1')
    fights_clean['streak_F2'] = compute_streak(fights_clean, 'Fighter_2')

    fighters_idx = fighters_clean.set_index('Fighter_Name')
    base_cols = ['Fighter_1', 'Fighter_2', 'target', 'Weight_Class_Enc', 'streak_F1', 'streak_F2']
    df = fights_clean[base_cols].copy()
    df = df.merge(fighters_idx.add_prefix('F1_'), left_on='Fighter_1', right_index=True, how='inner')
    df = df.merge(fighters_idx.add_prefix('F2_'), left_on='Fighter_2', right_index=True, how='inner')

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

    df_swap = df.copy()
    df_swap['target'] = 1 - df_swap['target']
    for col in DIFF_FEATURES + ENGINEERED_FEATURES:
        df_swap[col] = -df_swap[col]

    df_aug = (
        pd.concat([df, df_swap], ignore_index=True)
        .sample(frac=1, random_state=seed)
        .reset_index(drop=True)
    )
    return df_aug
