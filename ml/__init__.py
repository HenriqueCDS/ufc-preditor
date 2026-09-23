"""UFC fight outcome prediction: data prep, feature engineering, training and inference.

Extracted from Projeto_final_ufc_predidor.ipynb so the same logic can be
reused by any backend (FastAPI, Flask, a script, ...) without re-running
the notebook.

Typical flow:
    1. `python -m ml.train`  -> writes artifacts to ml/artifacts/
    2. Backend imports `ml.predict.Predictor`, loads artifacts once,
       and calls predict_fight / compare_fighters / predict_card per request.
"""
