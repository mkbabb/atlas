// platform/composables/useRomanNumeral.ts — THE ONE int→Roman converter (V-W2 · D3 §C.3).
//
// The single authority every atlas figure-number reads. It REPLACES four truncated `ROMAN[≤10]`
// lookup tables (FigureInitial / DashboardEssay / AnimatedRule / useDockStepper) plus PlateNumber's
// private additive-subtractive converter — all of which fell back to Arabic past X, so a figure
// XI..XXXIII rendered "11".."33" (the truncation bug L/coordination §7 names). The propaedeutic
// makes it acute: §V exceeds figure X, and the journal register (Tab. XXXIII) must not read "Tab. 33".
//
// CUT-ONCE (L/coordination §7): V-W2 AUTHORS this; L7 / L-DOCK-CONSUME CONSUME it — they never
// re-author the table. ONE source, no drift.
//
// Standard additive-subtractive algorithm over the descending value ladder; the subtractive pairs
// (CM/CD/XC/XL/IX/IV) sit inline so a single greedy pass emits them. Domain 1..3999 (the classic
// numeral range); anything outside — `≤0`, `≥4000`, or non-integer — returns "" (a figure-number is
// a positive whole count, so the empty string is the honest "no numeral" reading, never a lie).

/** The descending value → glyph ladder, subtractive pairs inline (the greedy single-pass source). */
const NUMERALS: readonly (readonly [number, string])[] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
];

/**
 * Convert a positive integer to its Roman numeral.
 *
 * @param n the figure-number — a whole count in `1..3999`.
 * @returns the additive-subtractive Roman numeral (`13 → "XIII"`, `33 → "XXXIII"`,
 *   `3999 → "MMMCMXCIX"`); `""` for `≤0`, `≥4000`, or any non-integer (there is no honest numeral).
 */
export function toRoman(n: number): string {
    if (!Number.isInteger(n) || n < 1 || n > 3999) return "";
    let rem = n;
    let out = "";
    for (const [value, glyph] of NUMERALS) {
        while (rem >= value) {
            out += glyph;
            rem -= value;
        }
    }
    return out;
}
