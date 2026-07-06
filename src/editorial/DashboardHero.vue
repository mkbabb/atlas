<script setup lang="ts">
// platform/editorial/DashboardHero.vue — THE page cover, the system's crown (F3a /
// f6-hero-interstitials §2.A · design-interstitial-system §4.4 · design-hierarchy §13 rung ⓪).
//
// The dashboards have chapters but no COVER (f6-hero §1.1: every route has NO <h1>; the body's
// first child opens straight into the lead plate). This is that cover: the editorial title, the
// dek, and the AUDACIOUS-NUMBER SERIES — the three thesis figures of the whole PAGE, not one
// plate. It seats ABOVE the lead beat, and it ABSORBS the per-plate `#headline` cluster that the
// reverted ChartFrame slot silently dropped (f6-hero §1.2): the cluster was always a PAGE thesis
// wearing plate clothing — the page IS its un-gridded headline band (DESIGN §2 BREAK-OUT). The
// resolution of the orphaned slot is RE-HOMING, not re-slotting (the lead plate drops its
// `#headline`; one source of truth).
//
// RANK ⓪ — the SUFFUSION contract (DESIGN §13 / design-hierarchy §4): the hero binds --attn-hero
// (1.00) on the figure series — the loudest surface on the first fold, ONE per route. --attn-hero
// is DISTINCT IN NAME from --attn-thesis (both full ink) so the NO-DOUBLE-THESIS law is
// gate-checkable: the page never binds two full-thesis surfaces (the hero AND a plate cluster).
// The hero is the page's ONLY <h1> (the document outline starts here); the plate titles stay <h2>.
//
// THE THREE FACES, total (DESIGN §6): the value is `figure-slug` (Fira, the audacious cap-box —
// crowns never shear, F6.4); the unit is the Fira eyebrow caption (it NAMES the unit, the F6.4
// close); the dek/caption is Newsreader. No fourth face. The DEFAULT register is EXACTLY THREE
// co-equal figures (the rule of three; the anti-stat-soup law). The RANKED register (I11 §2 ·
// design-usf §0 ⓪ · K-C-HIER graded) is the deliberate exception: when a member declares `rank:"lede"`,
// the series is a CROWN + N flanking SUB-aggregates (recessed to `--attn-data`) — a ranked lockup, not
// stat-soup,
// so the cover can state both the snapshot AND the decade scale without inflating to a KPI row. The
// series tints via `colorKind` (the page palette echo of the FigureInitial gradient — the cover and
// the chapter cap speak one color).
//
// THE REVEAL CLOCK — LOAD (the page's arrival): the series count-ups via the heroes' existing
// `useCountUp` (NumericAnimation), once. The route's ONE gold one-shot rides the THESIS figure
// (the loudest of the three — the page apex). PRM: the count snaps to the final value (the
// rendered text IS the figure — information parity); the gold one-shot is SKIPPED entirely under
// PRM (no shimmer, the static ink holds).
//
// THE RING-KILL (H.W1.b · G-MARKS / F7.3 · AXIOM-4 morphology): the editorial DatumRing is RETIRED
// — the hand-circle was wrong at any weight (the 3-arc chronic), and the audacious figure is found
// by SIZE + the gold MEDAL, never circled. The gold one-shot — formerly co-rooted on `ringIndex` —
// is re-rooted onto a `thesisIndex` (the figure that wears the page's ONE affirmation seal),
// disjoint from any ring. One voice each: the figure SHOUTS by size, the gold catches the light once.
//
// GLASS / GRID: the hero wears NO glass and NO grid (the un-gridded headline band on the paper
// ground, DESIGN §2). It is closed by `<AnimatedRule weight="hero">` (the assembler seats that
// below it — the hero band ends; the lead beat begins).
import { computed, onMounted, ref } from "vue";
import FigureSlug from "@/charts/frame/FigureSlug.vue";
import { useCountUp } from "@/platform/composables/useCountUp";
import { useGoldOneShot } from "@/motion/useGoldOneShot";
import { useReducedMotion } from "@/motion/useReducedMotion";
import type { ColorKind } from "@/charts/scale/colorKind";

