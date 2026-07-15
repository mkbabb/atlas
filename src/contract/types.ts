import { inject, type Component, type InjectionKey, type VNodeChild } from "vue";
import type { ColorKind } from "@/charts/scale/colorKind";
import type { VizContract } from "@/charts/contract/viz-contract";
import type { ChapterScene } from "@/charts/contract/scene-contract";

// The dashboard registry contracts. Structural (duck-typed), not OO: a dashboard
// is whatever a `meta.ts`/`dashboard.ts` pair under dashboards/<slug>/ exports.
// Mirrors the slides deck/types.ts split — a cheap eager half (the gallery card)
// and a heavy lazy half (the dashboard body), so listing never pulls a chunk.

/** The human grain of an entity row — what one mark on the dashboard counts. */
export type EntityGrain = "state" | "district" | "entity";

/** The gallery's NARRATIVE-FAMILY axis (J-STORY §11 / J-FEEDBACK-4 §6 A9 · C33) — the
    scale-conditional grouping the contents page sections by. A reader seeks by WHAT a route
    answers (the fund MONEY, the CONNECTIVITY, the measured OUTCOME), not by an arbitrary order:
      · `funds`        — the fund-money routes (USF · demand · ECF).
      · `connectivity` — the connectivity routes (SCI).
      · `outcomes`     — the measured-outcome routes (speedtest).
    A small CLOSED union — omittable, falling to a 'More' section — so a new route slots into a
    family with zero ceremony, and the grouping SCALES (when one family exceeds the grid, the
    deferred within-section scroller earns its place; at N=5 the sectioned grid shows all). */
export type DashboardCategory = "funds" | "connectivity" | "outcomes";

/** A card's FLAGSHIP-FIGURE TEASER (B4 · design-speedtest-gallery §114) — the route's ONE
    crown number, surfaced on the gallery cover as a small audacious fund-hue numeral so the
    contents page previews each route's magnitude. PRE-FORMATTED here (a display string + an
    accessible label), NOT a raw number: the gallery is meta-only (the eager-context defer —
    it never imports a dashboard's feed/format chain), so the figure is stamped at its
    data-truthful settled value with the SOURCE traced in each `meta.ts` comment. DATA-TRUTH:
    the value is the route's own crown (the figure the dashboard itself renders), never invented. */
export interface FlagshipFigure {
    /** The formatted crown numeral the card shows (e.g. "$83.5B", "262", "7.36×"). */
    value: string;
    /** The unit/caption beside or under the numeral (e.g. "Mbps median", "disbursed"). */
    unit?: string;
    /** The full accessible label the card announces (the numeral + unit read in plain words). */
    label: string;
}

/** Cheap card metadata — lives in each dashboard's `meta.ts` (eager-loaded for the
    gallery, so listing dashboards never pulls in their feature/chart chunks). */
export interface DashboardMeta {
    /** URL handle — defaults to the dashboard folder name when omitted. */
    slug?: string;
    /** Plate name (Fraunces title on the card). */
    title: string;
    /** The card EYEBROW kicker (J-STORY §11 de-collision · J-FEEDBACK-2 [F6]) — a SHORT 2–3-word
        program register the gallery card's `<Badge>` eyebrow pill carries, DISTINCT from `title`
        (the pill must not byte-echo the `<h2>` — the worst case is the question-form titles
        stamping the whole interrogative twice). The COPY is J-VOICE's to mint (the card-eyebrow
        register); J-STORY names the de-collision requirement (pill ≢ title) + binds the pill to it.
        Omit ⇒ the card shows NO eyebrow pill (never the title echoed). */
    kicker?: string;
    /** The card dek — the dashboard's thesis as a question (finding-as-prose). */
    summary?: string;
    /** The accent chip tint (a chrome-register brand color, never a data fill). */
    accent?: string;
    /** The entity grain one row measures — drives the card's grain hint. */
    entityGrain?: EntityGrain;
    /** The years the dashboard spans — the multi-year spine, drives the year hint. */
    years?: number[];
    /** The card's flagship-figure teaser (B4) — the route's ONE crown number, previewed on the
        gallery cover. Pre-formatted + source-traced in each `meta.ts`. Omit ⇒ no teaser numeral. */
    flagship?: FlagshipFigure;
    /** ISO date the dashboard was last updated; sorts the gallery newest-first. */
    updated?: string;
    /** The gallery NARRATIVE-FAMILY group (J-STORY §11 / J-FEEDBACK-4 §6 A9 · C33) — the
        scale-conditional contents-page axis (funds → connectivity → outcomes). Omit ⇒ the route
        falls to the 'More' section. A STRUCTURE facet (a closed union), not a copy register. */
    category?: DashboardCategory;
}

