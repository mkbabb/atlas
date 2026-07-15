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
// `useCountUp` (NumericAnimation), once. Glass draws the route's ONE CompletionSeal beside the
// THESIS figure when the count settles. PRM: the count and seal both snap to their final states.
//
// THE RING-KILL (H.W1.b · G-MARKS / F7.3 · AXIOM-4 morphology): the editorial DatumRing is RETIRED
// — the hand-circle was wrong at any weight (the 3-arc chronic), and the audacious figure is found
// by SIZE + the gold MEDAL, never circled. The seal is rooted on `thesisIndex`, disjoint from any
// editorial ring. One voice each: the figure SHOUTS by size, the gold catches the light once.
//
// GLASS / GRID: the hero wears NO glass and NO grid (the un-gridded headline band on the paper
// ground, DESIGN §2). It is closed by `<AnimatedRule weight="hero">` (the assembler seats that
// below it — the hero band ends; the lead beat begins).
import { computed, onMounted, ref } from "vue";
import FigureSlug from "@/charts/frame/FigureSlug.vue";
import { useCountUp } from "@/platform/composables/useCountUp";
import type { ColorKind } from "@/charts/scale/colorKind";
import type { DashboardCategory } from "@/contract";
import { resolveCategorySkin } from "@/skin/category";
import { CompletionSeal, resolveCompletionSeal } from "@/design/recipes/completion";
import type { TitlePole } from "@/contract";
import { resolveTitleAlign, type TitleAlign } from "./title-align";
import GhostNumeral, { type GhostNumeralSource } from "./GhostNumeral.vue";

/** One audacious cover figure — the pre-formatted value (routed through format.ts at the
    call site / the manifest, INV-E1), the unit caption (the F6.4 unit/context word), and the
    Newsreader caption beneath. The figure is found by SIZE; the THESIS figure additionally
    receives the route's ONE CompletionSeal at the count finish (the ring-kill, H.W1.b).

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
        /** THE COVER EYEBROW (the EX-44 D21 rider) — the small kicker word above the <h1> title.
            Omit ⇒ the title itself renders as the eyebrow (today's byte-identical default — every
            existing route keeps its title doubled, unchanged). Pass an explicit, DISTINCT kicker
            (the route's section name, say) so a route stops needing to duplicate its own title
            node and `display:none` the redundant copy (the D21 find: the usf/usfi/sci covers each
            hand-built that workaround because no lawful distinct-eyebrow seat existed). */
        eyebrow?: string;
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
        /** The registry category that resolves the compact identity skin. */
        category?: DashboardCategory;
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
        /** The bounded page-title pole. `auto` preserves the default start alignment. */
        align?: TitleAlign;
        /** Chapter ordinal for the chapter-masthead-only ghost. Omit on unnumbered covers. */
        ordinal?: number;
    }>(),
    { colorKind: "diverging", thesisIndex: 0, align: "auto" },
);

const titleAlign = computed<TitlePole>(() => resolveTitleAlign(props.align, "left"));
const ghostSource = computed<GhostNumeralSource | null>(() =>
    props.ordinal != null && props.ordinal > 0 ? { ordinal: props.ordinal } : null,
);

/** Parse a figure's value into a number for the count-up; a non-numeric string (already
    formatted, e.g. "$8.92B") has its digits extracted so the count climbs to the same crown. */
function numericOf(v: string | number): number {
    if (typeof v === "number") return v;
    // Pull the leading numeric magnitude (sign + digits + decimal) from the formatted slug.
    const m = v.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : 0;
}

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

const categorySkin = computed(() =>
    props.category ? resolveCategorySkin(props.category) : null,
);
const categoryStyle = computed(() =>
    categorySkin.value ? { "--category-accent": categorySkin.value.accent } : undefined,
);
const complete = ref(false);
const completionSeal = computed(() =>
    resolveCompletionSeal({
        complete: complete.value && props.thesisIndex >= 0,
        label: `${props.title} figures complete`,
        shape: categorySkin.value?.shape ?? "check",
    }),
);

onMounted(async () => {
    // The page arrival: count the series, then let Glass draw the earned completion seal once.
    await run();
    complete.value = true;
});

/** Whether figure `i` is the THESIS figure — the page apex that wears the ONE completion seal. */
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
    <header
        class="dashboard-hero"
        data-testid="dashboard-hero"
        :data-category="category"
        :style="categoryStyle"
    >
        <p class="eyebrow dashboard-hero__eyebrow">{{ eyebrow ?? title }}</p>
        <p v-if="categorySkin" class="eyebrow dashboard-hero__identity">
            <span
                class="dashboard-hero__identity-mark"
                :data-background="categorySkin.background"
                :data-shape="categorySkin.shape"
                aria-hidden="true"
            />
            {{ categorySkin.label }}
        </p>
        <!-- THE PAGE <h1> — rests LARGE, scroll-scrubs to the compact sticky wayfinding label (§1a).
             In the COMPACT state the route's ONE kicker (coverKicker) rides INLINE beside the shrunk
             title (aria-hidden — the accessible name stays the title alone), so the sticky band
             doubles as a chapter locator (O-C2 point 3 · ANSWERS Q-11). The `.page-title-wayfind`
             recipe (§1b) reveals it over the tail of the SAME native scroll timeline; at rest it has
             zero footprint (absent from the rest state). -->
        <div class="dashboard-hero__title-band" :data-title-align="titleAlign">
            <GhostNumeral v-if="ghostSource" :source="ghostSource" />
            <h1
                class="dashboard-hero__title text-page-title atlas-title-align"
            >{{ title
            }}<span
                v-if="coverKicker"
                class="page-title-wayfind"
                aria-hidden="true"
                >{{ coverKicker }}</span
            ></h1>
        </div>
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
                     the THESIS figure receives the ONE Glass completion seal after the count.
                     Every figure is the bare audacious slug. -->
                <FigureSlug
                    as="span"
                    class="dashboard-hero__value"
                    :sign="signOf(f)"
                >
                    {{ display(f) }}
                </FigureSlug>

                <figcaption class="dashboard-hero__caption">
                    <span class="dashboard-hero__caption-lead">
                        <CompletionSeal
                            v-if="isThesis(i) && completionSeal"
                            v-bind="completionSeal"
                            class="dashboard-hero__seal"
                        />
                        <span class="dashboard-hero__unit eyebrow">{{ f.unit }}</span>
                    </span>
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

        <!-- THE PROVENANCE SEAT (the EX-44 D21 rider) — an OPTIONAL slot for the route's inline
             exact-source provenance line (the usf/usfi/sci covers each hand-mount one today,
             outside this component's contract, the D21 verifier's flagged find). Absent when
             unfilled — no default content, no layout reservation for a route that has not
             adopted it (every existing consumer stays byte-identical). -->
        <slot name="provenance" />
    </header>
</template>

<style scoped src="./DashboardHero.css"></style>
