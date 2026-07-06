// src/lib/regions.ts — Census Bureau region grouping by zero-padded FIPS, plus
// the region UI list. Used by the global filter (FilterPanel) and the per-state
// region badge. Territories carry their own "Territories" bucket so the filter
// stays exhaustive (no state falls through to an undefined region).
export type Region = "Northeast" | "Midwest" | "South" | "West" | "Territories";

export const REGIONS: readonly Region[] = [
    "Northeast",
    "Midwest",
    "South",
    "West",
    "Territories",
] as const;

// Census regions keyed by 2-char FIPS (50 states + DC + the 5 territories).
const REGION_BY_FIPS: Record<string, Region> = {
    // Northeast
    "09": "Northeast", // CT
    "23": "Northeast", // ME
    "25": "Northeast", // MA
    "33": "Northeast", // NH
    "44": "Northeast", // RI
    "50": "Northeast", // VT
    "34": "Northeast", // NJ
    "36": "Northeast", // NY
    "42": "Northeast", // PA
    // Midwest
    "17": "Midwest", // IL
    "18": "Midwest", // IN
    "26": "Midwest", // MI
    "39": "Midwest", // OH
    "55": "Midwest", // WI
    "19": "Midwest", // IA
    "20": "Midwest", // KS
    "27": "Midwest", // MN
    "29": "Midwest", // MO
    "31": "Midwest", // NE
    "38": "Midwest", // ND
    "46": "Midwest", // SD
    // South
    "10": "South", // DE
    "11": "South", // DC
    "12": "South", // FL
    "13": "South", // GA
    "24": "South", // MD
    "37": "South", // NC
    "45": "South", // SC
    "51": "South", // VA
    "54": "South", // WV
    "01": "South", // AL
    "21": "South", // KY
    "28": "South", // MS
    "47": "South", // TN
    "05": "South", // AR
    "22": "South", // LA
    "40": "South", // OK
    "48": "South", // TX
    // West
    "04": "West", // AZ
    "08": "West", // CO
    "16": "West", // ID
    "30": "West", // MT
    "32": "West", // NV
    "35": "West", // NM
    "49": "West", // UT
    "56": "West", // WY
    "02": "West", // AK
    "06": "West", // CA
    "15": "West", // HI
    "41": "West", // OR
    "53": "West", // WA
    // Territories
    "60": "Territories", // AS
    "66": "Territories", // GU
    "69": "Territories", // MP
    "72": "Territories", // PR
    "78": "Territories", // VI
};

/** Region for a zero-padded FIPS, or "Territories" as the catch-all bucket. */
export function regionFor(fips: string): Region {
    return REGION_BY_FIPS[fips] ?? "Territories";
}
