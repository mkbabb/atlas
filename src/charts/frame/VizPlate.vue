<script setup lang="ts">
// VizPlate.vue — THE HOST THAT REPLACES ChartFrame (I2.a · BIG-BANG keystone, DESIGN §3.7).
//
// A viz is declared ONCE (a `VizContract`) and rendered WHOLE here: the title-rung, the E1
// axis-coloured description band, the B4 key-stat strip, the E5 compact legend, the E2 options
// trigger (default-on), the E3 export glyph, the E8 designed-void-on-empty, and the audacious
// figure — all from one declaration, in fixed slots.
//
// THE COMPOSE-NOT-REIMPLEMENT LAW (I2 Hard Gate 2): VizPlate MOUNTS <ChartFrame> internally for the
// engraved frame, the URL-addressable `?fig=` expand, the per-plate error boundary, the headline-
// straddle, and the legend-dock that ChartFrame already owns — so NO behaviour is lost and NO
// consumer mounts ChartFrame directly. ChartFrame becomes a private implementation detail of
// VizPlate. The §E verbs land ONCE in this host; the 21 feature plates shrink to "declare the
// contract + provide the chart body."
//
// THE PRIMITIVES IT COMPOSES (never absorbs — DESIGN §6.4 COMPOSE-not-absorb):
//   • ChartFrame      — the frame / expand / error-boundary / straddle / legend-dock.
//   • DockControl/DockTrigger/Badge — the J-VIZDOCK per-viz controls cluster (the
//     filter-toggle + folded download + enlarge + applied-filters summary, from the dock register).
//   • useVizOptions + VizFilterDock — the URL-backed options engine + the inline per-viz filter dock
//     the filter-toggle raises (E2 options + J-FRAME's filterDimensions facet; the VizOptions POPOVER
//     is RETIRED — its dials re-homed into the inline dock, a TOGGLE not a transient popover).
//   • ChartLegend     — the compact top-right / stepped / rail legend (E5).
//   • ChartDataTable  — the a11y rows that ARE the export payload (E3, off the contract).
//   • VizDescription / VizKeyStats / PlateVoid — the new furniture rungs (E1 / B4 / E8).
//   • vizExport       — the getDataURL / DOM-snapshot / CSV serializers (E3, ZERO heavy dep).
import { inject, onBeforeUnmount, watch } from "vue";
import { Download, SlidersHorizontal, Maximize2, Minimize2 } from "@lucide/vue";
import { DockControl, DockTrigger } from "@mkbabb/glass-ui/dock";
import { Badge } from "@mkbabb/glass-ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@mkbabb/glass-ui/dropdown-menu";
import ChartFrame from "./ChartFrame.vue";
import VizGearDock from "./VizGearDock.vue";
import VizDescription from "../legend/VizDescription.vue";
import VizKeyStats from "../legend/VizKeyStats.vue";
import ChartLegend from "../legend/ChartLegend.vue";
import ChartDataTable from "../legend/ChartDataTable.vue";
import PlateVoid from "./PlateVoid.vue";
import PlateSkeleton from "./PlateSkeleton.vue";
import VizAppendixDock from "../../platform/provenance/VizAppendixDock.vue";
import { STORY_CARD_KEY } from "./story-card-context.js";
import { useVizPlate, type VizPlateProps } from "./useVizPlate.js";
import { STAGE_ANATOMY_KEY } from "../contract/scene-contract.js";

const props = withDefaults(defineProps<VizPlateProps>(), { chart: null, nav: null });
const suppressFoot = inject(STAGE_ANATOMY_KEY, false);
const storyCard = inject(STORY_CARD_KEY, null);

const {
    slots,
    showOwnTitle,
    legend,
    legendDock,
    legendIsStepped,
    onExportCsv,
    onExportImage,
    platePhase,
    errorAction,
    hasNav,
    liveSentence,
    focusRim,
    onFigureKey,
    focusedStat,
    filterDimensions,
    reveal,
    glyphs,
    aggregateStats,
    keyStats,
    provenance,
    archetype,
    filterDockOpen,
    toggleFilterDock,
    activeDimChips,
    activeFilterCount,
    showAppliedSummary,
    sourceData,
    sourceEventHub,
    sourceDataOpen,
    openSourceData,
    closeSourceData,
    isFullscreen,
    toggleEnlarge,
    ariaLabel,
    size,
    frameRef,
} = useVizPlate(props);

