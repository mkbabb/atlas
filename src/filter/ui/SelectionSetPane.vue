<script setup lang="ts">
// SelectionSetPane.vue — THE SELECTION-SET BAND of the ONE unified filter panel (K-FILTER-UNIFIED
// §4.E · the `FilterView.vue` body LIFTED byte-faithful). The frosted `<Card variant="selection">`
// holding (1) an aggregate-HEADER band — a grain-aware MINI-MAP row of just the selected marks + the
// whole-selection roll-up — ABOVE (2) a `Collapsible`-floor accordion LIST where each selected entity
// is a section (Glyph + name trigger). The FIRST section is open at mount and SEEDED from the readout
// store (the selection-projection + `useSelectionStat` — a NON-BLANK Rank/Per-capita at mount, NO
// live hover required), the rest collapsed; a single-open coordinator (opening section k closes the
// prior).
//
// THE LIFT (K-FILTER-UNIFIED). This is the J-FILTER `FilterView` facility body, lifted INTO the
// unified panel: the TWO-filter fork (the standalone Teleported card + the inline per-viz dock)
// collapses into the ONE drawer panel. The body keeps the `j0-filter` facility relations
// (accordion / ring / mini-map / route-fold / aggregate-header — the `j0-filter.spec.ts` laws GREEN
// by COMPOSITION), so only the HOST moved: it is no longer Teleported to body / fixed top-left — it
// renders as a band INSIDE `UnifiedFilterPanel` (inside the live-behind drawer, the ONE filter home
// at every register). The `data-testid="filter-view"` + the `<Card variant="selection">` + the
// selection self-gate (`hasCards`) are PRESERVED (the producer/instrument bind).
//
// IT IS THE PERSISTENCE, NOT A NEW STATE HOME. The pane derives ENTIRELY from
// `useSelection.selectedItems` (the PARSED selection set, the single source of truth) ∪ the readout
// store's pinned projection — so a keyboard select or a deep-link `?sel=` seed with NO prior hover
// still raises an informative band. The ~1,176-L state layer (`useSelection`/`useHoverReadout`/
// `useSelectionStat`) is READ here, byte-untouched.
import { computed, ref, watch } from "vue";
import { Card } from "@mkbabb/glass-ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@mkbabb/glass-ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@mkbabb/glass-ui/toggle-group";
import { StatusDot } from "@mkbabb/glass-ui/status-dot";
import Glyph, { type GlyphGrain } from "../../charts/glyph/Glyph.vue";
import ReadoutFacts from "../../charts/readout/ReadoutFacts.vue";
import {
    stateGlyph,
    countyGlyph,
    districtGlyph,
    glyphRegistryVersion,
    type GlyphGeom,
} from "../../data/entityGeometry.js";
import { markColorFor } from "../../charts/scale/ColorScale.js";
import type { SelectionKey } from "../../charts/contract/selection-contract.js";
import { useHoverReadout, PIN_CAP } from "../../platform/stores/useHoverReadout.js";
import { useSelection } from "../../platform/stores/useSelection.js";
import { useSelectionStat } from "../../platform/stores/useSelectionStat.js";

const store = useHoverReadout();
const selection = useSelection();
const stat = useSelectionStat();

// ── THE PROJECTION (≤ PIN_CAP, in selection order) — the section list + the mini-map iterate the
// PARSED selection set (`selectedItems`), capped at PIN_CAP so the pane stays legible. For each key we
// LOOK UP its pin payload (the rich facts/title the producer auto-captured on a pointer pin); when none
// exists we SYNTHESIZE a minimal member from the parsed key (the entity's I4-registry name), so the
// pane derives from `selectedKeys`, never a captured transient. ────────────────────────────────────
interface FilterMember {
    /** The PARSED selection key (kind + id + the byte-identical Set member). */
    sel: SelectionKey;
    /** The glyph grain — the pin payload's grain when present, else the parsed kind. */
    grain: GlyphGrain;
    /** The geometry JOIN key (the producer's `glyphKey`, else the raw id). */
    glyphKey: string;
    /** The resolved silhouette, or null for an aspatial grain / a not-yet-loaded registry. */
    geom: GlyphGeom | null;
    /** The entity title — the producer's name, else the geometry's, else the raw id. */
    title: string;
    /** The verdict fill — the data-hue locus the mini-map mark wears. */
    fill: string;
    /** True for the truly-aspatial grains (cell/firm) — the kind-icon fallback, NOT a void-ring. */
    aspatial: boolean;
}

