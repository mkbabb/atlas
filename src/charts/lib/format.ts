// platform/charts/lib/format.ts — THE ONE PROSE-FORMATTER SEAM (INV-E1 · N.WE1 B6 · the platform
// precision law), now RESIDENT IN CORE.
//
// Raw numbers in, lawful prose strings out — the SINGLE precision authority every readout, every
// chip, and every axis face reaches. The body lived at `src/lib/format.ts` under the INV-E1
// consolidation; N.WE1 B6 INVERTED the two-format.ts relationship so the authority lives inside a
// PUBLISHED core barrel: `@atlas/core/charts` (via `ColorScale`) reached into the UNPUBLISHED
// instance module `@/lib/format`, the one published-barrel→instance leak the lib build cannot
// externalize. The full seam moves HERE (charts already owns this `lib/`, the axis faces already
// lived here); `src/lib/format.ts` is now the THIN instance re-export shim, so the ~50 running-arc
// `@/lib/format` importers resolve byte-stable and ColorScale imports the seam from core (`./format`).
// ONE authority, one home, the importers unmoved — the two-format collision resolved as one-body,
// one-shim (format-law.gate ALLOW_LIST already names both paths; the frozen table drives unchanged).
//
// THE PLATFORM PRECISION LAW (e-numbers.md §"The fix" — a figure's precision is a property of
// WHAT IT MEASURES, never WHERE it renders):
//
//   class                 rule                                              lawful output
//   ─────────────────────────────────────────────────────────────────────────────────────────
//   money — magnitude     abbreviate ≥$1K ($1.1B/$48K); group + 0 dp        8.92e9 → "$8.92B"
//                         below; NEVER cents above $1K                      640    → "$640"
//   money — per-unit      0 dp + GROUPED ≥ $100; 2 dp < $100 (cents only    1816.04 → "$1,816"
//                         where they read); ALWAYS grouped                  57.27   → "$57.27"
//   share / percent       0 dp by default; 1 dp ONLY on a deliberate        0.52 → "52%"
//                         per-call opt-in; NEVER a trailing ".0"            0.11 → "11%"
//   rate / multiplier     2 dp on the `×` (the ratio register)              3.15  → "3.15×"
//   count                 integer, grouped, never abbreviated below 1M      160429 → "160,429"
//   bandwidth             re-unit at magnitude (Gb/s ≥ 1000 Mbps; Mbps      7000   → "7 Gb/s"
//                         ≥ 1000 kbps); NEVER a trailing ".0"               500    → "500 Mbps"
//
// THE NON-NEGOTIABLES (the F4 verbatim + the E19 keystones):
//   · NO trailing `.0` anywhere — every re-unit drops the integer's fractional zero.
//   · The money name collision is dead — `formatUsdLedger` (full) vs `formatUsdCompact`
//     (abbreviated); no two formatters share a name with opposite semantics.
//   · `formatPerCapita` / `formatPerAdm` are gone — ONE `formatUsdPerUnit` magnitude-gates them.
//   · The tier LABEL (`tierLabel`, a discrete stop → "1 Gb/s", in sci/derive) is SPLIT from the
//     bandwidth magnitude FORMATTER (`formatBandwidth`, a continuum → rounds + re-units): the
//     conflation that leaked `192.560851… Mbps` through the no-rounding branch dies here.
//   · `formatPct` is the unsigned 0-dp default; `formatPctSigned` is a SEPARATE explicit face
//     (the +/− State-Import register), never the default.
//
// The `dashboards/*/derive.ts` files keep their DOMAIN projections (stateFacts/sciFacts/the
// tier math) but import every FORMATTER from here — derive.ts derives, format.ts formats, and
// the two never overlap again (the seam-singularity gate, format-law.gate.ts, freezes it).

// ── The grouped Intl cores (authored ONCE; every money face derives from these) ─────────────

const usdGrouped0 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

const usdGrouped2 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Drop a trailing `.0` from a fixed-precision string: "7.0" → "7", "7.5" → "7.5". The F4
    law in one helper — every re-unit formatter funnels its decimal through this. */
