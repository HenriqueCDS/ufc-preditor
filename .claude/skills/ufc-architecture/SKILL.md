---
name: ufc-architecture
description: Arquitetura e convenções do projeto UFC Preditor (scraper → treino ML → FastAPI → Next.js, deploy Vercel Services). Use ao adicionar/alterar endpoints, features de ML, páginas do frontend, scraper, artefatos do modelo ou deploy, para manter as camadas e o contrato de API consistentes.
---

# UFC Preditor — Arquitetura a seguir

Pipeline: `scraper/ → DATA/*.csv → backend/ml/train.py → backend/ml/artifacts/ → backend/main.py (FastAPI) → web/ (Next.js)`. Frontend e backend são **dois Vercel Services** no mesmo domínio (`vercel.json`), sem CORS.

## Mapa de camadas

| Camada | Local | Responsabilidade | NÃO faz |
|---|---|---|---|
| Coleta | `scraper/` | Atualiza incrementalmente `DATA/ufc_fighters_final.csv` e `DATA/ufc_gold_dataset_final.csv` do ufcstats.com (Playwright) | Não altera o schema dos CSVs |
| Limpeza | `backend/ml/data_prep.py` | Parsing/limpeza (altura, alcance, `%`, categoria de peso), constantes `FIGHTER_FEATURES`, `WEIGHT_CLASS_CATEGORIES` | Sem I/O de rede |
| Features | `backend/ml/features.py` | `DIFF_*` + compostas, `ALL_FEATURES`, `STAT_INFO`, `build_feature_row` (1 luta), `build_training_dataset` (vetorizado + augmentação) | — |
| Treino | `backend/ml/train.py` | Treina os 4 modelos, salva em `ml/artifacts/` | Nunca roda no deploy |
| Inferência | `backend/ml/predict.py` | Classe `Predictor`: retorna dicts/listas puros | **Sem print, plot, HTTP ou FastAPI** |
| API | `backend/main.py` | Rotas `/api/...`, modelos Pydantic, mapeia exceções → HTTP | **Sem lógica de ML** |
| Client | `web/src/lib/api.ts` + `types.ts` | Único ponto de acesso HTTP; tipos espelham os dicts do `Predictor` | Componentes não chamam `fetch` direto |
| UI | `web/src/app/*`, `web/src/components/*` | Páginas (App Router), gráficos Chart.js em `components/charts/` | — |

## Regras

### Backend
1. **Lógica nova de ML/dados vai em `backend/ml/`, exposta como método do `Predictor`**; `main.py` só valida entrada (Pydantic), chama o método e traduz erros.
2. Erros de domínio são exceções próprias (`FighterNotFoundError`, `ArtifactsNotFoundError`) levantadas no `Predictor`; `main.py` converte em `HTTPException(404, detail=str(exc))`.
3. **Todas as rotas começam com `/api/`** hardcoded no `main.py` (o rewrite do Vercel não remove o prefixo).
4. `Predictor()` é instanciado **uma vez** em module scope. Não carregue artefatos por requisição.
5. **Features: treino e inferência compartilham `features.py`.** Ao criar/alterar uma feature, altere a função compartilhada (`_composite_features`/`build_feature_row`) e a lista (`ENGINEERED_FEATURES`/`ALL_FEATURES`) — nunca duplique a fórmula no `predict.py`. Features são **diferenciais** (F1 − F2) para invariância posicional; mantenha a augmentação por espelhamento.
6. Mudou features, dados ou modelo ⇒ **é preciso retreinar** (`cd backend && python -m ml.train`, ~35 min) e commitar `ml/artifacts/`, senão inferência e modelo divergem.
7. Sem `pyarrow`/Parquet: artefatos tabulares em CSV (bundle pequeno). `SEED = 42` para reprodutibilidade.
8. Split estratificado 70/15/15; métrica principal AUC-ROC. Sem vazamento temporal: streak calculado só com lutas anteriores (`compute_streak`).
9. Texto de UI/mensagens em português; identificadores de código em inglês.

