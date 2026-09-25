"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/predict", label: "Prever e Comparar" },
  { href: "/events", label: "Proximos Eventos" },
  { href: "/statistics", label: "Estatisticas" },
];

export function Navbar() {
  const pathname = usePathname();
  // Remember which path the menu was opened on, so it closes itself on navigation.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-2xl font-extrabold uppercase tracking-wide text-neutral-100">
          UFC <span className="text-red-600">Preditor</span>
        </Link>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="menu-principal"
          onClick={() => setOpenAt(open ? null : pathname)}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-neutral-300 transition hover:text-neutral-100 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        <ul
          id="menu-principal"
          className={`${
            open ? "flex" : "hidden"
          } absolute inset-x-0 top-full flex-col border-b border-neutral-800 bg-neutral-950 px-4 pb-2 font-display text-lg font-semibold uppercase tracking-wide text-neutral-400 md:static md:flex md:flex-row md:gap-6 md:border-0 md:bg-transparent md:p-0`}
        >
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block py-3 transition hover:text-neutral-100 md:py-0 ${
                  pathname === link.href ? "text-neutral-100" : ""
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