/** The aspatial grains — no polygon, so the mini-map falls to a kind-icon (the J-GLYPH couple narrows
    the void-ring/county-proxy fallback to exactly these). `cell` is the speedtest hex bin; `firm` the
    consultant grain. A spatial grain resolves a real silhouette. */
const ASPATIAL_KINDS: ReadonlySet<string> = new Set(["cell", "firm"]);

/** Dispatch the I4 silhouette resolver by grain (the row CONSUMES the geometry, never re-rolls it).
    Pulls the `lg` LOD tier; returns null for an aspatial grain (the kind-icon fallback paints). */
function resolveGeom(grain: GlyphGrain, glyphKey: string): GlyphGeom | null {
    switch (grain) {
        case "state":
            return stateGlyph(glyphKey, "lg");
        case "county":
            return countyGlyph(glyphKey, "lg");
        case "district":
            return districtGlyph(glyphKey, "lg");
        default:
            return null;
    }
}

const members = computed<FilterMember[]>(() => {
    // Track the lazy-registry load version (J-PERF) — re-run the instant a `fine` LOD tier resolves so
    // the real silhouette swaps in over the transient void-ring.
    void glyphRegistryVersion.value;
    const out: FilterMember[] = [];
    for (const sel of selection.selectedItems) {
        if (out.length >= PIN_CAP) break;
        const pin = store.pinned.find((p) => p.key === sel.key) ?? null;
        const grain = (pin?.grain ?? sel.kind) as GlyphGrain;
        const glyphKey = pin?.glyphKey ?? sel.id;
        const aspatial = ASPATIAL_KINDS.has(sel.kind);
        const geom = aspatial ? null : resolveGeom(grain, glyphKey);
        const title = pin?.title ?? geom?.name ?? sel.id;
        const fill = markColorFor(sel.key) ?? "var(--route-accent)";
        out.push({ sel, grain, glyphKey, geom, title, fill, aspatial });
    }
    return out;
});

// THE MOUNT — the pane paints only with selected members (the selection self-gate; on /demand and the
// inert routes there is no selection ⇒ `hasCards=false`, the pane stays absent). The phone fold is the
// drawer's now (the pane lives INSIDE the one panel), so there is no concurrent-card gate here.
const hasCards = computed(() => members.value.length > 0);

// ── THE AGGREGATE-HEADER ROLL-UP — the whole-selection summary the pane leads with. The COUNT + the
// distinct kind set across `selectedItems` (so the header is the SELECTION roll-up, not the first
// entity's stat). ───────────────────────────────────────────────────────────────────────────────────
const aggregateCount = computed(() => members.value.length);
const aggregateKinds = computed<string[]>(() => {
    const seen = new Set<string>();
    for (const m of members.value) seen.add(m.sel.kind);
    return [...seen];
});
/** A human label for the selection grain ("places" mixed, else the grain plural) — the band lede. */
const aggregateNoun = computed(() => {
    const kinds = aggregateKinds.value;
    if (kinds.length !== 1) return "places";
    const k = kinds[0];
    return k === "firm" ? "firms" : `${k}s`;
});

// The verdict hue the card rim wears — the SAME data-hue locus the veil reads (NEVER a hand-hex). The
// rim collapses to the neutral glass rim when nothing is lit (`veilHue → null`).
const rimHue = computed<string | null>(() => selection.veilHue);

/** The contextual stat for a member — `useSelectionStat.statFor` tracks the active beat, falling back
    to the pinned readout's own facts. Seeded SYNCHRONOUSLY at mount, so the first-open body is NON-BLANK
    (no deferred hover-driven hydration). */
function statFor(m: FilterMember) {
    return stat.statFor(m.sel, m.grain);
}

// ── THE SINGLE-OPEN COORDINATOR (the `Collapsible` floor). `openKey` holds the ONE expanded section's
// selection key; opening section k closes the prior (a single-open relation). It is SEEDED to the FIRST
// member at mount, so the first section is `aria-expanded="true"` with a non-empty seeded body, the
// rest collapsed. ────────────────────────────────────────────────────────────────────────────────────
const openKey = ref<string | null>(null);

