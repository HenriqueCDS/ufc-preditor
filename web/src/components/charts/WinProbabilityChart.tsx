"use client";

import { Bar } from "react-chartjs-2";
import "./chart-setup";
import { CHART_GRID_COLOR, CHART_TEXT_COLOR, UFC_BLUE, UFC_RED } from "./chart-setup";
import type { PredictFightResult } from "@/lib/types";

export function WinProbabilityChart({ result }: { result: PredictFightResult }) {
  const data = {
    labels: [result.fighter1, result.fighter2],
    datasets: [
      {
        label: "Probabilidade de vitoria",
        data: [result.prob_fighter1 * 100, result.prob_fighter2 * 100],
        backgroundColor: [UFC_RED, UFC_BLUE],
        borderRadius: 6,
      },
    ],
  };

  return (
    <Bar
      data={data}
      options={{
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.formattedValue}%`,
            },
          },
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: CHART_GRID_COLOR },
            ticks: { color: CHART_TEXT_COLOR, callback: (v) => `${v}%` },
          },
          y: {
            grid: { display: false },
            ticks: { color: CHART_TEXT_COLOR },
          },
        },
      }}
    />
  );
}