function trimZero(fixed: string): string {
    return fixed.replace(/\.0+$/, "");
}

/** One significant decimal, the trailing `.0` dropped ("1.1" → "1.1", "800.0" → "800"). The
    abbreviation-ladder rung's decimal codec — shared by every B/M/K band. */
function sig1(n: number): string {
    return trimZero((Math.round(n * 10) / 10).toFixed(1));
}

// ── money — MAGNITUDE (totals / funds) ──────────────────────────────────────────────────────

/**
 * Compact dollars by magnitude — THE ONE compact-USD ladder (the 5 copies fold into this):
 * `$8.92B` / `$109.1M` / `$48K` / `$640`. Two decimals at the billions rung (the headline
 * fund total reads to the hundred-million), one significant decimal at M/K (the `.0` dropped —
 * `$48K`, never `$48.0K`), grouped whole dollars below $1K. Null / non-finite → the em-dash.
 */
export function formatUsdCompact(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const sign = v < 0 ? "-" : "";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${sig1(abs / 1e6)}M`;
    if (abs >= 1e3) return `${sign}$${sig1(abs / 1e3)}K`;
    return usdGrouped0.format(v); // "$640" — grouped whole dollars, the `usd0` codec
}

/**
 * The FULL ledger dollar — every digit, grouped, 0 dp: `$109,064,737`. The masthead/key
 * register where the whole magnitude is the point (never abbreviated). Renamed from the old
 * `formatUsd` so it can never collide with ECF's compact `formatUsd` again (E19's name trap).
 */
export function formatUsdLedger(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return usdGrouped0.format(v);
}

// ── money — the MAGNITUDE WORD (the unit/context corollary, INV-E1 units) ────────────────────
//
// THE UNITS GRAMMAR (f6-clipping-units §C1 — the F6.4 "$8.92 B" → "$8.92 billion" gap). The
// precision seam owns the per-quantity VALUE; it must also own the per-quantity UNIT WORD, so a
// headline dek can spell the magnitude ("$8.92 billion") instead of leaving the bare "B" suffix
// the eye cannot read as a unit (and that the figure-slug clip literally sheared). The word is
// minted HERE, never hand-typed in a consumer (the seam-singularity law extended to unit words:
// no `"billion"` literal in dashboards/**) — so a hero's dek reads its magnitude from the SAME
// authority that formats its figure, and the two can never drift.

/** The spelled magnitude WORD for a compact-USD value — the unit suffix the eye can read.
    `8.92e9 → "billion"`, `109.1e6 → "million"`, `48e3 → "thousand"`, `640 → ""` (a bare
    dollar magnitude needs no word — it is already whole). The exact twin of `formatUsdCompact`'s
    rung ladder, so the figure (`$8.92B`) and its dek word (`billion`) are sourced as one — the
    headline dek reads its magnitude from the SAME authority that formats its figure, never a
    hand-typed "billion" in a call-site (the seam-singularity law extended to the unit word). */
export function usdMagnitudeWord(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "";
    const abs = Math.abs(v);
    if (abs >= 1e9) return "billion";
    if (abs >= 1e6) return "million";
    if (abs >= 1e3) return "thousand";
    return "";
}

/**
 * The fused signed-USD delta — sign first, magnitude compacted: `+$1.84B` / `−$0.32B`. The
 * Net dollar figure the USF hover, the C0 readout, and the C4 scatter all share, so a state's
 * signed dollar never drifts between plates. The chromatic pole (orange/teal) is the consumer's
 * — this owns the GLYPH + the digits only. (Transposed off usf/derive — the 5th ladder copy.)
 */
export function formatUsdSignedDelta(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    return `${sign}${formatUsdCompact(Math.abs(v))}`;
}

// ── money — PER-UNIT (per-student / per-capita / per-mi² / per-ADM) ──────────────────────────

/**
 * The magnitude-gated per-unit dollar — the ONE function that kills `$1816.04` / `$1038.45` /
 * `$721.91` AND the 60-row ECF cents table, while keeping `$57.27`: ≥ $100 → 0 dp GROUPED
 * (`$1,816` — cents are noise at a four-digit magnitude, grouping is mandatory); < $100 → 2 dp
 * GROUPED (`$57.27` — cents READ on a per-student dollar). The single per-unit face the seam
 * owns; `formatPerCapita` / `formatPerAdm` are gone (each was the blind `$${v.toFixed(2)}`).
 */
export function formatUsdPerUnit(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    if (Math.abs(v) >= 100) return usdGrouped0.format(v); // "$1,816" — 0 dp, grouped
    return usdGrouped2.format(v); // "$57.27" / "$0.42" — 2 dp, grouped
}

// ── share / percent ─────────────────────────────────────────────────────────────────────────

/**
 * A fraction as an UNSIGNED percent, 0 dp by default — `0.52 → "52%"`, `0.11 → "11%"` (no
 * `.0`). The eye reads "half / a tenth"; one decimal is a deliberate per-call opt-in
 * (`{ dp: 1 }`, the ribbon-segment shares) and even then the trailing `.0` is dropped. The
 * SIGN-free default register; the signed face is `formatPctSigned`, separate and explicit.
 */
export function formatPct(
    v: number | null | undefined,
    opts: { dp?: 0 | 1 } = {},
): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const dp = opts.dp ?? 0;
    const pct = v * 100;
    return `${dp === 0 ? String(Math.round(pct)) : trimZero(pct.toFixed(1))}%`;
}

/**
 * The SIGNED percent (the State-Import register) — `+215%` / `−78%`, 0 dp, the sign always
 * shown (a positive leads with `+`). A SEPARATE explicit face: the default `formatPct` is
 * unsigned, so a share never accidentally wears a `+`. Uses the typographic minus `−`.
 */
export function formatPctSigned(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const pct = Math.round(v * 100);
    const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
    return `${sign}${Math.abs(pct)}%`;
}

// ── the cover voice (K-PAPER-COVER · ARM B — the audacious-masthead kicker + standfirst) ──────
//
// The reference masthead seats a small italic serif KICKER above the towering headline and a
// serif-italic DECK/STANDFIRST beside it (K-PAPER-CHARTER §I.1). Both DERIVE off the ONE
// editorial-direction scalar `thesisSign` every paper route store exposes, so the cover can never
// LEAD while the body LAGS — coherence by construction (the k-paper-thesis-coherence guard reads
// the standfirst's sign BACK and asserts it === thesisSign). PURE, deterministic, jsdom-testable
// (no `vue`, no DOM, no clock) — the share/percent register's editorial sibling faces.

/** The editorial-direction scalar each paper route store exposes (K-PAPER-COVER §4.H): the page
    thesis LAGS (`-1`), holds at par (`0`), or LEADS (`+1`). The cover kicker, the cover standfirst,
    and the body thesis ALL derive off this ONE scalar — the one-thesis-source law. */
export type ThesisSign = -1 | 0 | 1;

/** The cover KICKER — the small editorial word tucked above the towering masthead headline (the
    reference's "Median"), DERIVED off the route's `thesisSign` so the kicker speaks the page's
    editorial DIRECTION. Deterministic (same sign → same kicker); reads the SAME scalar the
    standfirst reads (never a second source — the one-thesis-source law).

    `faces` is the CONVENTION-HONEST override seat (N design consult · the F11 register law): the
    default faces presume the sign is VALENCE-aligned (negative = a shortfall), but a route whose
    sign is an accounting convention — USF's `netDelta = out − in`, negative BECAUSE the fund
    collected more than it disbursed, a SURPLUS — must not announce its carry as "Falling short"
    (deficit vocabulary over the ratified surplus frame, the same backwards read F11 killed at the
    LedgerNet gloss). The override stays derived off the ONE scalar (deterministic, no second
    source, no hand-typed magnitude); it re-voices only the FACE. */
export function formatCoverKicker(
    sign: ThesisSign,
    faces: { lead?: string; lag?: string; par?: string } = {},
): string {
    if (sign > 0) return faces.lead ?? "Gaining ground";
    if (sign < 0) return faces.lag ?? "Falling short";
    return faces.par ?? "Holding the line";
}

/** The cover STANDFIRST (the magazine deck — the felt so-what), composed from the route's
    PRE-FORMATTED signed thesis figure (already through `formatPctSigned` / `formatUsdSignedDelta`
    at the call site — INV-E1, no hand-typed magnitude) and the felt clause. It LEADS with the
    signed figure, so the standfirst's editorial DIRECTION is read straight off the SAME magnitude
    `thesisSign` derives from — the cover can never contradict the body. Returns `null` when the
    route carries no live signed figure (the `SpeedtestHero` guarded-computed precedent → the felt
    line or `null`), so the standfirst never fabricates a direction. */
export function formatCoverStandfirst(
    signedFigure: string | null | undefined,
    feltClause: string,
): string | null {
    if (!signedFigure || signedFigure === "—") return null;
    return `${signedFigure} ${feltClause}`;
}

// ── rate / multiplier ────────────────────────────────────────────────────────────────────────

/** Net-retention as a multiplier — 2 dp on the `×`: `3.15×` / `0.22×`. The ratio register. */
export function formatMultiplier(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${v.toFixed(2)}×`;
}