// Seed (and re-seed) the open section to the FIRST member whenever the set changes and the current
// open key has fallen out of the selection.
watch(
    members,
    (list) => {
        const keys = new Set(list.map((m) => m.sel.key));
        if (openKey.value === null || !keys.has(openKey.value)) {
            openKey.value = list.length ? list[0].sel.key : null;
        }
    },
    { immediate: true },
);

/** Toggle a section: opening k closes the prior (single-open); re-clicking the open one collapses it. */
function setOpen(key: string, open: boolean): void {
    openKey.value = open ? key : openKey.value === key ? null : openKey.value;
}

// ── THE RELEASE — route through `selection.select(key, {additive:true})` so a release TOGGLES the key
// OUT of the set, evicting the pin AND closing its section in lockstep (G-CLEAR by construction). ───
function release(m: FilterMember): void {
    selection.select(m.sel.key, { additive: true });
}
</script>

<template>
    <!-- THE SELECTION-SET BAND — mounts whenever a place is SELECTED (the projection of `selectedKeys`
         — the pane IS the persistence, so a keyboard/deep-link select with no hover still shows). It
         lives INSIDE the unified panel (no Teleport, no fixed top-left); the selection self-gate
         (`hasCards`) keeps the inert routes honestly absent. -->
    <section
        v-if="hasCards"
        class="filter-view"
        data-testid="filter-view"
        role="region"
        aria-label="Selected places"
    >
        <Card
            variant="selection"
            surface="glass"
            tier="quiet"
            :selected="!!rimHue"
            :data-hue="rimHue ?? undefined"
            class="filter-view__card"
        >
            <!-- (1) THE AGGREGATE-HEADER BAND — the whole-selection roll-up + the grain-aware MINI-MAP
                 row of JUST the chosen marks, ABOVE the granular list. -->
            <header class="filter-view__head" data-testid="filter-aggregate-header">
                <div class="filter-view__head-row">
                    <p class="filter-view__eyebrow">Selection</p>
                    <p class="filter-view__count">
                        {{ aggregateCount }} {{ aggregateNoun }}
                    </p>
                </div>

                <!-- THE MINI-MAP ROW — a `ToggleGroup type="single"` of just the selected marks:
                     a REAL Glyph silhouette per spatial grain, a `StatusDot` kind-icon for the
                     aspatial cell/firm (NOT the void-ring). The chooser re-aims the focused
                     subject (the open section) without mutating the set. -->
                <ToggleGroup
                    type="single"
                    class="filter-view__minimap"
                    data-testid="filter-minimap"
                    :model-value="openKey ?? undefined"
                    @update:model-value="
                        (v) => typeof v === 'string' && v && setOpen(v, true)
                    "
                >
                    <ToggleGroupItem
                        v-for="m in members"
                        :key="m.sel.key"
                        :value="m.sel.key"
                        class="filter-view__minimap-item"
                        :aria-label="m.title"
                        :data-grain="m.sel.kind"
                    >
                        <Glyph
                            v-if="!m.aspatial"
                            :grain="m.grain"
                            :id="m.glyphKey"
                            :label="m.title"
                            :geom="m.geom"
                            :fill="m.fill"
                            size="sm"
                            :selected="m.sel.key === openKey"
                        />
                        <StatusDot
                            v-else
                            variant="custom"
                            size="sm"
                            :color="m.fill"
                            :label="m.title"
                        />
                    </ToggleGroupItem>
                </ToggleGroup>
            </header>

            <!-- (2) THE EXPANDABLE GRANULAR LIST — each selected entity a `Collapsible`-floor section
                 (Glyph + name trigger); the FIRST open + SEEDED (non-blank), the rest collapsed via
                 the single-open coordinator. -->
            <div class="filter-view__list" role="list">
                <Collapsible
                    v-for="m in members"
                    :key="m.sel.key"
                    :open="m.sel.key === openKey"
                    class="filter-view__section"
                    data-testid="filter-section"
                    role="listitem"
                    @update:open="(o) => setOpen(m.sel.key, o)"
                >
                    <div class="filter-view__section-head">
                        <CollapsibleTrigger
                            class="filter-view__trigger"
                            :data-testid="
                                m.sel.key === openKey
                                    ? 'filter-section-open'
                                    : undefined
                            "
                        >
                            <Glyph
                                v-if="!m.aspatial"
                                class="filter-view__trigger-glyph"
                                :grain="m.grain"
                                :id="m.glyphKey"
                                :label="m.title"
                                :geom="m.geom"
                                :fill="m.fill"
                                size="sm"
                            />
                            <StatusDot
                                v-else
                                variant="custom"
                                size="sm"
                                :color="m.fill"
                                :label="m.title"
                            />
                            <span class="filter-view__title">{{ m.title }}</span>
                        </CollapsibleTrigger>
                        <button
                            type="button"
                            class="filter-view__release"
                            aria-label="Release this selection"
                            title="Release"
                            @click="release(m)"
                        >
                            ×
                        </button>
                    </div>

                    <CollapsibleContent class="filter-view__body">
                        <!-- THE SEEDED STAT — read SYNCHRONOUSLY off `useSelectionStat` so the
                             first-open body is NON-BLANK at mount (no deferred hover hydration). -->
                        <template v-if="statFor(m)">
                            <p class="filter-view__stat-label">
                                {{ statFor(m)!.label }}
                            </p>
                            <ReadoutFacts :facts="statFor(m)!.facts" density="compact" />
                        </template>
                        <p v-else class="filter-view__empty">
                            {{ m.sel.kind }} selected
                        </p>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </Card>
    </section>
