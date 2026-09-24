"use client";

import { Bar } from "react-chartjs-2";
import "./chart-setup";
import { CHART_GRID_COLOR, CHART_TEXT_COLOR, UFC_RED } from "./chart-setup";
import { MODEL_METRICS } from "@/data/model-metrics";

const NEUTRAL_BAR = "#737373";
const LIGHT_BAR = "#d4d4d4";

export function ModelComparisonChart() {
  const data = {
    labels: MODEL_METRICS.map((m) => m.label),
    datasets: [
      {
        label: "AUC-ROC (validacao)",
        data: MODEL_METRICS.map((m) => m.aucRocValidation),
        backgroundColor: UFC_RED,
        borderRadius: 4,
      },
      {
        label: "AUC-ROC (teste)",
        data: MODEL_METRICS.map((m) => m.aucRocTest),
        backgroundColor: NEUTRAL_BAR,
        borderRadius: 4,
      },
      {
        label: "Acuracia (validacao)",
        data: MODEL_METRICS.map((m) => m.accuracyValidation),
        backgroundColor: LIGHT_BAR,
        borderRadius: 4,
      },
    ],
  };

  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: CHART_TEXT_COLOR, boxWidth: 12, boxHeight: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${(Number(ctx.raw) * 100).toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_TEXT_COLOR } },
          y: {
            min: 0.6,
            max: 0.9,
            grid: { color: CHART_GRID_COLOR },
            ticks: {
              color: CHART_TEXT_COLOR,
              callback: (v) => `${(Number(v) * 100).toFixed(0)}%`,
            },
          },
        },
      }}
    />
  );
}
