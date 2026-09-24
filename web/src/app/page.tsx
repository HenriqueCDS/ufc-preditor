import Image from "next/image";
import Link from "next/link";
import { ModelComparisonChart } from "@/components/charts/ModelComparisonChart";
import { BEST_MODEL_KEY, DATASET_SUMMARY, MODEL_METRICS } from "@/data/model-metrics";
import banner from "@/assets/banner_dash_bord.jpg";

const PIPELINE_STEPS = [
  {
    title: "Definicao do problema",
    text: "Classificacao binaria: dado um par de lutadores, qual deles vence? Target 1 quando o Lutador 1 ganha e 0 quando o Lutador 2 ganha.",
  },
  {
    title: "Limpeza dos dados",
    text: "Conversao de unidades (altura e alcance para cm, percentuais para decimais), preenchimento de ausentes pela mediana e winsorizacao dos outliers (percentis 1% e 99%).",
  },
  {
    title: "Engenharia de features",
    text: "Features diferenciais (Lutador 1 - Lutador 2) mais variaveis compostas de striking, grappling e experiencia, garantindo invariancia de posicao.",
  },
  {
    title: "Treino e avaliacao",
    text: "Divisao estratificada 70/15/15 e comparacao de quatro modelos com acuracia, precisao, recall, F1 e AUC-ROC como metrica principal.",
  },
];

const MODELS = [
  { name: "Regressao Logistica", text: "Pesos lineares por feature. Simples, rapida e a mais bem calibrada." },
  { name: "Random Forest", text: "Centenas de arvores independentes combinadas por votacao." },
  { name: "Gradient Boosting", text: "Arvores em sequencia, cada uma corrigindo os erros da anterior." },
  { name: "XGBoost", text: "Boosting otimizado, com regularizacao embutida. Melhor AUC-ROC." },
];

