"use client";

import { useState, type ReactNode } from "react";
import { FighterSearchInput } from "@/components/FighterSearchInput";
import {
  MethodBreakdownChart,
  ResultsByYearChart,
  ShareDonutChart,
} from "@/components/charts/FighterCharts";
import { ApiError, getFighterStats } from "@/lib/api";
import type { FighterStatsResult } from "@/lib/types";

const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);
const num = (n: number) => n.toLocaleString("pt-BR");
const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

export function FighterStats() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<FighterStatsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = query.trim().length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await getFighterStats(query.trim()));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Falha ao buscar estatisticas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <FighterSearchInput label="Lutador" value={query} onChange={setQuery} />
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Ver estatisticas"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!result && !error && (
        <p className="text-sm text-neutral-500">
          Busque um lutador para ver cartel, metodos de vitoria, striking, grappling e historico.
        </p>
      )}

      {result && <FighterReport data={result} />}
    </div>
  );
}

function FighterReport({ data }: { data: FighterStatsResult }) {
  const { record, striking, profile } = data;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl font-bold">{data.name}</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {profile.height_cm.toFixed(0)} cm &middot; alcance {profile.reach_cm.toFixed(0)} cm
          &middot; {profile.weight_lbs.toFixed(0)} lbs &middot; {profile.age.toFixed(0)} anos
        </p>
      </section>

      {record ? (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Cartel no UFC"
              value={`${record.wins}-${record.losses}`}
              hint={`${record.fights} lutas`}
            />
            <StatCard label="Taxa de vitorias" value={pct(record.win_rate)} />
            <StatCard
              label="Vitorias por finalizacao"
              value={pct(record.finish_rate)}
              hint="KO/TKO + finalizacao"
            />
            <StatCard
              label="Sequencia atual"
              value={String(record.current_streak)}
              hint={`melhor: ${record.best_streak}`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Como vence e como perde">
              <MethodBreakdownChart record={record} />
            </Panel>
            <Panel title="Resultados por ano">
              <ResultsByYearChart byYear={data.by_year} />
            </Panel>
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-400">
          Nenhuma luta com resultado definido na base do UFC; so ha as estatisticas de perfil.
        </p>
      )}

      <section>
        <h3 className="mb-1 text-lg font-semibold text-neutral-200">
          Posicao entre os lutadores
        </h3>
        <p className="mb-4 text-xs text-neutral-500">
          Percentil frente a lutadores com 3+ lutas (maior = melhor; em golpes recebidos, menos e
          melhor). Taxa de vitorias e total de lutas vem do perfil profissional, entao podem incluir
          lutas fora do UFC.
        </p>
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          {data.percentiles.map((p) => (
            <div
              key={p.key}
              className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[13rem_1fr_2.5rem]"
            >
              <span className="truncate text-neutral-300" title={p.label}>
                {p.label}
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-red-600"
                  style={{ width: `${p.percentile}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-neutral-400">
                {p.percentile.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {striking && (
        <>
          <section>
            <h3 className="mb-4 text-lg font-semibold text-neutral-200">
              Striking e grappling (totais no UFC)
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Golpes significativos"
                value={`${num(striking.sig_landed)}/${num(striking.sig_attempted)}`}
                hint={`${pct(striking.sig_accuracy)} de precisao`}
              />
              <StatCard
                label="Golpes absorvidos"
                value={num(striking.sig_absorbed)}
                hint={`${pct(striking.sig_defense)} de defesa`}
              />
              <StatCard label="Knockdowns" value={num(striking.knockdowns)} />
              <StatCard label="Duracao media" value={`${striking.avg_fight_min.toFixed(1)} min`} />
              <StatCard
                label="Quedas"
                value={`${striking.td_landed}/${striking.td_attempted}`}
                hint={`${pct(striking.td_accuracy)} de precisao`}
              />
              <StatCard label="Finalizacoes tentadas" value={num(striking.sub_attempts)} />
              <StatCard
                label="Controle por luta"
                value={clock(striking.control_avg_sec)}
                hint="tempo medio (min:seg)"
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Alvo dos golpes">
              <ShareDonutChart
                labels={["Cabeca", "Corpo", "Perna"]}
                values={[striking.targets.head, striking.targets.body, striking.targets.leg]}
              />
            </Panel>
            <Panel title="Posicao dos golpes">
              <ShareDonutChart
                labels={["Distancia", "Clinch", "Solo"]}
                values={[
                  striking.positions.distance,
                  striking.positions.clinch,
                  striking.positions.ground,
                ]}
              />
            </Panel>
          </div>
        </>
      )}

      {data.history.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-200">Ultimas lutas</h3>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-left text-neutral-400">
                <tr>
                  {["Data", "Adversario", "Resultado", "Metodo", "Round", "Categoria"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {data.history.map((f) => (
                  <tr key={`${f.date}-${f.opponent}`}>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-400">{f.date}</td>
                    <td className="px-3 py-2 text-neutral-200">{f.opponent}</td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        f.result === "W" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {f.result === "W" ? "Vitoria" : "Derrota"}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">{f.method}</td>
                    <td className="px-3 py-2 text-neutral-400">{f.round ?? "-"}</td>
                    <td className="px-3 py-2 text-neutral-400">{f.weight_class}</td>
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-neutral-200">{title}</h3>
      <div className="h-72 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        {children}
      </div>
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
