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
| `/api/events/upcoming` | GET | — | `{scraped_at, events: [{id, name, date, location, fights_count}]}` |
| `/api/events/last` | GET | — | Último evento concluído: cada luta com `prediction` (calculada ANTES do evento, sem vazamento) + `result` (o que aconteceu de fato) + `correct` |
| `/api/events/{id}` | GET | — | `EventCardResult` (cada luta com `prediction`, ou `status: "no_data"` + `missing` para estreantes) |

Lutador ou evento não encontrado → `404` com `{"detail": "..."}`. `/api/events/last` também retorna `404` até o primeiro `ml.archive_last_event` rodar (ver abaixo).

`/api/events/upcoming` e `/api/events/{id}` leem `ml/artifacts/upcoming.json`, publicado pelo workflow agendado `.github/workflows/update-upcoming.yml` (via `scraper/scrape_upcoming.py`). Lutadores que não constam em `fighters.csv` (match exato, sem acento/caixa) não são previstos.

`/api/events/last` lê `ml/artifacts/last_event.json`, publicado por `ml/archive_last_event.py` dentro do workflow `.github/workflows/update-full.yml`. Esse script roda **depois** do scraper atualizar `DATA/` mas **antes** do retreino — o modelo usado para a `prediction` ainda não viu o resultado deste evento, então a comparação com `correct` é sempre fora da amostra.

## Artefatos do modelo (`ml/artifacts/`)

**Commitados no git de propósito.** O build do Vercel não roda o treino
(precisaria de sklearn/xgboost só para isso, e leva ~35 min — inviável num
build serverless). O fluxo é:

1. Local ou via `.github/workflows/update-full.yml` (agendado, todo domingo): `cd backend && python -m ml.train` (lê `../DATA/*.csv`, ~35 min, CPU comum)
2. Isso regrava `ml/artifacts/*` (model.joblib, fighters.csv, fights.csv, ...)
3. Commit as mudanças em `ml/artifacts/`
4. Deploy no Vercel — `main.py` só *lê* os artefatos, nunca treina

`update-full.yml` roda o pipeline completo sozinho: `scraper/run_update.py` (lutas + lutadores) → `ml.archive_last_event` (arquiva previsão vs. resultado do último evento) → `ml.train` (retreina) → commit de `DATA/` e `ml/artifacts/`. Ele não mexe em `upcoming.json` (isso é só o `update-upcoming.yml`).

`main.py` carrega o `Predictor()` uma vez em module scope, então fica em
memória entre invocações "quentes" da function; só o cold start paga o custo
de I/O (~1-3s para ler os CSVs + desserializar o joblib).

## Por que sem `pyarrow`/Parquet

Os artefatos usam CSV em vez de Parquet — o dataset é pequeno (poucos MB) e
isso elimina uma dependência de ~85MB (pyarrow) do bundle, sem custo real de
performance aqui.
