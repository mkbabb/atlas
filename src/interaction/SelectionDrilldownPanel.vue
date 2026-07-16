<script setup lang="ts">
// interaction/SelectionDrilldownPanel.vue — @mkbabb/atlas · THE CHRONIC DRILL-DOWN VIEW (O-A11).
//
// THE OWNER'S LAW (addendum 2026-07-04, §4 · verbatim-distilled): the clicked county/district/etc opens
// THE drill-down view. SINGLE-select → the hover information ALONE (no dropdown, no aggregate, no
// mini-map header). MULTI-select → a mini-map of the selection + aggregate statistics + per-LEVEL
// dropdowns (state/county/… each with its icon) that drill down and surface each item's hover card. The
// bespoke /usf right-side clicked-state entry is ABROGATED (a WG-D successor deletes it) — this panel
// SUBSUMES it, bound to `selectedItems`, so TX-shows-AK is impossible BY CONSTRUCTION (there is no store
// field to read a stale "top receiver" from; the title/glyph is a projection of THE SELECTION).
//
// THE REFRAME (selection-drilldown L36): the drill-down is NOT a new engine or state home. It PROMOTES
// the `SelectionSetPane` pattern (mini-map + aggregate + accordion, today a filter-drawer band) to a
// docked, viz-agnostic PANEL, and adds the two things the pane lacks: the SINGLE/MULTI split (a `computed`
// off `selectedItems.length` — ZERO new state) and the per-GRAIN dropdown ladder (`groupBy(items,.kind)`).
// The `placement` prop lets ONE component render BOTH the docked drill-down (`dock-br`) and the
// filter-drawer band (`drawer`) — the two-panels-drift the lineage kept re-creating, killed.
//
// THE PIECES (all live at HEAD): `useSelection.selectedItems` (parsed, kind-aware) is the content;
// `EntityIcon`/`resolveEntityIconForSelection` (O-A12) seats every row's icon + name; `useSelectionStat`
// runs the beat-tracked single (`statFor`) + aggregate (`aggregateFor`) resolvers; `ReadoutFacts` renders
// the fact grammar; `ReadoutDrill` carries the Pin·Compare·Focus verbs (the ONE touch path from single
// to multi — [ANSWERS Q-46] the action verbs SURVIVE on the single panel). The AGGREGATE LAW ([ANSWERS
// Q-37/Q-38]) is the resolver's: extensives Σ, intensives POOLED with the MEDIAN alongside — both shown.
//
// DRILL-AND-FILTER ([ANSWERS Q-45]): a map click BOTH drills (opens this panel) AND soft-filters the
// fleet — that click wiring is the route's (it writes a `source:"drilldown"` coordinator clause). This
// panel carries the MULTI set-promote verb `[Filter to these ▸]` (spatial grain, `promotable`) + the
// PERSISTENT un-filter affordance (`filtered` → a visible `[✕ un-filter]`), so the filter is never a
// one-way trap. Both are EMITTED (`@promote`/`@unfilter`) — the route owns the coordinator; the panel
// stays viz-agnostic (it knows the SELECTION and the active beat's resolvers, never a route's data).
//
// NEVER-INCRIMINATE (dashboard-facing): the panel renders whatever the resolver + `EntityIcon` supply;
// on /usf-integrity the route hands PSEUDONYM labels + public-total facts only (the `firm`→hub glyph
// seats a letter, never a firm name — O-A12's fence), so the restraint carries by construction.
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { Card } from "@mkbabb/glass-ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@mkbabb/glass-ui/collapsible";
import EntityIcon from "../charts/glyph/EntityIcon.vue";
import {
    resolveEntityIconForSelection,
    grainForKind,
    type EntityGrain,
    type ResolveEntityIconOptions,
} from "../charts/glyph/resolveEntityIcon.js";
import ReadoutFacts from "../charts/readout/ReadoutFacts.vue";
import ReadoutDrill from "./ReadoutDrill.vue";
import { boundedMinimapViewBox } from "./minimapExtent.js";
import { markColorFor } from "../charts/scale/ColorScale.js";
import type {
    SelectionKey,
    SelectionKind,
} from "../charts/contract/selection-contract.js";
import { useSelection } from "../platform/stores/useSelection.js";
import { useSelectionStat } from "../platform/stores/useSelectionStat.js";
import { PIN_CAP } from "../platform/stores/useHoverReadout.js";
import { projectDrilldown } from "./projectDrilldown.js";

