# UFC Preditor

**Pipeline de Machine Learning que transforma o histórico público do UFC em previsões de vencedor, comparações de lutadores e estatísticas — do scraper ao site, no ar como um único deploy.**

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5%2B-F7931E?logo=scikitlearn&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.0%2B-EB6B00)
![FastAPI](https://img.shields.io/badge/FastAPI-0.117%2B-009688?logo=fastapi&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-scraper-2EAD33?logo=playwright&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4.5-FF6384?logo=chartdotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/deploy-Vercel%20Services-000000?logo=vercel&logoColor=white)
![AUC-ROC](https://img.shields.io/badge/AUC--ROC%20(teste)-0.798-success)

Projeto da disciplina **Linguagem de Programação Python Aplicada a Machine Learning**.

---

## O problema

Cada luta do UFC tem dois lutadores e um vencedor. Palpite de bar e "feeling" de
narrador não escalam — e quem promete acertar mais de 90% está vendendo
ilusão, porque MMA tem muita variância (um golpe muda tudo).

Este projeto ataca a pergunta com dados: **antes da luta, quem tem mais chance de
vencer?** — como classificação binária (`1` = Fighter 1 vence, `0` = Fighter 2).

A tese: **a diferença entre as estatísticas de carreira dos dois lutadores
(striking, grappling, experiência, físico) é um bom preditor do resultado.** Em
vez de dar ao modelo os números de cada lutador, damos a *diferença* entre eles —
assim ele aprende quem é melhor, não quem está no canto vermelho.

Com ~8,7 mil lutas e ~4,6 mil lutadores, os quatro modelos testados chegam a
**~72% de acurácia e AUC-ROC de 0.79–0.80 em dados nunca vistos**.

---

## Demonstração

Saída real do `Predictor` treinado, não mockup.

### Buscar um lutador

```console
>>> Predictor().search_fighter("Jones", 5)
['Mason Jones', 'Paul Jones', 'Jon Jones', 'Nathan Jones', 'Marcus Jones']
```

### Prever uma luta

```console
>>> Predictor().predict_fight("Islam Makhachev", "Charles Oliveira", "Lightweight")
{
  "predicted_winner": "Islam Makhachev",
  "prob_fighter1": 0.870,
  "prob_fighter2": 0.130,
  "confidence": 0.870,
  "confidence_level": "ALTA",
  ...
}
```

### Prever um card

```console
Conor McGregor     vs Dustin Poirier     -> Dustin Poirier     61.2%  MEDIA
Islam Makhachev    vs Charles Oliveira   -> Islam Makhachev    87.0%  ALTA
Alex Pereira       vs Jiri Prochazka     -> Jiri Prochazka     64.2%  MEDIA
```

Lutas equilibradas saem com confiança `MEDIA`; só diferenças grandes de perfil
chegam a `ALTA`. O modelo sabe quando não sabe.

---

## Pipeline completo

Do site do UFC até a probabilidade na tela, em cinco etapas — cada uma isolada
na sua pasta, nenhuma faz o que a anterior já fez:

| # | Etapa | Onde | Saída |
|---|---|---|---|
| 1 | **Coletar** | [`scraper/`](scraper/) (`run_update.py`) | `DATA/*.csv` atualizados do ufcstats.com, de forma incremental |
| 2 | **Limpar e criar features** | [`backend/ml/data_prep.py`](backend/ml/data_prep.py), [`features.py`](backend/ml/features.py) | 21 features diferenciais + augmentação por espelhamento |
| 3 | **Treinar** | [`backend/ml/train.py`](backend/ml/train.py) | 4 modelos com busca de hiperparâmetros; `artifacts/` (modelo, métricas, tabelas) |
| 4 | **Servir** | [`backend/main.py`](backend/main.py) + [`predict.py`](backend/ml/predict.py) | API `/api/...` sobre a classe `Predictor` |
| 5 | **Exibir** | [`web/`](web/) | Dashboard, predição, comparação e estatísticas |

O notebook [`Projeto_final_ufc_predidor.ipynb`](Projeto_final_ufc_predidor.ipynb)
é a versão didática e original de todo o pipeline; o `backend/ml/` é a mesma
lógica extraída para código de produção.

---

## Aplicação web

| Rota | O que entrega |
|---|---|
| `/` | Dashboard: resumo do dataset e comparação de AUC-ROC entre os 4 modelos |
| `/predict` | Escolha dois lutadores e a categoria de peso → probabilidade de cada um, gráfico, e comparação de carreira (radar + tabela). `/compare` redireciona para cá |
| `/statistics` | Aba **Geral** (EDA: métodos de vitória, categorias, evolução temporal, correlações) e aba **Por lutador** (cartel, percentis, striking/grappling, histórico) |

### API

| Rota | Método | Retorno |
|---|---|---|
| `/api/health` | GET | Status e nº de lutadores carregados |
| `/api/fighters` | GET | Lista de lutadores |
| `/api/fighters/search?q=&top_n=` | GET | Nomes que casam com a busca |
| `/api/fighters/compare?f1=&f2=` | GET | Estatísticas lado a lado e vantagens |
| `/api/fighters/stats?name=` | GET | Perfil, percentis e histórico |
| `/api/predict` | POST | Predição de uma luta |
| `/api/predict/card` | POST | Predição de um card inteiro |

Lutador não encontrado devolve `404` com `{"detail": "..."}`. Contrato completo em
[backend/README.md](backend/README.md) e [web/README.md](web/README.md).

### Como rodar

Tudo junto, como em produção (mesma origem, roteamento via `vercel.json`):

```bash
npx vercel dev
```

Ou separado:

```bash
# backend
cd backend && pip install -r requirements.txt uvicorn
uvicorn main:app --reload --port 8000

# frontend (outro terminal) — crie web/.env.local com
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api
cd web && npm install && npm run dev
```

---

## Arquitetura

```
  ufcstats.com
       │
       ▼
  ┌──────────────────────┐   Python / Playwright
  │      scraper/        │   • Chromium real (o anti-bot barra requests)
  │   run_update.py      │   • incremental: só eventos novos e cartéis alterados
  └──────────┬───────────┘   • falha sempre alta (BlockedError, StructureError)
             │
             ▼   DATA/ufc_fighters_final.csv · ufc_gold_dataset_final.csv
  ┌──────────────────────┐   Python / scikit-learn / XGBoost
  │   backend/ml/        │   • limpeza + winsorização
  │  data_prep · features│   • features DIFF_* e compostas, sem vazamento
  │  train               │   • split 70/15/15 · 4 modelos · CV 5-fold
  └──────────┬───────────┘   • escolhe o melhor por AUC-ROC de validação
             │
             ▼   backend/ml/artifacts/  (versionado no git)
  ┌──────────────────────┐   FastAPI
  │  Predictor + main.py │   • Predictor carregado uma vez (module scope)
  │      /api/...        │   • main.py só valida entrada e traduz erros
  └──────────┬───────────┘   • zero lógica de ML nas rotas
             │
             ▼
  ┌──────────────────────┐   Next.js · TypeScript · Chart.js
  │        web/          │   • único ponto HTTP: src/lib/api.ts
  │  /  /predict  /stats │   • mesma origem que a API, sem CORS
  └──────────────────────┘
```

```
ufc-preditor/
├── DATA/                 # base publicada (lida pelo notebook e pelo treino)
├── scraper/              # atualização da base
├── backend/
│   ├── main.py           # FastAPI
│   └── ml/               # data_prep · features · train · predict · fighter_stats · eda
│       └── artifacts/    # model.joblib, metrics.json, fighters.csv, fights.csv...
├── web/src/{app,components,lib,data}
├── Projeto_final_ufc_predidor.ipynb
└── vercel.json           # 2 services + rewrites
```

---

## Resultados

Fonte: [`backend/ml/artifacts/metrics.json`](backend/ml/artifacts/metrics.json).

| Modelo | CV AUC | Validação — Acurácia | Validação — AUC | Teste — Acurácia | Teste — AUC |
|---|---|---|---|---|---|
| Regressão Logística | 0.7954 | 73.2% | 0.8057 | 72.3% | **0.8031** |
| Random Forest | 0.7904 | 72.1% | 0.7987 | 71.8% | 0.7913 |
| Gradient Boosting | 0.7994 | 73.0% | 0.8066 | 72.4% | 0.7959 |
| **XGBoost** (em produção) | 0.7999 | 73.0% | **0.8084** | 71.7% | 0.7978 |

- **XGBoost** vence na validação, então é o modelo servido.
- Os quatro ficam a ~0.01 de AUC uns dos outros — até a regressão logística
  empata. **O ganho vem das features, não do algoritmo.**
- Overfitting mínimo: gap validação/teste de 0.005–0.011 de AUC.

---

## Decisões técnicas

As escolhas que definiram o projeto, e o porquê de cada uma.

### Features diferenciais e augmentação por espelhamento

`DIFF_SLpM = SLpM(F1) − SLpM(F2)`. Positivo: F1 leva vantagem; negativo: F2.
Isso dá **invariância posicional** — o modelo não pode aprender "quem está na
posição F1 ganha mais". Reforçando: cada luta `F1 vs F2` ganha uma cópia
`F2 vs F1`, o dataset dobra e o target fica 50/50.

Além das diferenças cruas, há compostas que codificam conhecimento do esporte:
`Efficiency` (golpes acertados vs sofridos), `TD_Success`, `Grappling_Ctrl`,
`Strike_Ratio`, `Weighted_Exp` (win rate × log de lutas) e `Streak`.

### Sem vazamento temporal

O *streak* de um lutador é calculado **só com lutas anteriores** à luta prevista.
Usar o cartel final para prever uma luta de 2015 deixaria o modelo "ver o
futuro" e inflaria as métricas com um resultado que não se repete em produção.

### AUC-ROC como métrica principal

Acurácia depende de um limiar de decisão; a AUC avalia o modelo em todos eles e
mede a capacidade real de separar vencedor de perdedor. O split é estratificado
70/15/15 e o conjunto de teste só é lido na avaliação final.

### Camadas com fronteiras rígidas

`predict.py` devolve dicts puros, sem print, plot nem HTTP. `main.py` só valida
entrada (Pydantic), chama o `Predictor` e converte exceções de domínio
(`FighterNotFoundError`) em `404`. Treino e inferência **compartilham
`features.py`** — a fórmula de uma feature existe em um lugar só, então
modelo e API não divergem.

### Scraper que falha alto

O ufcstats passou a servir um desafio anti-bot em JavaScript: um `requests`
recebe HTTP 200 com uma tela de carregamento e o scraper original, sem tabela,
fazia `continue` e terminava com sucesso — sem coletar nada. Aqui o transporte é
um Chromium real e **toda falha é ruidosa**. A atualização é incremental (o
índice alfabético já traz a maior parte dos dados; só perfis com cartel alterado
são reabertos), e a escrita é atômica. Detalhes em [scraper/README.md](scraper/README.md).

### Artefatos versionados de propósito

O build do Vercel não treina modelo (levaria ~35 min e exigiria sklearn só para
isso). `backend/ml/artifacts/` é commitado, e a API só *lê* esses arquivos.
Para caber no limite de 500 MB da function, usa-se `xgboost-cpu` (mesmo
`import xgboost`, sem a dependência de GPU) e artefatos em CSV em vez de
Parquet, eliminando ~85 MB de `pyarrow`.

### Dois Vercel Services, um domínio

Frontend e backend são dois *services* no mesmo projeto (`vercel.json`), com
rewrite `/api/(.*)` → backend. Mesma origem: sem CORS, um deploy só.

### Honestidade sobre o teto

MMA tem variância alta. O modelo não vê lesão, fadiga, camp de treino, estilo
contra estilo nem psicologia. ~72% de acurácia é um resultado sólido — e o
projeto não finge que é mais que isso.

---

## Atualizando dados e modelo

```bash
cd scraper && python run_update.py     # 1. atualiza DATA/ (abre um Chrome; não é headless)
cd backend && python -m ml.train       # 2. retreina (~35 min em CPU) e regrava artifacts/
git add DATA/ backend/ml/artifacts/    # 3. versiona dados e artefatos
```

Depois de retreinar, atualize também `web/src/data/model-metrics.ts` (a partir
do novo `metrics.json`), rode `python -m ml.eda` em `backend/` para regenerar
`web/src/data/eda-stats.json` e confira a tabela de resultados acima.

---

## Limitações e próximos passos

- Estatísticas por **luta recente**, não só totais de carreira
- Dados de camp de treinamento e comissão técnica
- NLP em entrevistas pré-luta para detectar confiança/pressão
- Modelos de série temporal para a trajetória de desempenho

---

## Stack

| Camada | Tecnologia |
|---|---|
| Coleta | Python, Playwright, BeautifulSoup, pandas |
| ML | pandas, NumPy, scikit-learn, XGBoost, SciPy, joblib |
| API | FastAPI (+ uvicorn local) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Chart.js 4 |
| Exploração | Jupyter, matplotlib, seaborn |
| Deploy | Vercel Services |
