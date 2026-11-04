<script setup lang="ts">
// PlateTable.vue — the figure's table view (U/B8 A4, owner O-18 and O-19). The dock's Table view
// toggle swaps the figure for this table in the figure's own footprint: the same rows the CSV export
// writes (`contract.export.rows()`), in the glass DataTable, every column sortable, blank cells last
// in both directions (`compareCells`, the one atlas table sort). The plate holds its height: the
// table fills the figure's box and scrolls under a sticky header, so switching views moves nothing
// else on the page. A long table fades at its foot until it is scrolled to the end, so the cut reads
// as more to come.
//
// DV-3 (U/B8r): the rows are windowed. The sort runs over every row; the DataTable gets only the
// slice atlas's `useVirtualWindow` keeps in and around view, through glass's caller-windowed API
// (`aria-row-count`, `get-row-index`, `get-row-attrs`, `row-ref`), as SourceDataBrowser and DataViewerRoute do. The
// /bead provider strip's 546 rows were one 108-169 ms task on a 4x phone open; a window is ~20 rows.
import { computed, onMounted, ref } from "vue";
import {
    DataTable,
    type DataTableColumn,
    type DataTableRowAttrs,
    type DataTableSort,
} from "@mkbabb/glass-ui/data-table";
import { sortRowsBy } from "../../lib/compareCells.js";
import { useVirtualWindow, type VirtualItem } from "../../filter/composables/useVirtualWindow.js";
import type { ChartDataRow } from "../legend/ChartDataTable.vue";

const props = withDefaults(
    defineProps<{
        /** The plate id, for the subject hook. */
        id: string;
        /** The figure's title: the table's accessible name. */
        title: string;
        /** The export rows. */
        rows: ChartDataRow[];
        rowHeader?: string;
        valueHeader?: string;
    }>(),
    { rowHeader: "Name", valueHeader: "Value" },
);

interface TableRow {
    _id: string | number;
    name: string;
    value: string;
}

const sort = ref<DataTableSort | undefined>(undefined);
const keyed = computed<TableRow[]>(() =>
    props.rows.map((r, i) => ({ _id: r.key ?? i, name: r.name, value: r.value })),
);
const sorted = computed<TableRow[]>(() => {
    const s = sort.value;
    if (!s) return keyed.value;
    const key = s.key as "name" | "value";
    return sortRowsBy(keyed.value, (r) => r[key], s.direction);
});

// The table, windowed: the viewport is the table's one scroller.
const viewport = ref<HTMLElement | null>(null);
const virtual = useVirtualWindow<TableRow, string | number>({
    items: sorted,
    viewport,
    key: (row) => row._id,
    // A one-line row at reading density (36.6 px at 390 px on /bead).
    estimateSize: 37,
    // A short reach past the fold: the open mounts what is in view and a few rows more, not three
    // screens of rows (45 rows on the phone /bead open with the default reach).
    overscan: { before: 240, after: 480 },
});
type ViewRow = VirtualItem<TableRow, string | number>;
const tableRows = computed<ViewRow[]>(() => [...virtual.items.value]);
// The value column's register, read from the rows. Short figures ("$1.86B", "134 kbps") sit in a
// right-aligned column as wide as the longest of them. A composed text value (the /bead provider
// strip's "type · parent · award · …" cell) reads as text: a wide, left-aligned column that wraps.
const FIGURE_MAX_CH = 18;
const longestValue = computed(() => props.rows.reduce((n, r) => Math.max(n, String(r.value ?? "").length), 0));
const valueIsText = computed(() => longestValue.value > FIGURE_MAX_CH);
// The figures alone set the width (the floor fits a short head and its sort mark). A long head label
// wraps in its column: sized by the head, a 28-character label took 240 of a 252 px phone table and
// left the names 12 px (sci-schoolmap, U/B8r).
const valueCh = computed(() => Math.max(longestValue.value, 6));
const columns = computed<DataTableColumn<ViewRow>[]>(() => [
    { key: "item.name", label: props.rowHeader, sortable: true, class: "plate-table__name" },
    {
        key: "item.value",
        label: props.valueHeader,
        sortable: true,
        align: valueIsText.value ? "left" : "right",
        class: "plate-table__value",
        headerClass: "plate-table__value",
    },
]);
// The DataTable names a column by its row path (`item.name`); the sort keys are the row's own.
const tableSort = computed<DataTableSort | undefined>(() =>
    sort.value ? { ...sort.value, key: `item.${sort.value.key}` } : undefined,
);
function onSort(next: DataTableSort): void {
    sort.value = { ...next, key: next.key.replace(/^item\./, "") };
}
const rowId = (row: ViewRow): string | number => row.key;
const rowIndex = (row: ViewRow): number => row.index + 2;
const rowAttrs: DataTableRowAttrs<ViewRow> = (row) => ({
    class: "plate-table__row",
    style: { transform: `translateY(${row.top}px)` },
});
// Each mounted row is measured by the window's one observer (rows can wrap to two lines).
const rowStops = new Map<string | number, () => void>();
function setRow(element: HTMLElement | null, row: ViewRow): void {
    rowStops.get(row.key)?.();
    rowStops.delete(row.key);
    if (element) rowStops.set(row.key, virtual.observe(row.key, element));
}