/** Where the panel docks (selection-drilldown §B.0). `dock-br` (default) floats bottom-right over the
    focal viz's dead-space corner; `dock-tr`/`inset` are the ecf/usf-integrity per-route overrides;
    `drawer` is the SelectionSetPane band mount; `sheet` the phone bottom-sheet (I-MOBILE). */
export type DrilldownPlacement =
    | "dock-br"
    | "dock-tr"
    | "inset"
    | "drawer"
    | "sheet";

const {
    placement = "dock-br",
    promotable = false,
    filtered = false,
    cellLabel = undefined,
    schoolPoint = undefined,
    districtOf = undefined,
    pseudonym = undefined,
} = defineProps<{
    /** Where the panel docks. Default `dock-br` (bottom-right, over the map). */
    placement?: DrilldownPlacement;
    /** True on a spatial / co-filterable grain — enables the MULTI `[Filter to these ▸]` promote verb
        ([ANSWERS Q-47]: MULTI-mode, spatial-grain only). The route knows whether its grain co-filters. */
    promotable?: boolean;
    /** True when a `source:"drilldown"` co-filter is LIVE — shows the persistent `[✕ un-filter]`
        affordance so the filter is never a one-way trap ([ANSWERS Q-45]). The route owns the clause. */
    filtered?: boolean;
    /** Feed-side resolvers threaded to `EntityIcon` (O-A12) so the panel stays off every feed:
        the cell place name, the school interior point, the school→district crosswalk, the firm pseudonym. */
    cellLabel?: (id: string) => string | null | undefined;
    schoolPoint?: ResolveEntityIconOptions["schoolPoint"];
    districtOf?: (id: string) => string | null | undefined;
    pseudonym?: (id: string) => string | null | undefined;
}>();

const emit = defineEmits<{
    /** [Filter to these ▸] — promote the selected set of `grain` to a co-filter (the route writes the
        `source:"drilldown"` clause for `ids`). */
    promote: [grain: SelectionKind, ids: string[]];
    /** [✕ un-filter] — reverse the live drill-filter (the route clears the `"drilldown"` clause). */
    unfilter: [];
}>();

const selection = useSelection();
const stat = useSelectionStat();
const { selectedItems, primaryItem } = storeToRefs(selection);

// ── THE MODE — a pure function of set cardinality (selection-drilldown §A.2 · ZERO new state). n=0
// ⇒ absent (the `v-if` self-gate); n=1 ⇒ SINGLE (hover info alone); n≥2 ⇒ MULTI. No `isMulti` flag
// anywhere — the two modes are two RENDER BRANCHES over one number, never two code paths. ──────────
const n = computed(() => selectedItems.value.length);

// The verdict hue the card rim wears — the SAME data-hue locus the veil reads (never a hand-hex). */
const rimHue = computed<string | null>(() => selection.veilHue);

// ── PER-ITEM DESCRIPTION — the icon descriptor + title + verdict fill, resolved through the O-A12
// facility so the mini-map row, the dropdown rows, and the single card all read ONE resolver. ──────
const iconOpts = computed<ResolveEntityIconOptions>(() => ({
    size: "sm",
    cellLabel,
    schoolPoint,
    districtOf,
    pseudonym,
}));
interface Described {
    item: SelectionKey;
    grain: EntityGrain;
    title: string;
    fill: string;
}
function describe(item: SelectionKey): Described {
    const d = resolveEntityIconForSelection(item, iconOpts.value);
    return {
        item,
        grain: grainForKind(item.kind),
        title: d.label,
        fill: markColorFor(item.key) ?? "var(--route-accent)",
    };
}

