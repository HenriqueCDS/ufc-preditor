/** "2026-09-26" -> "26/09/2026". Pure string split: no timezone shift. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** ISO timestamp -> "24/09/2026 16:22" in the viewer's locale. */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
