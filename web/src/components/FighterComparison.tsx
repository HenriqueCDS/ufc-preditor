import { RadarComparisonChart } from "@/components/charts/RadarComparisonChart";
import type { CompareFightersResult } from "@/lib/types";

export function FighterComparison({ result }: { result: CompareFightersResult }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="mb-2 flex justify-between gap-2 text-sm text-neutral-400">
          <span className="text-red-500">{result.fighter1}</span>
          <span className="text-blue-400">{result.fighter2}</span>
        </div>
        <div className="h-80">
          <RadarComparisonChart result={result} />
        </div>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Vantagens: {result.fighter1} {result.advantage_f1}/12 &middot; {result.fighter2}{" "}
          {result.advantage_f2}/12
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Estatistica</th>
              <th className="px-3 py-2 text-right font-medium text-red-500">{result.fighter1}</th>
              <th className="px-3 py-2 text-right font-medium text-blue-400">{result.fighter2}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {result.stats.map((stat) => (
              <tr key={stat.key} title={stat.explanation}>
                <td className="px-3 py-2 text-neutral-300">{stat.label}</td>
                <td
                  className={`px-3 py-2 text-right ${
                    stat.winner === 1 ? "font-semibold text-red-400" : "text-neutral-400"
                  }`}
                >
                  {stat.value_f1.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    stat.winner === 2 ? "font-semibold text-blue-400" : "text-neutral-400"
                  }`}
                >
                  {stat.value_f2.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
