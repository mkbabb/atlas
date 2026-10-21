<script setup lang="ts">
// DataViewerRoute.vue — the data viewer route (U/B7 O-19, PLAN §5.4, R-SOURCES §3.3).
//
// One served snapshot as a table a reader can search, filter, sort and download, with every column
// named from the feed's own dictionary. The host registers `/data`, `/data/:dataset` and
// `/data/:dataset/inputs/:file` and passes the route params as props. A query key that names a
// served column filters to that value (`/data/sci?lea=93N`, the entity detail's "All rows" link);
// the period Select writes its column the same way. Downloads go through `serializeRows`, so the
// file opens with its source, filter and date.
import { computed, ref, shallowRef, watch, type FunctionalComponent } from "vue";
import { h } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { Button } from "@mkbabb/glass-ui/button";
import { DataTable, type DataTableColumn, type DataTableSort } from "@mkbabb/glass-ui/data-table";
import { Dialog, DialogDescription, DialogTitle } from "@mkbabb/glass-ui/dialog";
import { Input } from "@mkbabb/glass-ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mkbabb/glass-ui/select";
import { SheetContent } from "@mkbabb/glass-ui/sheet";
import { useVirtualWindow, type VirtualItem } from "../../filter/composables/useVirtualWindow.js";
import { serializeRows, type SerializedColumn } from "../../filter/engine/browser-from-scope.js";
import { triggerDownload } from "../../charts/lib/vizExport.js";
import { useSeatedOpen, useViewportSeat } from "../chrome/surfaces/useSurfaceSeat.js";
import {
    columnHeading,
    coverageText,
    resolveColumn,
    sourcesLine,
    type FeedDictionary,
    type FeedInputFile,
    type ResolvedColumn,
} from "./feed-dictionary.js";

type Row = Record<string, unknown>;

/** One served snapshot as the viewer loads it. */
export interface DataViewerFeed {
    rows: Row[];
    /** The served columns in order: the key columns, then the measures. */
    columns: string[];
    meta: FeedDictionary;
    /** The snapshot's sha-256 (the header prints its first 8 characters). */
    sha?: string;
}

/** One dataset the host lists. A fenced dataset is never listed. */
export interface DataViewerDataset {
    id: string;
    label: string;
    /** The column the period Select filters ("year"). */
    periodColumn?: string;
    load: () => Promise<DataViewerFeed>;
}

const props = withDefaults(
    defineProps<{
        datasets: DataViewerDataset[];
        /** The `:dataset` route param; absent on `/data`. */
        dataset?: string;
        /** The `:file` route param of `/data/:dataset/inputs/:file`. */
        file?: string;
        basePath?: string;
    }>(),
    { dataset: undefined, file: undefined, basePath: "/data" },
);

const route = useRoute();
const router = useRouter();
const COUNT = new Intl.NumberFormat("en-US");

const current = computed(() => props.datasets.find((d) => d.id === props.dataset) ?? null);
const feed = shallowRef<DataViewerFeed | null>(null);
const status = ref<"idle" | "loading" | "ready" | "error">("idle");
let loadToken = 0;
async function load(): Promise<void> {
    const ds = current.value;
    feed.value = null;
    if (!ds) {
        status.value = "idle";
        return;
    }
    const token = ++loadToken;
    status.value = "loading";
    try {
        const f = await ds.load();
        if (token !== loadToken) return;
        feed.value = f;
        status.value = "ready";
    } catch {
        if (token === loadToken) status.value = "error";
    }
}
watch(current, load, { immediate: true });

// ── columns, named from the dictionary ─────────────────────────────────────────────────────────
interface ViewerColumn extends SerializedColumn<Row> {
    resolved: ResolvedColumn | null;
}
const columns = computed<ViewerColumn[]>(() =>
    (feed.value?.columns ?? []).map((key) => {
        const resolved = resolveColumn(feed.value?.meta, key);
        return {
            key,
            label: resolved ? columnHeading(resolved) : key,
            value: (row: Row) => row[key],
            resolved,
        };
    }),
);
const sources = computed(() => sourcesLine(feed.value?.meta, feed.value?.columns));