</template>

<style scoped>
/* THE SELECTION-SET BAND — a calm resting instrument the selection projects onto, INSIDE the unified
   panel (no fixed/Teleport geometry: the drawer owns the placement). The frosted `<Card
   variant="selection">` wears the verdict RING (the variant's BUILT `--glass-accent` rim, routed off
   `:data-hue`), NOT a saturated plate-fill — the ring, not the slab. */
.filter-view__card {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.95rem 1.05rem;
}

/* (1) THE AGGREGATE-HEADER BAND — the whole-selection roll-up above the granular list. */
.filter-view__head {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid
        color-mix(in oklab, var(--border, currentColor) 40%, transparent);
}
.filter-view__head-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
}
.filter-view__eyebrow {
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    opacity: 0.7;
}
.filter-view__count {
    margin: 0;
    font-family: var(--font-display, serif);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--foreground);
}

/* THE MINI-MAP ROW — the chosen marks, a single-open chooser. */
.filter-view__minimap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.filter-view__minimap-item {
    display: grid;
    place-items: center;
    min-width: 2rem;
    min-height: 2rem;
    padding: 0.25rem;
    border-radius: var(--radius-control);
}

/* (2) THE EXPANDABLE GRANULAR LIST — the `Collapsible`-floor accordion. */
.filter-view__list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.filter-view__section {
    border-radius: var(--radius-control);
}
.filter-view__section-head {
    display: flex;
    align-items: center;
    gap: 0.45rem;
}
.filter-view__trigger {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0.3rem 0.1rem;
    cursor: pointer;
    text-align: left;
    color: var(--foreground);
    border-radius: var(--radius-control);
}
.filter-view__trigger:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--route-accent), transparent 40%);
    outline-offset: 2px;
}
.filter-view__trigger-glyph {
    flex: none;
}
.filter-view__title {
    min-width: 0;
    flex: 1 1 auto;
    font-family: var(--font-display, serif);
    font-weight: 600;
    font-size: 0.98rem;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.filter-view__release {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--muted-foreground);
    font-size: 1rem;
    line-height: 1;
    width: 1.4rem;
    height: 1.4rem;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        color 0.15s ease;
}
.filter-view__release:hover {
    background: color-mix(in oklab, var(--muted-foreground), transparent 82%);
    color: var(--foreground);
}

.filter-view__body {
    padding: 0 0.1rem 0.5rem;
}
.filter-view__stat-label {
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    opacity: 0.7;
}
.filter-view__empty {
    margin: 0.3rem 0 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem;
    color: var(--muted-foreground);
    opacity: 0.66;
}
</style>
