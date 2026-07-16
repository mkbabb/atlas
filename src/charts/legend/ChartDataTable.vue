<script setup lang="ts">
// ChartDataTable.vue — the ONE off-screen accessible-data-table fallback for a `role="img"`
// chart (f6-sci-broken-overscroll §2.2). A chart that paints to canvas/SVG carries an
// `aria-label` for the gestalt and this hidden `<table>` for the programmatic per-datum read:
// an AT user gets the values; a sighted user never sees it; an interactive tab-order over
// thousands of marks (which would be hostile, and interactive roles inside `role="img"`
// violate WCAG 4.1.2) is avoided.
//
// ════════════════════════════════════════════════════════════════════════════════════════
// THE OVERSCROLL ROOT (f6-sci-broken-overscroll §1.1/§2.1) — why this primitive exists.
//
// `.sr-only` is a FLOW-CONTENT visibility recipe (`width:1px; height:1px; overflow:hidden;
// position:absolute; clip-path:inset(50%)`). On a `<div>`/`<span>` it collapses to a 1px box
// and contributes nothing to `scrollHeight`. Put it on a `<table>` and it is STRUCTURALLY
// INERT: the Tailwind preflight base ships `table { display: table }`, and on a `display:table`
// box a specified `height` is a MINIMUM — table layout grows the principal box to fit its rows
// regardless of `height:1px`, and `overflow:hidden` does not clip table rows the way it clips
// block descendants. The SCI per-school table (2,374 rows × 24px) therefore measured
// `height:57024px` and padded /sci's `scrollHeight` to 59,260px — ~52,000px (≈58 viewports)
// of dead, blank scroll past the last beat. That was the whole of "Why can we scroll SO far
// beyond the last item within /sci" / "too much blank space here." USF (51 rows) and ECF
// (100 rows) carried the byte-identical latent defect; only SCI's row count detonated it.
//
// THE FIX — the clamp lands on a host that RESPECTS it. The off-screen affordance is a BLOCK
// envelope, never a styled table: `<div class="sr-only"><table>…</table></div>`. A block honors
// `height:1px; overflow:hidden`, so the inner `display:table` grows only INSIDE the 1px clipped
// block and contributes exactly 1px to `scrollHeight`. The `<table>` keeps its full semantics
// for AT; the clamp simply moves off the table and onto the block wrapper.
//
// This is the gestalt move (one `HoverCard`, one `ChartLegend`, one `ChartFrame`): a SINGLE
// table-aware off-screen primitive, never a hand-roll per chart. Because the recipe lives here
// once, the defect — a flow-content visibility class applied directly to a `<table>` host — is
// UNREPRESENTABLE at the call sites. Every chart with a `valueFormat` consumes this; the
// `hasTable`/`tableRows` computeds stay at the call site (they know the data), the MARKUP +
// the off-screen recipe centralize. (G-F6.7c pins it: a mounted `<ChartDataTable>` reports
// `getBoundingClientRect().height ≤ 2px` regardless of row count.)

/** One accessible row — a name (the row header) and its formatted value. `key` is an OPTIONAL
    stable unique id (an entity id + year, say); rows are keyed by it, falling back to the row
    index — NEVER the display `name`, which collides when two entities share a name (e.g. two
    "Honor Preparatory Charter School" rows raised Vue's duplicate-key warning in the SchoolMap
    table). */
export interface ChartDataRow {
    name: string;
    value: string;
    key?: string;
}

withDefaults(
    defineProps<{
        /** The data rows (name → formatted value). */
        rows: ChartDataRow[];
        /** The table caption + the row-header column name; usually the chart's aria-label. */
        caption: string;
        /** The row-header column label (e.g. "Bin", "Area"). */
        rowHeader?: string;
        /** The value column label (e.g. "Funding", "Value"). */
        valueHeader?: string;
    }>(),
    {
        rowHeader: "Name",
        valueHeader: "Value",
    },
);
</script>

<template>
    <!-- The BLOCK envelope carries the 1px clamp (a `<div>` honors `height:1px; overflow:hidden`
         where a `<table>` ignores it). The inner table grows only inside this clipped block,
         contributing 1px to the scroll region — the whole of the §2.1 overscroll fix. -->
    <div class="sr-only">
        <table :aria-label="`${caption} — data table`">
            <caption>
                {{ caption }}
            </caption>
            <thead>
                <tr>
                    <th scope="col">{{ rowHeader }}</th>
                    <th scope="col">{{ valueHeader }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(r, i) in rows" :key="r.key ?? i">
                    <th scope="row">{{ r.name }}</th>
                    <td>{{ r.value }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
