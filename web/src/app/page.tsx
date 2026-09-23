import Link from "next/link";
import { ModelComparisonChart } from "@/components/charts/ModelComparisonChart";
import { BEST_MODEL_KEY, DATASET_SUMMARY, MODEL_METRICS } from "@/data/model-metrics";

export default function DashboardPage() {
  const bestModel = MODEL_METRICS.find((m) => m.key === BEST_MODEL_KEY)!;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">UFC Preditor</h1>
        <p className="mt-2 max-w-2xl text-neutral-400">
          Classificacao binaria treinada sobre dados historicos de UFC (1994-2026):
          dado um par de lutadores, o modelo estima a probabilidade de vitoria de cada um
          a partir de diferencas estatisticas de carreira (striking, grappling, experiencia).
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/predict"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Prever uma luta
          </Link>
          <Link
            href="/compare"
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
          >
            Comparar lutadores
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Lutadores" value={DATASET_SUMMARY.fighters.toLocaleString("pt-BR")} />
        <StatCard label="Lutas (aumentadas)" value={DATASET_SUMMARY.fightsAugmented.toLocaleString("pt-BR")} />
        <StatCard label="Features" value={String(DATASET_SUMMARY.featureCount)} />
        <StatCard
          label="Melhor modelo"
          value={bestModel.label}
          hint={`AUC-ROC ${bestModel.aucRocValidation.toFixed(3)}`}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-200">
          Comparacao de modelos (AUC-ROC, conjunto de validacao)
        </h2>
        <div className="h-72 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <ModelComparisonChart />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Snapshot do ultimo treino local (`python -m ml.train`). Acuracia no conjunto de
          teste: {(bestModel.aucRocTest * 100).toFixed(1)}% AUC-ROC.
        </p>
      </section>
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