const projection = computed(() => projectDrilldown(selectedItems.value, describe, () => null));
const mode = computed<"single" | "multi">(() => projection.value.mode === "multi" ? "multi" : "single");

// ── SINGLE (n=1) — the hover card, docked (selection-drilldown §B.1). The one selected item's glyph +
// name + its stat facts + the drill verbs; NO aggregate, NO dropdown, NO mini-map header. ──────────
const single = computed<Described | null>(() => {
    if (projection.value.mode !== "single") return null;
    const primary = primaryItem.value;
    return primary ? describe(primary) : projection.value.item;
});
const singleStat = computed(() =>
    single.value ? stat.statFor(single.value.item, single.value.item.kind) : null,
);

// ── MULTI (n≥2) — the per-GRAIN dropdown ladder (selection-drilldown §B.5). `groupBy(items,.kind)` in
// geo-ladder order (state ▸ county ▸ district ▸ school ▸ cell ▸ firm); one dropdown per grain PRESENT.
const GRAIN_ORDER: readonly SelectionKind[] = [
    "state",
    "county",
    "district",
    "school",
    "cell",
    "firm",
];
/** Plural nouns per grain — the dropdown header + the roll-up lede. */
const GRAIN_PLURAL: Record<SelectionKind, string> = {
    state: "States",
    county: "Counties",
    district: "Districts",
    school: "Schools",
    cell: "Cells",
    firm: "Firms",
};
const SPATIAL_KINDS: ReadonlySet<SelectionKind> = new Set([
    "state",
    "county",
    "district",
    "school",
]);

interface GrainGroup {
    grain: SelectionKind;
    plural: string;
    rows: Described[];
    /** overflow beyond `PIN_CAP` — the `+N more` chip count. */
    overflow: number;
}
const groups = computed<GrainGroup[]>(() => {
    const byKind = new Map<SelectionKind, SelectionKey[]>();
    for (const it of selectedItems.value) {
        const arr = byKind.get(it.kind) ?? [];
        arr.push(it);
        byKind.set(it.kind, arr);
    }
    const out: GrainGroup[] = [];
    for (const grain of GRAIN_ORDER) {
        const items = byKind.get(grain);
        if (!items || !items.length) continue;
        const capped = items.slice(0, PIN_CAP).map(describe);
        out.push({
            grain,
            plural: GRAIN_PLURAL[grain],
            rows: capped,
            overflow: Math.max(0, items.length - PIN_CAP),
        });
    }
    return out;
});

/** The roll-up lede — the count + the grain noun ("3 places" mixed, else the grain plural). */
const rollupNoun = computed(() => {
    if (groups.value.length === 1) return groups.value[0].plural.toLowerCase();
    return "places";
});

// ── THE AGGREGATE BLOCK (selection-drilldown §B.4 · [ANSWERS Q-37/Q-38]). Per grain group, the
// beat-registered `AggregateResolver` reduces the beat's OWN extensives (Σ) + intensives (POOLED with
// MEDIAN alongside — both shown). Viz-agnostic: the panel calls `aggregateFor`, never sums route data.
// When no resolver is registered the block FALLS BACK to a count-only roll-up (never a blank). ─────
const aggregates = computed(() =>
    groups.value.map((g) => ({
        grain: g.grain,
        plural: g.plural,
        count: g.rows.length + g.overflow,
        stat: stat.aggregateFor(
            selectedItems.value.filter((it) => it.kind === g.grain),
            g.grain,
        ),
    })),
);

