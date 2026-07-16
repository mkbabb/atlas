<script setup lang="ts">
// MultiYearFigure.vue — M3, THE FAMILY SELECTOR of the multi-year crown (H.W2.a).
//
// THE ONE component each route's crown slot mounts (the family's single seat — so every route
// inherits the SAME convention: shared crown anatomy, axis dialect, gap-is-a-designed-void, the
// trajectory seam, number discipline). It runs the `years≥6 ∧ continues` discriminator
// (`isTrajectoryWindow`, the M-family's "is this a real trajectory window?" predicate) and
// renders:
//   · M2 WindowArcPlate — when the lead measure's real span is ≥6 years AND continues to the
//     feed's latest (the USF decade, the SCI 12-year chase): the window-arc bracket + forecast.
//   · M1 TrajectoryPlate — otherwise (the ECF 3-window arc): a bare honest span, still crowned.
// The discriminator is the ONE convention — no per-route crown logic. Differences honest
// (a 3-window arc has no forecast tail), never bespoke.
//
// THE AXIOM-5 DUCK (design-hierarchy-h §2.C — the value-identity-across-time law). The route's
// audacious figure already speaks LOUD ONCE at the snapshot hero (the `dashboard-hero__value`,
// H10's `--type-display-audacious` rung). The trajectory's TERMINAL value must therefore RECEDE
// — it is a RECESSIVE endpoint annotation, NEVER the audacious figure rung. M3 renders the
// terminal annotation at a ducked opacity AND a small rung (both below the gate's full-ink
// threshold: opacity ≤ 0.99 OR fontSize < the 30px salience floor), so the same string never
// renders full-ink twice (the NEG_AXIOM5_RESOLVED shape). The crown traces the trajectory; the
// hero owns the audacious figure.
import { computed } from "vue";
import TrajectoryPlate from "@/charts/marks/TrajectoryPlate.vue";
import WindowArcPlate from "@/charts/frame/WindowArcPlate.vue";
import {
    trajectory,
    isTrajectoryWindow,
    type TrajectoryPoint,
} from "@/data/multiYear";
import type { Feed } from "@/data/contract";
import type { FilterResponse } from "@/charts/contract/viz-contract";

const props = withDefaults(
    defineProps<{
        /** The feed the trajectory folds over (its `meta.years` span is the x-axis). */
        feed: Feed;
        /** The measures to draw — one LINE each, folded per its declared AggregateRule. */
        measures: string[];
        /** Per-measure display label + legal palette stop. */
        seriesMeta: Record<string, { label: string; color: string }>;
        /** The LEAD measure the discriminator + the rivet ride (defaults to `measures[0]`). */
        leadMeasure?: string;
        /** The active year — the linked clock (the rivet rivets to it). */
        activeYear: number;
        /** The year that must render as a DESIGNED VOID when present-but-empty (e.g. 2021). */
        voidYear?: number;
        /** The over-subscription crossing x (forwarded to the crown). */
        overSubscriptionX?: number;
        xFormat?: (x: number) => string;
        /** y formatter — ROUTE THROUGH THE FORMAT LAW (no raw floats, SYS-7). */
        yFormat?: (y: number) => string;
        /**
         * THE EXPLICIT X-TICKS (I15 · forwarded to the crown). A sparse categorical span (the ECF
         * 3-window arc) would otherwise let ECharts auto-fit FRACTIONAL ticks between the real
         * endpoints (`W1 · 2021.5 · W2 · 2022.5 · W3`); the caller hands the exact tick x's here.
         * Omit ⇒ the legacy auto-fit (every existing consumer unchanged).
         */
        xTicks?: number[];
        eyebrow?: string;
        ariaLabel?: string;
        size?: "default" | "hero";
        figId?: string;
        /** Whether route filters alter this figure. Omit for the responsive default. */
        filterResponse?: FilterResponse;
        /**
         * THE RECESSIVE TERMINAL annotation string (AXIOM-5). The trajectory's terminal value
         * (e.g. the −$324.1M the hero already carries audaciously). Rendered DUCKED — never the
         * audacious figure rung — so the same string never renders full-ink twice. Omit ⇒ no
         * terminal annotation.
         */
        terminalValue?: string;
        /** A short caption for the terminal annotation (e.g. "2025 net"). */
        terminalCaption?: string;
        /**
         * THE FOOT-BAND PLACEMENT (EX-51 · O-D12 residue 2). The terminal annotation's lawful home
         * is the D3 plate-foot ledger band (`.viz-plate__foot`, INSIDE the frame) rather than
         * floating below it — but existing consumers (the sci capacity-chase) render it OUTSIDE the
         * frame today, so the move is opt-IN: `false` (default) keeps the standalone render BYTE-
         * IDENTICAL; `true` seats the SAME annotation in the plate's own foot row instead. */
        terminalInFoot?: boolean;
        /** DE-SUPERFLUITY (I-COMPOSE): suppress the trajectory plate's auto first/last key-stats
            when the consuming beat already crowns the span endpoints audaciously (the ECF cliff
            crown owns the three window magnitudes). Forwarded to the bare TrajectoryPlate (M1) —
            the window-arc M2 is a USF/SCI register that keeps its key-stats. Default `false` ⇒
            render parity everywhere it is not set. */
        hideKeyStats?: boolean;
    }>(),
    {
        leadMeasure: undefined,
        voidYear: undefined,
        overSubscriptionX: undefined,
        xFormat: undefined,
        yFormat: undefined,
        xTicks: undefined,
        eyebrow: undefined,
        ariaLabel: "Multi-year figure",
        size: "default",
        figId: undefined,
        filterResponse: "responsive",
        terminalValue: undefined,
        terminalCaption: undefined,
        terminalInFoot: false,
        hideKeyStats: false,
    },
);

