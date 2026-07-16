<script setup lang="ts">
// DimDial.vue — ONE projected filter DIM's dial in the unified panel (K-FILTER-UNIFIED §4.E · the
// `VizFilterDock.vue:162-192` dim-row renderer LIFTED). The label + the active readout + the clear,
// PLUS the K-G `PercentileRangeSlider` for a `range`-arity dim carrying `dataValues` (else the
// text-chip readout). It READS its CELL through `useFilterDimensions.cellFor` (it NEVER re-authors the
// algebra) and WRITES through the `useViewParams` producer-edge mutators (`setParam`/`setNumberParam`/
// `setListParam`, byte-unchanged).
//
// THE LIFT (K-FILTER-UNIFIED). This is the J-VIZDOCK inline-dock dim-row, lifted INTO the ONE panel:
// the per-viz inline dock RETIRES — its dim-row renders here, projected off the active viz-set (the
// `viz-filter-dim-…` testid relations the `j0-vizdock` filter-toggle laws read are PRESERVED). One
// dim, ONE shared cell (the per-DIMENSION keying keystone): a dim declared by N like vizzes shows
// ONCE and reads ONE cell, so a value set on plate A persists onto plate B for free.
import { computed } from "vue";
import { X } from "@lucide/vue";
import {
    useFilterDimensions,
    type DimDeclaration,
    type DimCell,
    type RouteUniverse,
} from "../composables/useFilterDimensions.js";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import type { FilterDimension } from "../../charts/contract/viz-contract.js";
import PercentileRangeSlider from "./PercentileRangeSlider.vue";

const props = defineProps<{
    /** ONE projected filter dimension (the contract facet — the panel de-duped it by key). */
    dim: FilterDimension;
    /** The owning viz id (for the dial's testids — the per-DIMENSION cell is shared, the testid names
        the dim it renders for). */
    vizId: string;
}>();

const viewParams = useViewParams();

// The default universe when a dim omits one (the panel-only dims never collide across routes).
const DEFAULT_UNIVERSE: RouteUniverse = "sci-lea";

/** The runtime `DimDeclaration` the state model reads — universe defaults, `paramKey` falls to `key`. */
const declaration = computed<DimDeclaration>(() => ({
    key: props.dim.key,
    arity: props.dim.arity,
    universe: (props.dim.universe as RouteUniverse | undefined) ?? DEFAULT_UNIVERSE,
    selectionKind: props.dim.selectionKind,
    label: props.dim.label,
}));

const dims = computed<DimDeclaration[]>(() => [declaration.value]);
const { cellFor } = useFilterDimensions(dims);

const cell = computed<DimCell | null>(() => cellFor(props.dim.key));

const isActive = computed<boolean>(() => {
    const c = cell.value;
    if (!c) return false;
    if (c.arity === "set") return c.value.size > 0;
    if (c.arity === "multi") return c.value.length > 0;
    return c.value != null;
});

/** Is this a range dim carrying a LIVE distribution thunk (⇒ the slider; else the text-chip readout). */
const hasSlider = computed<boolean>(
    () => props.dim.arity === "range" && typeof props.dim.dataValues === "function",
);

const sliderValues = computed<number[]>(() => props.dim.dataValues?.() ?? []);

/** The range window the slider binds — the cell's `[lo, hi]` (or null at full extent). */
const rangeWindow = computed<readonly [number, number] | null>(() => {
    const c = cell.value;
    return c && c.arity === "range" ? c.value : null;
});

/** A human readout of the active constraint (the chip copy) — factual, never editorial. */
const summary = computed<string>(() => {
    const c = cell.value;
    if (!c) return "";
    if (c.arity === "single") return c.value ?? "";
    if (c.arity === "multi")
        return c.value.length > 0 ? `${c.value.length} selected` : "";
    if (c.arity === "range")
        return c.value ? `${fmtBound(c.value[0])}–${fmtBound(c.value[1])}` : "";
    return c.value.size > 0 ? `${c.value.size} selected` : "";
});

/** Format a range bound — the one-sided widen's open side reads as `−∞`/`∞` (the H3 polish). */
function fmtBound(n: number): string {
    if (n === -Infinity) return "−∞";
    if (n === Infinity) return "∞";
    return props.dim.format ? props.dim.format(n) : String(n);
}

/** Write the slider's `[lo, hi]` window into the dim's URL bounds (`${key}Min`/`${key}Max`). */
function setRange(next: [number, number]): void {
    const base = props.dim.key;
    viewParams.setNumberParam(`${base}Min`, next[0]);
    viewParams.setNumberParam(`${base}Max`, next[1]);
}

/** Clear ONE declared dim back to its no-constraint rest (the param-backed dims this dial owns). */
function clearDim(): void {
    const base = props.dim.key;
    if (props.dim.arity === "single") {
        viewParams.setParam(base, undefined);
    } else if (props.dim.arity === "range") {
        viewParams.setNumberParam(`${base}Min`, undefined);
        viewParams.setNumberParam(`${base}Max`, undefined);
    } else if (props.dim.arity === "multi") {
        viewParams.setListParam(base, []);
    }
}

const canClear = computed<boolean>(() => isActive.value && props.dim.arity !== "set");
</script>

<template>
    <li
        class="dim-dial"
        :class="{ 'dim-dial--active': isActive }"
        :data-testid="`viz-filter-dim-${vizId}-${dim.key}`"
        :data-active="isActive ? 'true' : undefined"
    >
        <div class="dim-dial__head">
            <span class="dim-dial__label">{{ dim.label ?? dim.key }}</span>
            <span v-if="isActive && !hasSlider" class="dim-dial__value">{{ summary }}</span>
            <span v-else-if="!hasSlider" class="dim-dial__rest">Any</span>
            <button
                v-if="canClear"
                type="button"
                class="dim-dial__clear"
                :aria-label="`Clear ${dim.label ?? dim.key} filter`"
                :data-testid="`viz-filter-clear-${vizId}-${dim.key}`"
                @click="clearDim"
            >
                <X class="dim-dial__clear-glyph" aria-hidden="true" />
            </button>
        </div>

        <!-- THE K-G RANGE SLIDER — a range dim carrying a LIVE `dataValues` distribution renders the
             dual-thumb slider (the first `filterDimensions` consumer's home); else the text readout. -->
        <PercentileRangeSlider
            v-if="hasSlider"
            :model-value="rangeWindow"
            :data-values="sliderValues"
            :format="dim.format"
            :step="dim.step"
            :label="dim.label ?? dim.key"
            @update:model-value="setRange"
        />
    </li>
</template>

<style scoped>
.dim-dial {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-block-size: 44px;
    padding-block: 0.25rem;
    list-style: none;
}
.dim-dial__head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.dim-dial__label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--foreground);
}
.dim-dial__value {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ink-primary); /* O-C7 D5 — the active dim value as a readable primary ink */
}
.dim-dial__rest {
    font-size: 0.75rem;
    color: var(--muted-foreground);
}
.dim-dial__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    margin-inline-start: auto;
    margin-block: -0.5rem;
    padding: 0.5rem;
    color: var(--muted-foreground);
    background: transparent;
    border: 0;
    border-radius: var(--radius-control);
    cursor: pointer;
}
.dim-dial__clear:hover,
.dim-dial__clear:focus-visible {
    color: var(--foreground);
}
.dim-dial__clear-glyph {
    width: 0.875rem;
    height: 0.875rem;
}
</style>
