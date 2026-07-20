<script setup lang="ts">
// platform/charts/ChartLegend.vue — the ONE shared legend primitive (DV-2, FD1 §3 /
// the "seven legends → one mechanism" collapse). Every plate's #legend strip is THIS
// component, in one of THREE modes, rendered as ONE accessible <dl> (the a11y root the
// SOLE-mechanism gate keys on: a swatch inside a <dl> IS the primitive; a bare inline-
// styled swatch span outside one is the hand-roll the gate forbids).
//
//   • CONTINUOUS — a magnitude/diverging ramp bar flanked by its two pole words, with an
//     optional HINGE TICK (the break-even mark on a diverging ramp, B-M4), an optional
//     NO-DATA swatch (the grey "no flow" key the choropleth needs), and an optional row of
//     VALUE ANCHORS (low · median · peak in Fira tnum, the ECF editorial-key idiom folded in
//     — D3 ds-legend-dock §2.3 / fd-ecf-cohesion E3/B1). The bar is painted from the
//     `colorKind.ts` stops (the SAME gradient the dropped-cap glyph wears) OR an explicit
//     `gradient` the consumer hands.
//   • DISCRETE — a row of tier/identity chips, each a swatch + its label (+ an optional count
//     badge). Correct for small-N IDENTITY keys (a time-series' named lines, the scatter's
//     series, treemap categories). Each chip is a verbatim stop (NEVER interpolated — FD1
//     §3.3). NEVER prints "· 0": a count of 0/undefined omits the badge.
//   • STEPPED — the hard-stop SPECTRAL SCALE BAR (D3 ds-legend-dock §2.1): N verbatim tier
//     segments, each painted its authored stop as an ADJOINING hard step (zero interpolation,
//     so FD1 §3.3 is honored BY GEOMETRY), hairline `--engrave` seams making the quantization
//     SEEN, flanked by the pole words + one optional mid anchor. The ORDINAL register a
//     14-tier rainbow needs — order at a glance in ONE line, killing the wrap-tower the
//     discrete-flex form ballooned into at 14-chip cardinality. With `layout="ledger"` the
//     discrete chips additionally render as a TIER LEDGER (the atlas/banknote key: swatch
//     column · label + dot-leader · tnum count, recessive zero rows) when the counts are DATA.
//
//   Selection rule (the doctrine the consumers follow):
//     identity, N ≤ ~6      → `discrete` chips (one row)
//     ordinal ramp, N ≥ 7   → `stepped` (+ `layout="ledger"` when counts are data)
//     magnitude / diverging → `continuous` (+ `anchors` when value-anchored)
//
// ONE <dl>: continuous/stepped emit the ramp/bar as a single <dt>meaning</dt><dd>pole→pole</dd>
// description pair; discrete emits one <dt>swatch</dt><dd>label</dd> pair per chip. Screen
// readers read the legend as a definition list (term ⇒ meaning), the chart's key in prose.
import type { ColorKind } from "../scale/colorKind.js";
import { useChartLegend } from "./useChartLegend.js";

/** A discrete legend entry — a verbatim swatch + its label + an optional count badge. */
export interface LegendChip {
    /** A stable key (the tier mbps, the series key). */
    key: string | number;
    /** The chip's resolved colour (a CSS colour the swatch fills with). */
    color: string;
    /** The chip's label (the tier Mbps, the series name). */
    label: string;
    /** An optional count badge (PSUs at this tier) — omitted when undefined OR 0 (a 0 NEVER
        prints "· 0": a dead tier shows an em-dash in the ledger, no badge in the chip row). */
    count?: number;
}

/** THE CLAMPED-RAMP STATEMENT (A-29 · the legend-coverage law: the legend keys every rendered
    encoding). A ramp capped at a percentile paints its top stop for EVERY value above the cap — so
    the key must say so, or the map silently claims the field's peak is the cap. The legend owns the
    GRAMMAR ("capped at $445 (P95) · max $722, Hyde"); the consumer hands only the facts. */