// ── filters: the query's column keys, the period Select, the search box ─────────────────────────
const search = ref("");
const queryFilters = computed<[string, string][]>(() => {
    const served = new Set(feed.value?.columns ?? []);
    return Object.entries(route.query)
        .filter(([k, v]) => served.has(k) && typeof v === "string" && v !== "")
        .map(([k, v]) => [k, v as string]);
});
const periodColumn = computed(() => current.value?.periodColumn ?? null);
const periods = computed<string[]>(() => {
    const col = periodColumn.value;
    if (!col || !feed.value) return [];
    return [...new Set(feed.value.rows.map((r) => String(r[col] ?? "")).filter(Boolean))].sort();
});
const ALL = "__all__";
const periodValue = computed(() => {
    const col = periodColumn.value;
    const v = col ? route.query[col] : undefined;
    return typeof v === "string" && v ? v : ALL;
});
function setQuery(key: string, value: string | undefined): void {
    const query = { ...route.query };
    if (value === undefined) delete query[key];
    else query[key] = value;
    void router.replace({ query });
}
function choosePeriod(v: unknown): void {
    const col = periodColumn.value;
    if (col) setQuery(col, v === ALL || v == null ? undefined : String(v));
}
function clearFilters(): void {
    search.value = "";
    const served = new Set(feed.value?.columns ?? []);
    const query = Object.fromEntries(Object.entries(route.query).filter(([k]) => !served.has(k)));
    void router.replace({ query });
}

const filtered = computed<Row[]>(() => {
    const rows = feed.value?.rows ?? [];
    const filters = queryFilters.value;
    const needle = search.value.trim().toLowerCase();
    return rows.filter(
        (r) =>
            filters.every(([k, v]) => String(r[k] ?? "") === v) &&
            (!needle || columns.value.some((c) => typeof r[c.key] === "string" && (r[c.key] as string).toLowerCase().includes(needle))),
    );
});
const filterActive = computed(() => queryFilters.value.length > 0 || search.value.trim() !== "");
const filterText = computed(() => {
    const parts = queryFilters.value.map(([k, v]) => `${resolveColumn(feed.value?.meta, k)?.label ?? k} is ${v}`);
    if (search.value.trim()) parts.push(`text contains "${search.value.trim()}"`);
    return parts.length ? parts.join("; ") : "None";
});

