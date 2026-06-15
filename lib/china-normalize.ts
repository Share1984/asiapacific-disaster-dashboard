const CHINA_TERRITORIES = new Set([
  "China",
  "China, Hong Kong Special Administrative Region",
  "China, Macao Special Administrative Region",
  "Taiwan (Province of China)",
]);

export function normalizeCountry(country: string): string {
  if (CHINA_TERRITORIES.has(country)) {
    return "China";
  }
  return country;
}
