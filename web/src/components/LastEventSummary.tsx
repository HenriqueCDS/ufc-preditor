"use client";

import { useEffect, useState } from "react";
import { AccuracyStat, LastEventFightRow } from "@/components/LastEventFightRow";
import { ApiError, getLastEvent } from "@/lib/api";
import { formatIsoDate } from "@/lib/format";
import type { LastEventResult } from "@/lib/types";

export function LastEventSummary() {
  const [data, setData] = useState<LastEventResult | null>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLastEvent()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao consultar a API."));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>
    );
  }
  if (data === undefined || data === null) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold">Último Evento</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {data.name ?? `Card de ${formatIsoDate(data.event_date)}`} · {formatIsoDate(data.event_date)}
          {data.location && ` · ${data.location}`}
        </p>
      </div>
      <AccuracyStat fights={data.fights} />
      <ol className="grid gap-3">
        {data.fights.map((fight) => (
          <LastEventFightRow key={`${fight.fighter1}-${fight.fighter2}`} fight={fight} />
        ))}
      </ol>
    </section>
  );
}