// ── sort ────────────────────────────────────────────────────────────────────────────────────────
const sort = ref<DataTableSort | undefined>(undefined);
const sorted = computed<Row[]>(() => {
    const s = sort.value;
    if (!s) return filtered.value;
    const dir = s.direction === "asc" ? 1 : -1;
    return [...filtered.value].sort((a, b) => {
        const x = a[s.key];
        const y = b[s.key];
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
});

// ── the table, windowed ─────────────────────────────────────────────────────────────────────────
const viewport = ref<HTMLElement | null>(null);
const virtual = useVirtualWindow<Row, number>({
    items: sorted,
    viewport,
    key: (_row, index) => index,
    estimateSize: 40,
});
type ViewRow = VirtualItem<Row, number>;
const tableRows = computed<ViewRow[]>(() => [...virtual.items.value]);
const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
function display(v: unknown): string {
    if (v == null || v === "") return "";
    return typeof v === "number" ? NUMBER.format(v) : String(v);
}
function cell(column: ViewerColumn): FunctionalComponent<{ row: ViewRow }> {
    const render: FunctionalComponent<{ row: ViewRow }> = ({ row }) => {
        const text = display(column.value(row.item));
        return h("span", { class: "data-viewer__cell-text", title: text }, text);
    };
    render.props = ["value", "row"];
    return render;
}
const tableColumns = computed<DataTableColumn<ViewRow>[]>(() =>
    columns.value.map((c) => ({
        key: c.key,
        label: c.label,
        sortable: true,
        align: c.resolved?.unit && c.resolved.unit !== "" ? "right" : "left",
        class: "data-viewer__cell",
        headerClass: "data-viewer__head",
        component: cell(c),
    })),
);
const rowAttrs = (row: ViewRow) => ({
    class: "data-viewer__row",
    "aria-rowindex": row.index + 2,
    style: { transform: `translateY(${row.top}px)` },
});

// ── downloads ───────────────────────────────────────────────────────────────────────────────────
function download(format: "csv" | "json"): void {
    const f = feed.value;
    const ds = current.value;
    if (!f || !ds) return;
    const meta = {
        grain: { kind: "dataset" } as const,
        filter: new URLSearchParams(queryFilters.value).toString(),
        filterExplain: filterText.value,
        asOf: [...new Set(f.meta.vintages.map((v) => v.asOf))].join("; "),
        source: { label: sources.value ? `${ds.label} (${sources.value})` : ds.label },
    };
    const text = serializeRows<Row, never>(columns.value, sorted.value, meta, format);
    if (text == null) return;
    triggerDownload(text, `${ds.id}.${format}`, format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8");
}

// ── the dictionary drawer ───────────────────────────────────────────────────────────────────────
const dictionaryOpen = ref(false);
const seat = useViewportSeat();
useSeatedOpen(dictionaryOpen, seat, "data-dictionary");
const isBottom = computed(() => seat() === "bottom");

const inputFiles = computed<FeedInputFile[]>(() => feed.value?.meta.vintages.flatMap((v) => v.files) ?? []);
const inputFile = computed(() => (props.file ? (inputFiles.value.find((f) => f.name === props.file) ?? null) : null));
const shortSha = (sha: string) => sha.slice(0, 8);
</script>

<template>
    <div class="data-viewer" data-testid="data-viewer">
        <nav class="data-viewer__datasets" aria-label="Datasets">
            <h2 class="data-viewer__nav-title">Datasets</h2>
            <ul>
                <li v-for="d in datasets" :key="d.id">
                    <RouterLink
                        :to="`${basePath}/${d.id}`"
                        class="data-viewer__dataset"
                        :aria-current="d.id === dataset ? 'page' : undefined"
                    >
                        {{ d.label }}
                    </RouterLink>
                </li>
            </ul>
        </nav>

        <main class="data-viewer__main">
            <p v-if="!current" class="data-viewer__note">Choose a dataset to see its rows and where each column comes from.</p>

            <template v-else>
                <header class="data-viewer__head-block">
                    <h1 class="data-viewer__title">{{ current.label }}</h1>
                    <p v-if="sources" class="data-viewer__sources" data-testid="data-viewer-sources">{{ sources }}</p>
                    <p v-if="feed" class="data-viewer__stats" data-testid="data-viewer-stats">
                        <span class="data-viewer__num">{{ COUNT.format(feed.rows.length) }}</span> rows,
                        <span class="data-viewer__num">{{ COUNT.format(feed.columns.length) }}</span> columns<template v-if="feed.sha">, sha
                            <span class="data-viewer__num">{{ shortSha(feed.sha) }}</span></template>
                    </p>
                </header>

                <section v-if="status === 'error'" class="data-viewer__state" role="alert">
                    <p>This dataset did not load.</p>
                    <Button emphasis="secondary" size="sm" @click="load">Reload</Button>
                </section>

                <p v-else-if="status === 'loading'" class="data-viewer__state" aria-live="polite">Loading the dataset.</p>

                <section v-else-if="inputFile" class="data-viewer__input" data-testid="data-viewer-input">
                    <h2 class="data-viewer__section-title">{{ inputFile.name }}</h2>
                    <p>
                        <span class="data-viewer__num">{{ COUNT.format(inputFile.rows) }}</span> rows, sha-256
                        <span class="data-viewer__num">{{ inputFile.sha256 }}</span>
                    </p>
                    <a v-if="inputFile.published" :href="inputFile.published" download class="data-viewer__link">Download the file as published</a>
                    <p v-else>This file is not published.</p>
                </section>

                <template v-else-if="feed">
                    <div class="data-viewer__tools">
                        <Input v-model="search" type="search" class="data-viewer__search" aria-label="Search the rows" placeholder="Search" />
                        <Select v-if="periods.length > 1" :model-value="periodValue" @update:model-value="choosePeriod">
                            <SelectTrigger class="data-viewer__period" aria-label="Period" data-testid="data-viewer-period">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem :value="ALL">All periods</SelectItem>
                                <SelectItem v-for="p in periods" :key="p" :value="p">{{ p }}</SelectItem>
                            </SelectContent>
                        </Select>
                        <div class="data-viewer__actions">
                            <Button emphasis="quiet" size="sm" data-testid="data-viewer-dictionary" @click="dictionaryOpen = true">Dictionary</Button>
                            <Button emphasis="quiet" size="sm" data-testid="data-viewer-csv" @click="download('csv')">CSV</Button>
                            <Button emphasis="quiet" size="sm" data-testid="data-viewer-json" @click="download('json')">JSON</Button>
                        </div>
                    </div>

                    <p class="data-viewer__count" aria-live="polite" data-testid="data-viewer-count">
                        <template v-if="filterActive">
                            Showing {{ COUNT.format(filtered.length) }} of {{ COUNT.format(feed.rows.length) }} rows
                        </template>
                        <template v-else>{{ COUNT.format(feed.rows.length) }} rows</template>
                    </p>

                    <section v-if="filtered.length === 0" class="data-viewer__state" data-testid="data-viewer-empty">
                        <p>No rows match these filters.</p>
                        <Button emphasis="secondary" size="sm" @click="clearFilters">Clear filters</Button>
                    </section>

                    <div v-else ref="viewport" class="data-viewer__viewport" role="region" :aria-label="`${current.label} rows`">
                        <DataTable
                            class="data-viewer__table"
                            :style="{ '--viewer-columns': Math.max(1, columns.length), '--viewer-total-size': `${virtual.totalSize.value}px` }"
                            :columns="tableColumns"
                            :rows="tableRows"
                            :get-row-id="(r: ViewRow) => r.key"
                            :get-row-attrs="rowAttrs"
                            :aria-label="`${current.label} rows`"
                            :aria-col-count="columns.length"
                            :aria-row-count="filtered.length + 1"
                            :sort="sort"
                            :responsive="false"
                            @update:sort="sort = $event"
                        />
                    </div>
                </template>
            </template>
        </main>

        <Dialog v-model:open="dictionaryOpen" :modal="false">
            <SheetContent
                v-if="feed"
                :side="isBottom ? 'bottom' : 'right'"
                class="data-viewer__dictionary"
                data-testid="data-viewer-dictionary-sheet"
            >
                <DialogTitle class="data-viewer__section-title">Dictionary</DialogTitle>
                <DialogDescription class="data-viewer__note">What each column is, where it comes from, and how much of it is filled.</DialogDescription>
                <dl class="data-viewer__entries">
                    <div v-for="c in columns" :key="c.key" class="data-viewer__entry">
                        <dt>{{ c.label }}</dt>
                        <dd v-if="c.resolved">
                            <p>{{ c.resolved.definition }}</p>
                            <p v-if="c.resolved.derivation">Built as: {{ c.resolved.derivation }}</p>
                            <p v-if="c.resolved.source">
                                Source:
                                <a v-if="c.resolved.source.url" :href="c.resolved.source.url" target="_blank" rel="noopener noreferrer" class="data-viewer__link">{{ c.resolved.source.publisher }}, {{ c.resolved.source.dataset }}</a>
                                <template v-else>{{ c.resolved.source.publisher }}, {{ c.resolved.source.dataset }} ({{ c.resolved.source.urlAbsentReason ?? "no public address" }})</template>,
                                {{ c.resolved.source.period }}
                            </p>
                            <p v-if="c.resolved.coverage">{{ coverageText(c.resolved.coverage) }}</p>
                            <ul v-if="c.resolved.source?.files.length" class="data-viewer__files">
                                <li v-for="f in c.resolved.source.files" :key="f.name">
                                    <RouterLink :to="`${basePath}/${current?.id}/inputs/${encodeURIComponent(f.name)}`" class="data-viewer__link">{{ f.name }}</RouterLink>
                                    <span class="data-viewer__num"> {{ shortSha(f.sha256) }}</span>
                                </li>
                            </ul>
                        </dd>
                        <dd v-else>A key column of the dataset.</dd>
                    </div>
                </dl>
            </SheetContent>
        </Dialog>
    </div>
</template>

<style scoped>
.data-viewer {
    --viewer-rule: color-mix(in srgb, var(--foreground) 14%, transparent);
    display: grid;
    grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
    gap: 1.5rem;
    min-inline-size: 0;
    padding-inline: 1rem;
    color: var(--foreground);
}
.data-viewer__datasets ul {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
}
.data-viewer__nav-title,
.data-viewer__section-title {
    margin: 0 0 0.5rem;
    font-size: var(--type-subheading, 1.125rem);
    font-weight: 600;
}
.data-viewer__dataset {
    display: block;
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-control, 0.5rem);
    color: inherit;
    text-decoration: none;
}
.data-viewer__dataset[aria-current="page"] {
    background: color-mix(in srgb, var(--route-accent, var(--primary)) 14%, transparent);
    font-weight: 600;
}
.data-viewer__main {
    display: grid;
    gap: 0.75rem;
    min-inline-size: 0;
    align-content: start;
}
.data-viewer__title {
    margin: 0;
    font-size: var(--type-heading, 1.5rem);
}
.data-viewer__sources,
.data-viewer__stats,
.data-viewer__count,
.data-viewer__note {
    margin: 0;
    color: var(--muted-foreground);
    font-size: var(--type-small, 0.875rem);
}
.data-viewer__num {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
}
.data-viewer__tools {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}
.data-viewer__search {
    flex: 1 1 12rem;
    max-inline-size: 22rem;
}
.data-viewer__period {
    min-inline-size: 9rem;
}
.data-viewer__actions {
    display: flex;
    gap: 0.25rem;
    margin-inline-start: auto;
}
.data-viewer__state {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
    padding: 1rem;
    border: 1px solid var(--viewer-rule);
    border-radius: var(--radius-plate, 0.75rem);
}
.data-viewer__state p {
    margin: 0;
}
.data-viewer__viewport {
    position: relative;
    overflow: auto;
    max-block-size: min(40rem, 70vh);
    border: 1px solid var(--viewer-rule);
    border-radius: var(--radius-plate, 0.75rem);
    overscroll-behavior: contain;
}
.data-viewer__viewport :deep(.data-viewer__table),
.data-viewer__viewport :deep(.data-viewer__table [data-slot="table"]) {
    overflow: visible;
}
.data-viewer__viewport :deep(table) {
    inline-size: max(100%, calc(var(--viewer-columns) * 9rem));
    table-layout: fixed;
}
.data-viewer__viewport :deep(thead) {
    position: sticky;
    z-index: 2;
    inset-block-start: 0;
    background: var(--card);
}
.data-viewer__viewport :deep(tbody) {
    position: relative;
    display: block;
    block-size: var(--viewer-total-size);
}
.data-viewer__viewport :deep(thead),
.data-viewer__viewport :deep(tbody tr) {
    display: table;
    inline-size: 100%;
    table-layout: fixed;
}
.data-viewer__viewport :deep(.data-viewer__row) {
    position: absolute;
    inset-block-start: 0;
    inline-size: 100%;
    border-block-end: 1px solid var(--viewer-rule);
    background: var(--background);
}
.data-viewer__viewport :deep(.data-viewer__head) {
    font-size: var(--type-small, 0.875rem);
    font-weight: 600;
    text-align: start;
}
.data-viewer__viewport :deep(.data-viewer__cell),
.data-viewer__viewport :deep(.data-viewer__head) {
    padding: 0.55rem 0.75rem;
}
.data-viewer__viewport :deep(.data-viewer__cell) {
    overflow: hidden;
    font-variant-numeric: tabular-nums;
}
.data-viewer__viewport :deep(.data-viewer__cell-text) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.data-viewer__dictionary {
    inline-size: min(22rem, 100vw);
    overflow-y: auto;
}
.data-viewer__entries {
    display: grid;
    gap: 1rem;
    margin: 1rem 0 0;
}
.data-viewer__entry dt {
    font-weight: 600;
}
.data-viewer__entry dd {
    margin: 0.25rem 0 0;
    font-size: var(--type-small, 0.875rem);
}
.data-viewer__entry dd p {
    margin: 0 0 0.25rem;
}
.data-viewer__files {
    margin: 0;
    padding-inline-start: 1rem;
}
.data-viewer__link {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
}
@media (max-width: 47.99rem) {
    .data-viewer {
        grid-template-columns: minmax(0, 1fr);
    }
    .data-viewer__datasets ul {
        display: flex;
        flex-wrap: wrap;
    }
    .data-viewer__viewport :deep(th:first-child),
    .data-viewer__viewport :deep(td:first-child) {
        position: sticky;
        inset-inline-start: 0;
        z-index: 1;
        background: var(--background);
    }
}
</style>
