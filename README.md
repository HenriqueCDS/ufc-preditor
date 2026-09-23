# UFC — Preditor de Resultados com Machine Learning

**Disciplina:** Linguagem de Programação Python Aplicada a Machine Learning  
**Versão:** v5 (2026)

Projeto completo de Machine Learning para prever o resultado de lutas do UFC — desde a limpeza dos dados até a predição de cards reais.

---

## Sumário

1. [O Problema](#1-o-problema)
2. [Dados](#2-dados)
3. [Pipeline do Projeto](#3-pipeline-do-projeto)
4. [Engenharia de Features](#4-engenharia-de-features)
5. [Modelos Treinados](#5-modelos-treinados)
6. [Avaliação](#6-avaliação)
7. [Resultados](#7-resultados)
8. [Limitações e Próximos Passos](#8-limitações-e-próximos-passos)
9. [Como usar](#9-como-usar)
10. [Tecnologias](#10-tecnologias)
11. [Aplicação Web](#11-aplicação-web)

---

## 1. O Problema

O UFC é a maior organização de MMA do mundo. Cada luta tem dois lutadores e apenas um vence.

**Objetivo:** construir um modelo de ML capaz de prever **qual dos dois lutadores vai vencer** antes da luta acontecer.

Tipo de problema: **classificação binária**

| Valor do target | Significado |
|---|---|
| `1` | Fighter 1 vence |
| `0` | Fighter 2 vence |

**Hipótese central:**
> A diferença nas estatísticas de carreira entre dois lutadores é um bom preditor do resultado. Lutadores com vantagem consistente em striking, grappling e experiência tendem a vencer mais.

---

## 2. Dados

**Fonte:** [Kaggle — UFC Dataset 1994–2026](https://www.kaggle.com/datasets/jossilva3110/ufc-dataset-1994-2026)

| Arquivo | Conteúdo |
|---|---|
| `ufc_fighters_final.csv` | 4.455 lutadores com estatísticas de carreira |
| `ufc_gold_dataset_final.csv` | 8.551 lutas registradas (1994–2026) |

**Mantendo os dados atualizados:** [`scraper/`](scraper/) reconstrói esses dois
CSVs direto do ufcstats.com de forma incremental (só lutadores cujo cartel
mudou, só eventos novos), sem alterar o schema que este notebook lê — ver
[`scraper/README.md`](scraper/README.md).

**Features disponíveis:**
- **Físicas:** altura, peso, alcance (wingspan)
- **Técnicas:** golpes por minuto (SLpM), precisão de striking, takedowns, defesa
- **Históricas:** Win Rate, total de lutas, sequência de vitórias/derrotas

---

## 3. Pipeline do Projeto

```
Dados Brutos → Limpeza → Feature Engineering → Treino → Avaliação → Predição
```

### Etapa 1 — Definindo o Problema
Formulação como classificação binária, definição do target e das hipóteses.

### Etapa 2 — Preparação e Limpeza dos Dados
- Conversão de unidades americanas (pés/polegadas → cm, `%` → decimal)
- Preenchimento de valores ausentes com **mediana** (robusta a outliers)
- Controle de outliers com **Winsorização** (percentis 1%–99%)
- Remoção de lutas sem resultado definido (empates, "no contest")
- Codificação numérica das categorias de peso

### Etapa 3 — Análise Exploratória (EDA)
- Balanceamento do target (F1 vs F2)
- Métodos de vitória: nocaute, finalização, decisão dos juízes
- Distribuição por categorias de peso e evolução temporal (1994–2026)
- Matriz de correlação entre estatísticas
- Análise de striking por nível de desempenho

### Etapa 4 — Engenharia de Features
Criação das variáveis diferenciais e compostas (ver seção 4).

### Etapa 5 — Divisão Treino / Validação / Teste

| Conjunto | Proporção | Uso |
|---|---|---|
| Treino | 70% | Aprendizado dos padrões |
| Validação | 15% | Ajuste de hiperparâmetros |
| Teste | 15% | Avaliação final — dados nunca vistos |

Divisão estratificada (`stratify=y`) para manter proporção de classes em cada conjunto.

### Etapa 6 — Treinamento dos Modelos
Quatro algoritmos com busca de hiperparâmetros via `GridSearchCV` e `RandomizedSearchCV` com validação cruzada 5-fold.

### Etapa 7 — Avaliação e Comparação
Métricas múltiplas, curvas ROC, matrizes de confusão e curvas de aprendizado.

### Etapa 8 — Predição em "Produção"
Predição de lutadores individuais e de cards completos (ex.: UFC Freedom 250).

---

## 4. Engenharia de Features

### Ideia central: features diferenciais

Em vez de passar as estatísticas de cada lutador separadamente, criamos **diferenças**:

```
DIFF_SLpM = SLpM(Fighter_1) - SLpM(Fighter_2)
```

- Valor **positivo** → F1 tem vantagem nessa estatística
- Valor **negativo** → F2 tem vantagem
- Garante **invariância posicional**: o modelo aprende quem é melhor, não quem é F1 ou F2

### Features compostas

| Feature | O que mede |
|---|---|
| `DIFF_Efficiency` | Eficiência líquida no striking (golpes acertados vs sofridos) |
| `DIFF_TD_Success` | Takedowns bem-sucedidos por minuto |
| `DIFF_Grappling_Ctrl` | Controle geral do grappling |
| `DIFF_Strike_Ratio` | Proporção golpes desferidos vs sofridos |
| `DIFF_Weighted_Exp` | Experiência ponderada pela qualidade (Win Rate × log de lutas) |
| `DIFF_Streak` | Momento atual — sequência de vitórias recentes |

### Data Augmentation por simetria posicional

Para cada luta `F1 vs F2`, é criada uma cópia espelhada `F2 vs F1`.

- Dataset: **~8.500 → ~17.000 linhas**
- Target: **50/50 perfeitamente balanceado**
- Garante que o modelo aprenda que o resultado depende de quem é melhor, não da posição

---

## 5. Modelos Treinados

| Modelo | Como funciona | Complexidade |
|---|---|---|
| **Regressão Logística** | Pesos lineares por feature | Baixa |
| **Random Forest** | Ensemble de centenas de árvores de decisão por votação | Média |
| **Gradient Boosting** | Árvores em sequência, cada uma corrige os erros da anterior | Alta |
| **XGBoost** | Gradient Boosting otimizado com regularização embutida | Alta |

---

## 6. Avaliação

### Métricas utilizadas

| Métrica | O que mede |
|---|---|
| **Acurácia** | % de previsões corretas |
| **Precisão** | Dos que previu como F1 vencendo, quantos realmente venceram? |
| **Recall** | Das vitórias reais de F1, quantas o modelo identificou? |
| **F1-Score** | Equilíbrio entre Precisão e Recall |
| **AUC-ROC** | Capacidade de separar as classes (0.5 = aleatório, 1.0 = perfeito) |

> O **AUC-ROC** é a métrica principal pois avalia o modelo em todos os limiares de decisão possíveis, dando uma visão mais honesta da capacidade discriminativa.

### Matriz de Confusão

| | Previu: F1 vence | Previu: F2 vence |
|---|---|---|
| **Real: F1 venceu** | Verdadeiro Positivo (VP) ✓ | Falso Negativo (FN) ✗ |
| **Real: F2 venceu** | Falso Positivo (FP) ✗ | Verdadeiro Negativo (VN) ✓ |

---

## 7. Resultados

| Aspecto | Resultado |
|---|---|
| **Melhor modelo (validação)** | Gradient Boosting — AUC-ROC 0.8105 (XGBoost e Regressão Logística ficam a menos de 0.001 de distância) |
| **Melhor modelo (teste)** | XGBoost — AUC-ROC 0.7943 |
| **AUC-ROC** | 0.788–0.810 entre os 4 modelos (validação e teste) |
| **Acurácia** | 70–73% (validação), 70–71% (teste) |
| **Feature mais importante** | `DIFF_Win_Rate` e `DIFF_Weighted_Exp` |
| **Overfitting** | Mínimo — gap validação/teste ≈ 0.015–0.02 de AUC-ROC |

### Por que Gradient Boosting e XGBoost vencem?

1. **Relações não-lineares:** a combinação de vantagens em striking + grappling não é simplesmente aditiva
2. **Regularização natural:** learning rate baixo + muitas árvores pequenas funciona como freio contra overfitting
3. **Foco nos casos difíceis:** cada nova árvore corrige os erros da anterior

### Comparação prática

| Modelo | Pontos Fortes | Limitações |
|---|---|---|
| Regressão Logística | Rápido, interpretável, bem calibrado | Só captura relações lineares |
| Random Forest | Robusto, estável | Comprime probabilidades extremas |
| Gradient Boosting | Alta acurácia, captura interações complexas | Mais lento para treinar |
| XGBoost | Rápido, regularizado, escalável | Requer instalação separada |

---

## 8. Limitações e Próximos Passos

### O que o modelo não consegue capturar

- Condição física atual: lesões, fadiga, preparação específica
- Dinâmicas de estilo x estilo (ex.: wrestler vs striker)
- Fatores psicológicos: motivação, pressão, ambiente do evento
- Mudanças recentes: novo camp de treinamento, novo treinador

> 70–73% de acurácia é excelente para predição de MMA. Quem afirma acertar mais de 90% está exagerando.

### Melhorias futuras

- Estatísticas por luta recente (não só totais de carreira)
- Dados de camp de treinamento e coaching staff
- NLP em entrevistas pré-luta para detectar confiança/pressão
- Modelos de séries temporais para capturar trajetória de desempenho

---

## 9. Como usar

Direto no notebook:

```python
# Buscar lutador pelo nome
search_fighter("Conor")

# Prever resultado de uma luta
predict_fight("Conor McGregor", "Dustin Poirier", model=gb_best, weight_class="Lightweight")

# Comparar estatísticas dos dois lutadores
compare_fighters("Conor McGregor", "Dustin Poirier")

# Prever um card completo
predict_card(card_fights)
```

Ou pela aplicação web (mesma lógica, sem precisar abrir o Jupyter) — ver [seção 11](#11-aplicação-web).

---

## 10. Tecnologias

| Biblioteca | Uso |
|---|---|
| `pandas` / `numpy` | Manipulação e limpeza de dados |
| `matplotlib` / `seaborn` | Visualizações e gráficos |
| `scikit-learn` | Pipeline, modelos, métricas, busca de hiperparâmetros |
| `xgboost` | Gradient Boosting otimizado |
| `scipy` | Winsorização e estatísticas |

---

## 11. Aplicação Web

A lógica deste notebook foi extraída para um backend FastAPI e um frontend
Next.js, deployados juntos no Vercel via [Services](https://vercel.com/docs/services)
(mesmo domínio, sem CORS) — ver [`vercel.json`](vercel.json).

```
backend/
  main.py           # FastAPI: rotas /api/... chamando ml.predict.Predictor
  requirements.txt
  ml/
    data_prep.py    # limpeza + parsing (equivalente às células 2, 6, 11)
    features.py     # features DIFF_/compostas + augmentação (células 26-29)
    train.py        # treina os 4 modelos e salva artefatos em ml/artifacts/
    predict.py      # Predictor: search_fighter/predict_fight/compare_fighters/
                     #   predict_card — usado pelo main.py, sem I/O próprio
    artifacts/       # model.joblib, fighters.csv, fights.csv, ... (versionado)
web/
  src/app/          # Dashboard, /predict (prever + comparar), /statistics (Next.js App Router)
  src/lib/api.ts     # client HTTP para /api/... (mesmo domínio em produção)
vercel.json          # declara os 2 services (web/, backend/) e o roteamento
```

Rodar o treino localmente (regrava `backend/ml/artifacts/`, ~35 min em CPU
comum devido à busca de hiperparâmetros; não requer GPU — commitar o
resultado depois, veja [`backend/README.md`](backend/README.md)):

```bash
cd backend
pip install -r requirements.txt
python -m ml.train
```

Rodar frontend + backend juntos, como em produção:

```bash
npx vercel dev
```

Ou cada um separado — veja [`backend/README.md`](backend/README.md) e
[`web/README.md`](web/README.md) para detalhes e o contrato de API completo.
