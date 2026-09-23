"use client";

import { useState } from "react";
import { FighterSearchInput } from "@/components/FighterSearchInput";
import { RadarComparisonChart } from "@/components/charts/RadarComparisonChart";
import { ApiError, compareFighters } from "@/lib/api";
import type { CompareFightersResult } from "@/lib/types";

export default function ComparePage() {
  const [fighter1, setFighter1] = useState("");
  const [fighter2, setFighter2] = useState("");
  const [result, setResult] = useState<CompareFightersResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fighter1.trim().length > 0 && fighter2.trim().length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await compareFighters(fighter1, fighter2);
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Falha ao comparar lutadores.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Comparar Lutadores</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Veja lado a lado as estatisticas de carreira de dois lutadores.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <FighterSearchInput label="Lutador 1" value={fighter1} onChange={setFighter1} />
        <FighterSearchInput label="Lutador 2" value={fighter2} onChange={setFighter2} />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Comparando..." : "Comparar"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="mb-2 flex justify-between text-sm text-neutral-400">
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

          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <table className="w-full text-sm">
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
      )}
    </div>
  );
}
