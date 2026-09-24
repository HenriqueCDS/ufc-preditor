// Thin client for the FastAPI backend, deployed as a Vercel Service (see
// ../../../vercel.json). Same origin as this frontend -- the top-level
// rewrite `/api/(.*)` forwards straight to the backend service, so no CORS
// and no absolute URL needed in production.
//
//   GET  /api/fighters                            -> string[] (all names)
//   GET  /api/fighters/search?q=...              -> string[]
//   GET  /api/fighters/compare?f1=...&f2=...      -> CompareFightersResult
//   GET  /api/fighters/stats?name=...             -> FighterStatsResult
//   POST /api/predict        { fighter1, fighter2, weight_class } -> PredictFightResult
//   POST /api/predict/card    { fights: CardFightInput[] }        -> PredictFightResult[]
//   GET  /api/events/upcoming                     -> UpcomingEventsResult
//   GET  /api/events/{id}                         -> EventCardResult (prediction per fight)
//
// Override NEXT_PUBLIC_API_URL (see .env.local.example) only if you're
// running the backend separately from the frontend (e.g. plain `uvicorn`
// instead of `vercel dev`).

import type {
  CardFightInput,
  CompareFightersResult,
  EventCardResult,
  FighterSearchResult,
  FighterStatsResult,
  PredictFightResult,
  UpcomingEventsResult,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Nao foi possivel conectar em ${API_BASE_URL}. O backend esta rodando?`);
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

let fightersPromise: Promise<FighterSearchResult> | null = null;

// All fighter names, fetched once and cached; filtering happens client-side.
export function listFighters(): Promise<FighterSearchResult> {
  if (!fightersPromise) {
    fightersPromise = apiFetch<FighterSearchResult>("/fighters").catch((err) => {
      fightersPromise = null; // allow retry after a failure
      throw err;
    });
  }
  return fightersPromise;
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

export function getFighterStats(name: string): Promise<FighterStatsResult> {
  const params = new URLSearchParams({ name });
  return apiFetch(`/fighters/stats?${params.toString()}`);
}

export function getUpcomingEvents(): Promise<UpcomingEventsResult> {
  return apiFetch("/events/upcoming");
}

export function getEventCard(eventId: string): Promise<EventCardResult> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`);
}
