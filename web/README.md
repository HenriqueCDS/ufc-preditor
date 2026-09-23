# UFC Preditor — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS + Chart.js. Consome o
backend FastAPI em [`../backend/`](../backend/), deployado junto como um
**Vercel Service** (ver [`../vercel.json`](../vercel.json)) — mesma origem,
sem CORS.

## Rodando localmente

```bash
npm install
npm run dev
```

Sozinho (`npm run dev`), a página `/predict` carrega
normalmente, mas as chamadas a `/api/...` falham (nenhum backend respondendo
em `/api`) até você também rodar o backend. Duas opções:

- **Junto, como em produção**: `npx vercel dev` na raiz do repo (usa o
  `vercel.json` para servir frontend + backend na mesma origem)
- **Separado**: rode `uvicorn main:app --port 8000` em `backend/` e crie
  `web/.env.local` com `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

## Páginas

| Rota | Descrição |
|---|---|
| `/` | Dashboard — resumo do dataset e comparação de AUC-ROC entre os 4 modelos (`src/data/model-metrics.ts`, snapshot estático do último treino) |
| `/predict` | Predição de luta (dois lutadores + categoria de peso) com gráfico de probabilidade e, logo abaixo, a comparação de estatísticas de carreira dos dois (radar chart + tabela). `/compare` redireciona para cá |
| `/statistics` | Abas "Geral" (EDA: metodos, categorias de peso, evolucao temporal, correlacoes e striking; dados estaticos em `src/data/eda-stats.json`, regenerados com `cd backend && python -m ml.eda`) e "Por lutador" (`GET /api/fighters/stats`: cartel, metodos, percentis, striking/grappling, historico) |

## Contrato de API (`src/lib/api.ts`)

```
GET  /api/fighters/search?q=...&top_n=8    -> string[]
GET  /api/fighters/compare?f1=...&f2=...   -> CompareFightersResult
GET  /api/fighters/stats?name=...            -> FighterStatsResult
POST /api/predict        { fighter1, fighter2, weight_class } -> PredictFightResult
POST /api/predict/card    { fights: [{ f1, f2, weight_class? }] } -> PredictFightResult[]
```

Os tipos de retorno (`src/lib/types.ts`) espelham os dicts que
`backend/ml/predict.py::Predictor` retorna. `NEXT_PUBLIC_API_URL` é opcional —
por padrão o client usa o path relativo `/api`, que resolve pra mesma origem
(correto tanto em produção via Vercel Services quanto em `vercel dev` local).

## Deploy

Este projeto é um dos dois **services** declarados em `../vercel.json`
(`root: "web/"`). Um único deploy do repositório sobe frontend e backend
juntos, no mesmo domínio — não é um projeto Vercel isolado.
