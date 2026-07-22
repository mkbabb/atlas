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
import { defineAsyncComponent, inject, onBeforeUnmount, watch } from "vue";
import { Download } from "@lucide/vue";
import { DockControl, DockTrigger } from "@mkbabb/glass-ui/dock";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@mkbabb/glass-ui/dropdown-menu";
import ChartFrame from "./ChartFrame.vue";
import VizDescription from "../legend/VizDescription.vue";
import VizKeyStats from "../legend/VizKeyStats.vue";
import ChartLegend from "../legend/ChartLegend.vue";
import ChartDataTable from "../legend/ChartDataTable.vue";
import PlateVoid from "./PlateVoid.vue";
import PlateSkeleton from "./PlateSkeleton.vue";
import VizAppendixDock from "../../platform/provenance/VizAppendixDock.vue";
import { useMembraneProvenanceSource } from "../../platform/provenance/useMembraneProvenance.js";
import { STORY_CARD_KEY } from "./story-card-context.js";
import { useVizPlate, type VizPlateProps } from "./useVizPlate.js";
import { STAGE_ANATOMY_KEY } from "../contract/scene-contract.js";

/** A-33 — the ONE generic source browser every declared `DataScope` renders through. Loaded only
    when a plate's `?browse=` aside opens, so the viewer never rides the plate's critical path. */
const SourceDataBrowser = defineAsyncComponent(
    () => import("../../filter/ui/SourceDataBrowser.vue"),
);

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
    reveal,
    aggregateStats,
    keyStats,
    provenance,
    archetype,
    sourceData,
    sourceEventHub,
    sourceDataOpen,
    sourceDataRegionId,
    openSourceData,
    closeSourceData,
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

