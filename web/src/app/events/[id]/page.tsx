"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { ApiError, getEventCard } from "@/lib/api";
import { formatIsoDate, formatTimestamp } from "@/lib/format";
import { baseWeightClass, translateWeightClass } from "@/lib/weight-classes";
import type { EventCardResult, EventFight, PredictFightResult } from "@/lib/types";

function ProbabilityBar({ prob1 }: { prob1: number }) {
  const pct1 = prob1 * 100;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-800">
        <div className="bg-red-600" style={{ width: `${pct1}%` }} />
        <div className="bg-blue-600" style={{ width: `${100 - pct1}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-neutral-400">
        <span>{pct1.toFixed(1)}%</span>
        <span>{(100 - pct1).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function detailsHref(fight: EventFight, p: PredictFightResult): string {
  // Dataset spellings (from the prediction), not the ufcstats ones, so the
  // fighter inputs match the search list exactly.
  const params = new URLSearchParams({ f1: p.fighter1, f2: p.fighter2 });
  const wc = baseWeightClass(fight.weight_class);
  if (wc) params.set("wc", wc);
  return `/predict?${params.toString()}`;
}

function NewBadge() {
  return (
    <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-400">
      Lutador novo
    </span>
  );
}

function FightRow({ fight }: { fight: EventFight }) {
  const p = fight.prediction;
  return (
    <li className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{translateWeightClass(fight.weight_class)}</span>
        {fight.title_bout && <span className="font-semibold text-yellow-500">Disputa de cinturao</span>}
      </div>

      <div className="mb-3 flex items-center justify-between gap-4 font-semibold">
        <span className={p && p.predicted_winner === fight.fighter1 ? "text-red-500" : ""}>
          {fight.fighter1}
          {fight.missing.includes(fight.fighter1) && <NewBadge />}
        </span>
        <span className="text-xs font-normal text-neutral-500">vs</span>
        <span className={`text-right ${p && p.predicted_winner === fight.fighter2 ? "text-blue-500" : ""}`}>
          {fight.missing.includes(fight.fighter2) && <NewBadge />}
          {fight.fighter2}
        </span>
      </div>

      {p ? (
        <>
          <ProbabilityBar prob1={p.prob_fighter1} />
          <p className="mt-3 text-sm text-neutral-400">
            Vencedor previsto: <span className="font-semibold text-neutral-100">{p.predicted_winner}</span> ·
            Confianca {(p.confidence * 100).toFixed(1)}% ({p.confidence_level})
          </p>
          <Link
            href={detailsHref(fight, p)}
            className="mt-3 inline-block rounded-lg border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:border-red-600 hover:text-white"
          >
            Ver detalhes
          </Link>
        </>
      ) : (
        <p className="rounded-lg border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-400">
          Sem dados para previsao: {fight.missing.join(" e ")} {fight.missing.length > 1 ? "sao lutadores novos" : "e lutador novo"} no UFC.
        </p>
      )}
    </li>
  );
}

export default function EventCardPage() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<EventCardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEventCard(id)
      .then(setCard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao consultar a API."));
  }, [id]);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/events" className="text-sm text-neutral-400 transition hover:text-neutral-100">
        &larr; Proximos eventos
      </Link>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>
      )}
      {!card && !error && <LoadingState message="Calculando as previsoes do card..." />}

      {card && (
        <>
          <div>
            <h1 className="text-2xl font-bold">{card.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {formatIsoDate(card.date)} · {card.location}
              {card.scraped_at && ` · card atualizado em ${formatTimestamp(card.scraped_at)}`}
            </p>
          </div>

          {card.fights.length === 0 ? (
            <p className="text-sm text-neutral-400">O card desse evento ainda nao foi divulgado.</p>
          ) : (
            <ol className="grid gap-3">
              {card.fights.map((fight) => (
                <FightRow key={`${fight.fighter1}-${fight.fighter2}`} fight={fight} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