/** One audacious cover figure — the pre-formatted value (routed through format.ts at the
    call site / the manifest, INV-E1), the unit caption (the F6.4 unit/context word), and the
    Newsreader caption beneath. The figure is found by SIZE; the THESIS figure additionally
    catches the route's ONE gold one-shot seal at the count finish (the ring-kill, H.W1.b).

    THE COVER RANK (I11 §2 · design-usf §0 ⓪ · K-C-HIER graded). A cover series is not always THREE
    co-equal figures: a route whose thesis is ONE number (USF's −$324.1M net carry) crowns that
    figure and recesses the rest as flanking sub-aggregates. The `rank` enum is the rank seam — the
    host renders the `lede` figure at the full audacious rung (`--rank-scale-lede`) and recesses the
    flanks (`--rank-scale-ancillary`) + ducks them to `--attn-data`, so the eye finds the entry point
    by SIZE + INK, never by reading left-to-right. The optional `relation` seats the recessive
    shown-math the crown PRODUCES ("$8.60B out − $8.92B in") beneath it, killing the bare en-dash that
    floated between figures as a non-figure in a figure slot (CC-6) — the relation reads as the
    equation yielding the crown, not a fourth co-equal figure. */
export interface HeroFigure {
    /** The audacious value — a pre-formatted string ("$8.92B") OR a number to count up. */
    value: string | number;
    /** The Fira eyebrow caption — NAMES the unit (the F6.4 close; never a bare figure). */
    unit: string;
    /** The Newsreader caption beneath (the "what / when"). */
    caption: string;
    /** The figure's editorial RANK in the cover lockup (the K-C graded hierarchy). `lede` is the
        page-thesis CROWN (the full audacious rung, found by SIZE); `support` is the graded middle
        (PROVISIONAL, §7 — no live route uses it yet); `ancillary` is the recessed flank. Omit ⇒ the
        flat co-equal triad (the default register — the host binds `--attn-hero` on the whole row). At
        most ONE figure is `lede` (the page apex). Rank governs SIZE (`--rank-scale-*`); `data-attn`
        governs INK. The binary predecessor is subsumed: `dominant:true`≡`rank:"lede"`. */
    rank?: "lede" | "support" | "ancillary";
    /** The recessive SHOWN-MATH (CC-6) — the equation the dominant crown produces
        ("$8.60B out − $8.92B in"), pre-formatted at the call site (INV-E1). Seated beneath the
        crown at `--attn-chrome`, it replaces the bare en-dash that read as a typo. Omit ⇒ none. */
    relation?: string;
}

const props = withDefaults(
    defineProps<{
        /** The page <h1> title (the dashboard's editorial name). */
        title: string;
        /** The Newsreader dek beneath the title. */
        dek: string;
        /** The cover figures — THREE co-equal by default (the rule of three), OR a ranked CROWN +
            flanking sub-aggregates when a member declares `rank:"lede"` (I11 §2; the ranked lockup may
            carry a fourth recessed flank — the decade-scale member — without becoming a KPI row). */
        figures: HeroFigure[];
        /** The page palette — tints the figures (the FigureInitial gradient echo). */
        colorKind?: ColorKind;
        /** The index (0..2) of the THESIS figure — the page apex that wears the route's ONE gold
            one-shot affirmation seal (no ring; the ring-kill, H.W1.b). Default 0: the first figure
            is the page's loudest fact. -1 = no gold seal on the hero (the route spends it elsewhere). */
        thesisIndex?: number;
        /** THE COVER KICKER (K-PAPER-COVER · ARM B) — the small editorial word tucked above the
            audacious cover-line (the reference's "Median"), DERIVED at the call site off the route's
            `thesisSign` via `formatCoverKicker` (NEVER hand-typed here — the cover voice is sourced
            from the ONE thesis scalar). Omit ⇒ no kicker (the booked per-route seat, §7). */
        coverKicker?: string;
        /** THE COVER STANDFIRST (K-PAPER-COVER · ARM B) — the magazine deck / felt so-what, DERIVED
            at the call site off the route's signed thesis figure via `formatCoverStandfirst` (it
            LEADS with the signed figure, so its sign === the store `thesisSign` by construction — the
            k-paper-thesis-coherence guard). `null`/omit ⇒ no deck (the guarded-computed precedent). */
        standfirst?: string | null;
    }>(),
    { colorKind: "diverging", thesisIndex: 0 },
);

/** Parse a figure's value into a number for the count-up; a non-numeric string (already
    formatted, e.g. "$8.92B") has its digits extracted so the count climbs to the same crown. */
function numericOf(v: string | number): number {
    if (typeof v === "number") return v;
    // Pull the leading numeric magnitude (sign + digits + decimal) from the formatted slug.
    const m = v.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : 0;
}

const reduced = useReducedMotion();