// The foot fade: shown while the scroller has rows below its fold.
const atEnd = ref(true);
function onScroll(): void {
    const sc = viewport.value;
    if (sc) atEnd.value = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
}
// The scroller is a keyboard stop when it scrolls, so the rows are reachable without a pointer.
const scrolls = ref(false);
onMounted(() => {
    const sc = viewport.value;
    if (!sc) return;
    scrolls.value = sc.scrollHeight > sc.clientHeight + 1;
    onScroll();
});
</script>

<template>
    <div
        class="plate-table"
        :class="{ 'plate-table--more': !atEnd, 'plate-table--text': valueIsText }"
        :style="{ '--plate-table-value-ch': valueCh }"
        data-plate-table
        :data-subject="id"
    >
        <div
            ref="viewport"
            class="plate-table__viewport"
            data-plate-table-viewport
            :tabindex="scrolls ? 0 : undefined"
            :aria-label="scrolls ? `${title}: table, ${rows.length} rows` : undefined"
            @scroll.passive="onScroll"
        >
            <DataTable
                class="plate-table__table"
                :style="{ '--plate-table-total': `${virtual.totalSize.value}px` }"
                :columns="columns"
                :rows="tableRows"
                :get-row-id="rowId"
                :get-row-index="rowIndex"
                :get-row-attrs="rowAttrs"
                :row-ref="setRow"
                :aria-label="title"
                :aria-row-count="sorted.length + 1"
                :sort="tableSort"
                :responsive="false"
                @update:sort="onSort"
            />
        </div>
    </div>
</template>

<style scoped>
.plate-table {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    font-size: var(--type-small, 0.8125rem);
    /* The table sits on the card, not on the plate's graph-paper ground: rows read without the grid
       showing through them. */
    background: var(--card, var(--background));
}
/* The one scroller, on both axes, so the header can stick. */
.plate-table__viewport {
    position: relative;
    flex: 1 1 auto;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
}
.plate-table--more .plate-table__viewport {
    mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent);
}
.plate-table__viewport :deep(.plate-table__table),
.plate-table__viewport :deep(.plate-table__table [data-slot="table-container"]),
.plate-table__viewport :deep(.plate-table__table [data-slot="table"]) {
    overflow: visible;
}
/* Windowed rows are seated absolutely, so each row and the head lay out as their own fixed table:
   the value column holds one width everywhere and the name takes the rest. */
.plate-table__viewport :deep(table) {
    inline-size: 100%;
    table-layout: fixed;
}
.plate-table__viewport :deep(thead) {
    position: sticky;
    z-index: 1;
    inset-block-start: 0;
    background: var(--card, var(--background));
}
.plate-table__viewport :deep(tbody) {
    position: relative;
    display: block;
    block-size: var(--plate-table-total);
}
.plate-table__viewport :deep(thead),
.plate-table__viewport :deep(tbody tr) {
    display: table;
    inline-size: 100%;
    table-layout: fixed;
}
.plate-table__viewport :deep(.plate-table__row) {
    position: absolute;
    inset-block-start: 0;
    inline-size: 100%;
}
.plate-table__viewport :deep(tr),
.plate-table__viewport :deep(th),
.plate-table__viewport :deep(td) {
    border-color: var(--viz-grid);
}
/* Rows at reading density: a long table shows more of itself in the figure's box. The inline padding
   leaves a phone name column room for a whole word ("Corporation" in a 95 px column). */
.plate-table__viewport :deep(td),
.plate-table__viewport :deep(th) {
    padding-block: 0.5rem;
    padding-inline: 0.625rem;
}
/* A tall text row reads from its top: the name sits beside the start of its record. */
.plate-table--text .plate-table__viewport :deep(td) {
    vertical-align: top;
}
/* Column widths are plain lengths or plain percentages: a fixed-layout cell treats a width that
   mixes the two (calc, clamp, min) as auto. A figure column is as wide as its longest figure plus
   the cell's padding; the name takes the rest and wraps. */
.plate-table__viewport :deep(.plate-table__value) {
    inline-size: calc(var(--plate-table-value-ch) * 1ch + 2.5rem);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}
/* The head label wraps inside the figures' width. */
.plate-table__viewport :deep(th.plate-table__value),
.plate-table__viewport :deep(th.plate-table__value .data-table-sort) {
    white-space: normal;
    overflow-wrap: break-word;
}
/* A text value takes the wider share and wraps like the name. */
.plate-table--text .plate-table__viewport :deep(.plate-table__value) {
    inline-size: 60%;
    white-space: normal;
    overflow-wrap: anywhere;
}
.plate-table__viewport :deep(.plate-table__name) {
    min-inline-size: 0;
    overflow-wrap: break-word;
}
</style>
