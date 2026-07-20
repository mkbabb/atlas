// skin/brand.ts — THE BRAND POLE LADDER (A-25). A brand surface (the home cover, a `/c/*`
// category home) is not a dashboard: it injects no `DashboardContext`, so it declared no `Theme`,
// so the aurora resolved BOTH poles to the neutral floor and every one of them composited the same
// flat `--viz-no-data` beige. That is the NULL-WASH TRAP, and it was live on every category home.
//
// THE CURE IS A SOURCE, NOT A SECOND LADDER. The platform already owns one pole ladder — the D2.2
// resolution in `selectAtmosphere` (a declared pole → the theme's `chrome` warm/cool leg → NEUTRAL).
// A-25's four rungs map onto it exactly, so this module mints NO resolution logic: it builds the
// `Theme` a brand surface never had, choosing WHICH rung feeds it, and the extant ladder resolves it.
//
//   ① declared brand poles → the `atmosphere` poles (the surface names its own field outright)
//   ② the category accent  → the `chrome` legs: the accent LEADS, its receded twin follows
//   ③ the card roster      → the `chrome` legs: the roster's first ↔ last (the platform's own span)
//   ④ NEUTRAL             → `undefined` — no theme at all, so the extant ladder falls to its own
//                            neutral floor. NEUTRAL is reachable ONLY here, as the LAST rung; it is
//                            never the default wash again.
//
// RUNG ② IS THE ACCENT BREATHED ONTO PAPER, NOT PAINTED ON IT. A category declares ONE accent, and
// a field needs two poles to lean — so both poles are the accent walked back toward the platform's
// own recessive paper, at two different distances. Mixing toward `--viz-no-data` mints no pigment.
// The DISTANCES were set by eye at :5173, not by arithmetic: the raw accent as the warm pole paints
// the whole surface one saturated hue (measured `rgb(56,141,101)` behind /c/connectivity — a green
// PAGE, not paper under a green field), because a brand cover has no opaque data plates to hide its
// ground the way a dashboard does. Walking the warm pole a third of the way back and the cool pole
// most of the way restores the paper and leaves the subject unmistakable.

import type { AtmosphereIntensity, Theme } from "../contract/index.js";

/** The pigment a pole recedes INTO — the platform's warm recessive no-data paper (the same token
    the neutral floor wears, so rung ② and rung ④ share one ground and only the lean differs). */
const GROUND = "var(--viz-no-data)";

/** How far each rung-② pole walks back toward the ground. The GAP between them is the field's lean;
    the DISTANCE of the nearer one is how much paper survives. */
const RECESSION = { warm: "20%", cool: "62%" } as const;

/** A pole receded toward the paper ground in OKLab, by a named distance. */
function recede(accent: string, by: string): string {
    return `color-mix(in oklab, ${accent}, ${GROUND} ${by})`;
}

/** The pole source a brand surface can offer, richest rung first. Every field is optional: the
    ladder takes the first one present, and a source that offers nothing resolves to NEUTRAL. */
export interface BrandFieldSource {
    /** ① The poles this surface DECLARES — the top rung, for a surface that names its own field. */
    poles?: { warm: string; cool: string };
    /** ② The category's own accent (`CategorySkin.accent`) — the `/c/*` identity rung. */
    categoryAccent?: string;
    /** ③ The card roster's accents in gallery order — the home's rung, the platform's whole span. */
    roster?: readonly string[];
    /** The loudness rung the surface wears (`ATMOSPHERE_PRESETS`). Omitted ⇒ the platform default. */
    intensity?: AtmosphereIntensity;
}

/** Which rung of the A-25 ladder produced a brand surface's poles — the falsifiable half: an
    acceptance probe reads this and asserts `"neutral"` appears ONLY where nothing was offered. */
export type BrandPoleRung = "declared" | "category" | "roster" | "neutral";

/** The rung `brandTheme` would take for a source — exported so the ladder's PRECEDENCE is testable
    against the shipped function, not a transcription of it. */
export function brandPoleRung(source: BrandFieldSource): BrandPoleRung {
    if (source.poles) return "declared";
    if (source.categoryAccent) return "category";
    if (source.roster && source.roster.length >= 2) return "roster";
    return "neutral";
}

/**
 * THE LADDER (A-25) — a brand surface's pole source as the `Theme` it never declared.
 *
 * Returns `undefined` at the NEUTRAL rung, which is the point: a surface with no pole source hands
 * the aurora no theme, and the extant D2.2 ladder falls to its own neutral floor — one neutral
 * floor on the platform, reached one way, as the LAST rung. Every richer rung returns a theme whose
 * poles the SAME ladder resolves, so a brand field and a dashboard field are painted by one path.
 *
 * The chrome legs are the carrier for rungs ②/③ (not the `atmosphere` poles) so the surface also
 * gets its `--route-*` group from `themeCssVars` — a category home's chrome and its field then read
 * the same accent by construction, which is what "the category identity field" (H14) asks for.
 */
export function brandTheme(source: BrandFieldSource): Theme | undefined {
    const rung = brandPoleRung(source);
    if (rung === "neutral") return undefined;

    const atmosphere = { intensity: source.intensity };

    if (rung === "declared") {
        const { warm, cool } = source.poles!;
        return {
            name: "brand",
            chrome: { accent: warm, accentWarm: warm, accentCool: cool },
            atmosphere: { ...atmosphere, warm, cool, biasCap: 0.3 },
        };
    }

    // ②/③ — the chrome legs ARE the poles. Distinct legs ⇒ the ladder derives the directional
    // bias cap itself (0.3); no `biasCap` is declared here, so the derivation stays in one place.
    const [warm, cool] =
        rung === "category"
            ? [
                  recede(source.categoryAccent!, RECESSION.warm),
                  recede(source.categoryAccent!, RECESSION.cool),
              ]
            : [source.roster![0], source.roster![source.roster!.length - 1]];

    // `accent` stays the UNRECEDED hue: the chrome group is the category's ink (the eyebrow, the
    // rule, the chip), which must read at full strength — only the FIELD recedes.
    return {
        name: "brand",
        chrome: {
            accent: rung === "category" ? source.categoryAccent! : warm,
            accentWarm: warm,
            accentCool: cool,
        },
        atmosphere,
    };
}
