// Thin client for the prediction backend. The backend itself isn't decided
// yet -- this file defines the HTTP contract the frontend expects:
//
//   GET  /fighters/search?q=...              -> string[]
//   GET  /fighters/compare?f1=...&f2=...      -> CompareFightersResult
//   POST /predict        { fighter1, fighter2, weight_class } -> PredictFightResult
//   POST /predict/card    { fights: CardFightInput[] }        -> PredictFightResult[]
//
// Point NEXT_PUBLIC_API_URL (see .env.local.example) at whatever implements
// this contract (FastAPI, Flask, ...) -- nothing else here needs to change.

import type {
  CardFightInput,
  CompareFightersResult,
  FighterSearchResult,
  PredictFightResult,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function requireApiBase(): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      "NEXT_PUBLIC_API_URL nao configurada. Copie web/.env.local.example para " +
        "web/.env.local e aponte para o backend de predicao."
    );
  }
  return API_BASE_URL;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = requireApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Nao foi possivel conectar em ${base}. O backend esta rodando?`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || `Erro ${res.status} ao chamar a API`, res.status);
  }
  return res.json() as Promise<T>;
}

export function searchFighters(query: string, topN = 8): Promise<FighterSearchResult> {
  const params = new URLSearchParams({ q: query, top_n: String(topN) });
  return apiFetch(`/fighters/search?${params.toString()}`);
}

export function predictFight(input: {
  fighter1: string;
  fighter2: string;
  weightClass: string;
}): Promise<PredictFightResult> {
  return apiFetch("/predict", {
    method: "POST",
    body: JSON.stringify({
      fighter1: input.fighter1,
      fighter2: input.fighter2,
      weight_class: input.weightClass,
    }),
  });
}

export function predictCard(fights: CardFightInput[]): Promise<PredictFightResult[]> {
  return apiFetch("/predict/card", {
    method: "POST",
    body: JSON.stringify({ fights }),
  });
}

export function compareFighters(fighter1: string, fighter2: string): Promise<CompareFightersResult> {
  const params = new URLSearchParams({ f1: fighter1, f2: fighter2 });
  return apiFetch(`/fighters/compare?${params.toString()}`);
}
