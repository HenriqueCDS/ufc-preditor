// Snapshot of ml/artifacts/metrics.json from the last local training run
// (`python -m ml.train`). Static on purpose: retraining is an offline step,
// not something the web app triggers. Re-copy these numbers after retraining,
// or -- once the backend exists -- swap this for a `GET /metrics` call.

export interface ModelMetric {
  key: string;
  label: string;
  accuracyValidation: number;
  aucRocValidation: number;
  aucRocTest: number;
}

export const MODEL_METRICS: ModelMetric[] = [
  {
    key: "logistic_regression",
    label: "Regressao Logistica",
    accuracyValidation: 0.7318,
    aucRocValidation: 0.8057,
    aucRocTest: 0.8031,
  },
  {
    key: "random_forest",
    label: "Random Forest",
    accuracyValidation: 0.7212,
    aucRocValidation: 0.7987,
    aucRocTest: 0.7913,
  },
  {
    key: "gradient_boosting",
    label: "Gradient Boosting",
    accuracyValidation: 0.7288,
    aucRocValidation: 0.8066,
    aucRocTest: 0.7959,
  },
  {
    key: "xgboost",
    label: "XGBoost",
    accuracyValidation: 0.7303,
    aucRocValidation: 0.8084,
    aucRocTest: 0.7978,
  },
];

export const BEST_MODEL_KEY = "xgboost";
export const DATASET_SUMMARY = {
  fighters: 4618,
  fightsAugmented: 17530,
  featureCount: 21,
};
