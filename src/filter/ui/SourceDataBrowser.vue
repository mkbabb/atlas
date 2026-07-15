<script
    setup
    lang="ts"
    generic="Row, Scope = unknown, Key extends string | number = string | number"
>
import { computed, nextTick, ref, useId, watch } from "vue";
import type { ExportFormat } from "@/charts/lib/source-data";
import type { ExportGrain } from "@/filter/engine/rows";
import { useVirtualWindow } from "@/filter/composables/useVirtualWindow";
import { useViewParams } from "@/platform/stores/useViewParams";
import { useVizRegistry } from "@/charts/composables/useVizRegistry";
import type { EventScope } from "@/events";
import type { ExportPayload } from "@/charts/lib/source-data";
import {
    reconcileMountedFocus,
    useSourceBrowserEvents,
    type SourceDataAvailableGrain,
    type SourceDataBrowserProps,
    type SourceDataGrainOption,
} from "./source-data-browser";

const props = defineProps<SourceDataBrowserProps<Row, Scope, Key>>();
const eventState = useSourceBrowserEvents(props.eventHub, props.vizId);
const vizRegistry = useVizRegistry();
const view = useViewParams();
view.registerKeys(["grain"]);

const grainControlName = `source-data-grain-${useId()}`;
const viewport = ref<HTMLElement | null>(null);
const activeIndex = ref(initialGrainIndex());
const grainExplicit = ref(
    indexForKind(view.param("grain")) >= 0 || indexForKind(eventState.grain.value) >= 0,
);
const focusedKey = ref<Key | null>(null);
const rowElements = new Map<Key, HTMLElement>();
const rowObservers = new Map<Key, () => void>();

function grainOf(option: SourceDataAvailableGrain<Scope>): ExportGrain<Scope> {
    return "grain" in option
        ? (option as SourceDataGrainOption<Scope>).grain
        : (option as ExportGrain<Scope>);
}

function labelOf(option: SourceDataAvailableGrain<Scope>): string {
    if ("grain" in option && option.label) return option.label;
    const grain = grainOf(option);
    if (grain.kind !== "aggregation") return titleCase(grain.kind);
    const scope = typeof grain.scope === "string" ? grain.scope : "summary";
    return `${titleCase(scope)} aggregation`;
}

function optionKey(option: SourceDataAvailableGrain<Scope>, index: number): string {
    const grain = grainOf(option);
    return grain.kind === "aggregation" ? `aggregation-${index}` : grain.kind;
}

function indexForKind(kind: string | null | undefined): number {
    if (!kind) return -1;
    return props.availableGrains.findIndex((option) => grainOf(option).kind === kind);
}

function initialGrainIndex(): number {
    const linked = indexForKind(view.param("grain"));
    if (linked >= 0) return linked;
    const published = indexForKind(eventState.grain.value);
    if (published >= 0) return published;
    const fallback = indexForKind(
        eventState.selectedKeys.value.length > 0 ? "selection" : "dataset",
    );
    return fallback >= 0 ? fallback : 0;
}

const activeGrain = computed<ExportGrain<Scope>>(() => {
    const option = props.availableGrains[activeIndex.value] ?? props.availableGrains[0];
    return option ? grainOf(option) : { kind: "dataset" };
});
const reader = computed(() =>
    typeof props.rowsReader === "function"
        ? props.rowsReader(eventState.activeVizId.value)
        : props.rowsReader,
);
const resolvedVizId = computed(
    () => eventState.activeVizId.value || props.vizId || "source-data",
);
const imageExport = computed(
    () => vizRegistry.registry.value.get(resolvedVizId.value)?.imageExport,
);
const exportFormats = computed<readonly ExportFormat[]>(() => [
    "csv",
    "json",
    ...(imageExport.value ? [imageExport.value.format] : []),
    "print",
]);
const resolvedScope = computed<EventScope>(() => {
    const authored = props.eventScope;
    if (!authored) return { grain: "viz", vizId: resolvedVizId.value };
    if (authored.grain === "viz") return { grain: "viz", vizId: resolvedVizId.value };
    return authored;
});
const rows = computed<readonly Row[]>(() => reader.value.rowsAt(activeGrain.value));
const payload = computed<ExportPayload<Row, Scope>>(() =>
    props.exportPayload(rows.value, activeGrain.value, resolvedVizId.value),
);
const provenanceFields = computed(() =>
    eventState.fields.value.length > 0
        ? eventState.fields.value
        : props.columns.map((column) => column.key),
);