### Artefatos (`backend/ml/artifacts/`)
- **Versionados no git de propósito** (o build do Vercel não treina). Não os coloque no `.gitignore`.
- Conteúdo: `model.joblib`, `weight_class_encoder.joblib`, `fighters.csv`, `fights.csv`, `feature_list.json`, `metrics.json`.
- Fluxo de atualização: `scraper/run_update.py` → `python -m ml.train` → commit de `DATA/` e `backend/ml/artifacts/` → deploy.
- Atenção: `train.py` lê `REPO_ROOT/'data'` (minúsculo) enquanto o scraper publica em `DATA/`. Funciona no Windows (case-insensitive); em Linux/CI garanta que o diretório exista com o nome esperado ou unifique.

### Contrato de API (mudar SEMPRE os 4 lugares juntos)
Ao criar/alterar um endpoint, atualize na mesma mudança:
1. método no `Predictor` (`backend/ml/predict.py`)
2. rota + modelo Pydantic (`backend/main.py`)
3. tipos em `web/src/lib/types.ts` (espelham o dict retornado)
4. função em `web/src/lib/api.ts` (converte camelCase do front → snake_case do backend, ex. `weightClass` → `weight_class`)
5. tabela de endpoints em `backend/README.md` e `web/README.md`

Endpoints atuais: `GET /api/health`, `GET /api/fighters/search`, `GET /api/fighters/compare`, `GET /api/fighters/stats`, `POST /api/predict`, `POST /api/predict/card`.

### Frontend (`web/`)
- **Next.js aqui NÃO é o que você conhece** (`web/AGENTS.md`): antes de escrever código Next, leia o guia relevante em `web/node_modules/next/dist/docs/` e respeite deprecations.
- Next.js App Router + TypeScript + Tailwind + Chart.js. Páginas em `src/app/<rota>/page.tsx`; componentes reutilizáveis em `src/components/`; gráficos em `src/components/charts/` usando `chart-setup.ts` (registro único do Chart.js).
- Acesso à API só via `src/lib/api.ts` (`apiFetch` + `ApiError`); base `"/api"` (mesma origem), sobrescrevível por `NEXT_PUBLIC_API_URL` só se o backend rodar separado.
- `src/data/model-metrics.ts` é snapshot estático das métricas do último treino — atualize a partir de `backend/ml/artifacts/metrics.json` após retreinar.

### Scraper
- Falhas **sempre altas** (`BlockedError`, `StructureError`), nunca `continue` silencioso.
- Incremental: lutas por checkpoint de `Fight_URL` (parar após 5 eventos sem novidade); lutadores revisitados só quando o cartel muda.
- Escrita atômica (tmp + replace); em falha de perfil, preservar o valor anterior (nunca gravar `0%`).
- Delay ≥ 0,4 s entre requisições; Chromium não-headless. Saída bruta em `scraper/data/` (ignorada); base publicada em `DATA/`. Testes offline: `python scraper/test_scraper.py`.

### Deploy (`vercel.json`)
- Services `frontend` (`web/`) e `backend` (`backend/`, entrypoint `main:app`); rewrites `/api/(.*)` → backend, `/(.*)` → frontend. Não crie projetos Vercel separados.
- Rodar tudo como em produção: `npx vercel dev` na raiz. Separado: `uvicorn main:app --reload --port 8000` em `backend/` + `web/.env.local` com `NEXT_PUBLIC_API_URL=http://localhost:8000/api`.

## Checklists

**Nova feature de ML**
1. `data_prep.py` (se precisar de coluna nova) → `features.py` (fórmula compartilhada + listas + `STAT_INFO` se for exibida)
2. Retreinar, conferir `metrics.json`, commitar artefatos
3. Atualizar `model-metrics.ts` e README (seção Resultados) se métricas mudaram

**Novo endpoint**: siga "Contrato de API" acima; adicione tratamento 404/erro consistente.

**Nova página**: `web/src/app/<rota>/page.tsx` + link em `Navbar.tsx` + função em `api.ts` se consumir API + linha na tabela de páginas do `web/README.md`.

**Atualizar dados**: `cd scraper && python run_update.py` → `cd backend && python -m ml.train` → commit `DATA/` + `backend/ml/artifacts/`.