// ── THE MINI-MAP TIER (selection-drilldown §B.3). The BOUNDED tier fits a homogeneous spatial
// selection to its union viewBox; the GLYPH-ROW tier (a wrapped row of `EntityIcon` marks) is the
// honest fallback for mixed / aspatial. The extent HELPER computes the bounded viewBox; the concrete
// bounded-GeoPlate embed is the per-route enrichment (it needs the route's projected geometry) — the
// glyph-row tier renders here so the mini-map is always honest. ────────────────────────────────────
const allRows = computed<Described[]>(() =>
    groups.value.flatMap((g) => g.rows),
);
const boundedExtent = computed<string | null>(() => {
    const rows = allRows.value;
    const allSameGrain =
        rows.length > 0 && rows.every((r) => r.item.kind === rows[0].item.kind);
    const allSpatial = rows.every((r) => SPATIAL_KINDS.has(r.item.kind));
    if (!allSameGrain || !allSpatial) return null;
    const boxes = rows.map((r) => {
        const d = resolveEntityIconForSelection(r.item, iconOpts.value);
        return d.mark === "glyph" ? d.geom.viewBox : null;
    });
    return boundedMinimapViewBox(boxes);
});

// ── THE FOCUS CHOOSER — clicking a mini-map mark or a dropdown header re-aims `focus()` (the open
// section + the highlighted member) WITHOUT mutating the set (selection-drilldown §B.3/§B.5). ──────
function reaim(item: SelectionKey): void {
    selection.focus(item.key);
    openRowKey.value = item.key;
}

// ── THE SINGLE-OPEN ROW COORDINATOR — opening a row's hover-card closes the prior (the pane's
// single-open logic, scoped to the ladder). Seeded to the primary item. ────────────────────────────
const openRowKey = ref<string | null>(null);
function toggleRow(key: string): void {
    openRowKey.value = openRowKey.value === key ? null : key;
}

// ── THE PROMOTE / UN-FILTER VERBS ([ANSWERS Q-45/Q-47]). `[Filter to these ▸]` emits the grain + its
// native ids (the route writes the `source:"drilldown"` clause); `[✕ un-filter]` reverses. ─────────
/** The one spatial grain group eligible for the set-promote (MULTI, spatial-grain only). */
const promoteGroup = computed<GrainGroup | null>(() => {
    if (!promotable || mode.value !== "multi") return null;
    return (
        groups.value.find((g) => SPATIAL_KINDS.has(g.grain)) ?? null
    );
});
function onPromote(): void {
    const g = promoteGroup.value;
    if (!g) return;
    emit("promote", g.grain, [...selection.selectedIdsOf(g.grain)]);
}
function onUnfilter(): void {
    emit("unfilter");
}

// ── DISMISS = CLEAR (selection-drilldown §B.0). The × + the Esc page-rung both `clearSelection()`, so
// the panel closes by construction (`v-if="n>0"`) — no hidden-but-live state (a dead affordance). ──
function onDismiss(): void {
    selection.clearSelection();
}

// ── THE ESC LADDER (selection-drilldown §C.3). Rung 2 (within-panel collapse): an Esc while a row is
// open COLLAPSES that row first and STOPS — it never reaches the page-level clear (rung 3, the
// PlatformShell/SelectionRegion seam that calls `clearSelection`). Rung 1 (the field-scope gate) lives
// in `useSelection` (a capture-phase stamp) and is untouched here. ─────────────────────────────────
function onPanelKeydown(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    if (openRowKey.value !== null) {
        openRowKey.value = null;
        e.stopPropagation();
    }
    // else: let Escape bubble to the page-level clear (rung 3) — the panel closes on the empty set.
}
</script>