// THE COUNT-UP — the page's load arrival (one clock, the heroes' NumericAnimation engine). The
// display counts from 0 to each figure's numeric crown; the RENDERED text is always the figure's
// own formatted string at its final value, so a pre-formatted slug ("$8.92B") never loses its
// unit/grouping to the count (the count drives a numeric overlay only where the value is a bare
// number; a formatted string renders verbatim — its count is the page's arrival cadence). Under
// PRM `run()` snaps in one paint (information parity); the rendered text is the final figure.
const targets = computed(() =>
    Object.fromEntries(props.figures.map((f, i) => [`f${i}`, numericOf(f.value)])),
);
const { run } = useCountUp(() => targets.value, { autoRecount: false });

// THE GOLD ONE-SHOT — the route's ONE affirmation seal, pressed once at the count finish on the
// THESIS figure (the loudest of the three — the page apex). Idempotent; PRM-skipped (no shimmer,
// static ink holds). Re-rooted off the retired `ringIndex` onto `thesisIndex` (H.W1.b ring-kill).
const gold = useGoldOneShot();

onMounted(async () => {
    // The page arrival: count the series, then press the gold seal on the thesis figure once.
    await run();
    if (props.thesisIndex >= 0) gold.fire();
});

/** Whether figure `i` is the THESIS figure — the page apex that wears the ONE gold one-shot seal. */
function isThesis(i: number): boolean {
    return i === props.thesisIndex;
}

// THE COVER RANK (I11 §2 · design-usf §0 ⓪ · K-C-HIER graded) — whether ANY figure declares a `rank`.
// When a series ranks, the host crowns the `lede` figure (the full audacious rung, full hero ink) and
// recesses every flank (`--rank-scale-ancillary` SIZE, `--attn-data` INK), so the eye finds the entry
// point by SIZE + INK. With no ranked member the series stays the flat three-co-equal triad (the
// default register): the host binds `--attn-hero` on the whole row and every figure rides one cap-line.
const isRanked = computed(() => props.figures.some((f) => f.rank != null));

// THE BANNER CARDINALITY STATE (M.W1 D3, ratified · N.WG1 Arm E — the ranked-4 lockup). The hero
// has TWO cardinality-derived states: ROW (three figures, one cap-line — ecf/sci/speedtest/usfi/vft)
// and BANNER (a ranked FOUR — usf, demand): the crown BANNERS row one (a full-row track, so the
// lifted audacious rung actually paints) and the flanks share ONE recessed row beneath it. Derived
// from the DATA (rank + cardinality), never a per-route fork — the usf `:deep()` 2×2 retires.
const isBanner = computed(() => isRanked.value && props.figures.length >= 4);

// The rendered value — always the figure's own formatted string (the count is the arrival
// cadence, not a digit-replace on a formatted slug; PRM renders the same final string).
/** A leading sign glyph (− U+2212 / + / hyphen / en-dash) carried at FigureSlug's own `sign`
    sub-rung — NEVER inlined in the slug slot. Inlining a signed value ("−$324.1M") lets the
    cap-box break after the sign and float it a line above the digits (the CC-6 floating-dash
    the cover re-rank exists to kill); the dedicated `sign` span is whitespace-stripped against
    the value, so it sits tight and cannot wrap. Unsigned figures return undefined (no span). */
const SIGN_GLYPHS = new Set(["−", "+", "-", "–"]);
function signOf(f: HeroFigure): string | undefined {
    const s = String(f.value);
    return SIGN_GLYPHS.has(s[0]) ? s[0] : undefined;
}
/** The slug value with any leading sign STRIPPED (the sign rides the `:sign` sub-rung). */
function display(f: HeroFigure): string {
    const s = String(f.value);
    return SIGN_GLYPHS.has(s[0]) ? s.slice(1) : s;
}

void reduced; // the PRM fence is consumed by useCountUp/useGoldOneShot; touch to keep the import honest
const seriesEl = ref<HTMLElement | null>(null);

// THE FIGURE-ROW CAP-LINE (DESIGN §3.1 figure-row law · I-COMPOSE.scale). The audacious triad shares
// ONE cap-line: every member renders at the SAME rung, sized so the LONGEST member fits its track
// without shearing. We bind `--slug-num-track` to the longest figure's ch-count so the figure-slug
// recipe's `min(rung, track-fit)` term seats the whole row at one size — the first never shears
// smaller than its siblings, and with the bumped audacious rung the row rides as large as its track
// lawfully allows (the I2 register: the rung wins on a wide track, shrinks-to-track on a tight one).
const seriesNumTrack = computed(() =>
    Math.max(4, ...props.figures.map((f) => String(f.value).length)),
);

