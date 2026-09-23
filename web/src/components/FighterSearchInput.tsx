"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, listFighters } from "@/lib/api";

interface FighterSearchInputProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

const MAX_SUGGESTIONS = 50;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function FighterSearchInput({ label, value, onChange, placeholder }: FighterSearchInputProps) {
  const [fighters, setFighters] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFighters()
      .then((names) => {
        if (!cancelled) setFighters(names);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Falha ao buscar lutadores.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const query = normalize(value);
    const filtered = query ? fighters.filter((name) => normalize(name).includes(query)) : fighters;
    return filtered.slice(0, MAX_SUGGESTIONS);
  }, [fighters, value]);

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-neutral-300">{label}</label>
      <input
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:border-red-600 focus:outline-none"
        value={value}
        placeholder={placeholder ?? "Digite o nome do lutador..."}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-neutral-200 hover:bg-red-600/20"
                onMouseDown={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
