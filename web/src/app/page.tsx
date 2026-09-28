import Image from "next/image";
import Link from "next/link";
import { ModelComparisonChart } from "@/components/charts/ModelComparisonChart";
import { BEST_MODEL_KEY, DATASET_SUMMARY, MODEL_METRICS } from "@/data/model-metrics";
import { EDA_STATS } from "@/data/eda-stats";
import banner from "@/assets/banner_dash_bord.jpg";

const PIPELINE_STEPS = [
  {
    title: "Definição do problema",
    text: "Classificação binária: dado um par de lutadores, qual deles vence? Target 1 quando o Lutador 1 ganha e 0 quando o Lutador 2 ganha.",
  },
  {
    title: "Limpeza dos dados",
    text: "Conversão de unidades (altura e alcance para cm, percentuais para decimais), preenchimento de ausentes pela mediana e winsorização dos outliers (percentis 1% e 99%).",
  },
  {
    title: "Engenharia de features",
    text: "Features diferenciais (Lutador 1 - Lutador 2) mais variáveis compostas de striking, grappling e experiência, garantindo invariância de posição.",
  },
  {
    title: "Treino e avaliação",
    text: "Divisão cronológica 70/15/15 (treino nas lutas mais antigas, teste nas mais recentes) e comparação de quatro modelos com acurácia, precisão, recall, F1 e AUC-ROC como métrica principal.",
  },
];

const MODELS = [
  { name: "Regressão Logística", text: "Pesos lineares por feature. Simples, rápida e a mais bem calibrada." },
  { name: "Random Forest", text: "Centenas de árvores independentes combinadas por votação." },
  { name: "Gradient Boosting", text: "Árvores em sequência, cada uma corrigindo os erros da anterior." },
  { name: "XGBoost", text: "Boosting otimizado, com regularização embutida. Melhor AUC-ROC." },
];