// W-MEMBRANE (A-39 · STRAND A) — the FACET-6 re-home. When this plate is the dial viz and the dock's
// facet-6 target is live, the header CSV/image export TELEPORTS into the membrane's provenance detent
// (the dashboards' `PlateProvenance` teleports the bar beside it). Disabled ⇒ the export renders in
// place (the pre-fold header home), so nothing is stranded until this viz is projected.
const { teleport: teleportPlateChrome, targetSelector: membraneProvenanceSlot } =
    useMembraneProvenanceSource(() => props.contract.id);

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
        :aria-details="!suppressFoot && sourceDataOpen ? sourceDataRegionId : undefined"
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
             a ChartLegend at the §E5 default mode (stepped for N≥7, else continuous/inline). This is
             the HEADER seat (inline KEY column / hero side rail); the `foot` dock renders its legend
             in the body foot below (ChartFrame vacates the header/rail for it), so the template is
             gated to the inline/rail docks to keep the beneath-body seat the sole render. -->
        <template
            v-if="!suppressFoot && (legendDock === 'inline' || legendDock === 'rail') && (legend || slots.legend)"
            #legend
        >
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

        <!-- THE #actions RUNG — W-MEMBRANE (A-39) FOLD. The per-plate `VizGearDock` capsule is GONE:
             the filter-TOGGLE re-homed to the membrane's facet-7 trigger (`MembraneVizContext`), the
             ENLARGE to the facet-5 zone, and the applied-filters summary to facet-7's pip — all
             projected off the ONE dial viz, so exactly one filter+enlarge affordance paints per route
             (the membrane), never one per plate. Only the CSV/image EXPORT survives in this host, and
             only as a TELEPORT into the facet-6 provenance detent — and only when THIS plate is the
             dial viz (`teleportPlateChrome`), so the export lands in the membrane, never in the header
             seat (no in-place fallback, no per-plate duplicate). -->
        <template v-if="!suppressFoot" #actions>
            <slot name="actions" />
            <!-- THE FOLDED DOWNLOAD — ONE control, the CSV/image choice behind a DockTrigger (the two
                 export handlers `onExportCsv`/`onExportImage` re-homed onto the menu, never
                 re-authored). W-MEMBRANE (A-39 · STRAND A): rendered ONLY when this plate is the dial
                 viz and TELEPORTED into the membrane's facet-6 provenance detent — the live vnode
                 relocates, no cross-repo import, no duplicate, no header-seat render. -->
            <Teleport v-if="teleportPlateChrome" :to="membraneProvenanceSlot">
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
            </Teleport>
        </template>

        <!-- A7 (A-39) · THE PER-VIZ FILTER-DIMENSIONS HOST-READ SEAT IS STRUCK. A `#filter-dimensions`
             template stood here, addressed at a `ChartFrame` slot that was never declared and filled
             by zero consumers — it painted nothing on any path. The projected dims now render ONLY in
             the ONE membrane drawer (`UnifiedFilterPanel`, off `useFilterPanel`'s `⋃ filterDimensions`
             projection); the per-plate seat dies by construction. (Same nil-DOM strike as A-11's
             struck top-aggregate seat: the numerals POLE is `StoryCardContext.numbers`, placed by
             grid row in StoryCard.vue — no per-plate template, no DOM reorder.) -->

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
            <!-- J-FRAME · FACET 2 (`reveal` → J-SCROLL §9) — the host hands the declared facet to its
                 owning-wave renderer via a scoped slot. J-FRAME READS the declaration (the reveal
                 steps), it RESOLVES nothing: J-SCROLL orchestrates the reveal over the ONE page-clock.
                 Absent when the facet is undeclared. -->
            <slot v-if="reveal" name="reveal" :reveal="reveal" :contract-id="contract.id" />

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
                 screen-reader per-datum read. Mounted here so the rows travel with the plate into
                 expand. CD-09 (PA-9): SUPPRESSED when the plate declares a `sourceData` grid — the
                 reachable windowed SourceDataBrowser is the per-datum read then (the figure's
                 `aria-details` above points at it), so the passive O(rows) table is redundant DOM.
                 The CSV export is UNAFFECTED — it reads `contract.export.rows()` directly (never this
                 DOM), so the payload stays complete + byte-stable whether or not the table mounts. -->
            <ChartDataTable
                v-if="!sourceData"
                :rows="contract.export.rows()"
                :caption="contract.title"
                :row-header="contract.export.rowHeader"
                :value-header="contract.export.valueHeader"
            />

            <aside
                v-if="!suppressFoot && sourceDataOpen && sourceData && sourceEventHub"
                :id="sourceDataRegionId"
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
                <SourceDataBrowser
                    v-bind="sourceData"
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

            <!-- E5 · THE BENEATH-BODY LEGEND SEAT (legendDock: "foot" — the R3 beneath-the-map seat).
                 When the contract docks the legend `foot`, the host lays the `#legend` content HERE,
                 between the figure and the provenance foot below — ChartFrame has vacated the header
                 KEY column + the side rail, so a tall identity-glyph lockup (the two USF maps) reads
                 beneath the map instead of cramming the masthead. A consumer `#legend` slot wins (the
                 bespoke lockup); else the contract's LegendSpec drives a ChartLegend. -->
            <div
                v-if="!suppressFoot && legendDock === 'foot' && (legend || slots.legend)"
                class="viz-plate__foot-legend"
            >
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
            </div>

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
                <!-- DIAL 11 — the dock's control IS this plate's whisper handle, so it carries the
                     SOURCE's own name rather than the word "Appendix": a reader scanning the foot
                     learns whose data the figure reads before deciding to open anything.
                     W-56 · A-32 — and when the plate DECLARES a scope, `browse` puts the viewer one
                     click from that name. This is the front-door reversal: the download seat in the
                     header dock stays, as the secondary it always should have been. -->
                <VizAppendixDock
                    v-if="provenance || slots.foot"
                    class="viz-plate__appendix"
                    peek-label="Source"
                    :label="provenance?.dataset ?? 'Appendix'"
                    :browse="sourceData ? openSourceData : null"
                >
                    <template #peek>{{ provenance?.dataset ?? contract.title }}</template>
                    <!-- `hosted` — this dock IS the disclosure, so the bar inside opens with it
                         and grows no second handle in front of this one (W-23). -->
                    <slot
                        v-if="provenance"
                        name="provenance"
                        :provenance="provenance"
                        :contract-id="contract.id"
                        :hosted="true"
                    />
                    <slot name="foot" :contract-id="contract.id" />
                </VizAppendixDock>
            </div>
        </template>
    </ChartFrame>
</template>

<style scoped src="./VizPlate.css"></style>
