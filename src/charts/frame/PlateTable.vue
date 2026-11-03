<script setup lang="ts">
// PlateTable.vue — the figure's table view (U/B8 A4, owner O-18 and O-19). The dock's Table view
// toggle swaps the figure for this table in the figure's own footprint: the same rows the CSV export
// writes (`contract.export.rows()`), in the glass DataTable, every column sortable, blank cells last
// in both directions (`compareCells`, the one atlas table sort). The plate holds its height: the
// table fills the figure's box and scrolls under a sticky header, so switching views moves nothing
// else on the page. A long table fades at its foot until it is scrolled to the end, so the cut reads
// as more to come.
import { computed, onMounted, ref } from "vue";
import { DataTable, type DataTableColumn, type DataTableSort } from "@mkbabb/glass-ui/data-table";
import { sortRowsBy } from "../../lib/compareCells.js";
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
const columns = computed<DataTableColumn<TableRow>[]>(() => [
    { key: "name", label: props.rowHeader, sortable: true, class: "plate-table__name" },
    { key: "value", label: props.valueHeader, sortable: true, align: "right", class: "plate-table__value" },
]);
const keyed = computed<TableRow[]>(() =>
    props.rows.map((r, i) => ({ _id: r.key ?? i, name: r.name, value: r.value })),
);
const sorted = computed<TableRow[]>(() => {
    const s = sort.value;
    if (!s) return keyed.value;
    const key = s.key as "name" | "value";
    return sortRowsBy(keyed.value, (r) => r[key], s.direction);
});

// The foot fade: shown while the scroller has rows below its fold.
const root = ref<HTMLElement | null>(null);
const atEnd = ref(true);
function scroller(): HTMLElement | null {
    return root.value?.querySelector<HTMLElement>('[data-slot="table-container"]') ?? null;
}
function onScroll(): void {
    const sc = scroller();
    if (sc) atEnd.value = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
}
onMounted(() => {
    const sc = scroller();
    if (!sc) return;
    // The scroller is a keyboard stop when it scrolls, so the rows are reachable without a pointer.
    if (sc.scrollHeight > sc.clientHeight + 1) {
        sc.tabIndex = 0;
        sc.setAttribute("aria-label", `${props.title}: table, ${props.rows.length} rows`);
    }
    onScroll();
});
</script>

<template>
    <div
        ref="root"
        class="plate-table"
        :class="{ 'plate-table--more': !atEnd }"
        data-plate-table
        :data-subject="id"
        @scroll.capture.passive="onScroll"
    >
        <DataTable
            :columns="columns"
            :rows="sorted"
            rowKey="_id"
            :aria-label="title"
            :sort="sort"
            @update:sort="sort = $event"
        />
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
.plate-table :deep([data-slot="data-table"]) {
    flex: 1 1 auto;
    min-block-size: 0;
    display: flex;
    flex-direction: column;
}
/* The library's table container is the one scroller, on both axes, so the header can stick. */
.plate-table :deep([data-slot="table-container"]) {
    flex: 1 1 auto;
    min-block-size: 0;
    overscroll-behavior: contain;
}
.plate-table--more :deep([data-slot="table-container"]) {
    mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent);
}
.plate-table :deep(thead) {
    position: sticky;
    z-index: 1;
    inset-block-start: 0;
    background: var(--card, var(--background));
}
.plate-table :deep(tr),
.plate-table :deep(th),
.plate-table :deep(td) {
    border-color: var(--viz-grid);
}
/* Rows at reading density: a long table shows more of itself in the figure's box. */
.plate-table :deep(td),
.plate-table :deep(th) {
    padding-block: 0.5rem;
}
.plate-table :deep(.plate-table__value) {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}
.plate-table :deep(.plate-table__name) {
    min-inline-size: 0;
    overflow-wrap: anywhere;
}
</style>