// ── count ─────────────────────────────────────────────────────────────────────────────────────

/** A whole count, grouped, never abbreviated below 1M: `160429 → "160,429"`, `297 → "297"`. */
export function formatCount(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return Math.round(v).toLocaleString("en-US");
}

/**
 * A compact count for SPACE-BOUND faces (slider tick labels, dense axis chips) —
 * `1234567 → "1.2M"`, `450000 → "450K"`, `297 → "297"`. The prose register stays
 * `formatCount` (grouped, unabbreviated); this face exists so no consumer hand-rolls
 * the 1e6/1e3 ladder (the seam-singularity law, E19). NO trailing `.0` (`1M`, never
 * `1.0M` — the F4 verbatim).
 */
export function formatCountCompact(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    if (v >= 1e6) {
        const m = v / 1e6;
        const face = m >= 10 ? String(Math.round(m)) : (Math.round(m * 10) / 10).toString();
        return `${face.replace(/\.0$/, "")}M`;
    }
    if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
    return String(Math.round(v));
}

// ── bandwidth (the magnitude FORMATTER — split from the tier LABEL) ──────────────────────────

/**
 * A bandwidth in Mbps, re-united at magnitude — `7000 → "7 Gb/s"`, `7500 → "7.5 Gb/s"`,
 * `500 → "500 Mbps"`, `192.56… → "193 Mbps"`. The CONTINUUM formatter: it ROUNDS its input
 * (an average-utilization measure is never a clean stop), so the `192.560851… Mbps` leak
 * (e0-hover-gates GATE 3 / E17·E19) cannot survive. Distinct from sci/derive `tierLabel`,
 * which formats a discrete RAINBOW STOP (`1 Gb/s`, `500 Mbps`) and never rounds — the tier
 * LABEL and the magnitude FORMATTER are now two functions, not one conflated one. NO trailing
 * `.0` (the `7 Gb/s`, never `7.0 Gb/s`, F4 verbatim).
 */
