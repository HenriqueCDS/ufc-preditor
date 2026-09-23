# UFC Preditor — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS + Chart.js. Consome uma API
de predição ainda não implementada (ver `../ml/` para a lógica de treino e
inferência já extraída do notebook).

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # aponte NEXT_PUBLIC_API_URL para o backend
npm run dev
```

Sem um backend rodando em `NEXT_PUBLIC_API_URL`, as páginas `/predict` e
`/compare` carregam normalmente mas mostram um erro amigável ao tentar
buscar/prever (`"NEXT_PUBLIC_API_URL nao configurada..."`).

## Páginas

| Rota | Descrição |
|---|---|
| `/` | Dashboard — resumo do dataset e comparação de AUC-ROC entre os 4 modelos (`src/data/model-metrics.ts`, snapshot estático do último treino) |
| `/predict` | Formulário de predição de luta (dois lutadores + categoria de peso) com gráfico de probabilidade |
| `/compare` | Comparação de estatísticas de carreira entre dois lutadores (radar chart + tabela) |

## Contrato de API esperado (`src/lib/api.ts`)

O backend ainda não foi escolhido — este arquivo define o contrato HTTP que
qualquer implementação (FastAPI, Flask, ...) precisa satisfazer:

```
GET  /fighters/search?q=...&top_n=8        -> string[]
GET  /fighters/compare?f1=...&f2=...       -> CompareFightersResult
POST /predict        { fighter1, fighter2, weight_class } -> PredictFightResult
POST /predict/card    { fights: [{ f1, f2, weight_class? }] } -> PredictFightResult[]
```

Os tipos de retorno (`src/lib/types.ts`) espelham exatamente os dicts que
`ml/predict.py::Predictor` já retorna — um backend HTTP fino em cima dessa
classe (FastAPI, por exemplo) atende o contrato sem transformação extra.

## Deploy

Pensado para o Vercel (é um app Next.js padrão). Se o backend de predição
não também for hospedado no Vercel (scikit-learn/xgboost/pandas em Python
Serverless Function tem limite de tamanho de bundle apertado), aponte
`NEXT_PUBLIC_API_URL` para onde o backend estiver (Render, Railway, Fly.io,
etc.) e configure CORS lá para aceitar o domínio do frontend.
