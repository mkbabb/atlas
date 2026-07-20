// contract/theme.ts — THE THEME NOUN (P-05 · THEME-FACILITY §2). The atlas never lacked themes; it
// lacked a theme NOUN. Every route's colour identity already existed, split across THREE declaration
// surfaces (three loose `DashboardContext` fields, the category skin registry, the route token
// sheets) with TWO `--route-*` writers disagreeing on the same token (T-1). This module gathers
// them: ONE type, ONE named default (`AMERICA` — the substrate the platform `:root` already is),
// ONE binder, and the closed re-point roster the CSS arm is audited against (Laws C-1..C-3). An
// EXTRACTION, not an invention — no pigment is minted here, and nothing in glass-ui changes: a
// theme suffuses the glass surfaces by re-pointing the semantic layer on the route marker, by NAME.

import type { AtmosphereFacet, ChromeIdentity } from "./types.js";

/** A data pole's SUBJECT registration — the seat dial 16's pole-grammar ruling lands in. `token` is
    a custom-property NAME (the same no-minted-pigment guard the atmosphere poles carry); `subject`
    is the editorial noun the pole wears on this route ("net receivers"), DATA for deks and legends.
    The `color.css` pole comments CITE this field instead of re-asserting a subject freehand, so the
    inversion that let §VIZ's prose contradict the live pixels (T-3) becomes unrepresentable. */
export interface PoleSubject {
    /** The pole's token name (e.g. `"--viz-diverging-low"`). */
    token: string;
    /** The editorial noun the pole carries on this route (e.g. `"net receivers"`). */
    subject: string;
}

/** THE ATMOSPHERE INTENSITY REGISTER (A-36 · spec-atmosphere §d.1) — the declared loudness of a
    route's aurora ground, and the ONLY dial a route turns. Seven routes hand-tuned seven deposition
    blocks that a single clamp then flattened into one subliminal wash; three shared presets replace
    all seven. `quiet` is a first-class occasional register, `data` is what an undeclared route
    wears, `hero` is the one loud move a corridor is allowed (≤1 per corridor) and the only preset
    that may EVER reach the shader. The preset → envelope table itself lives with the resolver
    (`platform/chrome/background/composables/atmosphere.ts` — `ATMOSPHERE_PRESETS`).

    THE ONE HOME (H-1): the intensity is declared on `Theme.atmosphere` and NOWHERE else — a second
    `context.atmosphere.intensity` surface is exactly the split declaration the theme noun was
    minted to kill, and `AtmosphereFacet` no longer carries a raw `deposition` block for a theme to
    smuggle one through (β-F-1). */
export type AtmosphereIntensity = "quiet" | "data" | "hero";

/** THE THEME — a dashboard's colour identity as ONE declared noun (the fields re-homed, not
    re-invented, so every seam that cites `ChromeIdentity`/`AtmosphereFacet` survives a one-hop path
    change). A route declares it on its context; an undeclared route IS `AMERICA` (§2.2). */
export interface Theme {
    /** The registry/prose identity ("america", "spectrum", "earthtone") — documentary, NOT a CSS
        selector (the CSS arm scopes on the extant `html[data-dashboard]` marker, Law C-1). It is
        the prose-citation anchor, the wave-sheet label, and the π/DELTA acceptance vocabulary. */
    name: string;
    /** The chrome legs — the `--route-*` group the ONE binder writes. Values stay
        `var(--viz-*)`/`var(--rainbow-*)` token references, so a theme flip retunes them for free. */
    chrome: ChromeIdentity;
    /** The declared atmosphere — poles + bias cap + intensity, resolved late by the platform aurora
        ladder (declared pole → the `chrome` warm/cool leg → the neutral floor). */
    atmosphere?: AtmosphereFacet;
    /** The dock SPECTRUM — an ordered base→apex ramp for a route whose chrome register is a
        spectrum, not one hue (SCI's rainbow, ECF's sequential). Undefined ⇒ the route tritone. */
    barometerRamp?: readonly string[];
    /** THE POLE GRAMMAR (dial 16, RULED: receivers wear warm, payers go cool) — the subject each
        data pole carries on this route. Prose and legends read `poles.*.subject` for their nouns;
        the pole comments in `color.css` cite it. Undefined ⇒ the route names no pole subjects. */
    poles?: { warm: PoleSubject; cool: PoleSubject };
}