export interface LegendClamp {
    /** The ramp's top stop — the value every larger datum is painted at (e.g. "$445"). */
    cap: string;
    /** How the cap was chosen, in the caller's own words (e.g. "P95"). Omit ⇒ unstated. */
    percentile?: string;
    /** The field's TRUE maximum — the value the clamp hides (e.g. "$722"). */
    max: string;
    /** Who holds that maximum (e.g. "Hyde") — the named extremum. Omit ⇒ the bare figure. */
    holder?: string;
}

const props = withDefaults(
    defineProps<{
        /** The legend mode: a `continuous` ramp bar, `discrete` chips, or a `stepped` hard-stop
            spectral scale bar (the ordinal ladder a 14-tier rainbow needs). */
        mode: "continuous" | "discrete" | "stepped";
        /** (discrete) `chips` for the flex row, OR `ledger` for the editorial tier ledger (the
            swatch-column / label+dot-leader / tnum-count grid; recessive zero rows). */
        layout?: "chips" | "ledger";
        /** (continuous) The ramp's colour kind — paints the bar from the `colorKind.ts`
            stops, the same gradient the dropped-cap glyph wears. Ignored if `gradient` set. */
        colorKind?: ColorKind;
        /** (continuous) The hinge as a 0..1 fraction up the ramp — slides the kind's stops
            AND positions the optional hinge tick. Default 0.5 (the neutral split). */
        hinge?: number;
        /** (continuous) An explicit CSS gradient, overriding `colorKind` (for a bespoke bar). */
        gradient?: string;
        /** (continuous/stepped) The low/high pole words flanking the bar (the meaning-bearing
            labels — the hues fail 4.5:1 at this size, so position + word read the key). */
        lowLabel?: string;
        highLabel?: string;
        /** (continuous) Draw the break-even HINGE TICK on the bar at the `hinge` fraction
            (the diverging key's seen break-even, B-M4). Default false. */
        showHinge?: boolean;
        /** (continuous) The hinge tick's label (e.g. "break-even"). */
        hingeLabel?: string;
        /** (continuous) Append a NO-DATA swatch + label after the bar (the choropleth's "no
            flow" key, B-M4). Default false. */
        showNoData?: boolean;
        /** (continuous) The no-data swatch colour + label. */
        noDataColor?: string;
        noDataLabel?: string;
        /** (continuous) The value anchors set in Fira tnum beneath the ramp (low · median ·
            peak — the ECF editorial-key idiom). Spaced edge → centre → edge under the bar. */
        anchors?: (string | null)[];
        /** (any ramp mode) THE CLAMPED-RAMP STATEMENT (A-29) — when the ramp's top stop is a CAP
            (a percentile clamp), the key states the cap AND the true maximum it hides, in the
            legend's own grammar. Omit ⇒ no clamp line (an unclamped ramp says nothing). */
        clamp?: LegendClamp;
        /** (discrete/stepped) The chips, base → apex / first → last. */
        chips?: LegendChip[];
        /** (stepped) An optional mid anchor word + its 0..1 position along the bar (e.g. the
            SCI "1 Gb/s" hinge the audacious statistic pivots on). */
        midLabel?: string;
        midPosition?: number;
        /** The accessible legend label (the <dl>'s aria-label). */
        ariaLabel?: string;
        /** A test id for the legend strip. */
        testid?: string;
    }>(),
    {
        layout: "chips",
        colorKind: undefined,
        hinge: 0.5,
        gradient: undefined,
        lowLabel: undefined,
        highLabel: undefined,
        showHinge: false,
        hingeLabel: undefined,
        showNoData: false,
        noDataColor: "var(--viz-no-data)",
        noDataLabel: "no data",
        anchors: undefined,
        clamp: undefined,
        chips: undefined,
        midLabel: undefined,
        midPosition: undefined,
        ariaLabel: "Legend",
        testid: undefined,
    },
);