/** The heavy half — each dashboard's `dashboard.ts` lazily resolves to the body
    component that the DashboardView mounts (so each dashboard code-splits). */
export interface DashboardContent {
    component: Component;
}

/** Registry entry — the metadata plus a lazy loader for the body component and the
    (eager, cheap) chrome context the active dashboard provides to the shell. */
export interface DashboardEntry extends DashboardMeta {
    /** The resolved URL handle (meta.slug or the folder name). */
    slug: string;
    /** Lazily import the dashboard body component. */
    load: () => Promise<Component>;
    /** The dashboard's chrome contract (the seam the Dock/filter read). Discovered
        eagerly from the folder's context.ts; undefined until a dashboard declares one. */
    context?: DashboardContext;
}

// ── The DashboardContext seam (G10 §4) ──────────────────────────────────────
// The small typed contract the generic chrome reads through provide/inject. One
// shell — the Dock, the floating filter, the hover card — reads the ACTIVE
// dashboard's context, so there is no USF-hard-coding in the chrome and no
// per-dashboard chrome fork. A dashboard PROVIDES this once (in DashboardView);
// every chrome part INJECTS DASHBOARD_KEY and renders against it.

/** A single dock entry. The `kind` discriminates two navigation registers under
    ONE component: a "beat" scrolls to an in-page section (the USF scroll-stepper),
    a "view" routes to a sibling URL (the SCI/ECF tab-nav). */
export type DockNavItem =
    | {
          /** In-page section beat — the dock scrolls to `id` (smooth, top-aligned). */
          kind: "beat";
          /** The target element id (e.g. "section-map"). */
          id: string;
          /** The accessible label (also the icon tooltip). */
          label: string;
          /** The glyph — a Lucide (or any Vue) icon component. */
          icon: Component;
      }
    | {
          /** Sibling-view tab — the dock routes to `to` (a RouterLink target). */
          kind: "view";
          /** The router destination (a path or a route-location object). */
          to: string;
          /** The accessible label (also the icon tooltip). */
          label: string;
          /** The glyph — a Lucide (or any Vue) icon component. */
          icon: Component;
      };

/** The active dashboard's chrome contract — six-plus fields, the anti-manifest
    seam (G10 §4.1). The chrome reads ONLY this; it never imports a dashboard. */