export default function DashboardPage() {
  const bestModel = MODEL_METRICS.find((m) => m.key === BEST_MODEL_KEY)!;

  return (
    <div className="flex flex-col">
      {/* Banner (full-bleed) */}
      <section className="relative -mt-8 ml-[calc(50%-50vw)] flex w-screen items-end overflow-hidden sm:min-h-[32rem]">
        {/* Mobile: image is a strip above the text (the art has its own logo). */}
        <div className="absolute inset-x-0 top-0 h-72 sm:inset-0 sm:h-auto">
        <Image
          src={banner}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-neutral-950/20" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-12 pt-64 sm:pb-16 sm:pt-0">
          <h1 className="text-6xl font-extrabold sm:text-8xl">
            UFC <span className="text-red-600">Preditor</span>
          </h1>
          <p className="mt-4 max-w-xl border-l-4 border-red-600 pl-4 text-base text-neutral-200 sm:text-lg">
            Descubra quem tem a vantagem antes do gongo. Um modelo treinado com mais de
            30 anos de histórico do UFC estima a probabilidade de vitória de cada lutador.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/predict"
              className="bg-red-600 px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-white transition hover:bg-red-500"
            >
              Prever e comparar lutadores
            </Link>
            <a
              href="#sobre"
              className="border-2 border-neutral-300 px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-neutral-100 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              Sobre o projeto
            </a>
          </div>
        </div>
      </section>

      {/* Numeros */}
      <section className="-mt-2 grid grid-cols-2 gap-4 pt-8 sm:grid-cols-4">
        <StatCard label="Lutadores" value={DATASET_SUMMARY.fighters.toLocaleString("pt-BR")} />
        <StatCard label="Lutas (aumentadas)" value={DATASET_SUMMARY.fightsAugmented.toLocaleString("pt-BR")} />
        <StatCard label="Features" value={String(DATASET_SUMMARY.featureCount)} />
        <StatCard
          label="Melhor modelo"
          value={bestModel.label}
          hint={`AUC-ROC ${bestModel.aucRocValidation.toFixed(3)} (validação)`}
        />
      </section>

      {/* Sobre o projeto */}
      <section id="sobre" className="scroll-mt-8 pt-20">
        <h2 className="text-3xl font-bold sm:text-5xl">
          Um pipeline completo de Machine Learning
        </h2>
        <p className="mt-4 max-w-3xl text-neutral-400">
          O UFC é a maior organização de MMA do mundo e toda luta termina com um único
          vencedor. Este projeto nasceu na disciplina de Python Aplicado a Machine Learning
          com uma hipótese simples: a diferença entre as estatísticas de carreira de dois
          lutadores é um bom preditor de quem vai vencer. Os dados vêm de{" "}
          <strong className="text-neutral-200">
            {EDA_STATS.summary.fights.toLocaleString("pt-BR")} lutas
          </strong>{" "}
          e{" "}
          <strong className="text-neutral-200">
            {EDA_STATS.summary.fighters.toLocaleString("pt-BR")} lutadores
          </strong>{" "}
          registrados no ufcstats.com entre {EDA_STATS.summary.yearFrom} e{" "}
          {EDA_STATS.summary.yearTo}, e cobrem atributos físicos (altura, alcance),
          técnicos (golpes por minuto, precisão, quedas) e históricos (taxa de vitórias,
          número de lutas).
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {PIPELINE_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5"
            >
              <span className="font-display text-5xl font-extrabold leading-none text-red-600">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-neutral-100">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-400">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-14 text-lg font-semibold text-neutral-200">Modelos comparados</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((m) => (
            <div key={m.name} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <p className="font-semibold text-neutral-100">{m.name}</p>
              <p className="mt-1 text-sm text-neutral-400">{m.text}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-14 mb-1 text-lg font-semibold text-neutral-200">
          Comparação de modelos
        </h3>
        <p className="mb-4 max-w-3xl text-sm text-neutral-400">
          AUC-ROC em validação e teste, e acurácia em validação, para os quatro modelos
          treinados sobre o mesmo conjunto de dados.
        </p>
        <div className="h-80 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <ModelComparisonChart />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Snapshot do último treino local (`python -m ml.train`). Melhor modelo:{" "}
          {bestModel.label}, com {(bestModel.aucRocTest * 100).toFixed(1)}% de AUC-ROC no teste.
        </p>

        {/* Dados usados na comparacao */}
        <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-100">
            Quais dados alimentam essa comparação?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Todos os modelos recebem exatamente as mesmas entradas e são avaliados nas mesmas
            fatias de dados, então a diferença entre as barras vem só do algoritmo.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <DataBlock title="1. Origem">
              Histórico de lutas e de lutadores do ufcstats.com (1994-2026): resultado,
              golpes, quedas e finalizações de cada luta, mais altura, alcance e idade de
              cada lutador. Lutas sem vencedor (empate, no contest) são removidas.
            </DataBlock>
            <DataBlock title="2. Entradas do modelo">
              Não usamos as estatísticas de cada lutador isoladamente, e sim a{" "}
              <strong className="text-neutral-200">diferença</strong> entre eles (Lutador 1 -
              Lutador 2), como DIFF_SLpM. Taxa de vitórias, golpes/min, defesa, quedas e
              sequência de vitórias são recalculados por luta, usando só o cartel do lutador{" "}
              <em>antes</em> daquela luta -- nunca as estatísticas atuais, para não vazar
              resultados que só aconteceram depois. Ao todo são{" "}
              {DATASET_SUMMARY.featureCount} features, mais a categoria de peso.
            </DataBlock>
            <DataBlock title="3. Alvo e balanceamento">
              O alvo é binário: 1 se o Lutador 1 venceu, 0 se foi o Lutador 2. Cada luta
              também entra espelhada (Lutador 2 vs Lutador 1), o que dobra a base para{" "}
              {DATASET_SUMMARY.fightsAugmented.toLocaleString("pt-BR")} linhas e deixa as classes
              50/50, de modo que o resultado não dependa da ordem dos nomes.
            </DataBlock>
          </div>

          <h4 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Como os dados são divididos
          </h4>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <Split pct="70%" label="Treino" text="O modelo aprende os padrões" />
            <Split pct="15%" label="Validação" text="Compara e ajusta os modelos" />
            <Split pct="15%" label="Teste" text="Nota final, dados nunca vistos" />
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Divisão cronológica por data da luta: o modelo treina só com o passado e é
            validado/testado com lutas futuras em relação ao treino, nunca o contrário.
          </p>

          <h4 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-300">
            O que cada métrica do gráfico significa
          </h4>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-neutral-100">AUC-ROC (métrica principal)</dt>
              <dd className="mt-1 text-neutral-400">
                Mede o quanto o modelo separa quem vence de quem perde considerando todos os
                limiares de decisão. 50% equivale a chutar e 100% é perfeito. Por isso é a
                métrica escolhida para ranquear os modelos.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-100">Acurácia</dt>
              <dd className="mt-1 text-neutral-400">
                Percentual de lutas em que o modelo apontou o vencedor correto. Em cada 10
                lutas, quantas ele acertou.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-100">Barra de validação</dt>
              <dd className="mt-1 text-neutral-400">
                Calculada nos 15% de dados usados para comparar e escolher o melhor modelo.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-100">Barra de teste</dt>
              <dd className="mt-1 text-neutral-400">
                Calculada nos 15% que o modelo nunca viu. Valores próximos aos de validação
                indicam que não houve overfitting.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function DataBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-red-400">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">{children}</p>
    </div>
  );
}

function Split({ pct, label, text }: { pct: string; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
      <p className="text-2xl font-bold text-neutral-100">{pct}</p>
      <p className="text-sm font-semibold text-red-400">{label}</p>
      <p className="mt-1 text-xs text-neutral-500">{text}</p>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-100">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