const {
    rampBackground,
    steppedBackground,
    steppedSeams,
    hingeLeft,
    midLeft,
    isContinuous,
    isStepped,
    isLedger,
} = useChartLegend(props);

/** The discrete chips — the BADGE-WHEN-DATA contract: a count of 0 (or undefined) never
    prints "· 0" (it omits the badge / shows an em-dash in the ledger). */
const isDead = (count?: number): boolean => count == null || count === 0;
</script>

<template>
    <!-- ONE accessible <dl> — the legend's key as a definition list. The visual swatches +
         words ride the <dt>/<dd> structure so a screen reader reads term ⇒ meaning. This <dl>
         is the SOLE-mechanism gate's anchor: a swatch inside it is the primitive; outside it
         is a hand-roll. -->
    <dl
        class="chart-legend figure"
        :class="{
            'chart-legend--continuous': isContinuous,
            'chart-legend--stepped': isStepped,
            'chart-legend--discrete': mode === 'discrete' && !isLedger,
            'chart-legend--ledger': isLedger,
        }"
        :aria-label="ariaLabel"
        :data-testid="testid"
    >
        <template v-if="isContinuous">
            <!-- The ramp pair as a DIRECT <dt>/<dd> group (the <dl> must directly hold a
                 <dt> followed by a <dd> — WCAG 1.3.1 / axe definition-list): the term is the
                 bar's meaning (the low pole word), the detail the ramp itself + the high pole +
                 the value anchors. The pole words carry the reading (the hues fail 4.5:1 at this
                 size); the bar + optional hinge tick are decorative (aria-hidden). -->
            <dt class="chart-legend__pole">{{ lowLabel || "low" }}</dt>
            <dd class="chart-legend__ramp-cell">
                <span class="chart-legend__ramp" :style="{ background: rampBackground }" aria-hidden="true">
                    <span
                        v-if="showHinge"
                        class="chart-legend__hinge"
                        :style="{ left: hingeLeft }"
                        :title="hingeLabel"
                    />
                </span>
                <span v-if="highLabel" class="chart-legend__pole chart-legend__pole--inline">{{ highLabel }}</span>
                <!-- The VALUE ANCHORS (the ECF editorial-key idiom): low · median · peak set in
                     Fira tnum beneath the ramp — the live legend reads its own distribution's
                     anchor values, the ramp the fills wear. Nested in the detail cell. -->
                <span v-if="anchors && anchors.length" class="chart-legend__anchors" aria-hidden="true">
                    <span v-for="(a, i) in anchors" :key="i">{{ a ?? "—" }}</span>
                </span>
            </dd>
            <!-- The no-data key (B-M4): a discrete swatch + label appended after the ramp, so
                 the choropleth's "no flow" grey reads as a named key, not an unlabeled fill. -->
            <template v-if="showNoData">
                <dt class="chart-legend__swatch-dt">
                    <span class="chart-legend__swatch" :style="{ background: noDataColor }" aria-hidden="true" />
                </dt>
                <dd class="chart-legend__chip-label">{{ noDataLabel }}</dd>
            </template>
        </template>

        <template v-else-if="isStepped">
            <!-- The STEPPED hard-stop spectral scale bar as a DIRECT <dt>/<dd> group (the same
                 WCAG-valid shape as continuous): the base pole word is the term, the N-segment
                 quantized bar (verbatim stops, hairline seams) + the apex pole + the mid anchor
                 are the detail. The bar is decorative (aria-hidden); the pole words (+ mid
                 anchor) are the meaning-bearing words. ONE line that shrinks before it wraps. -->
            <dt class="chart-legend__pole">{{ lowLabel || "low" }}</dt>
            <dd class="chart-legend__step-cell">
                <span
                    class="chart-legend__step-bar"
                    :style="{ background: steppedBackground }"
                    aria-hidden="true"
                >
                    <span class="chart-legend__step-seams" :style="{ background: steppedSeams }" />
                    <span
                        v-if="midLabel"
                        class="chart-legend__step-mid-tick"
                        :style="{ left: midLeft }"
                    />
                </span>
                <span v-if="highLabel" class="chart-legend__pole chart-legend__pole--inline">{{ highLabel }}</span>
                <span
                    v-if="midLabel"
                    class="chart-legend__step-mid-label"
                    :style="{ '--mid-left': midLeft }"
                    aria-hidden="true"
                    >{{ midLabel }}</span
                >
            </dd>
        </template>

        <template v-else-if="isLedger">
            <!-- THE TIER LEDGER (D3 ds-legend-dock §2.3) — the atlas/banknote key: a true
                 swatch COLUMN, labels left-aligned mono with a dot-leader to the tnum count,
                 read base → apex. Zero-count tiers stay listed but RECESSIVE (hollow engraved
                 swatch, dim label, an em-dash count cell — NEVER "· 0"). The ladder shows every
                 rung; the dot-leaders tie label to count, making 14 rows read as a ledger. -->
            <div
                v-for="chip in chips ?? []"
                :key="chip.key"
                class="chart-legend__ledger-row"
                :class="{ 'is-dead': isDead(chip.count) }"
            >
                <dt class="chart-legend__swatch-dt">
                    <span
                        class="chart-legend__swatch"
                        :class="{ 'chart-legend__swatch--hollow': isDead(chip.count) }"
                        :style="isDead(chip.count) ? undefined : { background: chip.color }"
                        aria-hidden="true"
                    />
                </dt>
                <dd class="chart-legend__ledger-label">
                    <span class="chart-legend__ledger-word">{{ chip.label }}</span>
                    <span class="chart-legend__ledger-leader" aria-hidden="true" />
                    <span class="chart-legend__ledger-count">{{ isDead(chip.count) ? "—" : chip.count }}</span>
                </dd>
            </div>
        </template>

        <template v-else>
            <!-- The discrete chips: one <dt>swatch</dt><dd>label</dd> pair per tier/identity,
                 each swatch a verbatim stop (no interpolation). An optional count badge rides
                 the label — but a count of 0/undefined omits it (NEVER "· 0"). -->
            <div v-for="chip in chips ?? []" :key="chip.key" class="chart-legend__chip">
                <dt class="chart-legend__swatch-dt">
                    <span class="chart-legend__swatch" :style="{ background: chip.color }" aria-hidden="true" />
                </dt>
                <dd class="chart-legend__chip-label">
                    {{ chip.label }}<span v-if="!isDead(chip.count)" class="chart-legend__count"> · {{ chip.count }}</span>
                </dd>
            </div>
        </template>

        <!-- THE CLAMP LINE (A-29) — the ramp's cap, stated. Seated OUTSIDE the mode branches: a
             continuous ramp and a stepped scale bar can both be clamped, and the statement reads
             the same either way. The term is what the top stop MEANS (the cap + how it was cut);
             the detail is the maximum the cap hides (+ who holds it), so a screen reader hears
             "capped at $445 (P95) ⇒ max $722, Hyde" — the encoding's whole truth. -->
        <template v-if="clamp">
            <dt class="chart-legend__clamp-dt">
                capped at {{ clamp.cap
                }}<span v-if="clamp.percentile"> ({{ clamp.percentile }})</span>
            </dt>
            <dd class="chart-legend__clamp">
                max {{ clamp.max }}<span v-if="clamp.holder">, {{ clamp.holder }}</span>
            </dd>
        </template>
    </dl>