// THE LEDE'S CAP-LINE FLOOR (D10 · K-FRAMEWORK §4 — the crown-restoration ANCHOR). The crown rides
// `--type-figure-slug: min(rung, track-fit)` where `track-fit = 100cqi / (--slug-num-track × 0.62)`
// (recipes.css §1). At the phone (390 — figures stack full-width) a SHARED series cap-line drives every
// figure's `min()` ceiling down to the LONGEST member's track-fit, FLATTENING the crown to the flank
// size. So the ranked register re-points `--slug-num-track` PER FIGURE. No lede in a ranked series ⇒
// fall back to the shared series cap-line (the safe flat behaviour).
const ledeNumTrack = computed(() => {
    const lede = props.figures.find((f) => f.rank === "lede");
    return lede ? Math.max(4, String(lede.value).length) : seriesNumTrack.value;
});

// THE RANKED CAP-LINE (D10). Flat ⇒ undefined (the series `--slug-num-track` inherits; the flat triad
// MUST share one cap-line, DESIGN §3.1). Ranked ⇒ per-figure, FLOORED at the lede's ch-count: a SHORTER
// figure shares the lede's cap-line (paints up to — never past — the crown); a LONGER flank self-clamps
// to its own ch-count. So a SHORT crown (/sci `43%`) paints its full rung while a long flank recesses; a
// LONG crown (/usf `−$324.1M`) holds every flank at the lede cap-line, collapsing to HEAD's shared
// cap-line = byte-identical, no inversion. The naive `max(4, ownCh)` is WRONG — on crown-LONGEST routes
// a SHORT flank would out-paint the long crown (an INVERSION) and diverge from HEAD's track-bound size.
function rankNumTrack(f: HeroFigure): Record<string, number> | undefined {
    if (!isRanked.value) return undefined;
    // THE BANNER RELEASE (D3): on the DESKTOP banner a flank rides its OWN recessed row, so the
    // inversion the lede-floor guards against cannot occur there — a flank's track is a ≤⅓-row
    // cell against the crown's full-row track. Each flank therefore CARRIES its own ch-count as
    // `--slug-num-track-own`, and the ≥640 banner CSS re-points `--slug-num-track` onto it (the
    // `--rank-scale-ancillary` SIZE recession finally paints — the lede floor had collapsed the
    // ranked-4 lockup to ONE shared cap-line, the M32/GP5 defect). The FLOORED track stays the
    // JS-emitted default so the PHONE COLUMN (where every figure spans the same full-width track
    // and the banner layout does not apply) keeps the no-inversion floor — media-correct without
    // a JS media query.
    const floored = Math.max(ledeNumTrack.value, String(f.value).length);
    if (isBanner.value && f.rank !== "lede")
        return {
            "--slug-num-track": floored,
            "--slug-num-track-own": Math.max(4, String(f.value).length),
        };
    return { "--slug-num-track": floored };
}
</script>

