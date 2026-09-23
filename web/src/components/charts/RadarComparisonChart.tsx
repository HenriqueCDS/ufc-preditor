"use client";

import { Radar } from "react-chartjs-2";
import "./chart-setup";
import { CHART_GRID_COLOR, CHART_TEXT_COLOR, UFC_BLUE, UFC_RED } from "./chart-setup";
import type { CompareFightersResult } from "@/lib/types";

/**
 * Stats live on very different scales (Win_Rate is 0-1, Total_Fights can be
 * 30+), so the radar plots each stat's *relative share* between the two
 * fighters (0-100, 50 = parity) rather than raw values. "baixo e melhor"
 * stats (e.g. SApM) are inverted first so "further out" always means
 * "better" on every axis.
 */
function fighter1Share(value1: number, value2: number, direction: string): number {
  const total = value1 + value2;
  const rawShare = total === 0 ? 50 : (value1 / total) * 100;
  return direction === "baixo e melhor" ? 100 - rawShare : rawShare;
}

export function RadarComparisonChart({ result }: { result: CompareFightersResult }) {
  const labels = result.stats.map((s) => s.label);
  const f1Values = result.stats.map((s) => fighter1Share(s.value_f1, s.value_f2, s.direction));
  const f2Values = f1Values.map((v) => 100 - v);

  const data = {
    labels,
    datasets: [
      {
        label: result.fighter1,
        data: f1Values,
        backgroundColor: `${UFC_RED}33`,
        borderColor: UFC_RED,
        pointBackgroundColor: UFC_RED,
      },
      {
        label: result.fighter2,
        data: f2Values,
        backgroundColor: `${UFC_BLUE}33`,
        borderColor: UFC_BLUE,
        pointBackgroundColor: UFC_BLUE,
      },
    ],
  };

  return (
    <Radar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: CHART_TEXT_COLOR } },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            grid: { color: CHART_GRID_COLOR },
            angleLines: { color: CHART_GRID_COLOR },
            pointLabels: { color: CHART_TEXT_COLOR, font: { size: 11 } },
            ticks: { display: false, stepSize: 25 },
          },
        },
      }}
    />
  );
}
