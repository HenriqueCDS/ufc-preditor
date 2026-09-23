"use client";

import { Bar } from "react-chartjs-2";
import "./chart-setup";
import { CHART_GRID_COLOR, CHART_TEXT_COLOR, UFC_RED } from "./chart-setup";
import { MODEL_METRICS } from "@/data/model-metrics";

export function ModelComparisonChart() {
  const data = {
    labels: MODEL_METRICS.map((m) => m.label),
    datasets: [
      {
        label: "AUC-ROC (validacao)",
        data: MODEL_METRICS.map((m) => m.aucRocValidation),
        backgroundColor: UFC_RED,
        borderRadius: 6,
      },
    ],
  };

  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: CHART_TEXT_COLOR } },
          y: {
            min: 0.5,
            max: 1,
            grid: { color: CHART_GRID_COLOR },
            ticks: { color: CHART_TEXT_COLOR },
          },
        },
      }}
    />
  );
}
