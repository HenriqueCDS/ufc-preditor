"""FastAPI backend, deployed as a Vercel Service (see ../vercel.json).

Routes are registered under /api/... because the top-level rewrite
`{ "source": "/api/(.*)", "destination": { "service": "backend" } }` forwards
the ORIGINAL path -- Vercel does not strip the /api prefix before handing the
request to this service. Same-origin as the Next.js frontend, so no CORS
needed.

Local dev without `vercel dev`:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
Routes are still under /api/... (e.g. http://localhost:8000/api/fighters/search)
since that prefix is baked into the route paths below, not added by the
rewrite -- see backend/README.md.
"""
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from ml.predict import ArtifactsNotFoundError, FighterNotFoundError, Predictor

app = FastAPI(title="UFC Preditor API")

try:
    predictor = Predictor()
except ArtifactsNotFoundError as exc:
    raise RuntimeError(
        "ml/artifacts/ esta faltando. Rode `cd backend && python -m ml.train` "
        "e commite os artefatos gerados antes de fazer deploy."
    ) from exc


class PredictRequest(BaseModel):
    fighter1: str
    fighter2: str
    weight_class: str = "Lightweight"


class CardFightItem(BaseModel):
    f1: str
    f2: str
    weight_class: str | None = None


class PredictCardRequest(BaseModel):
    fights: list[CardFightItem]


@app.get("/api/health")
def health():
    return {"status": "ok", "fighters": len(predictor.fighters)}


@app.get("/api/fighters")
def list_fighters():
    return sorted(predictor.fighters.index)


@app.get("/api/fighters/search")
def search_fighters(q: str = Query(min_length=1), top_n: int = Query(default=8, le=25)):
    return predictor.search_fighter(q, top_n=top_n)


@app.get("/api/fighters/compare")
def compare_fighters(f1: str, f2: str):
    try:
        return predictor.compare_fighters(f1, f2)
    except FighterNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/fighters/stats")
def fighter_stats(name: str = Query(min_length=1)):
    try:
        return predictor.fighter_stats(name)
    except FighterNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/predict")
def predict_fight(body: PredictRequest):
    try:
        return predictor.predict_fight(body.fighter1, body.fighter2, body.weight_class)
    except FighterNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/predict/card")
def predict_card(body: PredictCardRequest):
    fights = [
        {"f1": f.f1, "f2": f.f2, "weight_class": f.weight_class or "Lightweight"}
        for f in body.fights
    ]
    return predictor.predict_card(fights)
