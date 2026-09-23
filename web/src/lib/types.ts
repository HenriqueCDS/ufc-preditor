// Mirrors the dicts returned by ml/predict.py (Predictor class).
// Keep these in sync with the backend contract documented in web/README.md.

export interface PredictFightResult {
  fighter1: string;
  fighter2: string;
  prob_fighter1: number;
  prob_fighter2: number;
  predicted_winner: string;
  confidence: number;
  confidence_level: "ALTA" | "MEDIA" | "BAIXA";
  streak_f1: number;
  streak_f2: number;
  weight_class: string;
}

export type StatDirection = "alto e melhor" | "baixo e melhor" | "contexto" | "neutro";

export interface CompareStat {
  key: string;
  label: string;
  explanation: string;
  direction: StatDirection;
  value_f1: number;
  value_f2: number;
  winner: 0 | 1 | 2;
}

export interface CompareFightersResult {
  fighter1: string;
  fighter2: string;
  stats: CompareStat[];
  advantage_f1: number;
  advantage_f2: number;
}

export type FighterSearchResult = string[];

export interface CardFightInput {
  f1: string;
  f2: string;
  weight_class?: string;
}
