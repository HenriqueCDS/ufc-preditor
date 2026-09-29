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
  "Decision - Unanimous": "Decisão unânime",
  "Decision - Split": "Decisão dividida",
  "Decision - Majority": "Decisão majoritária",
  "KO/TKO": "KO/TKO",
  Submission: "Finalização",
  "TKO - Doctor's Stoppage": "TKO (médico)",
  DQ: "Desqualificação",
};

export const STAT_LABELS: Record<string, string> = {
  Win_Rate: "Taxa de vitórias",
  SLpM: "Golpes desferidos/min (SLpM)",
  SApM: "Golpes sofridos/min (SApM)",
  TD_Avg: "Quedas/15min (TD Avg)",
  Sub_Avg: "Finalizações/15min (Sub Avg)",
  Reach_cm: "Alcance (cm)",
  Height_cm: "Altura (cm)",
  Total_Fights: "Total de lutas",
  Str_Acc_f: "Precisão de acerto (%)",
  Str_Def_f: "Defesa de golpes (%)",
};

// Short axis labels for the correlation heatmap, where space is tight.
export const STAT_LABELS_SHORT: Record<string, string> = {
  Win_Rate: "Vitórias",
  SLpM: "Acertos/min",
  SApM: "Sofridos/min",
  TD_Avg: "Quedas",
  Sub_Avg: "Finalizações",
  Reach_cm: "Alcance",
  Height_cm: "Altura",
  Total_Fights: "Lutas",
  Str_Acc_f: "Precisão",
  Str_Def_f: "Defesa",
};