watch(
    () => [props.contract.id, aggregateStats.value] as const,
    ([vizId, stats], _previous, onCleanup) => {
        if (!storyCard) return;
        storyCard.setAggregateStats(vizId, stats);
        onCleanup(() => {
            if (props.contract.id !== vizId) storyCard.clearAggregateStats(vizId);
        });
    },
    { immediate: true },
);
onBeforeUnmount(() => storyCard?.clearAggregateStats(props.contract.id));

defineExpose({ archetype });
</script>

<template>
    <!-- VizPlate COMPOSES ChartFrame internally — the frame / `?fig=` expand / error boundary /
         headline-straddle / legend-dock all come from the mounted <ChartFrame> below. No consumer
         mounts ChartFrame directly; the §E verbs land ONCE here. -->
    <ChartFrame
        ref="frameRef"
        :eyebrow="contract.eyebrow"
        :aria-label="ariaLabel"
        :size="size"
        :fig-id="contract.id"
        :legend-dock="suppressFoot ? 'none' : legendDock"
        :show-title="showOwnTitle"
        data-viz-plate
        :data-viz-id="contract.id"
    >
        <!-- THE TITLE RUNG (the title TEXT alone — the E1 dek relocated to #default below, D5). The
             slot text is gated on `showOwnTitle` so the contract title string is never emitted under
             beat-ownership; `:show-title` ALSO drops ChartFrame's RUNG wrapper (the double-gate: the
             slot gate keeps the DOM clean, the RUNG gate kills the empty-`text-panel-title` ghost). -->
        <template #title>
            <div class="viz-plate__title-zone">
                <slot v-if="showOwnTitle" name="title">{{ contract.title }}</slot>
            </div>
        </template>

        <!-- THE LEGEND (E5) — a consumer `#legend` slot wins; else the contract's LegendSpec drives
             a ChartLegend at the §E5 default mode (stepped for N≥7, else continuous/inline). -->
        <template v-if="!suppressFoot && (legend || slots.legend)" #legend>
            <slot name="legend">
                <ChartLegend
                    v-if="legend"
                    :mode="legendIsStepped ? 'stepped' : 'continuous'"
                    :color-kind="legend.colorKind"
                    :low-label="legend.lowLabel"
                    :high-label="legend.highLabel"
                    :testid="`viz-legend-${contract.id}`"
                    :aria-label="`${contract.title} legend`"
                />
            </slot>
        </template>

        <!-- THE #actions RUNG — J-VIZDOCK's ONE standardized <DockControl compact> cluster (C38).
             The three loose nodes (the dual export <button>s + the VizOptions popover) are GONE: a
             filter-TOGGLE + ONE folded download (the CSV/image choice behind a DockTrigger) +
             an enlarge, sourced from @mkbabb/glass-ui/dock (the dock-control register — rounded,
             ≥44px hitbox). A COLLAPSED applied-filters summary Badge rides the cluster when dials are
             active + the dock is closed. The expand seam ChartFrame owns rides the enlarge button. -->
        <template v-if="!suppressFoot" #actions>
            <slot name="actions" />
            <VizGearDock
                class="viz-dock"
                :label="`${contract.title} controls`"
                :applied-count="activeFilterCount"
            >
                <!-- (1) THE FILTER-TOGGLE — raises the inline per-viz filter dock (a TOGGLE, the open
                     state persisting until re-toggled; NOT a click-away popover). Bound to the viz's
                     `filterDimensions` (J-FRAME's facet, CONSUMED). A Badge count-pip rides it when
                     ≥1 dial is active + the dock is closed (the applied-filters summary). -->
                <span class="viz-dock__filter-slot">
                    <DockControl
                        compact
                        :aria-label="`Filters — ${contract.title}`"
                        :aria-expanded="filterDockOpen"
                        aria-haspopup="true"
                        :title="`Filters · ${contract.title}`"
                        :data-testid="`viz-dock-filter-toggle-${contract.id}`"
                        data-viz-dock-filter-toggle
                        @click="toggleFilterDock"
                    >
                        <SlidersHorizontal class="viz-dock__glyph" aria-hidden="true" />
                    </DockControl>
                    <!-- THE COLLAPSED APPLIED-FILTERS SUMMARY — a state-derived count pip reading the
                         live active `filterDimensions` dials; present-when-active + dock-closed,
                         absent when no dial is active. The full chip-list rides the title. -->
                    <Badge
                        v-if="showAppliedSummary"
                        variant="secondary"
                        size="sm"
                        class="viz-dock__applied"
                        :title="`${activeFilterCount} filter(s): ${activeDimChips.join(', ')}`"
                        :data-testid="`viz-applied-summary-${contract.id}`"
                        data-viz-applied-summary
                        :data-filter-count="activeFilterCount"
                    >
                        {{ activeFilterCount }}
                    </Badge>
                </span>

                <!-- (2) THE FOLDED DOWNLOAD — ONE control, the CSV/image choice behind a
                     DockTrigger (the two export handlers `onExportCsv`/`onExportImage`
                     re-homed onto the menu, never re-authored). The image export is no longer hidden
                     in an sr-only twin; both exports stay reachable behind the one visible control. -->
                <DockControl
                    v-if="sourceData"
                    compact
                    :aria-label="`Browse source data — ${contract.title}`"
                    :aria-expanded="sourceDataOpen"
                    :title="`Source data · ${contract.title}`"
                    :data-testid="`viz-dock-download-${contract.id}`"
                    data-viz-dock-download
                    @click="openSourceData"
                >
                    <Download class="viz-dock__glyph" aria-hidden="true" />
                </DockControl>
                <DropdownMenu v-else>
                    <DockTrigger
                        for="dropdown"
                        :aria-label="`Download ${contract.title} — CSV or image`"
                        :title="`Download · ${contract.title}`"
                        :data-testid="`viz-dock-download-${contract.id}`"
                        data-viz-dock-download
                    >
                        <Download class="viz-dock__glyph" aria-hidden="true" />
                        <span class="sr-only">Download · CSV or image</span>
                    </DockTrigger>
                    <DropdownMenuContent align="end" :side-offset="6">
                        <DropdownMenuItem
                            :data-testid="`viz-export-csv-${contract.id}`"
                            @select="onExportCsv"
                        >
                            Download CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            :data-testid="`viz-export-image-${contract.id}`"
                            @select="onExportImage"
                        >
                            Download image
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <!-- (3) THE ENLARGE — the `?fig=` expand seam ChartFrame owns, driven from the
                     cluster (CONSUMED, not re-owned). Toggles this plate's fullscreen `?fig=` state. -->
                <DockControl
                    compact
                    :aria-label="
                        isFullscreen
                            ? `Collapse ${contract.title}`
                            : `Enlarge ${contract.title}`
                    "
                    :aria-pressed="isFullscreen"
                    :title="isFullscreen ? 'Collapse' : 'Enlarge'"
                    :data-testid="`viz-dock-enlarge-${contract.id}`"
                    data-viz-dock-enlarge
                    @click="toggleEnlarge"
                >
                    <Minimize2
                        v-if="isFullscreen"
                        class="viz-dock__glyph"
                        aria-hidden="true"
                    />
                    <Maximize2 v-else class="viz-dock__glyph" aria-hidden="true" />
                </DockControl>
            </VizGearDock>

            <!-- THE INLINE PER-VIZ FILTER DOCK IS RETIRED (K-FILTER-UNIFIED §4.H). The filter-toggle
                 above now PINS + opens the ONE unified panel (`UnifiedFilterPanel`); the viz's
                 `filterDimensions` dials + the re-homed E2 options render THERE, projected off the
                 K-ACTIVE active viz-set (the self-register seam). The 3-item dock chrome STAYS — only
                 the filter-toggle's TARGET changed (the two-filter fork collapses into the one panel). -->
        </template>

        <!-- J-FRAME · FACET 1 + FACET 4 (TOP) — the per-viz host-read seam, OUTSIDE the chart body.
             The host READS the declared facets and ROUTES each to its OWNING-WAVE renderer through a
             scoped slot (J-FRAME renders NOTHING — a viz hand-rolling a facet inline is the
             parallel-layer anti-pattern J-FEEDBACK-5 §2 forbids). `filterDimensions` → J-WORKBOOK/
             J-VIZDOCK rails; `aggregateStats` (top) → J-STORY's outside-the-grid placement (the
             viz-area-is-viz-only law). Each slot is guarded ABSENT when its facet is undeclared. -->
        <template v-if="filterDimensions.length" #filter-dimensions>
            <slot
                name="filter-dimensions"
                :dimensions="filterDimensions"
                :contract-id="contract.id"
            />
        </template>
        <template v-if="!storyCard && aggregateStats.length" #aggregate-stats-top>
            <slot
                name="aggregate-stats"
                :stats="aggregateStats"
                placement="top"
                :contract-id="contract.id"
            />
        </template>

        <!-- THE CHART BODY — the consumer's figure, wrapped in a `data-viz-body` host so the E3
             DOM-snapshot can find its SVG. On the empty-data signal (E8) the body swaps for the
             designed <PlateVoid> — a blank render is unrepresentable from the host. -->
        <template #default="{ fullscreen }">
            <!-- THE E1 DEK (D5) — UNCONDITIONAL, decoupled from the masthead RUNG: the dek is NO
                 LONGER in the #title slot ChartFrame gates, so the title-dedup rung guard never drops
                 it and the per-plate axis-keyed-description census stays GREEN (the dek remains in the
                 beat subtree). It reads beneath the <h2>, above the chart body, and travels cleanly
                 into the ?fig= expand + export. -->
            <VizDescription :description="contract.description" />
            <!-- J-FRAME · FACET 2 (`reveal` → J-SCROLL §9) + FACET 3 (`glyphs` → J-GLYPH) — the host
                 hands each declared facet to its owning-wave renderer via a scoped slot. J-FRAME
                 READS the declaration (the grain / the reveal steps), it RESOLVES nothing: J-SCROLL
                 orchestrates the reveal over the ONE page-clock, J-GLYPH resolves the grain to a REAL
                 silhouette (NO void-ring, NO proxy). Absent when the facet is undeclared. -->
            <slot v-if="reveal" name="reveal" :reveal="reveal" :contract-id="contract.id" />
            <slot v-if="glyphs" name="glyphs" :glyphs="glyphs" :contract-id="contract.id" />

            <!-- N.WD1 §4.D1.2 — THE 4-RUNG READINESS LADDER. The HOST branches (plates do not): the
                 hub's pure readiness fold picks the rung, and `isEmpty()` is read ONLY at the `figure`/
                 `empty` split (the composition law — a mid-load `rows:[]` reads as `loading`, never a
                 flashed void). No hub ⇒ the legacy `empty`/`figure` split, unchanged. -->
            <!-- O-LIB-CARRY (O-D24 find) — THE LOADING/ERROR/EMPTY SLOT PASSTHROUGH. Before this the
                 ladder rendered `PlateSkeleton`/`PlateVoid` with ZERO passthrough for a route's own
                 in-metaphor content, so a consumer needing bespoke loading/void copy or a bespoke
                 ghost had to compose the primitives directly in-route instead of riding this generic
                 ladder (the O-D24 vft fault-beat's documented gap). Each `<slot>` is GATED on the
                 named slot actually being filled (`slots.loading`/`.error`/`.empty`) — an unfilled
                 slot renders NO node at all, so `PlateSkeleton`'s `$slots.caption` check (and
                 `PlateVoid`'s own `$slots.default` ghost gate) see a genuinely absent slot, not an
                 empty-but-present one; every existing consumer of VizPlate stays byte-identical. -->
            <PlateSkeleton v-if="platePhase === 'loading'" :label="contract.title">
                <template v-if="slots.loading" #caption>
                    <slot name="loading" :contract-id="contract.id" />
                </template>
            </PlateSkeleton>
            <!-- O-D16 — the error rung rides the SAME `PlateVoid` family as `empty` (retiring
                 `PlateError` from the LADDER only; it still stands as ChartFrame's own
                 onErrorCaptured exception-boundary card, a separate job). Every pre-O-D16 route
                 keeps its default copy (label = title, a generic "could not be drawn" caption,
                 a "Try again" retry) unless it declares a bespoke `errorLabel`/`errorReason`/
                 `retryLabel`. -->
            <PlateVoid
                v-else-if="platePhase === 'error'"
                :label="contract.errorLabel ?? contract.title"
                :caption="contract.errorReason ?? 'This figure could not be drawn.'"
                :action="errorAction"
            >
                <slot v-if="slots.error" name="error" :contract-id="contract.id" />
            </PlateVoid>
            <PlateVoid
                v-else-if="platePhase === 'empty'"
                :label="contract.voidLabel ?? contract.title"
                :caption="contract.voidReason"
            >
                <slot v-if="slots.empty" name="empty" :contract-id="contract.id" />
            </PlateVoid>
            <!-- THE FIGURE (ready). When a `nav` is declared it is the OPERATING tab stop
                 (role=application, opt-in — SR-mode-changing, so opt-in only; the reading path role=img
                 on the inner host is untouched). The aria-live region serializes the SAME readout the
                 HoverCard renders; the focus rim seats the platform overlay ring at the focused mark. -->
            <div
                v-else
                class="viz-plate__body"
                :data-viz-body="contract.id"
                :tabindex="hasNav ? 0 : undefined"
                :role="hasNav ? 'application' : undefined"
                :aria-roledescription="hasNav ? 'interactive chart' : undefined"
                :aria-label="hasNav ? ariaLabel : undefined"
                @keydown="onFigureKey"
            >
                <slot :fullscreen="fullscreen" />
                <div v-if="hasNav" aria-live="polite" class="sr-only" data-testid="viz-aria-live">
                    {{ liveSentence }}
                </div>
                <div
                    v-if="hasNav && focusRim.visible"
                    class="viz-plate__focus-rim"
                    aria-hidden="true"
                    data-testid="viz-focus-rim"
                    :style="{ left: `${focusRim.x}px`, top: `${focusRim.y}px` }"
                />
            </div>

            <!-- UX-S2 — THE FOCUSED KEY-STAT BAND. While a selection is FOCUSED (primaryKey set)
                 and the active beat resolves a stat for THAT entity, the rung shows the focused
                 entity's value BESIDE the fleet aggregate below — "<entity>: X · fleet: Y", read
                 through the I5 useSelectionStat registry. Factual numbers only (D1/D6). Absent when
                 no primary is focused or no resolver answers (the fleet strip stands alone). -->
            <dl
                v-if="platePhase === 'figure' && focusedStat"
                class="viz-plate__focus-stat"
                data-testid="viz-focus-stat"
            >
                <dt class="viz-plate__focus-label">{{ focusedStat.label }}</dt>
                <div
                    v-for="(f, i) in focusedStat.facts"
                    :key="i"
                    class="viz-plate__focus-fact"
                >
                    <span class="viz-plate__focus-fact-label">{{ f.label }}</span>
                    <dd class="viz-plate__focus-fact-value">{{ f.value }}</dd>
                </div>
            </dl>

            <!-- THE EXPORT / a11y PAYLOAD (E3, one source) — the off-screen ChartDataTable IS the
                 CSV payload AND the screen-reader data table. Mounted here so the rows travel with
                 the plate into expand + export. -->
            <ChartDataTable
                :rows="contract.export.rows()"
                :caption="contract.title"
                :row-header="contract.export.rowHeader"
                :value-header="contract.export.valueHeader"
            />

            <aside
                v-if="!suppressFoot && sourceDataOpen"
                class="viz-plate__source-data"
                :aria-label="`${contract.title} source data browser`"
            >
                <button
                    type="button"
                    class="viz-plate__source-close"
                    @click="closeSourceData"
                >
                    Close source data
                </button>
                <component
                    :is="sourceData"
                    :event-hub="sourceEventHub"
                    :viz-id="contract.id"
                    :event-scope="{ grain: 'viz', vizId: contract.id }"
                />
            </aside>

            <!-- J-FRAME · FACET 4 (BOTTOM) — the host-read seam BELOW the grid (the outside-the-
                 viz placement). `aggregateStats` (bottom) → J-STORY's top/bottom-alternating
                 outside-the-grid placement. The host READS the declaration and ROUTES it to its
                 owning wave via a scoped slot — J-FRAME renders NOTHING. Absent when undeclared. -->
            <slot
                v-if="!storyCard && aggregateStats.length"
                name="aggregate-stats"
                :stats="aggregateStats"
                placement="bottom"
                :contract-id="contract.id"
            />

            <!-- The fixed foot keeps the factual crown and the appendix as separate seats. The
                 existing provenance and #foot fills move intact inside the collapsed dock, so the
                 crown never disappears merely because source detail is available. -->
            <div
                v-if="!suppressFoot && (keyStats.length || provenance || slots.foot)"
                class="viz-plate__foot"
                data-testid="viz-plate-foot"
            >
                <VizKeyStats
                    v-if="keyStats.length"
                    class="viz-plate__keystats"
                    :stats="keyStats"
                />
                <VizAppendixDock
                    v-if="provenance || slots.foot"
                    class="viz-plate__appendix"
                    peek-label="Source"
                >
                    <template #peek>{{ provenance?.dataset ?? contract.title }}</template>
                    <slot
                        v-if="provenance"
                        name="provenance"
                        :provenance="provenance"
                        :contract-id="contract.id"
                    />
                    <slot name="foot" :contract-id="contract.id" />
                </VizAppendixDock>
            </div>
        </template>
    </ChartFrame>
</template>

<style scoped src="./VizPlate.css"></style>