/** Freeze-and-return — the `defineSkin` idiom applied to the theme noun. */
export function defineTheme<const T extends Theme>(theme: T): Readonly<T> {
    return Object.freeze(theme);
}

/** THE DEFAULT — the owner's "america theme of USF", library-owned: the platform `:root` substrate
    (coral↔blue diverging poles, cream paper, NCSU-red chrome) plus USF's coral-led legs, which is
    why the flagship declares NOTHING and still wears its identity. The chrome legs are the usf
    context's verbatim; the atmosphere carries the poles + cap only — usf's hand-tuned deposition
    block does not survive as an authored block anywhere, library included. No `barometerRamp`
    (USF's dock is the single-accent fade) and no `name`-cased ceremony: an undeclared route IS
    america by construction, not by convention. */
export const AMERICA: Readonly<Theme> = defineTheme({
    name: "america",
    chrome: {
        accent: "var(--viz-diverging-low)",
        accentWarm:
            "color-mix(in oklab, var(--viz-diverging-low), var(--viz-diverging-high))",
        accentCool: "var(--viz-diverging-high)",
        eyebrowHue: "var(--viz-diverging-low)",
    },
    atmosphere: {
        warm: "var(--viz-diverging-low)",
        cool: "var(--viz-diverging-high)",
        biasCap: 0.3,
    },
    poles: {
        warm: { token: "--viz-diverging-low", subject: "net receivers" },
        cool: { token: "--viz-diverging-high", subject: "net payers" },
    },
});

/** THE EARTH REGISTER (T-4) — the botanical journal's theme: shadyshroom primary, moss/sage/ochre
    legs, the ppmycota violet ledgered to the crest. Defined library-side because its SHEET
    (`vft-tokens.css`) is the flagship Law C-1..C-3 proof the facility was traced from — the sheet
    and the noun are one artefact, and W-VFT declares this constant rather than re-authoring it.
    The sheet's hand-copied `--ink-*` block is REDUNDANT under Law C-1 (the root marker re-derives
    every ink through the cascade) and has drifted stale (0.52 against the tightened 0.47 body
    band): W-VFT deletes it. This theme names no `poles` — the pole SUBJECTS are the USF
    payer/receiver grammar (dial 16), which a germination journal has no analogue for. */
export const EARTHTONE: Readonly<Theme> = defineTheme({
    name: "earthtone",
    chrome: {
        accent: "var(--vft-accent)",
        accentWarm: "var(--vft-ochre)",
        accentCool: "var(--vft-moss)",
        eyebrowHue: "var(--vft-moss)",
    },
    atmosphere: {
        warm: "var(--vft-viz-low)",
        cool: "var(--vft-viz-high)",
        biasCap: 0.2,
        // the CHROMA hero (§d.1's assignment) — vft's loud beat is INTERIOR (VI.2), so the cover
        // leg of the shader AND-gate never closes here: rich field, no WebGL.
        intensity: "hero",
    },
    barometerRamp: ["var(--vft-sage)", "var(--vft-ochre)", "var(--vft-accent)"],
});

/** THE ONE BINDER — the `--route-*` custom-property group, bound on the route subtree by the
    platform shell. It replaces BOTH retired writers (the shell's own route-identity bind and the
    category skin's essay-subtree bind, which disagreed on the same token — T-1), so one token has
    one author. The OUTPUT contract is unchanged: every `--route-*` consumer (the dock rivets, the
    eyebrow icon, the legend chip) reads exactly what it read before. */
