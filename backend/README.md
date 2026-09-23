# UFC Preditor — Backend

FastAPI sobre `ml.predict.Predictor`, deployado como um **Vercel Service**
(ver `../vercel.json`) no mesmo projeto/domínio do frontend Next.js.

## Rodando localmente

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Todas as rotas ficam sob `/api/...` (ex.: `http://localhost:8000/api/fighters/search?q=Jones`)
— o prefixo está hardcoded nas rotas do `main.py`, não é adicionado pelo rewrite
do Vercel (ver `services routing`: o serviço recebe o path original).

Para rodar frontend + backend juntos exatamente como em produção (mesma
origem, roteamento via `vercel.json`):

```bash
npx vercel dev
```

## Endpoints

| Rota | Método | Body/Query | Retorno |
|---|---|---|---|
| `/api/health` | GET | — | `{status, fighters}` |
| `/api/fighters/search` | GET | `?q=...&top_n=8` | `string[]` |
| `/api/fighters/compare` | GET | `?f1=...&f2=...` | `CompareFightersResult` |
| `/api/fighters/stats` | GET | `?name=...` | `FighterStatsResult` |
| `/api/predict` | POST | `{fighter1, fighter2, weight_class}` | `PredictFightResult` |
| `/api/predict/card` | POST | `{fights: [{f1, f2, weight_class?}]}` | `PredictFightResult[]` |

Lutador não encontrado → `404` com `{"detail": "..."}`.

## Artefatos do modelo (`ml/artifacts/`)

**Commitados no git de propósito.** O build do Vercel não roda o treino
(precisaria de sklearn/xgboost só para isso, e leva ~35 min — inviável num
build serverless). O fluxo é:

1. Local: `cd backend && python -m ml.train` (lê `../data/*.csv`, ~35 min, CPU comum)
2. Isso regrava `ml/artifacts/*` (model.joblib, fighters.csv, fights.csv, ...)
3. Commit as mudanças em `ml/artifacts/`
4. Deploy no Vercel — `main.py` só *lê* os artefatos, nunca treina

`main.py` carrega o `Predictor()` uma vez em module scope, então fica em
memória entre invocações "quentes" da function; só o cold start paga o custo
de I/O (~1-3s para ler os CSVs + desserializar o joblib).

## Por que sem `pyarrow`/Parquet

Os artefatos usam CSV em vez de Parquet — o dataset é pequeno (poucos MB) e
isso elimina uma dependência de ~85MB (pyarrow) do bundle, sem custo real de
performance aqui.