<template>
    <!-- The page cover — a semantic <header> carrying the page's ONLY <h1>. NO glass, NO grid:
         the un-gridded headline band on the paper ground (DESIGN §2 BREAK-OUT). -->
    <header class="dashboard-hero" data-testid="dashboard-hero">
        <p class="eyebrow dashboard-hero__eyebrow">{{ title }}</p>
        <!-- THE PAGE <h1> — rests LARGE, scroll-scrubs to the compact sticky wayfinding label (§1a).
             In the COMPACT state the route's ONE kicker (coverKicker) rides INLINE beside the shrunk
             title (aria-hidden — the accessible name stays the title alone), so the sticky band
             doubles as a chapter locator (O-C2 point 3 · ANSWERS Q-11). The `.page-title-wayfind`
             recipe (§1b) reveals it over the tail of the SAME native scroll timeline; at rest it has
             zero footprint (absent from the rest state). -->
        <h1 class="dashboard-hero__title text-page-title">{{ title
            }}<span
                v-if="coverKicker"
                class="page-title-wayfind"
                aria-hidden="true"
                >{{ coverKicker }}</span
            ></h1>
        <p class="dashboard-hero__dek text-prose">{{ dek }}</p>
        <!-- THE COVER STANDFIRST (K-PAPER-COVER · ARM B) — the magazine deck / felt so-what, DERIVED
             off the route's signed thesis figure (it LEADS with the signed figure, so its sign matches
             the store thesisSign by construction). Rides the EXISTING `masthead-eyebrow` register (the
             script/italic display kicker, recipes.css §6 — NO new recipe), seated beside the dek. -->
        <p
            v-if="standfirst"
            class="masthead-eyebrow dashboard-hero__standfirst"
            data-testid="dashboard-hero-standfirst"
        >
            {{ standfirst }}
        </p>

        <!-- THE COVER KICKER (K-PAPER-COVER · ARM B) — the small italic editorial word tucked above
             the audacious cover-line (the reference's "Median"), DERIVED off the route's `thesisSign`
             via `formatCoverKicker`. Rides the SAME `masthead-eyebrow` register as the standfirst (NO
             new recipe); the page's editorial direction stated once, above the figures. -->
        <p v-if="coverKicker" class="masthead-eyebrow dashboard-hero__kicker">{{ coverKicker }}</p>

        <!-- THE AUDACIOUS SERIES — exactly three figures, each a `figure-slug` cap-box slug, each
             NAMING its unit (F6.4). It declares the rung ⓪ SUFFUSION token `--attn-hero` on the
             series host (data-attn="hero"), the loudest surface on the first fold. -->
        <div
            ref="seriesEl"
            class="dashboard-hero__series"
            :class="{
                'dashboard-hero__series--ranked': isRanked,
                'dashboard-hero__series--banner': isBanner,
            }"
            data-attn="hero"
            :data-color-kind="colorKind"
            :style="{ '--slug-num-track': seriesNumTrack }"
        >
            <!-- THE COVER RANK (I11 §2 · K-C-HIER graded): when a member declares `rank:"lede"`, the
                 host crowns it (the full audacious rung, full hero ink) and recesses every flank
                 (`--rank-scale-ancillary` SIZE + `--attn-data` INK) per-figure (so the row reads CROWN
                 + flanking sub-aggregates, not three co-equal KPIs). With no ranked member the series
                 stays the flat triad — `--attn-hero` on the host. The `--crown`/`--flank` classes are
                 retained as class-list-only ALIASES (no CSS) so the i11/i0 e2e selectors keep matching
                 in-wave; K-REPOINT retires them (K-C-HIER §4.2 migration note). The `:data-rank` is the
                 deterministic K-B seam hook; `:style="rankNumTrack(f)"` re-points `--slug-num-track`
                 PER FIGURE, LEDE-FLOORED (D10), the crown-restoration the §6 readback depends on. -->
            <figure
                v-for="(f, i) in figures"
                :key="i"
                class="dashboard-hero__figure"
                :class="{
                    'dashboard-hero__figure--thesis': isThesis(i),
                    'dashboard-hero__figure--lede': isRanked && f.rank === 'lede',
                    'dashboard-hero__figure--support': isRanked && f.rank === 'support',
                    'dashboard-hero__figure--ancillary':
                        isRanked && (f.rank == null || f.rank === 'ancillary'),
                    'dashboard-hero__figure--crown': isRanked && f.rank === 'lede',
                    'dashboard-hero__figure--flank': isRanked && f.rank !== 'lede',
                }"
                :data-attn="isRanked ? (f.rank === 'lede' ? 'hero' : 'data') : undefined"
                :data-rank="isRanked ? (f.rank ?? 'ancillary') : undefined"
                :style="rankNumTrack(f)"
            >
                <!-- THE RING-KILL (H.W1.b): no editorial ring — the figure is found by SIZE, and
                     the THESIS figure additionally catches the ONE gold one-shot seal at the count
                     finish (transient; PRM-skipped). Every figure is the bare audacious slug. -->
                <FigureSlug
                    as="span"
                    class="dashboard-hero__value"
                    :class="{ 'text-gilt': isThesis(i) && gold.shimmer.value }"
                    :sign="signOf(f)"
                >
                    {{ display(f) }}
                </FigureSlug>

                <figcaption class="dashboard-hero__caption">
                    <span class="dashboard-hero__unit eyebrow">{{ f.unit }}</span>
                    <span class="dashboard-hero__context text-caption">{{
                        f.caption
                    }}</span>
                    <!-- THE SHOWN-MATH (CC-6) — the recessive equation the crown produces, seated
                         beneath it at --attn-chrome in place of the bare en-dash (the relation that
                         yields ②, never a fourth co-equal figure). -->
                    <span
                        v-if="f.relation"
                        class="dashboard-hero__relation text-caption"
                        data-attn="chrome"
                    >
                        {{ f.relation }}
                    </span>
                </figcaption>
            </figure>
        </div>
    </header>