const virtual = useVirtualWindow<Row, Key>({
    items: rows,
    viewport,
    key: props.rowKey,
    estimateSize: 42,
});

watch(
    () => props.availableGrains.length,
    (length) => {
        if (activeIndex.value >= length) activeIndex.value = Math.max(0, length - 1);
    },
);

watch(eventState.grain, (kind) => {
    if (!kind || activeGrain.value.kind === kind) return;
    const index = indexForKind(kind);
    if (index >= 0) {
        grainExplicit.value = true;
        selectGrain(index, false);
    }
});

watch(
    () => view.param("grain"),
    (kind) => {
        if (!kind) {
            grainExplicit.value = false;
            selectContextualDefault();
            return;
        }
        if (activeGrain.value.kind === kind) return;
        const index = indexForKind(kind);
        if (index >= 0) {
            grainExplicit.value = true;
            selectGrain(index, false);
        }
    },
);

watch(
    eventState.selectedKeys,
    () => {
        if (!grainExplicit.value) selectContextualDefault();
    },
    { immediate: true },
);

watch(
    rows,
    (nextRows) => {
        if (nextRows.length === 0) {
            focusedKey.value = null;
            return;
        }
        const keys = nextRows.map(props.rowKey);
        if (focusedKey.value == null || !keys.includes(focusedKey.value)) {
            focusedKey.value = keys[0] ?? null;
        }
    },
    { immediate: true },
);

watch(virtual.items, (mounted) => {
    focusedKey.value = reconcileMountedFocus(
        focusedKey.value,
        mounted.map((item) => item.key),
    );
});

watch(
    [activeGrain, resolvedVizId],
    ([grain, vizId]) => {
        if (view.param("grain") !== grain.kind) view.setParam("grain", grain.kind);
        if (!props.eventHub) return;
        props.eventHub.emit({
            type: "granularity",
            scope: resolvedScope.value,
            vizId,
            grain: grain.kind,
        });
    },
    { immediate: true },
);

watch(
    payload,
    (currentPayload) => {
        if (!props.eventHub) return;
        const vizId = resolvedVizId.value;
        props.eventHub.emit({
            type: "provenance",
            scope: resolvedScope.value,
            vizId,
            fields: props.columns.map((column) => column.key),
            filterExplain: currentPayload.meta.filterExplain,
        });
    },
    { immediate: true },
);

function selectGrain(index: number, writeUrl = true): void {
    if (writeUrl) grainExplicit.value = true;
    if (index === activeIndex.value) return;
    activeIndex.value = index;
    if (writeUrl) view.setParam("grain", activeGrain.value.kind);
    viewport.value?.scrollTo({ top: 0 });
}

function markGrainExplicit(index: number): void {
    grainExplicit.value = true;
    const option = props.availableGrains[index];
    if (option) view.setParam("grain", grainOf(option).kind);
}

function selectContextualDefault(): void {
    const index = indexForKind(
        eventState.selectedKeys.value.length > 0 ? "selection" : "dataset",
    );
    if (index >= 0) selectGrain(index, false);
}

function setRowElement(key: Key, element: unknown): void {
    rowObservers.get(key)?.();
    rowObservers.delete(key);
    rowElements.delete(key);
    if (!(element instanceof Element)) return;
    rowElements.set(key, element as HTMLElement);
    rowObservers.set(key, virtual.observe(key, element));
}

function focusRow(key: Key): void {
    if (!virtual.ensureTargetWindow(key)) return;
    focusedKey.value = key;
    void nextTick(() => rowElements.get(key)?.focus());
}

function rememberFocusedRow(key: Key): void {
    focusedKey.value = key;
}

function onRowKeydown(event: KeyboardEvent, index: number): void {
    let target = index;
    switch (event.key) {
        case "ArrowDown":
            target = Math.min(rows.value.length - 1, index + 1);
            break;
        case "ArrowUp":
            target = Math.max(0, index - 1);
            break;
        case "Home":
            target = 0;
            break;
        case "End":
            target = rows.value.length - 1;
            break;
        default:
            return;
    }
    event.preventDefault();
    const row = rows.value[target];
    if (row !== undefined) focusRow(props.rowKey(row, target));
}

function serialize(format: ExportFormat): void {
    if (format === "png" || format === "svg") {
        imageExport.value?.export();
        return;
    }
    payload.value.serialize(format);
}

