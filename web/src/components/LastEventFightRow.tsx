import Link from "next/link";
import { baseWeightClass, translateWeightClass } from "@/lib/weight-classes";
import type { LastEventFight, PredictFightResult } from "@/lib/types";

/** Linha de luta com previsao (feita ANTES do evento) x resultado real, e o
 * percentual de acerto do card inteiro. Compartilhado entre a secao
 * "Ultimo Evento" (`/events`) e a pagina do evento quando ele ja aconteceu
 * (`/events/[id]`). */

/** null quando nenhuma luta do card tem previsao pra comparar (todo mundo
 * era estreante, por exemplo). */
export function AccuracyStat({ fights }: { fights: LastEventFight[] }) {
  const evaluated = fights.filter((f) => f.correct !== null);
  if (evaluated.length === 0) return null;
  const hits = evaluated.filter((f) => f.correct).length;
  const misses = evaluated.length - hits;
  const pctHits = (hits / evaluated.length) * 100;
  const pctMisses = 100 - pctHits;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center gap-4">
        <span className="text-3xl font-bold tabular-nums text-neutral-100">{pctHits.toFixed(0)}%</span>
        <span className="text-sm text-neutral-400">
          de acerto do modelo neste card
          <br />
          {hits} de {evaluated.length} lutas previstas corretamente
        </span>
      </div>

      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-neutral-800">
        {hits > 0 && <div className="bg-green-600" style={{ width: `${pctHits}%` }} />}
        {misses > 0 && <div className="bg-red-600" style={{ width: `${pctMisses}%` }} />}
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-green-400">
          {hits} {hits === 1 ? "acerto" : "acertos"} ({pctHits.toFixed(0)}%)
        </span>
        <span className="text-red-400">
          {misses} {misses === 1 ? "erro" : "erros"} ({pctMisses.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

export function ResultBadge({ correct }: { correct: boolean | null }) {
  if (correct === null) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        correct ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      {correct ? "Modelo acertou" : "Modelo errou"}
    </span>
  );
}

function detailsHref(fight: LastEventFight, p: PredictFightResult): string {
  const params = new URLSearchParams({ f1: p.fighter1, f2: p.fighter2 });
  const wc = baseWeightClass(fight.weight_class);
  if (wc) params.set("wc", wc);
  return `/predict?${params.toString()}`;
}

export function LastEventFightRow({ fight }: { fight: LastEventFight }) {
  const p = fight.prediction;
  return (
    <li className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{translateWeightClass(fight.weight_class)}</span>
        <ResultBadge correct={fight.correct} />
      </div>

      <div className="mb-3 flex items-center justify-between gap-4 font-semibold">
        <span className={fight.result.winner === fight.fighter1 ? "text-green-400" : "text-neutral-500"}>
          {fight.fighter1}
        </span>
        <span className="text-xs font-normal text-neutral-500">vs</span>
        <span className={`text-right ${fight.result.winner === fight.fighter2 ? "text-green-400" : "text-neutral-500"}`}>
          {fight.fighter2}
        </span>
      </div>

      <p className="text-sm text-neutral-400">
        Resultado: <span className="font-semibold text-neutral-100">{fight.result.winner}</span> por{" "}
        {fight.result.method}
        {fight.result.round != null && ` (round ${fight.result.round})`}
      </p>

      {p ? (
        <>
          <p className="mt-2 text-sm text-neutral-400">
            Previsão do modelo (antes do evento):{" "}
            <span className="font-semibold text-neutral-100">{p.predicted_winner}</span> · Confiança{" "}
            {(p.confidence * 100).toFixed(1)}% ({p.confidence_level})
          </p>
          <Link
            href={detailsHref(fight, p)}
            className="mt-3 inline-block rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:border-red-600 hover:text-white"
          >
            Ver detalhes
          </Link>
        </>
      ) : (
        <p className="mt-2 rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-400">
          Sem previsão registrada: {fight.missing.join(" e ")} {fight.missing.length > 1 ? "eram" : "era"} lutador
          novo no UFC.
        </p>
      )}
    </li>
  );
}
