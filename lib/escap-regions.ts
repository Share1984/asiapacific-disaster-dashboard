import type { EscapSubregion } from "./types";

const COUNTRY_TO_SUBREGION: Record<string, EscapSubregion> = {
  // North and Central Asia
  Armenia: "North and Central Asia",
  Azerbaijan: "North and Central Asia",
  Georgia: "North and Central Asia",
  Kazakhstan: "North and Central Asia",
  Kyrgyzstan: "North and Central Asia",
  Tajikistan: "North and Central Asia",
  Turkmenistan: "North and Central Asia",
  Uzbekistan: "North and Central Asia",

  // South and South West Asia
  Afghanistan: "South and South West Asia",
  Bangladesh: "South and South West Asia",
  Bhutan: "South and South West Asia",
  India: "South and South West Asia",
  "Iran (Islamic Republic of)": "South and South West Asia",
  Maldives: "South and South West Asia",
  Nepal: "South and South West Asia",
  Pakistan: "South and South West Asia",
  "Sri Lanka": "South and South West Asia",
  Türkiye: "South and South West Asia",

  // Pacific
  Australia: "Pacific",
  Fiji: "Pacific",
  Kiribati: "Pacific",
  "Marshall Islands": "Pacific",
  "Micronesia (Federated States of)": "Pacific",
  "Papua New Guinea": "Pacific",
  Samoa: "Pacific",
  "Solomon Islands": "Pacific",
  Tuvalu: "Pacific",
  Vanuatu: "Pacific",
  "American Samoa": "Pacific",
  "Cook Islands": "Pacific",
  "Northern Mariana Islands": "Pacific",

  // East and Northeast Asia (Russia counted here only)
  China: "East and Northeast Asia",
  "Democratic People's Republic of Korea": "East and Northeast Asia",
  Japan: "East and Northeast Asia",
  Mongolia: "East and Northeast Asia",
  "Republic of Korea": "East and Northeast Asia",
  "Russian Federation": "East and Northeast Asia",

  // Southeast Asia
  "Brunei Darussalam": "Southeast Asia",
  Cambodia: "Southeast Asia",
  Indonesia: "Southeast Asia",
  "Lao People's Democratic Republic": "Southeast Asia",
  Malaysia: "Southeast Asia",
  Myanmar: "Southeast Asia",
  Philippines: "Southeast Asia",
  Singapore: "Southeast Asia",
  Thailand: "Southeast Asia",
  "Timor-Leste": "Southeast Asia",
  "Viet Nam": "Southeast Asia",
};

export function getEscapSubregion(country: string): EscapSubregion | null {
  return COUNTRY_TO_SUBREGION[country] ?? null;
}

export function getCountriesForSubregion(subregion: EscapSubregion): string[] {
  return Object.entries(COUNTRY_TO_SUBREGION)
    .filter(([, region]) => region === subregion)
    .map(([country]) => country)
    .sort();
}
