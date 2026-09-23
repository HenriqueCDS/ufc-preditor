"""UFC fight outcome prediction: data prep, feature engineering, training and inference.

Extracted from Projeto_final_ufc_predidor.ipynb so the same logic isn't
tangled up with the FastAPI layer in ../main.py.

Typical flow:
    1. `cd backend && python -m ml.train`  -> writes artifacts to ml/artifacts/
       (reads raw CSVs from ../../data/, two levels up from this package)
    2. main.py imports `ml.predict.Predictor`, loads artifacts once at
       module scope, and calls predict_fight / compare_fighters / predict_card
       per request.
"""
