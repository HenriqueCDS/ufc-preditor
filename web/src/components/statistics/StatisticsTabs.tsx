"use client";

import { useState, type ReactNode } from "react";
import { FighterStats } from "./FighterStats";

const TABS = [
  { key: "general", label: "Geral" },
  { key: "fighter", label: "Por lutador" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// `general` is a server-rendered node; both panels stay mounted so switching
// tabs keeps the selected fighter and doesn't refetch.
export function StatisticsTabs({ general }: { general: ReactNode }) {
  const [tab, setTab] = useState<TabKey>("general");

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" className="flex gap-1 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "border-red-600 text-neutral-100"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "general"}>{general}</div>
      <div hidden={tab !== "fighter"}>
        <FighterStats />
      </div>
    </div>
  );
}
