import type { ReactNode } from "react";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import {
  MethodsByPeriodChart,
  MethodsDonutChart,
  StrikingScatterChart,
  TargetBalanceChart,
  TimelineChart,
  WeightClassChart,
} from "@/components/charts/EdaCharts";
import { EDA_STATS, STAT_LABELS } from "@/data/eda-stats";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function GeneralStats() {
  const { summary, describe } = EDA_STATS;
  const decisions = Object.entries(EDA_STATS.methods)
    .filter(([m]) => m.startsWith("Decision"))
    .reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Lutas validas" value={fmt(summary.fights)} />
        <StatCard label="Lutadores" value={fmt(summary.fighters)} />
        <StatCard label="Periodo" value={`${summary.yearFrom}-${summary.yearTo}`} />
        <StatCard
          label="Decisoes dos juizes"
          value={`${((decisions / summary.fights) * 100).toFixed(1)}%`}
          hint="das lutas terminam nos pontos"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Balanceamento do alvo"
          note={`O lutador 1 vence ${(summary.fighter1WinRate * 100).toFixed(1)}% das lutas: a ordem dos lutadores nao e aleatoria no dado bruto. Por isso o treino usa diferencas (F1 - F2) e aumento por espelhamento.`}
        >
          <TargetBalanceChart />
        </ChartCard>
        <ChartCard title="Metodos de vitoria (top 8)">
          <MethodsDonutChart />
        </ChartCard>
        <ChartCard title="Lutas por categoria de peso">
          <WeightClassChart />
        </ChartCard>
        <ChartCard title="Metodos por quinquenio (top 4)" note="Decisao unanime, KO/TKO, finalizacao e decisao dividida.">
          <MethodsByPeriodChart />
        </ChartCard>
      </div>

      <ChartCard title="Volume de lutas por ano" tall>
        <TimelineChart />
      </ChartCard>

      <ChartCard
        title="Golpes desferidos x sofridos por perfil de desempenho"
        note="Cada ponto e um lutador. Acima da diagonal, sofre mais do que acerta. Perfil definido pela taxa de vitorias."
        tall
      >
        <StrikingScatterChart />
      </ChartCard>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-200">
          Correlacao entre estatisticas dos lutadores
        </h2>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <CorrelationHeatmap />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Vermelho = correlacao positiva, azul = negativa (Pearson).
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-200">Estatisticas descritivas</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/50">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Metrica</th>
                {["Media", "Desvio", "Min", "Mediana", "Max"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(describe).map(([key, s]) => (
                <tr key={key} className="border-t border-neutral-800">
                  <td className="px-4 py-2 text-neutral-300">{STAT_LABELS[key] ?? key}</td>
                  {[s.mean, s.std, s.min, s["50%"], s.max].map((v, i) => (
                    <td key={i} className="px-4 py-2 text-right tabular-nums text-neutral-400">
                      {v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Lutadores apos imputacao pela mediana e winsorizacao (1%-99%). Snapshot gerado por
          `python -m ml.eda`.
        </p>
      </section>
    </div>
  );
}

function ChartCard({
  title,
  note,
  tall,
  children,
}: {
  title: string;
  note?: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-neutral-200">{title}</h2>
      <div
        className={`rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 ${tall ? "h-96" : "h-72"}`}
      >
        {children}
      </div>
      {note && <p className="mt-2 text-xs text-neutral-500">{note}</p>}
    </section>
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
