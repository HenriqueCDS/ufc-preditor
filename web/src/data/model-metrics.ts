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
    label: "Regressão Logística",
    accuracyValidation: 0.6028,
    aucRocValidation: 0.6435,
    aucRocTest: 0.6628,
  },
  {
    key: "random_forest",
    label: "Random Forest",
    accuracyValidation: 0.6092,
    aucRocValidation: 0.6414,
    aucRocTest: 0.6531,
  },
  {
    key: "gradient_boosting",
    label: "Gradient Boosting",
    accuracyValidation: 0.5913,
    aucRocValidation: 0.6445,
    aucRocTest: 0.6548,
  },
  {
    key: "xgboost",
    label: "XGBoost",
    accuracyValidation: 0.5837,
    aucRocValidation: 0.6429,
    aucRocTest: 0.6514,
  },
];

export const BEST_MODEL_KEY = "gradient_boosting";
export const DATASET_SUMMARY = {
  fighters: 4615,
  fightsAugmented: 17454,
  featureCount: 21,
};