<template>
    <!-- THE DRILL-DOWN PANEL — present ONLY when a selection exists (`v-if="n"` — the self-gate; the
         inert routes stay clean, the NEG control the gate asserts). A floating glass PAPER card over
         the focal viz; the `placement` data-attr carries the per-route corner (the route's CSS seats
         the fixed geometry — this component is geometry-agnostic, mounted where the route docks it). -->
    <section
        v-if="n > 0"
        class="drilldown"
        :class="`drilldown--${placement}`"
        :data-placement="placement"
        :data-mode="mode"
        data-testid="drilldown-panel"
        role="region"
        aria-label="Selection drill-down"
        @keydown="onPanelKeydown"
    >
        <Card
            variant="selection"
            surface="glass"
            tier="quiet"
            :selected="!!rimHue"
            :data-hue="rimHue ?? undefined"
            class="drilldown__card"
        >
            <!-- ═══ SINGLE (n=1) — the hover card, docked. Glyph + name + stat facts + drill verbs.
                 NO aggregate, NO dropdown, NO mini-map header (the owner's law; asserted by the gate). ═══ -->
            <template v-if="mode === 'single' && single">
                <div class="drilldown__single" data-testid="drilldown-single">
                    <header class="drilldown__single-head">
                        <EntityIcon
                            :entity-key="single.item.id"
                            :grain="single.grain"
                            :size="48"
                            fill-policy="data"
                            :fill="single.fill"
                            :label="single.title"
                            selected
                        />
                        <h3 class="drilldown__title">{{ single.title }}</h3>
                        <button
                            type="button"
                            class="drilldown__dismiss"
                            aria-label="Clear selection"
                            title="Clear"
                            @click="onDismiss"
                        >
                            ×
                        </button>
                    </header>

                    <template v-if="singleStat">
                        <p class="drilldown__stat-label">{{ singleStat.label }}</p>
                        <ReadoutFacts :facts="singleStat.facts" density="compact" />
                    </template>

                    <!-- [ANSWERS Q-46] the action verbs SURVIVE on the single panel (touch has no shift;
                         [Compare] is the ONLY way to grow single → multi). -->
                    <ReadoutDrill :selection-key="single.item.key" />
                </div>
            </template>

            <!-- ═══ MULTI (n≥2) — mini-map + aggregate + per-grain dropdown ladder. ═══ -->
            <template v-else>
                <header class="drilldown__head">
                    <div class="drilldown__head-row">
                        <p class="drilldown__eyebrow">Selection</p>
                        <p class="drilldown__count">{{ n }} {{ rollupNoun }}</p>
                    </div>
                    <button
                        type="button"
                        class="drilldown__dismiss drilldown__dismiss--multi"
                        aria-label="Clear selection"
                        title="Clear"
                        @click="onDismiss"
                    >
                        ×
                    </button>
                </header>

                <!-- (1) THE MINI-MAP — the glyph-row tier: a wrapped row of the selected marks, each a
                     re-aim chooser (never mutating the set). `data-tier` records bounded vs glyph-row
                     (the bounded viewBox is computed for a homogeneous spatial selection; the concrete
                     bounded-GeoPlate embed is the per-route enrichment). -->
                <div
                    class="drilldown__minimap"
                    data-testid="drilldown-minimap"
                    :data-tier="boundedExtent ? 'bounded' : 'glyph-row'"
                    :data-extent="boundedExtent ?? undefined"
                    role="group"
                    aria-label="Selection extent"
                >
                    <button
                        v-for="d in allRows"
                        :key="d.item.key"
                        type="button"
                        class="drilldown__minimap-mark"
                        :class="{
                            'drilldown__minimap-mark--on':
                                d.item.key === (primaryItem?.key ?? null),
                        }"
                        :aria-label="d.title"
                        :data-grain="d.item.kind"
                        @click="reaim(d.item)"
                    >
                        <EntityIcon
                            :entity-key="d.item.id"
                            :grain="d.grain"
                            size="sm"
                            fill-policy="data"
                            :fill="d.fill"
                            :label="d.title"
                            :cell-label="cellLabel"
                            :school-point="schoolPoint"
                            :district-of="districtOf"
                            :pseudonym="pseudonym"
                            :selected="d.item.key === (primaryItem?.key ?? null)"
                        />
                    </button>
                </div>

                <!-- (2) THE AGGREGATE BLOCK — per grain group, the beat's honest reduce (Σ extensives;
                     POOLED + MEDIAN intensives, BOTH shown [ANSWERS Q-38]). Falls to a count-only
                     roll-up when no resolver is registered (never a blank). -->
                <section
                    class="drilldown__aggregate"
                    data-testid="drilldown-aggregate"
                    aria-label="Aggregate"
                >
                    <template v-for="a in aggregates" :key="a.grain">
                        <div class="drilldown__aggregate-group">
                            <template v-if="a.stat">
                                <p class="drilldown__stat-label">{{ a.stat.label }}</p>
                                <ReadoutFacts
                                    :facts="a.stat.facts"
                                    density="compact"
                                />
                            </template>
                            <!-- the count-only floor (canon §5.A4 — never a bare em-dash) -->
                            <p v-else class="drilldown__aggregate-count">
                                {{ a.count }} {{ a.plural.toLowerCase() }}
                            </p>
                        </div>
                    </template>
                </section>

                <!-- (3) THE PER-GRAIN DROPDOWN LADDER — one Collapsible per grain present; each row =
                     EntityIcon + name + a hover-card trigger (expands to the item's full facts + verbs). -->
                <div class="drilldown__ladder" role="list">
                    <Collapsible
                        v-for="g in groups"
                        :key="g.grain"
                        :open="true"
                        class="drilldown__dropdown"
                        data-testid="drilldown-dropdown"
                        :data-grain="g.grain"
                        role="listitem"
                    >
                        <CollapsibleTrigger class="drilldown__dropdown-head">
                            <EntityIcon
                                :entity-key="g.rows[0]?.item.id ?? ''"
                                :grain="grainForKind(g.grain)"
                                size="sm"
                                fill-policy="identity"
                                :label="g.plural"
                            />
                            <span class="drilldown__dropdown-title"
                                >{{ g.plural }} · {{ g.rows.length + g.overflow }}</span
                            >
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div
                                v-for="d in g.rows"
                                :key="d.item.key"
                                class="drilldown__row"
                                data-testid="drilldown-row"
                            >
                                <button
                                    type="button"
                                    class="drilldown__row-trigger"
                                    :aria-expanded="d.item.key === openRowKey"
                                    @click="toggleRow(d.item.key)"
                                >
                                    <EntityIcon
                                        :entity-key="d.item.id"
                                        :grain="d.grain"
                                        size="sm"
                                        fill-policy="data"
                                        :fill="d.fill"
                                        :label="d.title"
                                        :cell-label="cellLabel"
                                        :school-point="schoolPoint"
                                        :district-of="districtOf"
                                        :pseudonym="pseudonym"
                                    />
                                    <span class="drilldown__row-title">{{
                                        d.title
                                    }}</span>
                                    <span
                                        class="drilldown__row-chev"
                                        aria-hidden="true"
                                        >{{ d.item.key === openRowKey ? "▾" : "›" }}</span
                                    >
                                </button>
                                <!-- the drill-down: the item's OWN hover card (facts + verbs) -->
                                <div
                                    v-if="d.item.key === openRowKey"
                                    class="drilldown__row-card"
                                    data-testid="drilldown-row-card"
                                >
                                    <template
                                        v-if="stat.statFor(d.item, d.item.kind)"
                                    >
                                        <p class="drilldown__stat-label">
                                            {{ stat.statFor(d.item, d.item.kind)!.label }}
                                        </p>
                                        <ReadoutFacts
                                            :facts="
                                                stat.statFor(d.item, d.item.kind)!.facts
                                            "
                                            density="compact"
                                        />
                                    </template>
                                    <ReadoutDrill :selection-key="d.item.key" />
                                </div>
                            </div>
                            <p v-if="g.overflow" class="drilldown__overflow">
                                + {{ g.overflow }} more
                            </p>
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                <!-- (4) THE PROMOTE + UN-FILTER FOOT ([ANSWERS Q-45/Q-47]). -->
                <footer class="drilldown__foot">
                    <button
                        v-if="promoteGroup"
                        type="button"
                        class="drilldown__promote"
                        data-testid="drilldown-promote"
                        @click="onPromote"
                    >
                        Filter to these ▸
                    </button>
                    <button
                        v-if="filtered"
                        type="button"
                        class="drilldown__unfilter"
                        data-testid="drilldown-unfilter"
                        @click="onUnfilter"
                    >
                        ✕ un-filter
                    </button>
                </footer>
            </template>
        </Card>
    </section>
</template>

<style scoped>
/* THE DRILL-DOWN PANEL — a floating glass PAPER card the selection projects onto. The `placement`
   variants seat the fixed geometry ONLY for the docked corners; `drawer`/`inset` inherit the host's
   flow (the SelectionSetPane band + the ecf readout slot are positioned by their host). Map-primacy
   law: the panel FLOATS over the focal viz's dead-space corner, never a reserved column. */
.drilldown {
    --drilldown-w-single: 280px;
    --drilldown-w-multi: 340px;
    z-index: 20;
    max-width: min(92vw, var(--drilldown-w-multi));
}
.drilldown[data-mode="single"] {
    max-width: min(92vw, var(--drilldown-w-single));
}
.drilldown--dock-br,
.drilldown--dock-tr {
    position: absolute;
    inline-size: var(--drilldown-w-multi);
    max-inline-size: 92vw;
}
.drilldown--dock-br[data-mode="single"],
.drilldown--dock-tr[data-mode="single"] {
    inline-size: var(--drilldown-w-single);
}
.drilldown--dock-br {
    inset-block-end: 1rem;
    inset-inline-end: 1rem;
}
.drilldown--dock-tr {
    inset-block-start: 1rem;
    inset-inline-end: 1rem;
}
/* the phone bottom-sheet — full-width, seated at the viewport foot (I-MOBILE transposition). */
.drilldown--sheet {
    position: fixed;
    inset-block-end: 0;
    inset-inline: 0;
    inline-size: 100%;
    max-inline-size: 100%;
    max-block-size: 62vh;
    overflow-y: auto;
}

.drilldown__card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 0.95rem 1.05rem;
}

