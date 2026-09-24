"use client";

import type { ChartOptions } from "chart.js";
import { translateWeightClass } from "@/lib/weight-classes";
import { Bar, Doughnut, Line, Scatter } from "react-chartjs-2";
import {
  CHART_GRID_COLOR,
  CHART_TEXT_COLOR,
  UFC_BLUE,
  UFC_GREEN,
  UFC_ORANGE,
  UFC_PURPLE,
  UFC_RED,
} from "./chart-setup";
import { EDA_STATS, METHOD_LABELS } from "@/data/eda-stats";

const fmt = (n: number) => n.toLocaleString("pt-BR");

const xAxis = { grid: { display: false }, ticks: { color: CHART_TEXT_COLOR } };
const yAxis = { grid: { color: CHART_GRID_COLOR }, ticks: { color: CHART_TEXT_COLOR } };
const legend = { labels: { color: CHART_TEXT_COLOR, boxWidth: 12 } };

export function TargetBalanceChart() {
  const { fighter1, fighter2 } = EDA_STATS.target;
  const total = fighter1 + fighter2;
  return (
    <Bar
      data={{
        labels: ["Lutador 1 vence", "Lutador 2 vence"],
        datasets: [
          { data: [fighter1, fighter2], backgroundColor: [UFC_GREEN, UFC_RED], borderRadius: 6 },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => `${fmt(c.parsed.y ?? 0)} lutas (${(((c.parsed.y ?? 0) / total) * 100).toFixed(1)}%)`,
            },
          },
        },
        scales: { x: xAxis, y: yAxis },
      }}
    />
  );
}

const DONUT_COLORS = [UFC_BLUE, UFC_RED, UFC_GREEN, UFC_ORANGE, UFC_PURPLE, "#14b8a6", "#eab308", "#737373"];

export function MethodsDonutChart() {
  const entries = Object.entries(EDA_STATS.methods);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return (
    <Doughnut
      data={{
        labels: entries.map(([m]) => METHOD_LABELS[m] ?? m),
        datasets: [
          {
            data: entries.map(([, n]) => n),
            backgroundColor: DONUT_COLORS,
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
          legend: { position: "right", ...legend },
          tooltip: {
            callbacks: {
              label: (c) => `${fmt(c.parsed)} (${((c.parsed / total) * 100).toFixed(1)}%)`,
            },
          },
        },
      }}
    />
  );
}

export function WeightClassChart() {
  const entries = Object.entries(EDA_STATS.weightClasses);
  return (
    <Bar
      data={{
        labels: entries.map(([k]) => translateWeightClass(k)),
        datasets: [{ data: entries.map(([, n]) => n), backgroundColor: UFC_BLUE, borderRadius: 4 }],
      }}
      options={{
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: yAxis, y: xAxis },
      }}
    />
  );
}

export function TimelineChart() {
  const entries = Object.entries(EDA_STATS.timeline);
  return (
    <Line
      data={{
        labels: entries.map(([y]) => y),
        datasets: [
          {
            label: "Lutas",
            data: entries.map(([, n]) => n),
            borderColor: UFC_BLUE,
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: xAxis, y: yAxis },
      }}
    />
  );
}

const PERIOD_COLORS = [UFC_BLUE, UFC_RED, UFC_GREEN, UFC_ORANGE];

export function MethodsByPeriodChart() {
  const { periods, series } = EDA_STATS.methodsByPeriod;
  return (
    <Bar
      data={{
        labels: periods,
        datasets: Object.entries(series).map(([method, values], i) => ({
          label: METHOD_LABELS[method] ?? method,
          data: values,
          backgroundColor: PERIOD_COLORS[i % PERIOD_COLORS.length],
          borderRadius: 3,
        })),
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", ...legend } },
        scales: { x: xAxis, y: yAxis },
      }}
    />
  );
}

const PROFILE_COLORS: Record<string, string> = {
  "Iniciante (<40%)": UFC_RED,
  "Medio (40-60%)": UFC_ORANGE,
  "Bom (60-75%)": UFC_BLUE,
  "Elite (>75%)": UFC_GREEN,
};
const SCATTER_MAX = 12; // clip the long tail (notebook uses the 98th percentile)

export function StrikingScatterChart() {
  const options: ChartOptions<"scatter"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { position: "bottom", ...legend } },
    scales: {
      x: {
        ...yAxis,
        min: 0,
        max: SCATTER_MAX,
        title: { display: true, text: "Golpes desferidos por min (SLpM)", color: CHART_TEXT_COLOR },
      },
      y: {
        ...yAxis,
        min: 0,
        max: SCATTER_MAX,
        title: { display: true, text: "Golpes sofridos por min (SApM)", color: CHART_TEXT_COLOR },
      },
    },
  };
  return (
    <Scatter
      data={{
        datasets: [
          ...Object.entries(EDA_STATS.scatter).map(([label, points]) => ({
            label,
            data: points.map(([x, y]) => ({ x, y })),
            backgroundColor: `${PROFILE_COLORS[label]}73`,
            pointRadius: 2.5,
          })),
          {
            label: "Desferidos = sofridos",
            data: [
              { x: 0, y: 0 },
              { x: SCATTER_MAX, y: SCATTER_MAX },
            ],
            showLine: true,
            borderColor: "rgba(255,255,255,0.4)",
            borderDash: [6, 6],
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      }}
      options={options}
    />
  );
}