</template>

<style scoped>
/* THE PAGE COVER — the un-gridded headline band on paper (no glass, no grid). Under
   figure-primacy (H.W10.a) the AUDACIOUS FIGURE series is the cover-line and the title is
   the `text-page-title` rung (Fraunces optical-display, the receded quiet label — smaller
   than the shared `text-headline` plate question-titles, distinct so they don't shrink with
   it); the dek is Newsreader prose; the series is the three lifted audacious cap-box slugs.
   The band breathes wide above the lead beat — the figure is the page's first, loudest mark. */
.dashboard-hero {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-block-end: 0.5rem;
}
.dashboard-hero__eyebrow {
    /* the eyebrow names the page (the small-caps kicker above the cover-line). */
    margin: 0;
}
.dashboard-hero__title {
    margin: 0;
    /* the page <h1> — the receded quiet label (text-page-title); the recipe owns face/axes/size. */
    max-inline-size: var(--measure, 36ch);
}
.dashboard-hero__dek {
    margin: 0;
    max-inline-size: var(--measure, 60ch);
    color: var(--muted-foreground);
}

/* THE COVER STANDFIRST + KICKER (K-PAPER-COVER · ARM B) — both ride the global `masthead-eyebrow`
   recipe (face/axes/size/italic, recipes.css §6); only their SEAT in the cover flow lands here. The
   standfirst is the felt deck beside the dek; the kicker is the small word above the series. */
.dashboard-hero__standfirst {
    margin: 0;
    max-inline-size: var(--measure, 60ch);
}
.dashboard-hero__kicker {
    margin: 0;
    margin-block-start: 0.5rem;
}

/* THE AUDACIOUS SERIES — three cap-box figures in a row (the rule of three). On the phone
   measure they stack; from the tablet up they ride one row, each its own slug + caption. The
   `--attn-hero` rung is on the host (the SUFFUSION token); the figures tint via the page ramp. */
.dashboard-hero__series {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(1.25rem, 5vw, 3rem);
    margin-block-start: 0.75rem;
    /* The rung ⓪ recession multiplier — the page thesis at full ink (the loudest fold surface).
       The series declares its rung HERE (the SUFFUSION contract — never a brush-intrinsic alpha).
       The RANKED register (I11 §2) lifts the row-level fade: the ink is declared PER-FIGURE there
       (the crown at `--attn-hero`, the flanks at `--attn-data`), so the host stays opaque and each
       member carries its own rung. */
    opacity: var(--attn-hero);
    align-items: start;
    /* THE COVER-HERO SERIES CLS RESERVATION (L3-CSS · Fork 12 — relocated off the platform recipe
       sheet onto the DashboardHero that OWNS the audacious series; serves demand/sci/ecf). The series
       lays out at h=0 first (the `cqw` figure-slug + count-up resolve a frame late) then jumps to its
       real height, growing the cover and shoving the lead beat (+130px desktop) — the J-CLOSE dominant
       shift. `min-block-size` = the SETTLED rendered height holds the series box from first paint so the
       late slug layout FILLS a reserved box instead of growing the cover. A MIN (a richer crown wrap
       grows past it with no shift); per-viewport because the phone STACKS the series into one full-width
       column. The phone floor reserves the tallest narrow register (demand 471 · sci/ecf 348). The
       mobile-base + `min-width:640px` split mirrors the §4c measure (UNCHANGED, so CLS does not move). */
    min-block-size: 460px;
}
@media (min-width: 640px) {
    /* the desktop one-row band — every DashboardHero route settles at ~129px (the audacious row);
       reserve it so the cover stays its settled ~270–303px from first paint (no 173→303 jump). */
    .dashboard-hero__series {
        min-block-size: 128px;
    }
}
.dashboard-hero__series--ranked {
    opacity: 1;
}

/* THE BANNER CARDINALITY STATE (M.W1 D3, ratified · N.WG1 Arm E). The ranked-4 lockup (usf,
   demand): the CROWN banners row one — a full-row track, so `min(rung, track-fit)` finally lets
   the lifted audacious rung paint (the §12 ×1.5 lift was PAIRED with exactly this track release)
   — and the flanks share ONE recessed row beneath it (`flex:1 1 0` — equal thirds, each flank's
   own ch-count self-clamp + `--rank-scale-ancillary` sizing the visible recession). Desktop-row
   register only (≥640px matches the series' one-row band); the phone column stack governs below. */
