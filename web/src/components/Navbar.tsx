import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/predict", label: "Prever e Comparar" },
  { href: "/events", label: "Proximos Eventos" },
  { href: "/statistics", label: "Estatisticas" },
];

export function Navbar() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-neutral-100">
          UFC <span className="text-red-600">Preditor</span>
        </Link>
        <ul className="flex gap-6 text-sm font-medium text-neutral-400">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition hover:text-neutral-100">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
