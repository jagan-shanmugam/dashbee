/**
 * GeoJSON Data Sources
 *
 * For production use, these would be loaded from CDN or bundled.
 * Using public domain sources:
 * - US States: Natural Earth Data
 * - World Countries: Natural Earth Data
 *
 * Note: For the demo, we use external URLs to keep bundle size small.
 * In production, you might want to bundle these or use a CDN.
 */

// Public CDN URLs for GeoJSON data
export const GEO_DATA_URLS = {
  // US States from Natural Earth via GitHub
  usStates:
    "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",

  // World Countries from Natural Earth via GitHub
  worldCountries:
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
} as const;

// US State name to code mapping
export const US_STATE_CODES: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

// Reverse mapping (code to name)
export const US_STATE_NAMES: Record<string, string> = Object.entries(
  US_STATE_CODES,
).reduce(
  (acc, [name, code]) => {
    acc[code] = name;
    return acc;
  },
  {} as Record<string, string>,
);

// Country name normalization (common variations)
export const COUNTRY_ALIASES: Record<string, string> = {
  USA: "United States of America",
  US: "United States of America",
  "United States": "United States of America",
  UK: "United Kingdom",
  "Great Britain": "United Kingdom",
  England: "United Kingdom",
  Russia: "Russian Federation",
  China: "People's Republic of China",
  PRC: "People's Republic of China",
  Taiwan: "Taiwan, Province of China",
  "South Korea": "Republic of Korea",
  "North Korea": "Democratic People's Republic of Korea",
  Iran: "Islamic Republic of Iran",
  Syria: "Syrian Arab Republic",
  Venezuela: "Bolivarian Republic of Venezuela",
  Bolivia: "Plurinational State of Bolivia",
  Vietnam: "Viet Nam",
  Laos: "Lao People's Democratic Republic",
  Tanzania: "United Republic of Tanzania",
  Congo: "Republic of the Congo",
  DRC: "Democratic Republic of the Congo",
};

/**
 * Normalize region name for matching
 */
export function normalizeRegionName(name: string): string {
  const trimmed = name.trim();

  // Check US state codes
  const upperName = trimmed.toUpperCase();
  if (US_STATE_NAMES[upperName]) {
    return US_STATE_NAMES[upperName];
  }

  // Check country aliases
  if (COUNTRY_ALIASES[trimmed]) {
    return COUNTRY_ALIASES[trimmed];
  }

  return trimmed;
}