function display(value: unknown): string {
    if (value == null || value === "") return "—";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function titleCase(value: string): string {
    return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}
</script>

<template>
    <section
        class="source-browser"
        :aria-label="ariaLabel ?? 'Source data browser'"
        :data-viz-id="resolvedVizId"
        :data-filter-active="eventState.filter.value.active || undefined"
    >
        <div
            class="source-browser__toolbar"
            role="toolbar"
            aria-label="Source data controls"
        >
            <fieldset class="source-browser__grains">
                <legend>Rows shown</legend>
                <label
                    v-for="(option, index) in availableGrains"
                    :key="optionKey(option, index)"
                    class="source-browser__grain"
                    :class="{ 'source-browser__grain--active': activeIndex === index }"
                >
                    <input
                        type="radio"
                        :name="grainControlName"
                        :checked="activeIndex === index"
                        @click="markGrainExplicit(index)"
                        @change="selectGrain(index)"
                    />
                    <span>{{ labelOf(option) }}</span>
                </label>
            </fieldset>

            <div
                class="source-browser__exports"
                role="group"
                aria-label="Export source data"
            >
                <button
                    v-for="format in exportFormats"
                    :key="format"
                    type="button"
                    @click="serialize(format)"
                >
                    {{ format.toUpperCase() }}
                </button>
            </div>
        </div>

        <dl class="source-browser__provenance" aria-label="Data provenance">
            <div>
                <dt>Source</dt>
                <dd>
                    <a
                        v-if="payload.meta.source.href"
                        :href="payload.meta.source.href"
                        rel="noreferrer"
                        >{{ payload.meta.source.label }}</a
                    >
                    <span v-else>{{ payload.meta.source.label }}</span>
                </dd>
            </div>
            <div>
                <dt>As of</dt>
                <dd>{{ payload.meta.asOf }}</dd>
            </div>
            <div class="source-browser__filter">
                <dt>Filter</dt>
                <dd>{{ payload.meta.filterExplain }}</dd>
            </div>
            <div>
                <dt>Fields</dt>
                <dd>{{ provenanceFields.join(", ") }}</dd>
            </div>
        </dl>

        <div
            ref="viewport"
            class="source-browser__viewport"
            role="grid"
            :aria-label="`${ariaLabel ?? 'Source data'} rows`"
            :aria-rowcount="virtual.ariaRowCount.value + 1"
            :aria-colcount="columns.length"
        >
            <div class="source-browser__header" role="row" aria-rowindex="1">
                <span
                    v-for="column in columns"
                    :key="column.key"
                    role="columnheader"
                    :style="{ width: `${100 / Math.max(1, columns.length)}%` }"
                    >{{ column.label }}</span
                >
            </div>

            <p v-if="rows.length === 0" class="source-browser__empty">
                No rows match this view.
            </p>
            <div
                v-else
                class="source-browser__canvas"
                role="rowgroup"
                :style="{ height: `${virtual.totalSize.value}px` }"
            >
                <div
                    v-for="item in virtual.items.value"
                    :key="item.key"
                    :ref="(element) => setRowElement(item.key, element)"
                    class="source-browser__row"
                    role="row"
                    :aria-rowindex="item.index + 2"
                    :tabindex="focusedKey === item.key ? 0 : -1"
                    :style="{ transform: `translateY(${item.top}px)` }"
                    @focus="rememberFocusedRow(item.key)"
                    @keydown="onRowKeydown($event, item.index)"
                >
                    <span
                        v-for="column in columns"
                        :key="column.key"
                        role="gridcell"
                        :style="{ width: `${100 / Math.max(1, columns.length)}%` }"
                        :title="display(column.value(item.item))"
                        >{{ display(column.value(item.item)) }}</span
                    >
                </div>
            </div>
        </div>
        <p class="source-browser__count" aria-live="polite">
            {{ rows.length.toLocaleString() }} {{ rows.length === 1 ? "row" : "rows" }}
            <template v-if="eventState.selectedKeys.value.length">
                · {{ eventState.selectedKeys.value.length.toLocaleString() }} selected
            </template>
        </p>
    </section>
</template>

<style scoped>
.source-browser {
    --source-rule: color-mix(in srgb, var(--foreground) 16%, transparent);
    display: grid;
    gap: 0.75rem;
    min-inline-size: 0;
    color: var(--foreground);
}

.source-browser__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem 1rem;
    align-items: end;
    justify-content: space-between;
}

