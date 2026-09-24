// Display-only translation of UFC weight classes. The backend keeps using the
// English names (they are the model's categories), so only labels are translated.

/** Categories the model knows, in the order shown in selects. */
export const WEIGHT_CLASSES = [
  "Strawweight",
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Heavyweight",
  "Super Heavyweight",
];

/** "Women's Strawweight" -> "Strawweight"; null when it is not one of WEIGHT_CLASSES (e.g. Catch Weight). */
export function baseWeightClass(weightClass: string): string | null {
  // Longest first so "Light Heavyweight" wins over "Heavyweight".
  const byLength = [...WEIGHT_CLASSES].sort((a, b) => b.length - a.length);
  return byLength.find((wc) => weightClass.includes(wc)) ?? null;
}

const WEIGHT_CLASS_PT: [string, string][] = [
  // Longer names first: "Light Heavyweight" must win over "Heavyweight".
  ["Super Heavyweight", "Super Pesado"],
  ["Light Heavyweight", "Meio-Pesado"],
  ["Heavyweight", "Pesado"],
  ["Middleweight", "Médio"],
  ["Welterweight", "Meio-Médio"],
  ["Lightweight", "Leve"],
  ["Featherweight", "Pena"],
  ["Bantamweight", "Galo"],
  ["Flyweight", "Mosca"],
  ["Strawweight", "Palha"],
  ["Catch Weight", "Peso Casado"],
  ["Open Weight", "Peso Livre"],
  ["Other", "Outras"],
];

/** "Women's Strawweight" -> "Palha Feminino"; unknown values are returned unchanged. */
export function translateWeightClass(weightClass: string): string {
  const match = WEIGHT_CLASS_PT.find(([en]) => weightClass.includes(en));
  if (!match) return weightClass;
  return /women/i.test(weightClass) ? `${match[1]} Feminino` : match[1];
}
