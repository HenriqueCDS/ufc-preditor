import { GeneralStats } from "@/components/statistics/GeneralStats";
import { StatisticsTabs } from "@/components/statistics/StatisticsTabs";

export const metadata = { title: "Estatísticas | UFC Preditor" };

export default function StatisticsPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Estatísticas</h1>
        <p className="mt-2 max-w-2xl text-neutral-400">
          Análise exploratória dos dados do UFC: visão geral do histórico e o desempenho
          detalhado de cada lutador.
        </p>
      </section>
      <StatisticsTabs general={<GeneralStats />} />
    </div>
  );
}
