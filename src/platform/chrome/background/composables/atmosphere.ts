// platform/composables/atmosphere.ts — THE ATMOSPHERE RESOLVER + GUARD (N.WD2 §4.D2, the ruled
// departure). This is the PURE half of the aurora atmosphere: the resolution ladder that turns a
// route's declared `atmosphere` facet (or its `chromeIdentity` legs, or nothing) into unresolved
// pole EXPRS + a bias-cap + a clamped deposition, plus the four gate-able guard predicates. It holds
// NO DOM/colour math — `useAuroraConfig` resolves the returned exprs through the palette bridge's
// `resolveAtmosphereColors` (the EXISTING `resolveColorsBatch`), so page-glow stays data-glow with
// zero new colour machinery. The former per-surface `surfacePoles`/`surfaceProfile` slug-switch is
// DELETED (D2.5): the poles are now DECLARED on the instance context, not tabled in the platform.
//
// THE LADDER (per field, D2.2): a declared pole → the `chromeIdentity` accentWarm/accentCool leg (the
// D6 default) → `NEUTRAL_ATMOSPHERE` (the PAPER_WASH floor — an unknown route NEVER wears USF's tide).
// THE GUARD (D2.3, undeclarable + resolver-side): the deposition CLAMPS to the D6 envelope
// (granulation ∈ [0.28, 0.38] · breathDepth ≤ 0.05 · breathPeriod ≥ 40 · elongation ∈ [1.0, 1.5]) —
// a route leans its field, never makes it loud. The token-only + page-glow-membership arms are
// gate-able predicates below.

import type {
    AtmosphereFacet,
    ChromeIdentity,
    DepositionProfile,
} from "@/contract";

/** Clamp a scalar into [lo, hi] (local, no import churn). */
function clampRange(x: number, lo: number, hi: number): number {
    return x < lo ? lo : x > hi ? hi : x;
}

// ── THE D6 DEPOSITION ENVELOPE (D2.3.2 — recessive, undeclarable-beyond) ──────────────────────
/** The clamp bounds a declared deposition can never breach: a route may lean its ground within the
    envelope, never louder than it. Authored once, read by both the resolver and the guard gate. */
export const DEPOSITION_ENVELOPE = {
    granulation: [0.28, 0.38] as const,
    breathDepthMax: 0.05,
    breathPeriodMin: 40,
    elongation: [1.0, 1.5] as const,
};

/** The D6 default deposition — the base a declared partial overrides, and the character a route with
    a `chromeIdentity` but no declared deposition wears (a moderate, in-envelope ground). */
export const DEFAULT_DEPOSITION: DepositionProfile = {
    granulation: 0.3,
    breathDepth: 0.04,
    breathPeriod: 44,
    elongation: 1.2,
    angle: 0,
};

/** THE NEUTRAL FLOOR deposition (D2.5) — the quietest, most isotropic still-water wash an unknown
    route wears: the lowest breath, isotropic nuclei, the PAPER_WASH granulation floor. */
export const NEUTRAL_DEPOSITION: DepositionProfile = {
    granulation: 0.3,
    breathDepth: 0.025,
    breathPeriod: 52,
    elongation: 1.0,
    angle: 0,
};

/** The NEUTRAL pole token — the warm recessive no-data paper (`--viz-no-data`). Both poles read it
    at bias-cap 0, so an unknown route reads a flat recessive paper wash, never a directional tide. */
export const NEUTRAL_POLE = "var(--viz-no-data)";

/** THE NEUTRAL ATMOSPHERE (D2.2 floor) — the exprs + cap + deposition a no-context / no-chrome route
    resolves to. The deliberate delta from the old USF-poles fallback (render-matrix-verified, D2.5). */
export const NEUTRAL_ATMOSPHERE = {
    warmExpr: NEUTRAL_POLE,
    coolExpr: NEUTRAL_POLE,
    biasCap: 0,
    deposition: NEUTRAL_DEPOSITION,
    rung: "neutral" as const,
};

/** CLAMP a declared (partial) deposition over a base into the D6 envelope (D2.3.2). Every field
    lands in-envelope: an in-envelope declaration is a NO-OP (the value-exact migration path), an
    out-of-envelope one is pulled to the nearest bound. `huePath`/`angle` pass through (character,
    not loudness). */
export function clampDeposition(
    declared: Partial<DepositionProfile> | undefined,
    base: DepositionProfile = DEFAULT_DEPOSITION,
): DepositionProfile {
    const m = { ...base, ...(declared ?? {}) };
    return {
        granulation: clampRange(
            m.granulation,
            DEPOSITION_ENVELOPE.granulation[0],
            DEPOSITION_ENVELOPE.granulation[1],
        ),
        breathDepth: clampRange(m.breathDepth, 0, DEPOSITION_ENVELOPE.breathDepthMax),
        breathPeriod: Math.max(m.breathPeriod, DEPOSITION_ENVELOPE.breathPeriodMin),
        huePath: m.huePath,
        elongation: clampRange(
            m.elongation,
            DEPOSITION_ENVELOPE.elongation[0],
            DEPOSITION_ENVELOPE.elongation[1],
        ),
        angle: m.angle,
    };
}

// ── THE GUARD PREDICATES (D2.3, gate-able) ───────────────────────────────────────────────────

/** Extract the PARTICIPATING token names of a colour expr — `var(--a)` and each `var(--…)` inside a
    `color-mix(...)`. The guard matches on token NAMES, not the full expr string (P2-B honest edge). */
