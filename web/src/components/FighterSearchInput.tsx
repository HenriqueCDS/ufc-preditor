"use client";

import { useEffect, useState } from "react";
import { ApiError, searchFighters } from "@/lib/api";

interface FighterSearchInputProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

export function FighterSearchInput({ label, value, onChange, placeholder }: FighterSearchInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = value.trim();
    const timeoutId = setTimeout(() => {
      if (trimmed.length < 2) {
        setSuggestions([]);
        setError(null);
        return;
      }
      searchFighters(trimmed)
        .then((results) => {
          setSuggestions(results);
          setError(null);
        })
        .catch((err: unknown) => {
          setSuggestions([]);
          setError(err instanceof ApiError ? err.message : "Falha ao buscar lutadores.");
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

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
