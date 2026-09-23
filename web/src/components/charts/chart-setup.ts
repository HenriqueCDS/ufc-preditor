"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
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