export interface DashboardContext {
    /** Stable id (usually the slug) — keys the active context. */
    id: string;
    /** The plate title the chrome surfaces (the dashboard's name). */
    title: string;
    /** The brandmark glyph the dock renders top-of-rail (a monogram like "U"). */
    brand: string;
    /** The flagship route — where the brandmark and the gallery card point. */
    flagshipRoute: string;
    /** The dock entries — section beats or sibling-view tabs (the same component). */
    nav: DockNavItem[];
    /** The per-route chrome-identity profile (design-palette-identity §2.4) — the `--route-*`
        custom-property group DashboardView binds on the route subtree. Undefined ⇒ the tokens.css
        neutral defaults govern (the gallery/about fallthrough). */
    chromeIdentity?: ChromeIdentity;
    /** An ordered multi-stop ramp (base → apex) for a dashboard whose chrome register is a
        SPECTRUM, not one hue — the Dock threads it into the Barometer's Layer A so the dock
        thread carries the dashboard's signature ramp (SCI's rainbow, ECF's sequential). Each
        entry is a CSS colour (a `var(--rainbow-signature-*)`/`var(--viz-sequential-*)` ref or
        any colour). This is the seam that REPLACES the deleted `*-chrome.css` `!important`
        barometer overrides (T-7). Undefined ⇒ the Barometer's single-`accent` fade (USF). */
    barometerRamp?: readonly string[];
    /** The row key the selection/filter machinery joins on (e.g. "fips"). */
    selectionKey: string;
    /** Whether the dashboard spans multiple years (drives the year affordance). */
    hasMultiYear: boolean;
    /** Cross-dashboard hand-offs — a URL hand-off carrying the shared selection key
        (e.g. the ECF↔USF `fips` DNA), never a shared store (G10 §7.3). */
    crossLinks?: { label: string; to: string }[];
    /** O-LIB-CARRY (v1.0.29) — years to render as data-absent NOTCHES on the dashboard's own
        `FilterPanel`-hosted `YearScrubber` (the O-D10-LIB `dimYears` lever, v1.0.28, threaded the
        rest of the way): `FilterPanel` reads this field off the injected context and forwards it
        straight to the scrubber, so a dashboard wires a per-year data-presence set with ONE field
        on its own `context.ts` — no FilterPanel/DashboardView edit, mirroring `crossLinks`/
        `hasMultiYear` (the panel already reads THOSE off this same context, never prop-drilled
        from the mount site). A GETTER, not a stored `Ref` (mirrors `useYearScope`'s own
        `scrollYearGetter` convention — a function is never auto-unwrapped by Vue's reactive
        typing; calling it inside a `computed` establishes the dependency through whatever live
        source it closes over, with no ref-of-ref stored here). Undefined ⇒ no dimming
        (byte-identical to every dashboard that doesn't declare one). */
    dimYears?: () => ReadonlySet<number> | readonly number[];
    /** Optional filter-algebra readout rendered above the selection controls. */
    algebraBody?: Component;
    /** The dashboard's floating-filter BODY — the controls the generic FilterShell
        renders inside its chrome. The chrome owns the frame; the body owns its logic
        (its own reset/apply). Undefined ⇒ the dashboard has no floating filter. */
    filterBody?: Component;
    /** THE DECLARED ATMOSPHERE FACET (N.WD2 §4.D2 — the ruled departure from the hardcoded
        Aurora slug-switch). A route may DECLARE the two data poles + the deposition character its
        page-glow paints, resolved late by the platform aurora. The resolution ladder is per-field:
        a declared pole → the `chromeIdentity` accentWarm/accentCool leg (the D6 default) →
        `NEUTRAL_ATMOSPHERE` (an unknown route never wears USF's tide). Omitting `warm`/`cool`
        leaves the poles to the mechanical D6 derivation (the TODO-free default) while still
        authoring the route's deposition; omitting the whole facet falls to the D6 derivation. The
        recessive laws (the opacity ceiling, the PAPER_WASH floor, the deposition envelope clamp)
        stay resolver-side and UNDECLARABLE — a route can lean its field, never make it loud. */
    atmosphere?: AtmosphereFacet;
}

/** THE ATMOSPHERE HUE-PATH — the palette-interpolation arc for the aurora ramp (mirrors glass-ui's
    `AuroraHuePath`/value.js `HueInterpolationMethod`, declared here so the contract owns no glass-ui
    import). `increasing` sweeps the spectrum floor→apex (the SCI band-cake signature); omit for the
    clean OKLab-rectangular blend (diverging / single-hue magnitude). */
export type AtmosphereHuePath = "shorter" | "longer" | "increasing" | "decreasing";

/** THE PER-ROUTE DEPOSITION SIGNATURE (N.WD2 §4.D2.3 — f6-atmosphere §2.4, adopted canon). The
    deposition CHARACTER of a route's aurora ground: crayon-tooth density, breath, hue-arc, and the
    warm-nucleus aspect. Every field CLAMPS to the D6 envelope resolver-side (granulation ∈
    [0.28, 0.38] · breathDepth ≤ 0.05 · breathPeriod ≥ 40 · elongation ∈ [1.0, 1.5]) — the declared
    value leans the field within the envelope but can never breach it. */