export function formatBandwidth(mbps: number | null | undefined): string {
    if (mbps == null || !Number.isFinite(mbps)) return "—";
    if (mbps >= 1000) return `${sig1(mbps / 1000)} Gb/s`;
    return `${Math.round(mbps)} Mbps`;
}

/**
 * A per-student bandwidth in kbps, re-united at magnitude — `7000 → "7 Mbps"`, `737.5 →
 * "738 kbps"`, `14.2 → "14 kbps"`. The kbps continuum re-units to Mbps ≥ 1000 kbps (the
 * `7000.0 kbps → 7 Mbps` law, e-numbers.md), rounds below (kbps is read to the unit, not the
 * tenth — a per-student kbps is never meaningfully fractional). NO trailing `.0`.
 */
export function formatKbps(kbps: number | null | undefined): string {
    if (kbps == null || !Number.isFinite(kbps)) return "—";
    if (kbps >= 1000) return `${sig1(kbps / 1000)} Mbps`;
    return `${Math.round(kbps)} kbps`;
}

// ── the AXIS / CANVAS tick faces (the abbreviated register — the C.W7 MB-3 minting) ───────────
//
// The axis tick is the TERSEST legible form at the 11px mobile floor: ONE significant decimal in
// the B/M/K bands (the `.0` dropped), NEVER the spelled magnitude, never the raw float the audit
// flagged on the break-even scatter. These are NOT the prose faces above (formatUsdCompact spells
// `$8.92B`, formatUsdLedger groups every digit) — an axis tick wants `$1.1B`, terse. The C.W7
// MB-3 [FOLD-MOBILE-AXES] minted them at this platform/charts seam; they are the axis/canvas
// register that always lived HERE, alongside the prose faces the B6 inversion folded home. They
// reuse the seam's own `sig1` decimal codec (the prior bespoke `trim1` helper retired — it
// computed the identical "round to 1 dp, drop the `.0`" rung the seam already owns).

