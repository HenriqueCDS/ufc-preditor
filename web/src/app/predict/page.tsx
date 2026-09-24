"use client";

import { useState } from "react";
import { FighterSearchInput } from "@/components/FighterSearchInput";
import { FighterComparison } from "@/components/FighterComparison";
import { WinProbabilityChart } from "@/components/charts/WinProbabilityChart";
import { translateWeightClass } from "@/lib/weight-classes";
import { ApiError, compareFighters, predictFight } from "@/lib/api";
import type { CompareFightersResult, PredictFightResult } from "@/lib/types";

const WEIGHT_CLASSES = [
  "Strawweight",
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
  "Super Heavyweight",
];

export default function PredictPage() {
  const [fighter1, setFighter1] = useState("");
  const [fighter2, setFighter2] = useState("");
  const [weightClass, setWeightClass] = useState("Lightweight");
  const [result, setResult] = useState<PredictFightResult | null>(null);
  const [comparison, setComparison] = useState<CompareFightersResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fighter1.trim().length > 0 && fighter2.trim().length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    // Independent calls: one failing must not hide the other's result.
    const [prediction, comparisonResult] = await Promise.allSettled([
      predictFight({ fighter1, fighter2, weightClass }),
      compareFighters(fighter1, fighter2),
    ]);
    setResult(prediction.status === "fulfilled" ? prediction.value : null);
    setComparison(comparisonResult.status === "fulfilled" ? comparisonResult.value : null);

    const failures = [prediction, comparisonResult].flatMap((r) =>
      r.status === "rejected"
        ? [r.reason instanceof ApiError ? r.reason.message : "Falha ao consultar a API."]
        : []
    );
    setError(failures.length > 0 ? [...new Set(failures)].join(" ") : null);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Prever Luta</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Escolha os dois lutadores e a categoria de peso para estimar o vencedor e ver a comparacao de estatisticas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <FighterSearchInput label="Lutador 1" value={fighter1} onChange={setFighter1} />
        <FighterSearchInput label="Lutador 2" value={fighter2} onChange={setFighter2} />

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-300">Categoria de peso</label>
          <select
            value={weightClass}
            onChange={(e) => setWeightClass(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            {WEIGHT_CLASSES.map((wc) => (
              <option key={wc} value={wc}>
                {translateWeightClass(wc)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Calculando..." : "Prever resultado"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              Vencedor previsto: <span className="text-red-500">{result.predicted_winner}</span>
            </h2>
            <span className="text-sm text-neutral-400">
              Confianca: {(result.confidence * 100).toFixed(1)}% ({result.confidence_level})
            </span>
          </div>
          <div className="h-40">
            <WinProbabilityChart result={result} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-neutral-400 sm:grid-cols-4">
            <div>
              <dt className="text-neutral-500">Streak {result.fighter1}</dt>
              <dd className="text-neutral-200">{result.streak_f1} vitorias</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Streak {result.fighter2}</dt>
              <dd className="text-neutral-200">{result.streak_f2} vitorias</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-neutral-500">Categoria</dt>
              <dd className="text-neutral-200">{translateWeightClass(result.weight_class)}</dd>
            </div>
          </dl>
        </section>
      )}

      {comparison && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Comparacao entre os lutadores</h2>
          <FighterComparison result={comparison} />
        </section>
      )}
    </div>
  );
}