export interface DepositionProfile {
    /** The crayon-tooth density. Clamped to [0.28, 0.38] (the PAPER_WASH-anchored envelope). */
    granulation: number;
    /** The per-route breath CEILING (the live depth the scroll-motion gate rides). Clamped ≤ 0.05
        — always below the JND-loop floor, so the ground never reads as a loud pulse. */
    breathDepth: number;
    /** The breath period (s). Clamped ≥ 40 — a route may breathe slower (calmer), never faster. */
    breathPeriod: number;
    /** The palette-interpolation arc (`increasing` = the SCI spectral sweep); omit for the clean
        OKLab-rectangular blend. */
    huePath?: AtmosphereHuePath;
    /** The warm-nucleus Gaussian aspect (1 = isotropic still water; 1.4 = USF horizontal currents).
        Clamped to [1.0, 1.5]. */
    elongation: number;
    /** The warm-nucleus major-axis angle (deg, CSS-top-origin). 0 = horizontal currents. */
    angle: number;
}

/** THE DECLARED ATMOSPHERE FACET (N.WD2 §4.D2.2). The two poles are CSS token EXPRS
    (`var(--…)`/`color-mix(...)`), late-resolved through the platform palette bridge's
    `resolveColorsBatch` — a colour LITERAL is a guard failure (no minted pigment outside
    tokens.css), and each declared pole must be a pole some DATA surface on the route paints
    (page-glow IS data-glow). Both poles are OPTIONAL: omit them to leave the poles to the
    mechanical D6 (chromeIdentity) derivation while still authoring the deposition. */
export interface AtmosphereFacet {
    /** The warm data pole — a CSS token EXPR. Omit ⇒ the D6 `chromeIdentity.accentWarm` derivation. */
    warm?: string;
    /** The cool data pole — a CSS token EXPR. Omit ⇒ the D6 `chromeIdentity.accentCool` derivation. */
    cool?: string;
    /** The directional pole-lean cap: 0.3 directional (the default) · 0 magnitude/neutral (no lean —
        a magnitude ramp encodes no direction). */
    biasCap?: number;
    /** The route's declared deposition character (clamped to the D6 envelope resolver-side). A
        `Partial` — declared fields override the deposition default; the rest fall to it. */
    deposition?: Partial<DepositionProfile>;
}

/** The per-route CHROME-IDENTITY profile (design-palette-identity §2.4 MOVE 4 — the keystone).
    The route declares its chrome palette ONCE here; DashboardView binds it as the `--route-*`
    custom-property GROUP on the route subtree (the `DashboardView` `--route-*` inline-`:style`
    bind), so every chrome surface (dock rivets via `rivetHue()`, the eyebrow icon, the legend
    chip) reads ONE route-resolved token — never a `[data-dashboard]` stylesheet fork (the
    C1-retired anti-pattern), never a per-component accent prop. All VALUES are token REFERENCES
    (`var(--viz-diverging-high)` etc.), so a theme flip retunes them for free; the tokens.css
    neutral defaults (`--route-accent: var(--viz-diverging-high)` …) are the fallthrough when a
    route declares no profile (the gallery/about). A directional route declares a DISTINCT warm +
    cool leg so the dock rail reads as a ≥3-hue colour INDEX at rest (G1/G2/SM-2). */
export interface ChromeIdentity {
    /** The route's primary chrome accent (`--route-accent`) — the dock active-adjacent hue, the
        eyebrow/CTA fallback. A `var(--viz-*)`/`var(--rainbow-*)` token reference. */
    accent: string;
    /** The warm leg (`--route-accent-warm`) — the second dock-rivet hue. Omit ⇒ the accent. */
    accentWarm?: string;
    /** The cool leg (`--route-accent-cool`) — the third dock-rivet hue. Omit ⇒ the accent. */
    accentCool?: string;
    /** The section-eyebrow icon tint (`--route-eyebrow-hue`). Omit ⇒ the accent. */
    eyebrowHue?: string;
}