const points = computed<TrajectoryPoint[]>(() =>
    trajectory(props.feed, props.measures),
);

const lead = computed<string>(() => props.leadMeasure ?? props.measures[0]);

/** THE DISCRIMINATOR — is this a real trajectory window (≥6 real years, continuing to latest)?
    True ⇒ the WindowArcPlate (bracket + forecast); false ⇒ the bare TrajectoryPlate. The ONE
    convention selecting the crown shape at every depth. */
const isWindow = computed<boolean>(() => isTrajectoryWindow(points.value, lead.value));

/** EX-51 · O-D12 residue 2 — the terminal annotation seats in the crown's OWN foot band only when
    BOTH a value is carried AND the consumer opted in (`terminalInFoot`); otherwise it stays the
    legacy standalone render below the plate (byte-identical default). */
const showFootTerminal = computed<boolean>(
    () => Boolean(props.terminalValue) && props.terminalInFoot,
);
</script>

<template>
    <div class="multi-year-figure" data-testid="multi-year-figure">
        <WindowArcPlate
            v-if="isWindow"
            :feed="feed"
            :measures="measures"
            :series-meta="seriesMeta"
            :lead-measure="leadMeasure"
            :active-year="activeYear"
            :void-year="voidYear"
            :over-subscription-x="overSubscriptionX"
            :x-format="xFormat"
            :y-format="yFormat"
            :x-ticks="xTicks"
            :eyebrow="eyebrow"
            :aria-label="ariaLabel"
            :size="size"
            :fig-id="figId"
            :filter-response="filterResponse"
        >
            <template v-if="$slots.title" #title><slot name="title" /></template>
            <template v-if="showFootTerminal" #foot>
                <p class="multi-year-figure__terminal multi-year-figure__terminal--foot" data-testid="trajectory-terminal">
                    <span class="multi-year-figure__terminal-value">{{ terminalValue }}</span>
                    <span v-if="terminalCaption" class="multi-year-figure__terminal-caption">{{
                        terminalCaption
                    }}</span>
                </p>
            </template>
        </WindowArcPlate>
        <TrajectoryPlate
            v-else
            :feed="feed"
            :measures="measures"
            :series-meta="seriesMeta"
            :lead-measure="leadMeasure"
            :active-year="activeYear"
            :void-year="voidYear"
            :over-subscription-x="overSubscriptionX"
            :x-format="xFormat"
            :y-format="yFormat"
            :x-ticks="xTicks"
            :eyebrow="eyebrow"
            :aria-label="ariaLabel"
            :size="size"
            :fig-id="figId"
            :filter-response="filterResponse"
            :hide-key-stats="hideKeyStats"
        >
            <template v-if="$slots.title" #title><slot name="title" /></template>
            <template v-if="showFootTerminal" #foot>
                <p class="multi-year-figure__terminal multi-year-figure__terminal--foot" data-testid="trajectory-terminal">
                    <span class="multi-year-figure__terminal-value">{{ terminalValue }}</span>
                    <span v-if="terminalCaption" class="multi-year-figure__terminal-caption">{{
                        terminalCaption
                    }}</span>
                </p>
            </template>
        </TrajectoryPlate>

        <!-- THE RECESSIVE TERMINAL ANNOTATION (AXIOM-5). The trajectory's terminal value — the
             string the hero already speaks audaciously — renders HERE as a quiet endpoint label:
             a small rung at ducked opacity, BOTH below the full-ink threshold (opacity ≤ 0.99 OR
             fontSize < the 30px salience floor). So the value-identity stutter never fires: the
             hero owns the audacious figure, the trajectory terminal recedes. STANDALONE (below the
             frame) unless `terminalInFoot` opts the SAME annotation into the crown's own foot band
             above (EX-51 · O-D12 residue 2) — never both (mutually exclusive with `showFootTerminal`). -->
        <p
            v-if="terminalValue && !terminalInFoot"
            class="multi-year-figure__terminal"
            data-testid="trajectory-terminal"
        >
            <span class="multi-year-figure__terminal-value">{{ terminalValue }}</span>
            <span v-if="terminalCaption" class="multi-year-figure__terminal-caption">{{
                terminalCaption
            }}</span>
        </p>
    </div>
</template>

<style scoped>
.multi-year-figure {
    width: 100%;
}
/* THE RECESSIVE TERMINAL (AXIOM-5). A quiet endpoint annotation, NEVER the audacious figure
   rung: a small Fira-tabular value at a ducked opacity. The font-size sits FAR below the 30px
   salience floor AND the opacity below the 0.99 full-ink threshold — both belt-and-suspenders
   so the gate never reads it as a second full-ink render of the hero's audacious string. */
.multi-year-figure__terminal {
    margin-top: 0.5rem;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    opacity: 0.62;
}
/* EX-51 · O-D12 residue 2 — seated in the crown's OWN `.viz-plate__foot` ledger band instead of
   floating below the frame: the outer margin is the FOOT band's own (`margin-block-start: 1.25rem`
   on `.viz-plate__foot`), so the standalone top margin is dropped; the top hairline rule matches
   the EXACT `.viz-plate__keystats` recipe so the row reads as ONE consistent ruled band regardless
   of which foot content is seated (the VizPlate.css §O-D3 convention — "whichever child renders"). */
.multi-year-figure__terminal--foot {
    margin-top: 0;
    padding-block-start: 0.6rem;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground), transparent 90%);
}
.multi-year-figure__terminal-value {
    font-family: "Fira Code", monospace;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--muted-foreground);
}
.multi-year-figure__terminal-caption {
    font-family: "Fira Code", monospace;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
    opacity: 0.8;
}
</style>