export default function DashboardPage() {
  const bestModel = MODEL_METRICS.find((m) => m.key === BEST_MODEL_KEY)!;

  return (
    <div className="flex flex-col">
      {/* Banner (full-bleed) */}
      <section className="relative -mt-8 ml-[calc(50%-50vw)] flex min-h-[26rem] w-screen items-end overflow-hidden sm:min-h-[32rem]">
        <Image
          src={banner}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-neutral-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 via-transparent to-transparent" />

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-12 sm:pb-16">
          <span className="inline-block rounded-full border border-red-600/50 bg-red-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-red-400">
            Machine Learning &middot; MMA
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl">
            UFC <span className="text-red-600">Preditor</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-neutral-300 sm:text-lg">
            Descubra quem tem a vantagem antes do gongo. Um modelo treinado com mais de
            30 anos de historico do UFC estima a probabilidade de vitoria de cada lutador.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/predict"
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500"
            >
              Prever e comparar lutadores
            </Link>
            <a
              href="#sobre"
              className="rounded-lg border border-neutral-600 bg-neutral-950/40 px-5 py-2.5 text-sm font-semibold text-neutral-200 backdrop-blur transition hover:border-neutral-400"
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
          hint={`AUC-ROC ${bestModel.aucRocValidation.toFixed(3)}`}
        />
      </section>

      {/* Sobre o projeto */}
      <section id="sobre" className="scroll-mt-8 pt-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Sobre o projeto</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Um pipeline completo de Machine Learning
        </h2>
        <p className="mt-4 max-w-3xl text-neutral-400">
          O UFC e a maior organizacao de MMA do mundo e toda luta termina com um unico
          vencedor. Este projeto nasceu na disciplina de Python Aplicado a Machine Learning
          com uma hipotese simples: a diferenca entre as estatisticas de carreira de dois
          lutadores e um bom preditor de quem vai vencer. Os dados vem de{" "}
          <strong className="text-neutral-200">8.551 lutas</strong> e{" "}
          <strong className="text-neutral-200">4.455 lutadores</strong> registrados no
          ufcstats.com entre 1994 e 2026, e cobrem atributos fisicos (altura, alcance),
          tecnicos (golpes por minuto, precisao, quedas) e historicos (taxa de vitorias,
          numero de lutas).
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {PIPELINE_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600/15 text-sm font-bold text-red-400">
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
          Comparacao de modelos
        </h3>
        <p className="mb-4 max-w-3xl text-sm text-neutral-400">
          AUC-ROC em validacao e teste, e acuracia em validacao, para os quatro modelos
          treinados sobre o mesmo conjunto de dados.
        </p>
        <div className="h-80 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <ModelComparisonChart />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Snapshot do ultimo treino local (`python -m ml.train`). Melhor modelo:{" "}
          {bestModel.label}, com {(bestModel.aucRocTest * 100).toFixed(1)}% de AUC-ROC no teste.
        </p>

        {/* Dados usados na comparacao */}
        <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-100">
            Quais dados alimentam essa comparacao?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Todos os modelos recebem exatamente as mesmas entradas e sao avaliados nas mesmas
            fatias de dados, entao a diferenca entre as barras vem so do algoritmo.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <DataBlock title="1. Origem">
              Historico de lutas e de lutadores do ufcstats.com (1994-2026): estatisticas de
              carreira como golpes por minuto, precisao, defesa, quedas, finalizacoes, altura,
              alcance, idade e taxa de vitorias. Lutas sem vencedor (empate, no contest) sao
              removidas.
            </DataBlock>
            <DataBlock title="2. Entradas do modelo">
              Nao usamos as estatisticas de cada lutador isoladamente, e sim a{" "}
              <strong className="text-neutral-200">diferenca</strong> entre eles (Lutador 1 -
              Lutador 2), como DIFF_SLpM. Somam-se variaveis compostas: eficiencia de striking,
              controle de grappling, experiencia ponderada e sequencia de vitorias
              (calculada so com lutas anteriores, sem vazar o futuro). Ao todo sao{" "}
              {DATASET_SUMMARY.featureCount} features, mais a categoria de peso.
            </DataBlock>
            <DataBlock title="3. Alvo e balanceamento">
              O alvo e binario: 1 se o Lutador 1 venceu, 0 se foi o Lutador 2. Cada luta
              tambem entra espelhada (Lutador 2 vs Lutador 1), o que dobra a base para{" "}
              {DATASET_SUMMARY.fightsAugmented.toLocaleString("pt-BR")} linhas e deixa as classes
              50/50, de modo que o resultado nao dependa da ordem dos nomes.
            </DataBlock>
          </div>

          <h4 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Como os dados sao divididos
          </h4>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <Split pct="70%" label="Treino" text="O modelo aprende os padroes" />
            <Split pct="15%" label="Validacao" text="Compara e ajusta os modelos" />
            <Split pct="15%" label="Teste" text="Nota final, dados nunca vistos" />
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Divisao estratificada, com a mesma proporcao de vitorias em cada conjunto.
          </p>

          <h4 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-300">
            O que cada metrica do grafico significa
          </h4>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-neutral-100">AUC-ROC (metrica principal)</dt>
              <dd className="mt-1 text-neutral-400">
                Mede o quanto o modelo separa quem vence de quem perde considerando todos os
                limiares de decisao. 50% equivale a chutar e 100% e perfeito. Por isso e a
                metrica escolhida para ranquear os modelos.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-100">Acuracia</dt>
              <dd className="mt-1 text-neutral-400">
                Percentual de lutas em que o modelo apontou o vencedor correto. Em cada 10
                lutas, quantas ele acertou.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-100">Barra de validacao</dt>
              <dd className="mt-1 text-neutral-400">
                Calculada nos 15% de dados usados para comparar e escolher o melhor modelo.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-100">Barra de teste</dt>
              <dd className="mt-1 text-neutral-400">
                Calculada nos 15% que o modelo nunca viu. Valores proximos aos de validacao
                indicam que nao houve overfitting.
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