</template>

<style scoped>
/* The legend reads in the muted recessive ink at the figure-tick rung — chrome that never
   competes with the data. The pole words + chip labels are AA-clear (muted-foreground on
   paper); the swatches/ramp are aria-hidden decoration the words name. */
.chart-legend {
    display: flex;
    align-items: center;
    gap: 0.5rem 0.625rem;
    margin: 0;
    font-size: 0.6875rem;
    color: var(--muted-foreground);
}
.chart-legend--discrete {
    flex-wrap: wrap;
    justify-content: flex-end;
}
.chart-legend dt,
.chart-legend dd {
    margin: 0;
}

/* CONTINUOUS — the low pole (a direct <dt>), then the ramp DETAIL cell (a direct <dd>) that
   holds the bar, the inline high pole, and the value-anchors row. The dl is a flex row; the
   cell wraps its anchors beneath the bar. */
.chart-legend--continuous {
    flex-wrap: wrap;
    align-items: flex-start;
}
.chart-legend__nodata-row,
.chart-legend__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    white-space: nowrap;
}
.chart-legend__pole {
    color: var(--muted-foreground);
    white-space: nowrap;
}
.chart-legend__ramp-cell,
.chart-legend__step-cell {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    min-inline-size: 0; /* shrink before wrap — the clamp, never a max-width wrap-forcer */
}
.chart-legend__ramp {
    position: relative;
    display: inline-block;
    width: 5rem;
    height: 0.5rem;
    border-radius: var(--radius-pill);
}
/* The break-even HINGE TICK (B-M4) — a thin foreground mark across the ramp at the hinge
   fraction, so the diverging key shows WHERE break-even sits (the seen hinge, not implied). */
