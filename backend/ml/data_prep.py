"""Loading and cleaning of the two source CSVs (fighters, fights).

Mirrors notebook cells 2-3-6-11: unit conversion, median imputation,
1%-99% winsorization, target creation and weight-class encoding.
"""
import re

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

FIGHTER_FEATURES = [
    'Height_cm', 'Weight_lbs', 'Reach_cm', 'Age',
    'Win_Rate', 'Total_Fights',
    'SLpM', 'Str_Acc_f', 'SApM', 'Str_Def_f',
    'TD_Avg', 'TD_Acc_f', 'TD_Def_f', 'Sub_Avg',
]

WEIGHT_CLASS_CATEGORIES = [
    'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
    'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight',
    'Heavyweight', 'Super Heavyweight', "Women's",
]


def parse_height(h):
    """Converte altura no formato 5'11" para centimetros."""
    if pd.isna(h) or str(h).strip() == '':
        return np.nan
    m = re.match(r"(\d+)'\s*(\d+)\"", str(h))
    return round((int(m.group(1)) * 12 + int(m.group(2))) * 2.54, 1) if m else np.nan


def parse_weight(w):
    if pd.isna(w) or str(w).strip() == '':
        return np.nan
    m = re.search(r'([\d.]+)', str(w))
    return float(m.group(1)) if m else np.nan


def parse_reach(r):
    if pd.isna(r) or str(r).strip() == '':
        return np.nan
    m = re.search(r'([\d.]+)', str(r))
    return round(float(m.group(1)) * 2.54, 1) if m else np.nan


def parse_pct(p):
    if pd.isna(p) or str(p).strip() == '':
        return np.nan
    m = re.search(r'([\d.]+)', str(p))
    return float(m.group(1)) / 100 if m else np.nan


def extract_weight_class(wc):
    """Extrai a categoria base (ex.: 'UFC Lightweight Title Bout' -> 'Lightweight')."""
    for cat in WEIGHT_CLASS_CATEGORIES:
        if cat in str(wc):
            return cat
    return 'Other'


def load_and_clean_fighters(fighters_csv):
    """Returns fighters_clean: one row per fighter, FIGHTER_FEATURES only,
    imputed (median) and winsorized (1%-99%)."""
    fighters = pd.read_csv(fighters_csv)

    fighters['Height_cm'] = fighters['Height'].apply(parse_height)
    fighters['Weight_lbs'] = fighters['Weight'].apply(parse_weight)
    fighters['Reach_cm'] = fighters['Reach'].apply(parse_reach)
    fighters['Str_Acc_f'] = fighters['Str_Acc'].apply(parse_pct)
    fighters['Str_Def_f'] = fighters['Str_Def'].apply(parse_pct)
    fighters['TD_Acc_f'] = fighters['TD_Acc'].apply(parse_pct)
    fighters['TD_Def_f'] = fighters['TD_Def'].apply(parse_pct)

    total = fighters['Wins'] + fighters['Losses'] + fighters['Draws']
    fighters['Win_Rate'] = np.where(total > 0, fighters['Wins'] / total, np.nan)
    fighters['Total_Fights'] = total
    fighters['DOB'] = pd.to_datetime(fighters['DOB'], errors='coerce')
    fighters['Age'] = ((pd.Timestamp('2024-01-01') - fighters['DOB']).dt.days / 365.25).round(1)

    fighters_clean = fighters[['Fighter_Name'] + FIGHTER_FEATURES].copy()

    for col in FIGHTER_FEATURES:
        fighters_clean[col] = fighters_clean[col].fillna(fighters_clean[col].median())
    for col in FIGHTER_FEATURES:
        p01 = fighters_clean[col].quantile(0.01)
        p99 = fighters_clean[col].quantile(0.99)
        fighters_clean[col] = fighters_clean[col].clip(lower=p01, upper=p99)

    return fighters_clean


def load_and_clean_fights(fights_csv):
    """Returns (fights_clean, weight_class_label_encoder)."""
    fights = pd.read_csv(fights_csv)
    fights_clean = fights.dropna(subset=['Fighter_1', 'Fighter_2', 'Winner']).copy()

    mask_valid = (
        (fights_clean['Winner'] == fights_clean['Fighter_1']) |
        (fights_clean['Winner'] == fights_clean['Fighter_2'])
    )
    fights_clean = fights_clean[mask_valid].copy()
    fights_clean['target'] = (fights_clean['Winner'] == fights_clean['Fighter_1']).astype(int)

    fights_clean['Weight_Class_Cat'] = fights_clean['Weight_Class'].apply(extract_weight_class)
    wc_le = LabelEncoder()
    fights_clean['Weight_Class_Enc'] = wc_le.fit_transform(fights_clean['Weight_Class_Cat'])

    fights_clean['Event_Date'] = pd.to_datetime(fights_clean['Event_Date'], errors='coerce')
    fights_clean = fights_clean.sort_values('Event_Date').reset_index(drop=True)

    return fights_clean, wc_le