@media (min-width: 640px) {
    .dashboard-hero__series--banner .dashboard-hero__figure--lede {
        flex-basis: 100%;
        flex-grow: 1;
    }
    .dashboard-hero__series--banner
        .dashboard-hero__figure:not(.dashboard-hero__figure--lede) {
        flex: 1 1 0;
        /* the flank's OWN cap-line (the JS emits both tracks) — on its own recessed row the
           lede floor is unnecessary and the size recession actually paints; the phone column
           below 640 keeps the floored default (no inversion on a shared-width stack). */
        --slug-num-track: var(--slug-num-track-own);
    }
}
/* I-MOBILE figure-stack (F-FIG-2) — at the phone register the three `flex:1 1 auto` figures
   shrink-fit onto ONE row (the wrap squeeze: the audacious slugs cramp + share a row band). On the
   phone each figure reads on its OWN full-width row, so we stack the series into a single column
   (the figures are the page thesis — they must not cramp at the measure that can least afford it). */
@media (--phone) {
    .dashboard-hero__series {
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: stretch;
    }
}
.dashboard-hero__figure {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
    /* a container so the slug's `17cqw` resolves against the figure's own track (L2). */
    container-type: inline-size;
    flex: 1 1 auto;
    min-inline-size: 0;
}
.dashboard-hero__value {
    /* the audacious value — the figure-slug recipe owns the Fira cap-box (crowns never shear). */
    display: block;
    /* A figure slug is ATOMIC — it never wraps. Without this, a signed crown ("−$324.1M") breaks
       at the U+2212↔"$" opportunity and floats the sign a line above the digits (the CC-6 typo the
       re-rank kills); the recipe's fit-to-track (min(rung, track-fit)) sizes the font so the whole
       token fits its column, so nowrap reads on ONE line without overflow. */
    white-space: nowrap;
}

/* THE COVER RANK (I11 §2 · design-usf §0 ⓪ · K-C-HIER graded) — the `lede` CROWN at the full
   audacious rung, the flanks recessed by SIZE (`--rank-scale-ancillary`) + INK (`--attn-data`).
   Rank governs SIZE: each rung re-points `--type-figure-slug` by a named `--rank-scale-*` scalar
   (the PullFigure idiom — re-point the recipe's rung, the `min(rung, track-fit)` term unchanged so a
   member can neither shear nor collide), replacing the deleted `/1.3` magic divisor. The crown also
   claims more of the row track (`--rank-grow-lede`, replacing the literal `flex-grow:1.6`) so its
   wider slug seats without crowding the flanks. The per-figure `data-attn` binds the SUFFUSION ink:
   the lede at `hero` (full), the flanks at `data` (recessed). */
.dashboard-hero__figure--lede {
    flex-grow: var(--rank-grow-lede);
}
.dashboard-hero__figure--lede .dashboard-hero__value {
    /* the crown rides the FULL audacious rung (`--rank-scale-lede: 1`) — the page apex. */
    --type-figure-slug: calc(var(--type-display-audacious) * var(--rank-scale-lede));
    opacity: var(--attn-hero);
    /* THE PAYER HUE (I11 §2 · design-usf §0 ⓪) — the crown is the net CARRY (a payer-side figure),
       so it wears the diverging-LOW payer pole (one-color-one-meaning, INV-2: the payer pole is the
       net-out hue the route's spine already speaks). The ramp-ink ban allows the FIGURE to tint (it
       is the audacious figure, not body text); the flanks stay ink + recede by opacity alone. The
       cascade-resolved token is theme-aware. The crown's sign glyph rides the same pole. */
    color: var(--ink-diverging-low-lg); /* O-C7 D5 — the payer-pole crown as a READABLE hero ink (hue kept, L to the AA-large band) */
    --readout-sign-color: var(--ink-diverging-low-lg);
}
/* E-3 (K-DESIGN-SUFFUSE · the /sci cover-thesis pop) — the lede CROWN hue is the ROUTE's icon-palette
   pole, not the diverging payer pole, on the rainbow route. The crown rule above hardcodes
   `--viz-diverging-low` (the /usf, /demand diverging payer hue — correct there, E-2 PASS). On the
   RAINBOW route (/sci) that left the cover thesis speaking the diverging pole while the route accent
   is GREEN (--rainbow-signature-1, sci/meta.ts) — two voices for one route. Keyed on the EXISTING
   `data-color-kind="rainbow"` seam (the series host already carries it — no new prop, no consumer
   patch; the lede-hue authority stays HERE), the rainbow page's lede crown wears the green
   signature-1 pole, so the cover thesis + the route accent are ONE voice. A chrome PICKOUT on the
   lede figure (a budgeted signature pop) within the K-C crown — the colorkind/three-red law GREEN
   (the audacious FIGURE may tint; the signature green is an L3 chrome accent, never a new data ramp). */