/* ── SINGLE ─────────────────────────────────────────────────────────────────────────────────── */
.drilldown__single {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}
.drilldown__single-head {
    display: flex;
    align-items: center;
    gap: 0.7rem;
}
.drilldown__title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-family: var(--font-display, serif);
    font-weight: 600;
    font-size: 1.1rem;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--foreground);
}

/* ── MULTI head ─────────────────────────────────────────────────────────────────────────────── */
.drilldown__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
    padding-bottom: 0.65rem;
    border-bottom: 1px solid
        color-mix(in oklab, var(--border, currentColor) 40%, transparent);
}
.drilldown__head-row {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}
.drilldown__eyebrow {
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    opacity: 0.7;
}
.drilldown__count {
    margin: 0;
    font-family: var(--font-display, serif);
    font-weight: 600;
    font-size: 1rem;
    color: var(--foreground);
}

/* the dismiss × — a ≥44px effective target (the touch floor L16 named). */
.drilldown__dismiss {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--muted-foreground);
    font-size: 1.15rem;
    line-height: 1;
    width: 1.65rem;
    height: 1.65rem;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        color 0.15s ease;
}
.drilldown__dismiss::before {
    content: "";
    position: absolute;
    min-width: 44px;
    min-height: 44px;
}
.drilldown__single-head .drilldown__dismiss {
    position: relative;
}
.drilldown__dismiss:hover {
    background: color-mix(in oklab, var(--muted-foreground), transparent 82%);
    color: var(--foreground);
}
.drilldown__dismiss:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--route-accent), transparent 40%);
    outline-offset: 2px;
}