/** The provide/inject token the chrome reads the active context through. */
export const DASHBOARD_KEY: InjectionKey<DashboardContext> =
    Symbol("dashboard-context");

/** Read the active dashboard context, or `undefined` outside a providing route (the
    gallery/about shell, a story/preview harness). Never throws — the befitting-silent
    default for a chrome primitive most call sites already treat as optional. */
export function useOptionalDashboardContext(): DashboardContext | undefined {
    return inject(DASHBOARD_KEY);
}

/** Read the active dashboard context. THROWS when no route has provided one
    (fail-explicit — for a call site that is ONLY ever mounted inside a dashboard route
    and should never silently degrade). Most chrome call sites want the optional form
    above; reach for this one when a missing provider is a genuine bug. */
export function useDashboardContext(): DashboardContext {
    const ctx = useOptionalDashboardContext();
    if (!ctx) {
        throw new Error(
            "useDashboardContext(): no dashboard context provided — this component must " +
                "mount inside a route that provides DASHBOARD_KEY (see views/DashboardView.vue).",
        );
    }
    return ctx;
}

// ── The data-provenance contract (L6-PROVENANCE · Fork 10) ───────────────────
/** The provenance LIFECYCLE of a dashboard's source-of-record — HOW its data arrived.
    A DATA fact, NOT a card-display fact: it lives in each `reports/<slug>/data-provenance.md`
    front-matter (`kind:`), NEVER on `DashboardMeta`. `sci/meta.ts` eager-imports its snapshot,
    so coupling provenance to the meta contract would force the coverage gate to pull the whole
    snapshot feed-chain just to read one enum — homing it report-side keeps the gate pure
    (string-ops only, no mount, no snapshot import). The 3 ACTIVE members:
      · `seeded`              — a committed, manually-swapped frame (frozen / illustrative).
      · `seeded-on-cycle`     — re-baked on a fixed cadence (the annual pipeline products).
      · `continually-updated` — proxied/refreshed continuously (the live upstream feed).
    The deferred `live-updated` 4th member waits H6 (the live-feed arc) — it is the gate's
    VALIDITY NEG fixture, NOT a member until then. The union is small + closed; a new member
    extends it additively. */
export const PROVENANCE_KINDS = [
    "seeded",
    "seeded-on-cycle",
    "continually-updated",
] as const;
export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number];

// ── The declarative essay (I3 §1) ───────────────────────────────────────────
// THE BODY-AS-DATA THESIS (I3): a dashboard's narrative is a `Chapter[]` the route
// declares ONCE in its `context.ts`, and the nav is a PROJECTION of it
// (`nav = chapters.filter(isBeat).map(toNavItem)`) so the dock's "Step N of M" and the
// body's beat order read ONE source and cannot drift. `DashboardEssay.vue` iterates the
// array and mounts the FigureInitial + eyebrow + title + dek + AnimatedRule + the
// `section-anchor beat` wrapper + the reveal binding ONCE per chapter — the single
// scaffold the three bodies (usf/sci/ecf) collapse onto.

/** A chapter's title CARRIER. A plain `string` renders as bare `<h2>` slot text; a
    render-slot factory (`() => VNodeChild`) carries the live VNode the body composes —
    a `<HandMark>` picked-out word, a `<ScrollLetteringHeading>` glyph-scrubbed
    title — so the host renders BOTH without per-body branching (it just renders the
    string, or invokes the factory in the `<h2>`). The factory form is how a body keeps
    its scroll-lettering / hand-underline title under the declarative scaffold. */
export type ChapterTitle = string | (() => VNodeChild);

