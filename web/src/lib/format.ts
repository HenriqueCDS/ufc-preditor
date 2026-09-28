/** "2026-09-26" -> "26/09/2026". Pure string split: no timezone shift. */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** ISO timestamp -> "24/09/2026 16:22" in the viewer's locale. */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** "2026-09-26" < hoje? Comparacao de string pura (mesmo truque de
 * formatIsoDate): datas ISO ordenam igual a strings, sem risco de fuso. */
export function isPastDate(iso: string): boolean {
  return iso < new Date().toISOString().slice(0, 10);
}
