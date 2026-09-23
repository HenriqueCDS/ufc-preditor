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

export type MethodGroup = "ko_tko" | "submission" | "decision" | "other";

export interface FighterPercentile {
  key: string;
  label: string;
  value: number;
  /** 0-100, already inverted for "baixo e melhor" stats: higher is always better. */
  percentile: number;
  direction: StatDirection;
}

export interface FighterRecord {
  fights: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  finish_rate: number | null;
  current_streak: number;
  best_streak: number;
  wins_by: Record<MethodGroup, number>;
  losses_by: Record<MethodGroup, number>;
}

export interface FighterStriking {
  sig_landed: number;
  sig_attempted: number;
  sig_accuracy: number | null;
  sig_absorbed: number;
  sig_defense: number | null;
  knockdowns: number;
  td_landed: number;
  td_attempted: number;
  td_accuracy: number | null;
  sub_attempts: number;
  control_avg_sec: number;
  avg_fight_min: number;
  targets: { head: number | null; body: number | null; leg: number | null };
  positions: { distance: number | null; clinch: number | null; ground: number | null };
}

export interface FighterHistoryItem {
  date: string;
  opponent: string;
  result: "W" | "L";
  method: string;
  round: number | null;
  weight_class: string;
}

/** `record`/`striking` are null when the fighter has no fight in the UFC dataset. */
export interface FighterStatsResult {
  name: string;
  profile: { height_cm: number; reach_cm: number; weight_lbs: number; age: number };
  percentiles: FighterPercentile[];
  record: FighterRecord | null;
  striking: FighterStriking | null;
  by_year: { year: number; wins: number; losses: number }[];
  history: FighterHistoryItem[];
}