/** The viz a chapter mounts in its beat body. A feature-plate `Component` (the plate owns
    its own `VizContract`/`VizPlate`, the way the bodies mount `<FundLedgerFlow />` today)
    OR a declared `VizContract` (the I2 contract the host can render through `VizPlate`
    directly) OR a page-level sentinel — `"hero"` (the page cover) / `"colophon"` (the
    page foot) — for the two non-plate beats the essay still scaffolds. The E8 designed
    void routes through the contract's `isEmpty()` + `voidReason` (the I2 PlateVoid seam),
    so an empty chapter renders its named void inside the scaffold, never a gap. A `ChapterScene`
    (K-SCENE) is the COMPOSITIONAL archetype member — a pinned-graphic stepped narrative the
    `<StickyScene>` host renders; its `graphic` stays type-free (a scene NEVER names a picture, D5). */
export type ChapterViz =
    | Component
    | VizContract
    | ChapterScene
    | "hero"
    | "colophon";

/** The motion facet of a chapter (I3 §2 / §8) — how the beat REVEALS, mapped onto the
    `Beat`/`scroll-driven.css` reveal tiers (the F6.3 seam), plus the optional asymmetric
    grid-break flag. The host derives the `AnimatedRule :seed` cadence from the chapter
    INDEX (the SM-1/`:seed` drift folds), so a chapter declares only what is intrinsic to
    it (its reveal register, whether it leads, whether it is the asymmetric beat) and the
    cadence is a function of position. Every field optional ⇒ the default beat reveal. */
export interface RevealSpec {
    /** The reveal register → the `Beat` `scroll-driven.css` attribute tier. Omit ⇒ default. */
    tier?: "default" | "dense" | "chrome" | "tail";
    /** The LEAD beat opts OUT of the lift (a translate displaces the masthead top — the
        bodies' `beatStyle(scene, false)`). Omit ⇒ the full scroll-scrubbed rise. */
    lift?: boolean;
    /** The ONE asymmetric grid-breaker (the `beat--aside` offset — usf normalization beat). */
    aside?: boolean;
    /** N.WD1 DEFECT C — opt this beat into the COVER-SCRUB axis (the `[data-scroll-tl]` host
        `useCoverProgress` walks up to) WITHOUT the `aside` inset. A figure beat whose plate declares a
        scroll-driven reveal/count (a WC1 `MotionDeclaration` `on:"scroll"` segment — the demand
        crossover crown, the product-mix draw, the usf-integrity scatter draw-in) needs a scrub host, or
        its scroll scalar degrades to terminal 1 (the figure shows fully drawn, never scrubbing). The
        essay stamps `data-scroll-tl` on `aside || scrub`; this DECOUPLES the scrub-axis opt-in from the
        aside inset (the two were conflated onto `aside` alone, so an essay route with no aside beat had
        ZERO cover hosts). CONSUMES the KEPT `scroll-driven.css` `[data-reveal-beat][data-scroll-tl]`
        register + `useCoverProgress` — it authors no new reveal machinery. */
    scrub?: boolean;
    /** O-A26 (DIR-5 ARM D) · THE BOUNDED REVEAL-SHAPE AXIS — a closed 3-name register layered
        onto the SAME `translate3d(...)` the `reveal-beat` keyframe already scrubs
        (`scroll-driven.css`), compositor-safe by construction (AG7: transform/opacity only, zero
        new paint properties). `lift` = today's shape (unchanged, the majority default); `settle`
        = PLUS a gentle `scale()` zoom-in; `unfold` = PLUS a paper-tilt `skewY()` settle. Omit ⇒
        the tier-rotated fallback (`rotateRevealShape`, `story/beat-template.ts`), restraint-biased
        (`lift` wins ≥half the slots). An AUTHORED value always wins over the fallback — the same
        override law every other `RevealSpec` field carries. */
    shape?: "lift" | "settle" | "unfold";
    /** The PLACEMENT grammar (K-EXPRESS D2). Omit ⇒ the beat auto-zebras by its masthead-phase
        index. An explicit `layout.title` WINS over the retained `aside` alias (override-beats-alias).
        `aside` is RETAINED (it also keys the editorial INSET + the `data-scroll-tl` scalar stamp,
        OUT of D2's scope); `resolveLayout` reads it as `title:'right'` so the beat zebra-aligns. */
    layout?: BeatLayout;
}

