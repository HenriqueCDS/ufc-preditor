"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  LineElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Filler,
  RadialLinearScale,
  PointElement,
  LineElement,
  RadarController,
  Tooltip,
  Legend
);

export const UFC_RED = "#e0212d";
export const UFC_BLUE = "#3b82f6";
export const CHART_GRID_COLOR = "rgba(255, 255, 255, 0.08)";
export const CHART_TEXT_COLOR = "#a3a3a3";
export const UFC_GREEN = "#4daf7c";
export const UFC_ORANGE = "#f28e2b";
export const UFC_PURPLE = "#9c6ade";