export function themeCssVars(theme: Theme): Record<string, string> {
    const { chrome } = theme;
    const style: Record<string, string> = { "--route-accent": chrome.accent };
    if (chrome.accentWarm) style["--route-accent-warm"] = chrome.accentWarm;
    if (chrome.accentCool) style["--route-accent-cool"] = chrome.accentCool;
    if (chrome.eyebrowHue) style["--route-eyebrow-hue"] = chrome.eyebrowHue;
    return style;
}

/** LAW C-2 · THE CLOSED RE-POINT ROSTER — the ONLY tokens a theme sheet may re-point: the glass-ui
    semantic layer (the seam by which a theme suffuses every glass surface with zero glass-ui
    change) INCLUDING its categorical `--chart-{1..5}` ramp (the same seam class as
    `--viz-category-*`, and the earthtone sheet's proven alias onto its botanical ramp), the
    platform data poles, the chrome accent pair, the surface finish, and the ONE non-colour member:
    `--rank-grow-lede`, the ranked-crown track claim a route tunes as a MEASURE (usfi's crown needs
    3 where the platform default is 2) — a route measure is as much theme as a hue — and the three
    READING rungs a route may set its own register on (`--type-kicker` · `--type-heading-section` ·
    `--type-prose-muted`/`-lh`). Those four are the retirement of the vft DUAL LADDER (W-70 arm b):
    a journal that reads a golden step above the dense-atlas default used to fork the RECIPES on its
    marker, which shadowed the token ladder with a second one. Re-pointing the rung keeps ONE ladder
    and one locus — the route turns the platform's own dial instead of standing up a rival. NOT here, by
    law: `--rainbow-tier-*` (the stops ARE the data), `--route-*` (JS-bound — one writer),
    `--emphasis-record` (DERIVED off the warm pole — re-point the pole, not the record), and
    `--ink-*` (DERIVED: Law C-1's root-marker scoping re-derives them through the cascade, and a
    hand copy drifts — the T-4 finding). */
export const THEME_REPOINT_ROSTER: readonly string[] = [
    "--background", "--foreground", "--card", "--card-foreground", "--popover",
    "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
    "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
    "--accent-foreground", "--destructive", "--destructive-foreground", "--border",
    "--input", "--focus-ring-color",
    "--viz-diverging-low", "--viz-diverging-mid", "--viz-diverging-high",
    "--viz-sequential-low", "--viz-sequential-high", "--viz-no-data", "--viz-grid",
    "--viz-category-1", "--viz-category-2", "--viz-category-3", "--viz-category-4",
    "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
    "--cp-accent", "--cp-accent-ink",
    "--paper-grain-opacity", "--glass-under-shadow-quiet", "--glass-under-shadow-default",
    "--glass-under-shadow-vivid", "--glass-key-direction",
    "--rank-grow-lede",
    "--type-kicker", "--type-heading-section", "--type-prose-muted", "--type-prose-muted-lh",
];

/** The Law C-1/C-2 audit over a theme sheet's TEXT: every custom-property declared under the route
    marker must be a roster member OR a `--<namespace>-*` mint of the sheet's own (the
    namespace-intermediate clause — both shipped sheets already embody it: a sheet mints its pigment
    into its own namespace and resolves roster members to `var(--<namespace>-*)` references).
    Returns the offending property names, in source order, so an ordinary test can assert `[]`.
    Route FIX rules carry no `--*:` declarations and pass through untouched. */
export function themeSheetViolations(css: string, namespace: string): string[] {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const mint = `--${namespace}-`;
    const out: string[] = [];
    // Innermost rules only (`[^{}]` never spans a brace), so a `@media` wrapper yields the rule it
    // wraps — the forced-colors arm is audited exactly like the light one.
    for (const [, selector, body] of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!selector.includes("[data-dashboard")) continue;
        for (const [, prop] of body.matchAll(/(--[\w-]+)\s*:/g)) {
            if (!prop.startsWith(mint) && !THEME_REPOINT_ROSTER.includes(prop)) {
                out.push(prop);
            }
        }
    }
    return out;
}
