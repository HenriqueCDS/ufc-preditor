"use client";

import { Bar, Doughnut } from "react-chartjs-2";
import {
  CHART_GRID_COLOR,
  CHART_TEXT_COLOR,
  UFC_BLUE,
  UFC_GREEN,
  UFC_ORANGE,
  UFC_RED,
} from "./chart-setup";
import type { FighterRecord, FighterStatsResult } from "@/lib/types";

const xAxis = { grid: { display: false }, ticks: { color: CHART_TEXT_COLOR } };
const yAxis = {
  grid: { color: CHART_GRID_COLOR },
  ticks: { color: CHART_TEXT_COLOR, precision: 0 },
};
const legend = { position: "bottom" as const, labels: { color: CHART_TEXT_COLOR, boxWidth: 12 } };

const METHOD_GROUPS = [
  ["ko_tko", "KO/TKO"],
  ["submission", "Finalizacao"],
  ["decision", "Decisao"],
  ["other", "Outros"],
] as const;

export function MethodBreakdownChart({ record }: { record: FighterRecord }) {
  return (
    <Bar
      data={{
        labels: METHOD_GROUPS.map(([, label]) => label),
        datasets: [
          {
            label: "Vitorias",
            data: METHOD_GROUPS.map(([k]) => record.wins_by[k]),
            backgroundColor: UFC_GREEN,
            borderRadius: 4,
          },
          {
            label: "Derrotas",
            data: METHOD_GROUPS.map(([k]) => record.losses_by[k]),
            backgroundColor: UFC_RED,
            borderRadius: 4,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend },
        scales: { x: xAxis, y: yAxis },
      }}
    />
  );
}

export function ResultsByYearChart({ byYear }: { byYear: FighterStatsResult["by_year"] }) {
  return (
    <Bar
      data={{
        labels: byYear.map((r) => String(r.year)),
        datasets: [
          { label: "Vitorias", data: byYear.map((r) => r.wins), backgroundColor: UFC_GREEN },
          { label: "Derrotas", data: byYear.map((r) => r.losses), backgroundColor: UFC_RED },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend },
        scales: { x: { ...xAxis, stacked: true }, y: { ...yAxis, stacked: true } },
      }}
    />
  );
}

export function ShareDonutChart({
  labels,
  values,
}: {
  labels: string[];
  values: (number | null)[];
}) {
  return (
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data: values.map((v) => (v ?? 0) * 100),
            backgroundColor: [UFC_RED, UFC_BLUE, UFC_ORANGE],
            borderColor: "#0a0a0a",
            borderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
          legend,
          tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.toFixed(1)}%` } },
        },
      }}
    />
  );
}