/** A furniture SIDE (K-EXPRESS D2). `auto` ⇒ the zebra resolver picks by beat phase. The masthead
    title resolves to `left|center|right` (the `center` third pole is O-A15, title-only — spent
    sparingly: cover/summary/synthesis/close, ≤2 per corridor); the dock resolves to `left|right`;
    the numbers band resolves to `top|bottom`. All edges are union members so a future placement is a
    new member, NOT a host fork (the D5 extensibility law). */
export type Side = "left" | "right" | "top" | "bottom" | "center" | "auto";

/** The masthead TITLE pole — the RESOLVED horizontal placement `resolveLayout` / `resolveBeatTemplate`
    emit. A superset of the historical `left|right` with the O-A15 `center` third pole (the missing
    middle pole, spent sparingly per the ≤2-C-per-corridor constraint). The `center` beat rises
    vertically (its reveal follows the pole ⇒ `scrollIn:"up"`), never sliding from a margin. */
export type TitlePole = "left" | "center" | "right";

/** The reveal-in AXIS (K-EXPRESS D2). `left|right` slide the beat in horizontally; `up` keeps the
    vertical rise; `auto` ⇒ follows the resolved title side. */
export type ScrollDir = "left" | "right" | "up" | "auto";

/** FACET — the per-beat PLACEMENT grammar (K-EXPRESS D2). Every field optional ⇒ omit and the beat
    auto-zebras by masthead phase. Declare ONE field to break the zebra for that mark only. The
    visual side is resolved by `resolveLayout` (useBeatLayout.ts); the host stamps it as `data-*`
    registers — the side-flip is grid placement only, NEVER `order` (the a11y keystone). */
export interface BeatLayout {
    /** The masthead (eyebrow · h2 · dek · drop-cap) margin side. Omit ⇒ even=left, odd=right. A
        HORIZONTAL subset of `Side` (the masthead resolves to left|center|right — the O-A15 `center`
        third pole joins as a union member, NOT a host fork; the D5 extensibility law). */
    title?: Exclude<Side, "top" | "bottom">;
    /** The aggregate-stats band POLE. Omit ⇒ even=top, odd=bottom. RESOLVED but NOT stamped this
        cut — the pole-router that consumes it is the DEFERRED vocabulary seam (no consumer ⇒ no
        `data-numbers` stamp; the resolver carries it READY). The VERTICAL subset of `Side`. */
    numbers?: Exclude<Side, "left" | "right" | "center">;
    /** The three-item dock corner. Omit ⇒ OPPOSITE the resolved title (the balance counterweight; a
        `center` title has no opposite margin, so the dock rests at its default right corner). A
        HORIZONTAL subset of `Side` (the dock never centers — it is always a corner counterweight). */
    dock?: Exclude<Side, "top" | "bottom" | "center">;
    /** The reveal-in axis. Omit ⇒ FOLLOWS the resolved title (left title ⇒ slide from left). */
    scrollIn?: ScrollDir;
}

/** A CHAPTER — one beat of the declarative essay (I3 §1). The route declares its chapters
    as a `Chapter[]` in `context.ts`; `DashboardEssay.vue` renders the full beat scaffold
    once from each entry (the `FigureInitial` from `figure`, the eyebrow from `icon`+`figure`
    +`eyebrow`, the `<h2>` from `title`, the dek `<p>` from `dek`, the chapter `viz`, and the
    trailing `AnimatedRule` whose `:seed` the host derives from the chapter index). */