.chart-legend__hinge {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    border-radius: var(--radius-mark);
    background: var(--foreground);
    transform: translateX(-50%);
}
/* The VALUE ANCHORS (the ECF editorial-key idiom) — low · median · peak in Fira tnum, spread
   edge → centre → edge. A full-width row that wraps beneath the bar within the detail cell. */
.chart-legend__anchors {
    display: flex;
    justify-content: space-between;
    /* The narrow-measure REFLOW (the C8 close-π gutter consequence): at the mobile
       dock-clearing column (~270px measure → ~188px plate interior) the three tnum
       anchors (≈239px) must WRAP onto a second line, never ellipsize/clip — G1's
       text-reflow contract. On a one-line fit, space-between still spreads them. */
    flex-wrap: wrap;
    column-gap: 0.75rem;
    row-gap: 0.125rem;
    flex-basis: 100%;
    min-inline-size: 0;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
    opacity: 0.9;
}

/* THE CLAMP LINE (A-29) — the ramp-cap statement, seated on its own row beneath the bar in the
   recessive tnum register the anchors already speak. The term (the cap) and the detail (the true
   max) read as ONE sentence, joined by the atlas mid-dot; a narrow measure wraps it, never clips. */
.chart-legend__clamp-dt,
.chart-legend__clamp {
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
    opacity: 0.9;
}
.chart-legend__clamp-dt {
    white-space: nowrap;
}
.chart-legend__clamp::before {
    content: " · ";
}

/* STEPPED — the low pole (a direct <dt>) + the bar DETAIL cell (a direct <dd>): the quantized
   bar, the inline apex pole, the mid anchor absolutely seated under its boundary. ONE line. */
.chart-legend--stepped {
    flex-wrap: wrap;
    align-items: flex-start;
}
.chart-legend__step-cell {
    flex: 1;
    /* the abs mid-label is positioned within this cell — give it room below the bar. */
    padding-block-end: 1.05em;
    position: relative;
}
.chart-legend__step-bar {
    position: relative;
    display: block;
    flex: 1;
    min-inline-size: clamp(8rem, 24cqi, 13rem);
    height: 0.5rem;
    border-radius: var(--radius-mark);
    overflow: hidden;
}
/* The hairline seam overlay — drawn over the segment fill so the quantization is SEEN. */
.chart-legend__step-seams {
    position: absolute;
    inset: 0;
    pointer-events: none;
}
/* The mid-anchor tick (e.g. the SCI 1 Gb/s hinge) — a foreground mark across the bar. It is
   aria-hidden legend DECORATION (rung ③), so its recession reads from --attn-legend
   (§HIERARCHY) — the legend mark declares its strata rung by TOKEN, not a per-surface 0.7
   guess (the IC-5 escape-hatch close; the AA-clear TEXT keeps its full muted-foreground ink). */