.dashboard-hero__series[data-color-kind="rainbow"]
    .dashboard-hero__figure--lede
    .dashboard-hero__value {
    color: var(--ink-rainbow-signature-1-lg); /* O-C7 D5 — the /sci green signature crown as a readable hero ink */
    --readout-sign-color: var(--ink-rainbow-signature-1-lg);
}
.dashboard-hero__figure--support .dashboard-hero__value {
    /* the graded middle (PROVISIONAL, §7) — the support rung between lede + ancillary; its rung is
       `--rank-scale-support` (`calc(1/1.3)`, the byte-equivalent successor to the old `/1.3`). */
    --type-figure-slug: calc(var(--type-display-audacious) * var(--rank-scale-support));
    opacity: var(--attn-data);
}
.dashboard-hero__figure--ancillary .dashboard-hero__value {
    /* the recessed flank — the rung recessed to `--rank-scale-ancillary` (0.59) + the ink ducked to
       `--attn-data`, so the flanks read as the crown's supporting magnitudes, not co-equal KPIs. */
    --type-figure-slug: calc(var(--type-display-audacious) * var(--rank-scale-ancillary));
    opacity: var(--attn-data);
}
/* The recessed flank's CAPTION text stays full-ink (WCAG 1.4.3 AA — the recession governs the
   figure's ink mass, never drops the unit/context prose below the 4.5:1 floor; the PullFigure
   convergence-pass precedent). The `--attn-data` fade is scoped to the slug VALUE above. */
.dashboard-hero__figure--ancillary .dashboard-hero__caption,
.dashboard-hero__figure--support .dashboard-hero__caption {
    opacity: 1;
}

/* THE K-B SEAM STAND-IN (D13 · K-FRAMEWORK §4) — a K-B-OWNED, load-anchored fade-in-up scoped to the
   `lede` crown, so the deterministic-subject seam (K-C NAMES the subject; K-B owns the TIMING) is
   testable BEFORE K-B's `vizzes` band lands. It is a sibling-wave PLACEHOLDER, retired the moment
   K-B's band keys its fade-in-up off `[data-rank="lede"]` — NOT a permanent K-C deliverable. The
   fence is the POSITIVE `@media (prefers-reduced-motion: no-preference)` form (matching
   scroll-driven/chrome-overlays/map-draw), NOT `not (… reduce)`: the positive form also evaluates
   FALSE where the feature is UNSUPPORTED, so the crown stays STATIC there too. The crown's SIZE
   recession is PRM-INDEPENDENT (CSS, not motion) — the crown reads by size under PRM regardless. */
@media (prefers-reduced-motion: no-preference) {
    @keyframes dashboard-hero-lede-reveal {
        from {
            opacity: 0;
            transform: translateY(0.5rem);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .dashboard-hero__figure--lede {
        animation: dashboard-hero-lede-reveal 0.5s var(--ease-engrave, ease-out) both;
    }
}

/* THE SHOWN-MATH (CC-6) — the recessive equation the crown produces, in place of the bare
   en-dash. It is the relation that yields the crown (the carry), set quiet so it never reads as
   a fourth co-equal figure. THE TEXT-RECESSION LAW (N5 design consult · G-N9): this is TEXT, so
   its recession is the MUTED INK + the caption size — the prior `--attn-chrome` (④, 0.46) alpha
   stacked on the mute landed it at 1.94:1 on light paper (the W0 e2e defect); the §HIERARCHY
   covenant forbids sub-AA text. Full alpha: the mute + `text-caption` scale ARE the rung.
   (Live after-fix: 5.46:1 light; the dark arm rides the 6.70:1 dark-muted token.) */
.dashboard-hero__relation {
    margin: 0;
    margin-block-start: 0.1rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
}
.dashboard-hero__caption {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}
.dashboard-hero__unit {
    /* the unit caption — the Fira eyebrow that NAMES the unit (the F6.4 close). */
    margin: 0;
}
.dashboard-hero__context {
    /* the "what / when" line — Newsreader caption, recessive. */
    margin: 0;
}
</style>