export interface Chapter {
    /** The anchor id — REUSES the section-anchor nav id (the dock scroll target). */
    id: string;
    /** The Roman figure-number (1 → I, 2 → II, …) the `FigureInitial` drops as the cap. */
    figure: number;
    /** The eyebrow glyph (a Lucide/Vue icon) — tinted to the route data-hue (SM-1). */
    icon: Component;
    /** The eyebrow kicker prose (the text beside the icon + Roman, e.g. "Per-capita ↔ per-area"). */
    eyebrow: string;
    /** The `<h2>` title — a plain string OR a render-slot factory carrying a live VNode
        (`<HandMark>`/`<ScrollLetteringHeading>`), rendered identically by the host. */
    title: ChapterTitle;
    /** The dek prose under the title (the `text-prose-muted` paragraph). GOVERNED COPY —
        the copy-conformance gate's object-literal extractor reaches `dek:` here (I3 §7). */
    dek: string;
    /** The viz the beat mounts — a feature-plate component, a `VizContract`, or a
        `"hero"`/`"colophon"` page-level slot. */
    viz: ChapterViz;
    /** The motion facet (reveal tier, lead/lift, the asymmetric grid-break). Omit ⇒ default. */
    reveal?: RevealSpec;
    /** The dock nav LABEL — the entry the projection surfaces (distinct from the eyebrow:
        the eyebrow is the on-page kicker, the label is the dock tooltip). Omit ⇒ `eyebrow`. */
    navLabel?: string;
    /** Whether this chapter is a dock BEAT (projected into `nav`). The page cover / colophon
        are chapters the essay scaffolds but the dock does NOT step to — they set `false`.
        Omit ⇒ `true` (the chapter is a navigable beat). */
    isBeat?: boolean;
    /** The FigureInitial colorKind (the route live-legend kind) + the live hinge fraction —
        passthrough to the dropped-cap. Omit ⇒ `diverging` / `0.5` (the neutral key). */
    colorKind?: ColorKind;
    hinge?: number;
}

/** A chapter SPINE entry — a `Chapter` minus its `viz` (the heavy figure component). The
    cheap eager `context.ts` declares the spine (icons + strings + title VNodes + reveal); the
    LAZY `dashboard.ts` body supplies the figures through a `ChapterVizMap` (J-PERF arm a · the
    cross-dashboard VizPlate fusion split). A spine entry MAY still carry a page-level sentinel
    (`"hero"`/`"colophon"`) inline — those import nothing, so they stay on the spine. */
export type ChapterSpine = Omit<Chapter, "viz"> & { viz?: "hero" | "colophon" };

/** The figure-component map the lazy body zips onto the chapter spine — keyed by section id.
    The eager context's `nav` projection passes `{}` (it reads only id/label/icon), so the eager
    seam never references a figure component; the body passes the real plates at mount. */
export type ChapterVizMap = Record<string, ChapterViz>;

/** Zip the figure components onto a chapter spine (J-PERF arm a). Each spine entry resolves its
    `viz` from `vizById[id]` when present (the body's lazy figure map), else keeps its inline
    sentinel (`"hero"`/`"colophon"`) or stays `undefined` (the nav-projection path, which never
    reads `viz`). This is the seam that keeps the nav a PROJECTION of the SAME spine the body
    renders — drift-safe — while the eager context imports ZERO figure components. */
export function attachViz(spine: ChapterSpine[], vizById: ChapterVizMap): Chapter[] {
    return spine.map((c) => ({ ...c, viz: vizById[c.id] ?? c.viz }) as Chapter);
}

/** Whether a chapter projects into the dock nav (a navigable beat). The page cover /
    colophon chapters set `isBeat: false`; every narrative beat is `true` (the default). */
export function isBeat(c: Chapter | ChapterSpine): boolean {
    return c.isBeat ?? true;
}

/** Project a chapter into a `DockNavItem` (I3 §1) — the nav becomes
    `chapters.filter(isBeat).map(toNavItem)`, so the dock and the body read ONE array and
    cannot drift. A chapter is always an in-page `"beat"` (the essay scrolls to its `id`);
    the sibling-`"view"` tab register is the SCI/ECF route-nav, declared directly, not a
    chapter projection. The label is the chapter's `navLabel` (else its `eyebrow`). */
export function toNavItem(c: Chapter): DockNavItem {
    return {
        kind: "beat",
        id: c.id,
        label: c.navLabel ?? c.eyebrow,
        icon: c.icon,
    };
}