export function participatingTokens(expr: string): string[] {
    return [...expr.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
}

/** GUARD ARM 1 (token-only poles, D2.3.1). A declared pole MUST be a `var(--…)`/`color-mix(…var(--…)…)`
    token expr resolvable through `resolveColorsBatch`; a colour LITERAL (`#fff`, `rgb(...)`, a named
    colour, or a `color-mix` of only literals) mints pigment outside tokens.css → a gate failure. */
export function isTokenExpr(expr: string): boolean {
    return participatingTokens(expr).length > 0;
}

/** The PLATFORM data-pole token names — the poles a data surface actually paints (the diverging /
    sequential ramps, the 14 rainbow tiers, the minted magnitude/register hues, the neutral). A
    declared pole's token must be one of these (page-glow IS data-glow, D2.3.3). */
export const DATA_POLE_TOKENS: ReadonlySet<string> = new Set<string>([
    "--viz-diverging-low",
    "--viz-diverging-mid",
    "--viz-diverging-high",
    "--viz-sequential-low",
    "--viz-sequential-high",
    "--viz-speedtest-bright",
    "--viz-demand-warm",
    "--viz-no-data",
    ...Array.from({ length: 14 }, (_, i) => `--rainbow-tier-${i + 1}`),
]);

/** An INSTANCE-private data-pole token (the vft note: vft's poles ride its `--vft-*` palette
    instance-side; the lib aggregate carries platform tokens only). An instance palette hue is a
    legitimate data pole for its own route. */
export function isInstancePaletteToken(name: string): boolean {
    return /^--vft-/.test(name);
}

/** GUARD ARM 3 (page-glow-is-data-glow membership, D2.3.3). Every participating token of a declared
    pole must be a data pole SOME surface on the route paints — a platform data token or an instance
    palette hue. A chrome-only register token (`--route-accent`, an eyebrow hue) is NOT a data pole. */
export function poleTokensAreData(expr: string): boolean {
    const tokens = participatingTokens(expr);
    if (tokens.length === 0) return false; // a literal is caught by arm 1, but is never data here
    return tokens.every(
        (t) => DATA_POLE_TOKENS.has(t) || isInstancePaletteToken(t),
    );
}

// ── THE RESOLUTION LADDER (D2.2) ─────────────────────────────────────────────────────────────

/** The resolved atmosphere SELECTION — unresolved pole EXPRS (the DOM resolution is `useAuroraConfig`'s
    job) + the bias-cap + the clamped deposition + which ladder rung produced the poles. */
export interface AtmosphereSelection {
    /** The warm pole EXPR (a token expr, or the neutral token) — resolved late via the palette bridge. */
    warmExpr: string;
    /** The cool pole EXPR — resolved late via the palette bridge. */
    coolExpr: string;
    /** The directional pole-lean cap (0.3 directional · 0 neutral). */
    biasCap: number;
    /** The clamped deposition character. */
    deposition: DepositionProfile;
    /** Which rung produced the POLES: a declared pole · the chromeIdentity leg (D6) · the neutral floor. */
    rung: "declared" | "chrome" | "neutral";
}

/** THE LADDER — turn a route's declared `atmosphere` + `chromeIdentity` into an `AtmosphereSelection`.
    Per-field: a declared pole → the chromeIdentity accentWarm/accentCool leg → NEUTRAL. Omitting the
    poles (but declaring deposition) is the TODO-free mechanical D6 default the 4 new routes ride
    until the fable consult authors their poles. The deposition ALWAYS clamps to the D6 envelope. */
export function selectAtmosphere(
    atmosphere: AtmosphereFacet | undefined,
    chrome: ChromeIdentity | undefined,
): AtmosphereSelection {
    const declaredWarm = atmosphere?.warm;
    const declaredCool = atmosphere?.cool;
    const chromeWarm = chrome?.accentWarm ?? chrome?.accent;
    const chromeCool = chrome?.accentCool ?? chrome?.accent;

    // The POLE rung: a declared pole wins; else the chromeIdentity leg (D6); else the neutral floor.
    const hasDeclaredPole = declaredWarm !== undefined || declaredCool !== undefined;
    const rung: AtmosphereSelection["rung"] = hasDeclaredPole
        ? "declared"
        : chrome
          ? "chrome"
          : "neutral";

    const warmExpr = declaredWarm ?? chromeWarm ?? NEUTRAL_POLE;
    const coolExpr = declaredCool ?? chromeCool ?? NEUTRAL_POLE;

    // BIAS CAP — declared wins; else derive: distinct chrome legs = directional (0.3), a single-hue
    // register or the neutral floor = 0 (magnitude/neutral has no pole to lean toward).
    const hasDistinctLegs =
        chrome?.accentWarm !== undefined &&
        chrome?.accentCool !== undefined &&
        chrome.accentWarm !== chrome.accentCool;
    const biasCap =
        atmosphere?.biasCap ??
        (rung === "neutral" ? 0 : hasDistinctLegs ? 0.3 : 0);

    // DEPOSITION — the neutral floor uses the still-water base; else the D6 default. Always clamped.
    const base = rung === "neutral" ? NEUTRAL_DEPOSITION : DEFAULT_DEPOSITION;
    const deposition = clampDeposition(atmosphere?.deposition, base);

    return { warmExpr, coolExpr, biasCap, deposition, rung };
}
