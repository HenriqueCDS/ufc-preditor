"""Train the 4 candidate models and export inference artifacts.

Runs entirely on CPU in a few minutes (~17k rows, 21 features) -- no GPU,
no cloud needed. Re-run whenever ../../data/*.csv changes:

    cd backend && python -m ml.train

Artifacts land in backend/ml/artifacts/ and are committed to git -- Vercel's
build step never runs this (it would need sklearn/xgboost just to train, and
takes ~35min). main.py only ever reads the artifacts, never imports this
module.
"""
import json
import time
from pathlib import Path

import joblib
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

from .data_prep import load_and_clean_fighters, load_and_clean_fights
from .features import ALL_FEATURES, build_training_dataset

SEED = 42
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / 'data'
ARTIFACTS_DIR = Path(__file__).resolve().parent / 'artifacts'


def _evaluate(pipe, X, y):
    pred = pipe.predict(X)
    prob = pipe.predict_proba(X)[:, 1]
    return {
        'accuracy': accuracy_score(y, pred),
        'precision': precision_score(y, pred, zero_division=0),
        'recall': recall_score(y, pred, zero_division=0),
        'f1': f1_score(y, pred, zero_division=0),
        'auc_roc': roc_auc_score(y, prob),
    }


def _train_logistic_regression(X_train, y_train):
    pipe = Pipeline([('scaler', StandardScaler()), ('model', LogisticRegression(max_iter=1000, random_state=SEED))])
    grid = GridSearchCV(pipe, {
        'model__C': [0.001, 0.01, 0.1, 1, 10, 100],
        'model__penalty': ['l1', 'l2'],
        'model__solver': ['liblinear'],
    }, cv=5, scoring='roc_auc', n_jobs=-1)
    grid.fit(X_train, y_train)
    return grid.best_estimator_, grid.best_score_


def _train_random_forest(X_train, y_train):
    pipe = Pipeline([('scaler', StandardScaler()), ('model', RandomForestClassifier(random_state=SEED, n_jobs=-1))])
    grid = GridSearchCV(pipe, {
        'model__n_estimators': [100, 200, 300],
        'model__max_depth': [None, 8, 12, 16],
        'model__min_samples_leaf': [1, 2, 5],
        'model__max_features': ['sqrt', 'log2'],
    }, cv=5, scoring='roc_auc', n_jobs=-1)
    grid.fit(X_train, y_train)
    return grid.best_estimator_, grid.best_score_


def _train_gradient_boosting(X_train, y_train):
    pipe = Pipeline([('scaler', StandardScaler()), ('model', GradientBoostingClassifier(random_state=SEED))])
    search = RandomizedSearchCV(pipe, {
        'model__n_estimators': [100, 200, 300, 400],
        'model__learning_rate': [0.01, 0.05, 0.1, 0.2],
        'model__max_depth': [3, 4, 5, 6],
        'model__subsample': [0.7, 0.8, 1.0],
        'model__min_samples_leaf': [1, 5, 10],
    }, n_iter=25, cv=5, scoring='roc_auc', random_state=SEED, n_jobs=-1)
    search.fit(X_train, y_train)
    return search.best_estimator_, search.best_score_


def _train_xgboost(X_train, y_train):
    pipe = Pipeline([('scaler', StandardScaler()), ('model', XGBClassifier(
        random_state=SEED, eval_metric='logloss', verbosity=0,
    ))])
    search = RandomizedSearchCV(pipe, {
        'model__n_estimators': [100, 200, 300],
        'model__learning_rate': [0.05, 0.1, 0.2],
        'model__max_depth': [3, 4, 5, 6],
        'model__subsample': [0.7, 0.8, 1.0],
        'model__colsample_bytree': [0.7, 0.8, 1.0],
        'model__reg_alpha': [0, 0.1, 0.5],
    }, n_iter=25, cv=5, scoring='roc_auc', random_state=SEED, n_jobs=-1)
    search.fit(X_train, y_train)
    return search.best_estimator_, search.best_score_


def train():
    t0 = time.time()
    print('Carregando e limpando dados...')
    fighters_clean = load_and_clean_fighters(DATA_DIR / 'ufc_fighters_final.csv')
    fights_clean, wc_le = load_and_clean_fights(DATA_DIR / 'ufc_gold_dataset_final.csv')
    df_aug = build_training_dataset(fighters_clean, fights_clean, seed=SEED)
    print(f'  Lutadores: {len(fighters_clean):,} | Lutas (aumentadas): {len(df_aug):,}')

    X = df_aug[ALL_FEATURES].fillna(0).values
    y = df_aug['target'].values

    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=SEED, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=SEED, stratify=y_temp)

    trainers = {
        'logistic_regression': _train_logistic_regression,
        'random_forest': _train_random_forest,
        'gradient_boosting': _train_gradient_boosting,
    }
    if XGBOOST_AVAILABLE:
        trainers['xgboost'] = _train_xgboost
    else:
        print('[AVISO] xgboost nao instalado -- pulando esse modelo (pip install xgboost)')

    candidates = {}
    cv_scores = {}
    for name, trainer in trainers.items():
        print(f'Treinando {name}...')
        pipe, cv_auc = trainer(X_train, y_train)
        candidates[name] = pipe
        cv_scores[name] = cv_auc

    metrics = {}
    for name, pipe in candidates.items():
        metrics[name] = {
            'cv_auc_roc': cv_scores[name],
            'validation': _evaluate(pipe, X_val, y_val),
            'test': _evaluate(pipe, X_test, y_test),
        }

    best_name = max(metrics, key=lambda n: metrics[n]['validation']['auc_roc'])
    best_pipe = candidates[best_name]

    ARTIFACTS_DIR.mkdir(exist_ok=True)
    joblib.dump(best_pipe, ARTIFACTS_DIR / 'model.joblib')
    joblib.dump(wc_le, ARTIFACTS_DIR / 'weight_class_encoder.joblib')
    fighters_clean.to_csv(ARTIFACTS_DIR / 'fighters.csv', index=False)
    fights_clean.to_csv(ARTIFACTS_DIR / 'fights.csv', index=False)
    (ARTIFACTS_DIR / 'feature_list.json').write_text(json.dumps(ALL_FEATURES, indent=2), encoding='utf-8')
    (ARTIFACTS_DIR / 'metrics.json').write_text(
        json.dumps({'best_model': best_name, 'models': metrics}, indent=2, default=float),
        encoding='utf-8',
    )

    print()
    print(f'Melhor modelo: {best_name}  (AUC-ROC val: {metrics[best_name]["validation"]["auc_roc"]:.4f})')
    print(f'Artefatos salvos em {ARTIFACTS_DIR}')
    print(f'Tempo total: {time.time() - t0:.1f}s')


if __name__ == '__main__':
    train()
