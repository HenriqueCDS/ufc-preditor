"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { ApiError, getUpcomingEvents } from "@/lib/api";
import { formatIsoDate, formatTimestamp } from "@/lib/format";
import type { UpcomingEventsResult } from "@/lib/types";

export default function EventsPage() {
  const [data, setData] = useState<UpcomingEventsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUpcomingEvents()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao consultar a API."));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Proximos Eventos</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Escolha um card para ver a previsao de cada luta.
          {data?.scraped_at && ` Atualizado em ${formatTimestamp(data.scraped_at)}.`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>
      )}
      {!data && !error && <LoadingState message="Carregando proximos eventos..." />}
      {data && data.events.length === 0 && (
        <p className="text-sm text-neutral-400">Nenhum evento futuro disponivel no momento.</p>
      )}

      <ul className="grid gap-3">
        {data?.events.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-red-600"
            >
              <div className="min-w-0">
                <h2 className="font-semibold">{event.name}</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {formatIsoDate(event.date)} · {event.location}
                </p>
              </div>
              <span className="shrink-0 text-sm text-neutral-400">
                {event.fights_count} {event.fights_count === 1 ? "luta" : "lutas"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