.source-browser__grains {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    border: 0;
}

.source-browser__grains legend {
    inline-size: 100%;
    margin-block-end: 0.2rem;
    font-size: 0.6875rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
    text-transform: uppercase;
}

.source-browser__grain,
.source-browser__exports button {
    min-block-size: 2.25rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--source-rule);
    border-radius: var(--radius, 0.35rem);
    background: color-mix(in srgb, var(--card) 78%, transparent);
    font: 600 0.75rem/1.1 var(--font-sans, ui-sans-serif, sans-serif);
    color: var(--muted-foreground);
    cursor: pointer;
}

.source-browser__grain {
    display: inline-flex;
    align-items: center;
}

.source-browser__grain input {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    opacity: 0;
}

.source-browser__grain--active {
    border-color: color-mix(in srgb, var(--foreground) 42%, transparent);
    background: var(--foreground);
    color: var(--background);
}

.source-browser__grain:has(input:focus-visible),
.source-browser__exports button:focus-visible,
.source-browser__row:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: 2px;
}

.source-browser__exports {
    display: flex;
    gap: 0.25rem;
}

.source-browser__exports button:hover {
    color: var(--foreground);
    border-color: color-mix(in srgb, var(--foreground) 38%, transparent);
}

.source-browser__provenance {
    display: grid;
    grid-template-columns: minmax(8rem, 1fr) minmax(7rem, auto) minmax(12rem, 2fr);
    margin: 0;
    border-block: 1px solid var(--source-rule);
}

.source-browser__provenance > div {
    min-inline-size: 0;
    padding: 0.55rem 0.75rem;
}

.source-browser__provenance > div + div {
    border-inline-start: 1px solid var(--source-rule);
}

.source-browser__provenance dt {
    margin-block-end: 0.15rem;
    font-size: 0.625rem;
    font-weight: 650;
    letter-spacing: 0.09em;
    color: var(--muted-foreground);
    text-transform: uppercase;
}

.source-browser__provenance dd {
    overflow: hidden;
    margin: 0;
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.source-browser__provenance a {
    color: inherit;
    text-underline-offset: 0.18em;
}

.source-browser__viewport {
    position: relative;
    overflow: auto;
    min-block-size: 12rem;
    max-block-size: min(32rem, 65vh);
    border: 1px solid var(--source-rule);
    border-radius: var(--radius, 0.35rem);
    background: color-mix(in srgb, var(--background) 94%, var(--card));
    overscroll-behavior: contain;
}

.source-browser__header,
.source-browser__row {
    display: flex;
    min-inline-size: max-content;
}

.source-browser__header {
    position: sticky;
    z-index: 2;
    inset-block-start: 0;
    border-block-end: 1px solid var(--source-rule);
    background: color-mix(in srgb, var(--card) 96%, var(--background));
}

.source-browser__header > span,
.source-browser__row > span {
    flex: 1 0 9rem;
    min-inline-size: 9rem;
    padding: 0.65rem 0.75rem;
    border-inline-end: 1px solid var(--source-rule);
}

.source-browser__header > span {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.055em;
    color: var(--muted-foreground);
    text-align: start;
    text-transform: uppercase;
}

.source-browser__canvas {
    position: relative;
}

.source-browser__row {
    position: absolute;
    inset-block-start: 0;
    inline-size: 100%;
    border-block-end: 1px solid var(--source-rule);
    background: var(--background);
    font: 0.75rem/1.35 var(--font-mono, ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
}

.source-browser__row:nth-child(even) {
    background: color-mix(in srgb, var(--card) 54%, var(--background));
}

.source-browser__row > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.source-browser__empty {
    margin: 0;
    padding: 2.5rem 1rem;
    color: var(--muted-foreground);
    text-align: center;
}

.source-browser__count {
    margin: 0;
    font: 0.6875rem/1 var(--font-mono, ui-monospace, monospace);
    color: var(--muted-foreground);
    text-align: end;
}

@media (max-width: 40rem) {
    .source-browser__provenance {
        grid-template-columns: 1fr 1fr;
    }

    .source-browser__provenance .source-browser__filter {
        grid-column: 1 / -1;
        border-block-start: 1px solid var(--source-rule);
        border-inline-start: 0;
    }

    .source-browser__grain,
    .source-browser__exports button {
        min-block-size: 44px;
    }
}
</style>