/* ── the mini-map (glyph-row tier) ──────────────────────────────────────────────────────────── */
.drilldown__minimap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.drilldown__minimap-mark {
    appearance: none;
    border: 0;
    background: transparent;
    display: grid;
    place-items: center;
    min-width: 2.4rem;
    min-height: 2.4rem;
    padding: 0.2rem;
    border-radius: var(--radius-control);
    cursor: pointer;
    transition: background-color 0.15s ease;
}
.drilldown__minimap-mark:hover,
.drilldown__minimap-mark--on {
    background: color-mix(in oklab, var(--route-accent), transparent 86%);
}
.drilldown__minimap-mark:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--route-accent), transparent 40%);
    outline-offset: 2px;
}

/* ── the aggregate block ────────────────────────────────────────────────────────────────────── */
.drilldown__aggregate {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding-block: 0.55rem;
    border-block: 1px solid
        color-mix(in oklab, var(--border, currentColor) 30%, transparent);
}
.drilldown__aggregate-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}
.drilldown__aggregate-count {
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
    color: var(--muted-foreground);
}
.drilldown__stat-label {
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    opacity: 0.72;
}

/* ── the dropdown ladder ────────────────────────────────────────────────────────────────────── */
.drilldown__ladder {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.drilldown__dropdown-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 2.2rem;
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0.25rem 0.1rem;
    cursor: pointer;
    text-align: left;
    color: var(--foreground);
}
.drilldown__dropdown-head:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--route-accent), transparent 40%);
    outline-offset: 2px;
    border-radius: var(--radius-control);
}
.drilldown__dropdown-title {
    font-family: var(--font-mono, monospace);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
.drilldown__row {
    padding-inline-start: 0.35rem;
}
.drilldown__row-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 2.4rem;
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0.25rem 0.1rem;
    cursor: pointer;
    text-align: left;
    color: var(--foreground);
    border-radius: var(--radius-control);
}
.drilldown__row-trigger:hover {
    background: color-mix(in oklab, var(--muted-foreground), transparent 90%);
}
.drilldown__row-trigger:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--route-accent), transparent 40%);
    outline-offset: 2px;
}
.drilldown__row-title {
    flex: 1 1 auto;
    min-width: 0;
    font-family: var(--font-display, serif);
    font-weight: 600;
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.drilldown__row-chev {
    flex: none;
    color: var(--muted-foreground);
    font-size: 0.9rem;
}
.drilldown__row-card {
    padding: 0.15rem 0.1rem 0.5rem 1.9rem;
}
.drilldown__overflow {
    margin: 0.2rem 0 0 1.9rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem;
    color: var(--muted-foreground);
    opacity: 0.7;
}

/* ── the promote / un-filter foot ───────────────────────────────────────────────────────────── */
.drilldown__foot {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding-top: 0.5rem;
    border-top: 1px solid
        color-mix(in oklab, var(--border, currentColor) 30%, transparent);
}
.drilldown__promote,
.drilldown__unfilter {
    appearance: none;
    min-height: 2.2rem;
    padding: 0.35rem 0.7rem;
    border-radius: var(--radius-control);
    font-family: var(--font-mono, monospace);
    font-size: 0.68rem;
    letter-spacing: 0.03em;
    cursor: pointer;
    border: 1px solid
        color-mix(in oklab, var(--route-accent), transparent 55%);
    background: color-mix(in oklab, var(--route-accent), transparent 90%);
    color: var(--foreground);
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease;
}
.drilldown__promote:hover {
    background: color-mix(in oklab, var(--route-accent), transparent 80%);
}
.drilldown__unfilter {
    border-color: color-mix(in oklab, var(--muted-foreground), transparent 55%);
    background: transparent;
    color: var(--muted-foreground);
}
.drilldown__unfilter:hover {
    color: var(--foreground);
    background: color-mix(in oklab, var(--muted-foreground), transparent 88%);
}
.drilldown__promote:focus-visible,
.drilldown__unfilter:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--route-accent), transparent 35%);
    outline-offset: 2px;
}
</style>