/**
 * Abbreviated USD for an axis tick: `$1.1B`, `$800M`, `$48K`, `$640`. ONE significant
 * decimal in the B/M/K bands (dropped when it would read `.0`), so the tick is the
 * tersest legible form at the 11px floor — never the raw `1,118,026,003.42` float.
 *
 * Sub-thousand values render as whole dollars (`$640`); a sub-dollar value keeps two places
 * so a cost-per-Mbps tick near zero still reads (`$0.40`), never collapsing to `$0`. A
 * non-finite / null input returns the em-dash placeholder (the no-data tick), never `$NaN`.
 */
export function formatUsdAbbrev(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const sign = v < 0 ? "-" : "";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${sign}$${sig1(abs / 1e9)}B`;
    if (abs >= 1e6) return `${sign}$${sig1(abs / 1e6)}M`;
    if (abs >= 1e3) return `${sign}$${sig1(abs / 1e3)}K`;
    if (abs >= 1) return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
    if (abs === 0) return "$0";
    return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Σ-bandwidth in Mbps → a compact Gb/s axis tick — `630800 → "631 Gb/s"`, `0 → "0 Gb/s"`,
 * `90000 → "90 Gb/s"`. The CONTRACTED-CEILING trend's y-axis face (the SCI utilization
 * trajectory) — a state-aggregate magnitude that always reads in Gb/s, so (unlike the seam's
 * `formatBandwidth`, which re-units DOWN to Mbps below 1 Gb/s) this axis tick stays in Gb/s
 * across its whole span. One significant decimal in the band, the trailing `.0` ALWAYS dropped
 * (`0 Gb/s`, never `0.0 Gb/s` — F4 verbatim). Null/non-finite → em-dash.
 */
export function formatGbpsAxis(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${sig1(v / 1000)} Gb/s`;
}

/**
 * Abbreviated UNIT-LESS number for an axis tick (no `$`): `1.1B` / `160K` / `42`. The
 * scatter's generic fallback tick when a plate supplies no `xFormat`/`yFormat` — a raw
 * `1,118,026,003.42` collapses to `1.1B` so no axis ever paints the unformatted float the
 * audit flagged (SX-1). One significant decimal in the B/M/K bands (the `.0` dropped); grouped
 * whole values from 100 up; two places below (a sub-1 cost tick still reads `0.42`). Null /
 * non-finite → the em-dash placeholder.
 */
export function formatNumberAbbrev(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const sign = v < 0 ? "-" : "";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${sign}${sig1(abs / 1e9)}B`;
    if (abs >= 1e6) return `${sign}${sig1(abs / 1e6)}M`;
    if (abs >= 1e3) return `${sign}${sig1(abs / 1e3)}K`;
    if (abs >= 100 || Number.isInteger(v)) return Math.round(v).toLocaleString("en-US");
    return v.toFixed(2);
}
