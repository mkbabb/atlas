<script setup lang="ts">
// Treemap.vue — the part-of-whole box primitive (ECF-PAGES §3/§4, the Charters +
// Consultants tiles: box AREA = total funding, box FILL = $/ADM on a ColorScale). A
// useEChart treemap like the rest of the platform's charts: boxes sized by `value`,
// stained by the caller's `fill(item)`, labelled in place. The canvas tooltip is OFF —
// the Vue HoverCard is the hover (INV-6, kill the canvas string) — and hover emits the
// item key upward so the shared selection lights the same datum across the dashboard.
//
// ECharts via `useEChart`, the SOLE lifecycle composable. One flat level (no drill), no
// breadcrumb, no leaf-label clutter past what fits: a ranked field of rectangles, the
// editorial treemap the v3.2 workbook draws — not the glossy interactive one.
//
// THE PRODUCER (C.W4.2 S1, contract symmetry): a box `select`s on the ECHARTS CANVAS
// click (NOT an SVG `@click` — the treemap is a canvas, RP-4), the modifier read off the
// native event the zrender params carry. So a click-a-charter-to-filter fires the same
// contract the maps do.
import { computed, ref, watch } from "vue";
import { use } from "echarts/core";
import { TreemapChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import { useMobileRegister } from "../../platform/composables/useMobileRegister.js";
import { useEChart } from "../composables/useEChart.js";
import { useVizPalette } from "../composables/useVizPalette.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { RAISE_ONLY } from "../scale/emphasis-policy.js";
import {
    isMultiSelect,
    type SelectionEmits,
} from "../contract/selection-contract.js";

// Treemap + the (kept-OFF) tooltip module — registered here so the bundle only carries
// the box renderer when a dashboard actually draws one (modular registration, CH2 §B).
use([TreemapChart, TooltipComponent]);

/** One box in the treemap — a charter applicant, a consulting firm. */
export interface TreemapItem {
    /** A stable join key (an applicant id, a firm name) for the linked-highlight. */
    key: string;
    /** The box's display label. */
    name: string;
    /** The magnitude the box AREA encodes (total funding). */
    value: number;
}

/** THE RICH IN-BOX LABEL (F6.9 · f6-viz-text-rich §2.2c — the in-plate story callout). A
    two-tier typeset card INSIDE the box: the firm/applicant NAME reads as a Newsreader prose
    title (heavier), the count/badge META recedes as Fira-tabular metadata in muted ink with a
    faint mid-dot — a typeset card, not a flat truncated sentence. Mechanism #2 (in-canvas
    ECharts rich-text), so the label truncates + morphs WITH its box (a DOM overlay would
    mis-anchor under the universalTransition box-morph + the per-run truncate). Color per run is
    a RESOLVED rgb (T-4, the caller hands the contrast-derived ink); no data hue touches the text
    (the ramp-ink ban — the $/student encoding stays on the box FILL). */
export interface TreemapRichLabel {
    /** The prose NAME run (Newsreader, heavier). */
    name: string;
    /** The recessive META runs (Fira tabular, muted) — joined by a faint mid-dot. The box
        drops the meta line first under `overflow:truncate` (the proportion law degrades
        gracefully — a small box keeps the name, a large box reads the full card). */
    meta: string[];
}

const props = withDefaults(
    defineProps<{
        /** The boxes to lay out — order is irrelevant, the treemap packs by value. */
        items: TreemapItem[];
        /** A box's fill colour, keyed by the item (a ColorScale over a second measure). */
        fill: (item: TreemapItem) => string;
        /** A box's label colour (so a dark fill keeps the text legible). Default the foreground. */
        labelColor?: (item: TreemapItem) => string;
        /** THE RICH IN-BOX LABEL (F6.9) — when supplied, the box emits a two-tier ECharts
            rich-text label (a Newsreader name run + Fira muted meta runs) instead of the flat
            `name` string. The per-run INK is derived from the box's resolved `labelColor` (the
            name run) blended toward muted (the meta run) — both T-4-resolved rgb, NEVER a data
            hue (the ramp-ink ban). Omit ⇒ the flat single-run label (byte-identical at rest). */
        richLabel?: (item: TreemapItem) => TreemapRichLabel;
        /** Keys to RAISE (linked-highlight). */
        raisedKeys?: ReadonlySet<string>;
        /** THE TOP-N BUDGET (D4.a · ds §9) — the per-viz `topN` dial generalizing the MB-4
            mobile tile budget to user control: when set, the field shows the top-N boxes by
            value (rolling the tail into one "…and M more" cap tile, the SAME affordance the
            mobile budget uses). `undefined` (the default) keeps the register policy — the full
            field on desktop, the mobile leaf-budget on a phone — so a URL minted on one register
            never imposes its budget on another (ds §5). */
        topN?: number;
        ariaLabel?: string;
    }>(),
    {
        labelColor: undefined,
        raisedKeys: undefined,
        topN: undefined,
        richLabel: undefined,
        ariaLabel: "Treemap",
    },
);

const emit = defineEmits<SelectionEmits>();

const host = ref<HTMLElement | null>(null);

// The canvas-colour bridge (T-4): the engraved box-seam (the plate fill `--card`) and
// the default label ink (`--foreground`) are CSS tokens the canvas cannot read, so the
// resolved rgb is injected — re-resolved on a theme flip, never a raw `var(--…)` that
// would render black-on-graphite in dark.
const palette = useVizPalette();

/** Blend a resolved name-ink rgb toward the palette muted (the recessive META run ink). The
    META run reads ONE tier quieter than the NAME (the inversion law — the metadata never
    out-weighs the firm name it annotates). Both ends are already T-4-resolved rgb, so the
    midpoint is paint-safe (the canvas never sees a `var(--…)`). A faint mid-dot sits quieter
    still (toward the box's own ink so it reads as a separator, not a glyph). */
function parseRgb(c: string): [number, number, number] | null {
    const m = c.match(/-?\d*\.?\d+/g);
    if (!m || m.length < 3) return null;
    return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function mix(a: string, b: string, t: number): string {
    const ca = parseRgb(a);
    const cb = parseRgb(b);
    if (!ca || !cb) return a;
    const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return `rgb(${r}, ${g}, ${bl})`;
}

// THE RE-SORT MORPH FENCE (D7.c M9 / ds2-motion-field M9) — under reduce the top-N re-tile is a
// HARD-CUT (animation off, instant re-layout); with motion it morphs via ECharts
// universalTransition (the boxes slide to their new packed positions).
const reduced = useReducedMotion();

// ── MB-4 / M6 — the mobile tile-budget ([FOLD-MOBILE-TREEMAP]) ─────────────────────────
// At the 358px measure a field of N tiles degrades to a long tail of sub-name-width boxes
// that truncate to "#N …" rank-numeral noise — a tile that cannot carry a legible name is
// NOT an independent tile on the phone. So mobile budgets to the TOP-N tiles that can hold a
// name, rolling the tail into ONE "…and M more" tile (area = Σ tail, magnitude-proportional).
//
// M6 (fd-ecf-cohesion) — the flat top-6 budget INVERTED the plate: at the 99-charter measure
// the 93-tile tail SUMS to ~60% of the funding mass, so the ONE rollup box swallowed ~60% of
// the plate (a grey void where the tile language should be). A flat leaf count is the wrong
// instrument — the rollup's AREA is its VALUE SHARE, not its tile count, so a budget that
// ignores the tail's mass cannot bound the void. The fix is a LEAF-FLOOR + an area-bounded
// BUDGET CURVE: grow the named head until the rolled tail's value share falls under a ceiling
// (the rollup never the dominant tile), floored at a minimum legible count and capped at what
// fits the 358px measure. So the named field always holds the funding mass and the rollup is a
// small labelled residual — the tile language reads, not a slab. The budget is a FRAME-seam
// policy (one budget covers ECF + any future treemap, no per-dashboard fork). Desktop is
// untouched (the full field). A reactive matchMedia re-lays live on a rotate/resize.
const ROLLUP_KEY = "__treemap_rollup__"; // the sentinel key the "…and M more" tile carries
/** The leaf-FLOOR — the minimum named tiles the mobile field always shows (so the plate is
    never reduced to a handful of boxes + a slab). Eight name-width tiles fit the 358px column
    at the 11px label floor. */
const MOBILE_LEAF_FLOOR = 8;
/** The leaf-CEILING — the most name-width tiles that read at 358px before they truncate to
    rank-numeral noise (the head never grows past what the column can label). */
const MOBILE_LEAF_CEILING = 12;
const { isPhone: isMobile } = useMobileRegister();

// The "…and M more" tile is an isExpand affordance: a tap reclaims the pixels by un-budgeting
// the full field IN PLACE (the A7 expand register — the field expands rather than a second
// route). Toggled off whenever the items change so a new dataset re-budgets to its top-N.
const expanded = ref(false);
watch(
    () => props.items,
    () => {
        expanded.value = false;
    },
);

// The budgeted box set: on desktop (or once expanded) the full field; on the budgeted mobile
// register the top-N named leaves + one rolled "…and M more" cap tile.
//
// M6 (fd-ecf-cohesion) — the AREA-CLAMP, not just a leaf count. The original failure was the
// flat top-6 rolling 93 of 99 charters into a rollup that summed to ~60-90% of the funding
// mass, so the ONE grey box DOMINATED the plate (the tile language inverted into a void). A
// leaf count alone cannot bound this: a long tail of many small charters has a large SUMMED
// value, so a magnitude-faithful rollup is always huge. But the rollup is an AFFORDANCE (a
// "tap to see the rest" tile), NOT a data box that must be area-faithful — so the fix clamps
// the rollup tile's DISPLAYED area to at most the head's MEDIAN tile. It can never out-size the
// named field: it reads as "one more box, the residual," never a slab. The leaf-FLOOR (8) keeps
// the named field rich; the CEILING (12) keeps every name legible at 358px. (The hidden mass is
// honestly recovered by the tap-to-expand affordance — the full field, area-true.)
const budgetedItems = computed<TreemapItem[]>(() => {
    // THE TOP-N DIAL (D4.a) — an explicit user budget wins over the register policy: show the
    // top-N boxes by value + one rolled "…and M more" cap tile (the SAME affordance the mobile
    // budget uses). The expand affordance still un-budgets the full field in place.
    if (props.topN != null && !expanded.value) {
        const sorted = [...props.items].sort((a, b) => b.value - a.value);
        const n = Math.min(props.topN, sorted.length);
        if (sorted.length <= n + 1) return props.items;
        const head = sorted.slice(0, n);
        const tail = sorted.slice(n);
        const headValues = head.map((it) => it.value).sort((a, b) => a - b);
        const medianHeadValue = headValues[Math.floor(headValues.length / 2)] ?? 0;
        const rollupArea = Math.min(
            tail.reduce((acc, it) => acc + it.value, 0),
            medianHeadValue,
        );
        return [
            ...head,
            { key: ROLLUP_KEY, name: `…and ${tail.length} more`, value: rollupArea },
        ];
    }
    if (!isMobile.value || expanded.value) return props.items;
    const sorted = [...props.items].sort((a, b) => b.value - a.value);
    const headCount = Math.min(MOBILE_LEAF_FLOOR, sorted.length);
    // Rolling a single tail tile saves nothing (it would replace one named tile with the
    // rollup) — only budget when the tail is ≥2 tiles. Grow the head toward the ceiling if the
    // field is large enough to spare named leaves past the floor.
    const grownHead = Math.min(MOBILE_LEAF_CEILING, Math.max(headCount, Math.ceil(sorted.length * 0.12)));
    const n = Math.min(grownHead, sorted.length);
    if (sorted.length <= n + 1) return props.items;
    const head = sorted.slice(0, n);
    const tail = sorted.slice(n);
    // The rollup's DISPLAY area is clamped to the head's MEDIAN tile value — the rollup is an
    // affordance, so it never becomes the dominant box regardless of the tail's true sum. (The
    // label still announces the true count of folded tiles; only the BOX AREA is clamped.)
    const headValues = head.map((it) => it.value).sort((a, b) => a - b);
    const medianHeadValue = headValues[Math.floor(headValues.length / 2)] ?? 0;
    const rollupArea = Math.min(
        tail.reduce((acc, it) => acc + it.value, 0),
        medianHeadValue,
    );
    return [
        ...head,
        { key: ROLLUP_KEY, name: `…and ${tail.length} more`, value: rollupArea },
    ];
});

const option = computed<EChartsOption>(() => {
    const data = budgetedItems.value.map((it) => {
        // MB-4 — the rolled "…and M more" cap tile is an AFFORDANCE, not a datum: it wears the
        // engraved muted ground (a quiet recessive box, distinct from the data hues) and never
        // routes through the caller's `fill`/`labelColor` (its key is not a real item key).
        const isRollup = it.key === ROLLUP_KEY;
        const boxColor = isRollup ? palette.value.muted : props.fill(it as TreemapItem);
        // THE RICH IN-BOX LABEL (F6.9 · §2.2c) — a two-tier typeset card emitted IN-CANVAS via
        // the ECharts rich-text channel (`label.rich` + `{name|…}\n{meta|…}` formatter). The NAME
        // run is the box's resolved ink (the caller's contrast-derived `labelColor`); the META run
        // recedes one tier (the name blended toward muted — the inversion law); the mid-DOT sits
        // quieter still. Per-box `rich` (each box has its own contrast ink), so the registry rides
        // the datum. NO data hue touches a run (the ramp-ink ban — the encoding stays on the FILL).
        const richSpec =
            !isRollup && props.richLabel ? props.richLabel(it as TreemapItem) : null;
        const nameInk = isRollup
            ? palette.value.background
            : props.labelColor
              ? props.labelColor(it as TreemapItem)
              : palette.value.foreground;
        const richLabelBlock = richSpec
            ? {
                  // The two-tier card: a Newsreader name title, then the Fira-tabular meta line
                  // (dropped first under truncate — the proportion law degrades gracefully). The
                  // meta runs join through a faint mid-DOT run (`{dot| · }`), so the separator
                  // recedes below the metadata it joins.
                  formatter: () =>
                      richSpec.meta.length
                          ? `{name|${richSpec.name}}\n` +
                            richSpec.meta.map((m) => `{meta|${m}}`).join("{dot| · }")
                          : `{name|${richSpec.name}}`,
                  rich: {
                      name: {
                          fontFamily: palette.value.fontSerif,
                          fontWeight: 600,
                          fontSize: 12,
                          lineHeight: 15,
                          color: nameInk,
                      },
                      meta: {
                          fontFamily: palette.value.fontMono,
                          fontWeight: 400,
                          fontSize: 10,
                          lineHeight: 13,
                          color: mix(nameInk, palette.value.muted, 0.55),
                      },
                      dot: { fontWeight: 400, color: mix(nameInk, palette.value.muted, 0.78) },
                  },
              }
            : null;
        return {
            name: it.name,
            value: it.value,
            // THE RE-SORT MORPH ANCHOR (M9) — a stable `id` per box (its join key) so ECharts'
            // `universalTransition` MATCHES a survivor across a top-N change and SLIDES it to its
            // new packed position (instead of the whole field re-popping). A box dropped from the
            // budget fades out; a box that survives morphs in place.
            id: it.key,
            // Carry the key on the datum so a mouseover params resolves to it (linked highlight).
            key: it.key,
            itemStyle: {
                color: boxColor,
                // The engraved gap between boxes — the atlas-plate seam, not a glossy gutter.
                borderColor: palette.value.border,
                borderWidth: 2,
                gapWidth: 2,
            },
            // THE STROKE RAISE (E3 §1.4 / f-hover-flicker F6) — the part-of-whole hover affordance.
            // Dropping `focus:"self"` killed the BLUR-the-rest wash, but ECharts' default treemap
            // emphasis still BRIGHTENS the hovered box's FILL (a derived-lighter colour) — and on a
            // field of a few LARGE boxes (the consultants treemap), brightening one dominant box
            // swings whole-plate mean luminance +40 (the wash the gate still reads). So the box's
            // emphasis PRESERVES its own fill (`color: boxColor` — no brighten) and the raise rides
            // a STROKE instead: a heavier `--foreground` border on the ONE box, exactly the SVG
            // choropleth's stroke-on-hover idiom (the design control). Raise the one with ink, never
            // re-tint the field.
            emphasis: {
                itemStyle: {
                    color: boxColor,
                    borderColor: palette.value.foreground,
                    borderWidth: 2,
                },
            },
            label: {
                color: nameInk,
                // THE RICH IN-BOX CARD (F6.9) — when the caller supplies `richLabel`, the box
                // carries the two-tier formatter + rich registry (the Newsreader name + Fira
                // meta runs). Else the flat single-run label (the `color` above carries the ink).
                ...(richLabelBlock ?? {}),
            },
        };
    });

    return {
        // THE RE-SORT MORPH (D7.c M9 / ds2-motion-field M9) — the top-N dial RE-ORDERS the field,
        // and a re-order is the canonical morph case. ECharts `universalTransition` (below) GPU-
        // morphs the data-bound boxes between option pushes, so on a top-N change the surviving
        // boxes SLIDE to their new packed positions rather than the whole field re-popping. This
        // is a CANVAS chart, so it uses ECharts' OWN transition engine — NO `view-transition-name`
        // on a `<canvas>` (the anti-move; a canvas carries no per-element VT name). The Treemap has
        // no external value-scrub (unlike the SCI band-cake, whose `animation:false` is owned by
        // the band-RISE NumericAnimation), so enabling the ECharts tween here is safe — there is no
        // second writer to fight. Under reduce the tween is OFF (an instant hard-cut re-tile).
        animation: !reduced.value,
        backgroundColor: "transparent",
        // Tooltip OFF — the Vue HoverCard is the hover (INV-6, kill the canvas string).
        tooltip: { show: false },
        series: [
            {
                type: "treemap",
                roam: false, // an editorial field, not a pan/zoom toy
                nodeClick: false,
                breadcrumb: { show: false },
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                // THE MORPH OPT-IN (M9) — match boxes by their stable `id` across option pushes and
                // morph the survivors (slide to new position) on the GPU. Brief, on an explicit
                // option change only (the top-N dial), never per data tick; PRM fences it off above.
                universalTransition: { enabled: !reduced.value },
                // One flat level: a box's style comes from its datum, drawn verbatim.
                levels: [{ itemStyle: { gapWidth: 2 } }],
                label: {
                    show: true,
                    // Fira-mono in-box label; small enough that tiny boxes hide it cleanly.
                    fontSize: 11,
                    overflow: "truncate",
                },
                // THE EMPHASIS LAW (E3 §1.4 / f-hover-flicker F6) — RAISE the hovered box, never
                // WASH the field. The old `focus: "self"` made ECharts blur every other box to
                // 10 % opacity, ghost-paling the whole part-of-whole plate the instant one box was
                // entered (+86.8 / +99.9 luminance, live) and re-firing that flash on every
                // box-boundary crossing across a transit. `RAISE_ONLY` omits `focus` entirely, so
                // the hovered box keeps its own emphasis (the linked `raisedKeys` border + the
                // readout card) while every sibling box stays fully inked — the SVG-choropleth
                // affordance that is the design control. Routed through the platform constant so a
                // raw `focus:"self"` can never re-enter (the F6 config tripwire).
                emphasis: RAISE_ONLY,
                data,
            },
        ],
    };
});

/** Resolve an ECharts treemap mouseover params to its item key (carried on the datum). */
function keyOf(params: unknown): string | null {
    const d = (params as { data?: { key?: string } }).data;
    return d?.key ?? null;
}

const { chart } = useEChart({
    host,
    option: () => option.value,
    // MB-4 — the rolled cap tile is an affordance, not a datum: never emit a linked-highlight
    // hover for it (it has no real item key, so it cannot light a datum across the dashboard).
    onHover: (key) => emit("hover", key === ROLLUP_KEY ? null : key),
    keyOf,
    // T-PERF-4 (I-PERF-DATA.c) — defer init+paint to first viewport. The host below reserves its
    // box via `chart-h-lg` (a fixed 560/640px), so the deferred canvas mounts into an already-sized
    // slot — no scroll-in shift (the ≤0.038 CLS floor holds). Off the route hydration critical path.
    lazyMount: true,
});

// The select producer — the ECharts CANVAS click (RP-4: not an SVG `@click`). The native
// event rides `params.event.event` (zrender wraps the browser event), so the cmd/ctrl
// modifier reads at the canvas edge, mirroring the map producers.
watch(chart, (c) => {
    if (!c) return;
    c.on("click", (params: unknown) => {
        const key = keyOf(params);
        if (key == null) return;
        // MB-4 — a tap on the "…and M more" cap tile is the isExpand affordance: un-budget the
        // full field IN PLACE (the A7 expand register), it does NOT select a datum.
        if (key === ROLLUP_KEY) {
            expanded.value = true;
            return;
        }
        const native = (params as { event?: { event?: MouseEvent } }).event?.event;
        emit("select", { key, multi: native ? isMultiSelect(native) : false });
    });
});
</script>

<template>
    <!-- A fixed-height host — the canvas collapses to 0 without it (chart-h-lg is the
         large-plate rung, matching the StackedBar host). -->
    <div
        ref="host"
        class="chart-h-lg w-full"
        role="img"
        :aria-label="ariaLabel"
        data-testid="treemap"
    />
</template>
