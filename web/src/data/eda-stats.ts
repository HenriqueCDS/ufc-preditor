// Typed view of eda-stats.json, generated offline by `cd backend && python -m ml.eda`
// (notebook section 2.4). Static on purpose, same as model-metrics.ts: re-run and
// commit the JSON after updating data/*.csv.

import raw from "./eda-stats.json";

export interface EdaStats {
  summary: {
    fights: number;
    fighters: number;
    yearFrom: number;
    yearTo: number;
    fighter1WinRate: number;
  };
  target: { fighter1: number; fighter2: number };
  methods: Record<string, number>;
  weightClasses: Record<string, number>;
  timeline: Record<string, number>;
  methodsByPeriod: { periods: string[]; series: Record<string, number[]> };
  correlation: { features: string[]; matrix: number[][] };
  scatter: Record<string, [number, number][]>;
  describe: Record<string, Record<"mean" | "std" | "min" | "50%" | "max", number>>;
}

export const EDA_STATS = raw as unknown as EdaStats;

export const METHOD_LABELS: Record<string, string> = {
  "Decision - Unanimous": "Decisao unanime",
  "Decision - Split": "Decisao dividida",
  "Decision - Majority": "Decisao majoritaria",
  "KO/TKO": "KO/TKO",
  Submission: "Finalizacao",
  "TKO - Doctor's Stoppage": "TKO (medico)",
  DQ: "Desqualificacao",
};

export const STAT_LABELS: Record<string, string> = {
  Win_Rate: "Taxa de vitorias",
  SLpM: "Golpes desferidos/min (SLpM)",
  SApM: "Golpes sofridos/min (SApM)",
  TD_Avg: "Quedas/15min (TD Avg)",
  Sub_Avg: "Finalizacoes/15min (Sub Avg)",
  Reach_cm: "Alcance (cm)",
};