.chart-legend__step-mid-tick {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 1.5px;
    background: var(--foreground);
    transform: translateX(-50%);
    opacity: var(--attn-legend); /* the legend-mark recession rung (§HIERARCHY) */
}
/* The mid-anchor word, seated under the tick (centred on its position along the bar). It is
   absolutely placed within the step-cell so the bar+poles stay on one line above it. */
.chart-legend__step-mid-label {
    position: absolute;
    inset-block-end: 0;
    inset-inline-start: var(--mid-left, 50%);
    transform: translateX(-50%);
    inline-size: max-content;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
    opacity: 0.9;
}

/* DISCRETE / NO-DATA — the verbatim swatch + its label. */
.chart-legend__swatch-dt {
    display: inline-flex;
}
.chart-legend__swatch {
    display: inline-block;
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
    border-radius: var(--radius-mark);
    /* THE CHIP-RIM ROUTE ACCENT (design-palette-identity §2.4 MOVE 4 / d-pops M4 · SM-6). The
       swatch FILL is the verbatim data hue (the `:style="{ background: chip.color }"` bind — never
       touched: G6's "--route-* never on a data fill" holds). The 1px engraved RIM is CHROME — it
       carries the route's accent TEMPERATURE recessively, so the legend reads as the route's own
       chip-set without re-coloring the data. The rim mixes --route-accent ~70% into transparent
       (a faint structural tint, NOT a saturated outline), composed over the --engrave hairline so a
       theme/route flip retunes it from the cascade. `--route-accent` falls through to the platform
       brand pole when no route binds, so a bare legend still reads. */
    box-shadow: inset 0 0 0 0.5px
        color-mix(in oklab, var(--route-accent), transparent 70%);
}
.chart-legend__chip-label {
    color: var(--muted-foreground);
}
.chart-legend__count {
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
}

/* THE TIER LEDGER — the atlas/banknote key: a swatch column, labels + dot-leaders, tnum
   counts. A CSS grid so the swatches form a true column, labels left-align, counts right-
   align. Read base → apex (the consumer feeds the chips in that order). */
.chart-legend--ledger {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 0.5rem;
    row-gap: 0.18rem;
    justify-content: start;
    inline-size: max-content;
    max-inline-size: 14rem;
}
.chart-legend__ledger-row {
    display: contents;
}
.chart-legend__ledger-label {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: baseline;
    column-gap: 0.4rem;
    color: var(--muted-foreground);
}
.chart-legend__ledger-word {
    font-variant-numeric: tabular-nums;
}
/* The dot-leader — the editorial signature tying label to count across the gap; it makes the
   14 rows read as a LEDGER (a printed table of contents), not a list. */
.chart-legend__ledger-leader {
    align-self: center;
    border-block-end: 1px dotted color-mix(in oklab, var(--engrave, currentColor), transparent 50%);
    transform: translateY(-0.12em);
}
.chart-legend__ledger-count {
    font-variant-numeric: tabular-nums;
    text-align: end;
    opacity: 0.9;
}
/* The hollow engraved swatch — a dead (zero-count) tier's rung: a 1px --engrave ring, no
   fill, so every rung of the ladder still shows but the dead ones read recessive. */
.chart-legend__swatch--hollow {
    background: transparent;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--engrave, currentColor), transparent 30%);
}
.chart-legend__ledger-row.is-dead .chart-legend__ledger-word {
    opacity: 0.6;
}
.chart-legend__ledger-row.is-dead .chart-legend__ledger-count {
    opacity: 0.55;
}
</style>
