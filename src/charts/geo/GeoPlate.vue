<script setup lang="ts">
// platform/charts/GeoPlate.vue (J-ARCH §2 — THE GEO FAMILY ENGINE) — the shared geo host
// scaffold the five geo plates mirrored inline, generalized into ONE engine (the sibling of
// platform/charts/ScatterPlate.vue). Where I-ARCH's `useXOption` composables
// (`useChoroplethOption`/`useSchoolMapOption`/`useHexMapOption`) lifted the OPTION assembly out
// of each plate, this lifts the HOST scaffold the option extraction left mirrored FIVE times:
//
//   • the `<VizPlate :contract>` host wiring (the I2 contract → ChartFrame furniture),
//   • the `mapHost` ref + the `.relative` `[data-key]` query root (the D1.2 datum-anchor frame),
//   • the ANCHOR measurement (`querySelector([data-key])`→`getBoundingClientRect`→top-centre) —
//     the byte-identical block all five plates inlined (DistrictChoropleth:262-269,
//     NetRetentionMap:173-180, NormalizationFlip:229-236, HexMapPlate:194-201, SchoolMap:344-351),
//   • the `useHoverReadout` PUBLISH/CLEAR watch (the owner-gated `publish(builder(e,a))` /
//     `clear(origin)` on the [hovered-entity, anchor] change — DistrictChoropleth:311-321,
//     NetRetentionMap:232-248, NormalizationFlip:252-268, HexMapPlate:207-227, SchoolMap:415-425),
//   • the `useSharedColorMode`→settle-epoch→scale-rebuild SEAM (the `void mode.value` poke FOLDED:
//     the engine owns ONE settle-epoch subscription via `useVizPalette`'s live `onFlipSettled` wire,
//     so the 3 geo `void mode.value` pokes — DistrictChoropleth:125, NetRetentionMap:95,
//     NormalizationFlip:139 — EVAPORATE; each plate reads the `paletteEpoch` the engine exposes).
//
// The GEO LAYER itself (GeoChoropleth / GeoPointLayer) + its SelectionRegion + its legend stay
// CONSUMER SLOTS: their per-plate prop surfaces (the fill resolver, the raised/dimmed/selected
// sets, the kbd ring, the keyField/nameField, the rank, the backdrop, the value channels) are
// irreducibly distinct across the five plates, so forcing them into engine props would re-grow the
// host into a render-mode switch (the J-ARCH §openQ-2 fallback the re-verified imports REJECT — the
// host is shared, the layer is the only fork). The slot keeps each plate's geo markup BYTE-IDENTICAL
// (the cardinal regression proof: a refactor moves code, not pixels) while the mirrored scaffold
// collapses ONCE into the engine.
//
// `kind` ("choropleth" | "point") is carried for the family roster + the contract `render:"geo"`
// invariant; the inner layer is rendered by the consumer slot (the host scaffold is identical across
// both kinds — the §openQ-2 resolution: ONE GeoPlate with a `kind` discriminator, not two siblings).
import { computed, ref, watch } from "vue";
import VizPlate from "@/charts/frame/VizPlate.vue";
import type { VizContract } from "@/charts/contract/viz-contract";
import type { ProvenanceFacet } from "@/platform/provenance/provenance-contract";
import { useHoverReadout, type HoverReadout } from "@/platform/stores/useHoverReadout";
import { useGeoPaletteEpoch } from "@/charts/composables/useGeoPaletteEpoch";

/** The settled datum anchor in VIEWPORT space (the mark's bbox top-centre). */
export interface GeoAnchor {
    x: number;
    y: number;
}

const props = withDefaults(
    defineProps<{
        /** The I2 VizContract the plate declares (the host furniture source). */
        contract: VizContract;
        /**
         * The geo-layer family kind. `choropleth` (GeoChoropleth — the four state/county/hex plates)
         * vs `point` (GeoPointLayer — the SchoolMap dot field). The host scaffold is IDENTICAL across
         * both; this is carried for the family roster + the `render:"geo"` invariant, the inner layer
         * is the consumer slot's (the §openQ-2 resolution).
         */
        kind?: "choropleth" | "point";
        /**
         * The HOVERED entity the readout publishes for (the per-plate "settled hovered datum" — the
         * choropleth cell, the USF row's facts, the school dot), or null at rest. The engine watches
         * `[hoveredEntity, anchor]` and publishes `readoutFor(entity, anchor)` (owner-gated), clearing
         * on null. When omitted, the engine mounts NO publish watch (a plate that publishes its own).
         */
        hoveredEntity?: unknown;
        /**
         * The SETTLED ANCHOR KEY of the hovered datum (its `data-key`) — the engine reads the rendered
         * `[data-key]` rect through `mapHost` to the top-centre anchor. Omit ⇒ the engine does not
         * measure (the plate anchors itself).
         */
        anchorKey?: string | null;
        /**
         * Build the readout payload for the hovered entity at its measured viewport anchor — the shared
         * publish projection (the plate's `usfStateReadout` / `ecfEntityReadout` / `sciEntityReadout`
         * call). Required when `hoveredEntity` is provided.
         */
        readoutFor?: (entity: never, anchor: GeoAnchor) => HoverReadout;
        /**
         * The owner-gate ORIGIN the engine CLEARS the card under (the stable per-publisher string the
         * `useHoverReadout` ownership guard keys on). Defaults to `contract.id`; a plate whose readout
         * payload carries a different `origin` than its viz id (NormalizationFlip's `usf-normalization`
         * ≠ `usf-normflip`) passes it explicitly so the publish + clear key on the SAME origin.
         */
        origin?: string;
        /**
         * The `mapHost` div's class — each plate's host carries its own SVG-sizing recipe
         * (`choro-host chart-h-lg relative` / `hex-host chart-h-lg relative` / plain `relative`), so
         * the host class is the plate's (the `.relative` query-root contract is always present).
         */
        hostClass?: string;
        /**
         * The `mapHost` div's INNER attributes (the plate's host `data-testid` / `data-resolution` —
         * DistrictChoropleth's `ecf-choro-host`, HexMapPlate's `speedtest-hex-host` + `data-resolution`)
         * that lived on the inner host div in the original template. Plate-level fallthrough attrs (e.g.
         * NormalizationFlip's root `data-testid="usf-normalization"`) flow to VizPlate's root as before
         * (default attr inheritance), so the plate-root + host-div testids land EXACTLY where they did.
         */
        hostAttrs?: Record<string, unknown>;
    }>(),
    {
        kind: "choropleth",
        hostClass: "relative",
    },
);

// ── THE SETTLE-EPOCH SEAM (J-ARCH §2/§4 — the `void mode.value` poke FOLDED) ───────────────────
// The engine owns ONE settle-epoch subscription via `useGeoPaletteEpoch` — the live `onFlipSettled`
// settle wire (`useVizPalette`, useVizPalette.ts:285-318) bumps it on the post-paint settle beat. The
// `paletteEpoch` is exposed via the layer slot scope; each plate's scale/option builder reads it (via
// the SAME composable in its script — the slot scope cannot reach a script-level computed) in place of
// the deleted `void mode.value` poke, so the theme-flip re-tint fires ONCE in the engine's settle seam,
// not five times inline. The poke was the SYMPTOM of each plate re-threading the host scale-rebuild
// inline; the engine owning the subscription IS its removal.
const paletteEpoch = useGeoPaletteEpoch();

// ── THE DATUM-ANCHOR FRAME (D1.2 — the mapHost `[data-key]` query root) ────────────────────────
// The ONE `.relative` host whose rendered `[data-key]` mark rects the card anchors to. The consumer
// renders its geo layer (+ SelectionRegion) INTO this host via the `#layer` slot; the engine measures
// the anchor off the SAME host (one query root, one coordinate frame). The anchor is the mark's bbox
// top-centre in viewport space — the byte-identical block all five plates inlined, now lifted once.
const mapHost = ref<HTMLElement | null>(null);

/** Measure a datum's bbox top-centre in viewport space (the settled anchor) — the SAME geometry the
    five plates inlined. Returns the `{0,0}` floor when the key is null or the rect is unresolved (the
    HoverReadout store nulls the unmeasured floor, so a card paints ONLY beside a real datum). */
function anchorFor(key: string | null | undefined): GeoAnchor {
    if (!key || !mapHost.value) return { x: 0, y: 0 };
    const el = mapHost.value.querySelector<SVGGraphicsElement>(`[data-key="${key}"]`);
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top }; // top-centre of the mark, viewport space
}

/** The reactive anchor of the engine-published hovered datum (off `anchorKey`). */
const anchor = computed<GeoAnchor>(() => anchorFor(props.anchorKey));

// ── THE READOUT PUBLISH WATCH (D1.2 / the owner-gated publish — lifted once) ────────────────────
// The engine watches `[hoveredEntity, anchor]` and PUBLISHES the plate's readout projection (owner-
// gated by the store's `origin` guard), CLEARING on null. The per-plate readout BUILDER stays the
// plate's (`readoutFor`), so the rich card content is byte-unchanged; the engine owns only the
// publish/clear LIFECYCLE the five plates mirrored. Mounted ONLY when the plate hands an entity +
// builder (HexMap/SchoolMap publish their own richer flows; they pass the builder all the same).
const readout = useHoverReadout();
const origin = computed<string>(() => props.origin ?? props.contract.id);
watch(
    [() => props.hoveredEntity, anchor] as const,
    ([entity, a]) => {
        if (props.readoutFor == null) return; // the plate publishes itself — no engine watch
        if (entity == null) {
            readout.clear(origin.value);
            return;
        }
        readout.publish(props.readoutFor(entity as never, a));
    },
    { immediate: true },
);

// EXPOSE the host ref + the anchor helper so a plate's SCRIPT-level pin/keyboard paths (which run
// synchronously on a user event, outside the slot scope) measure the datum anchor off the SAME query
// root the engine watches — one host, one coordinate frame (the byte-identical pin anchor).
defineExpose({ mapHost, anchorFor });

// The slot scope the consumer's `#layer` slot consumes: the host ref, the anchor helper (for the
// plate's own pin/keyboard anchors), the live anchor, and the folded `paletteEpoch`.
defineSlots<{
    /** The geo layer + its SelectionRegion — rendered into the engine's `mapHost` query root. The
        scope hands the anchor helper (the plate's own pin/keyboard anchors), the live anchor, and the
        folded `paletteEpoch` (the consumer may key its scale on it from the slot if it prefers). */
    layer(props: {
        anchorFor: (key: string | null | undefined) => GeoAnchor;
        anchor: GeoAnchor;
        paletteEpoch: number;
    }): unknown;
    /** The plate's bespoke legend (passed straight through to VizPlate's `#legend`). */
    legend(): unknown;
    /** The plate's title rung override (passed straight through to VizPlate's `#title`). */
    title(): unknown;
    /** The `#provenance` facet slot (J-VOICE's source lockup) — forwarded straight through to
        VizPlate's `#provenance` WITH its scope so a GEO plate paints the provenance bar via the SAME
        slot a VizPlate plate does. Without this, the five geo plates (ecf DistrictChoropleth, sci
        SchoolMap, speedtest HexMapPlate, usf NetRetentionMap, usf-integrity WfaMap) could not fill
        the bar through the slot — the /speedtest GeoPlate-only route painted no bar (the O-A9 residue). */
    provenance(props: { provenance: ProvenanceFacet; contractId: string }): unknown;
    /** Pre-host content (a status label / a control row) — a SIBLING of the host div inside the viz
        body, rendered BEFORE the layer (the NormalizationFlip status label's exact DOM position). */
    prelude(): unknown;
    /** Plate-footer prose (the grain footnote / privacy note) — rendered after the layer. */
    footer(): unknown;
    /** The #actions rung passthrough (rarely used by geo plates). */
    actions(): unknown;
}>();
</script>

<template>
    <!-- The shared geo host: VizPlate composes the I2 contract furniture (the frame / E1 dek / B4
         key-stats / E2 options / E3 export / E5 legend-dock); the consumer renders its geo LAYER into
         the engine's `mapHost` query root (the `#layer` slot, scoped with the anchor helper + the
         folded `paletteEpoch`). The legend / title / footer pass straight through. The geo BODY stays
         byte-identical — the engine owns only the mirrored scaffold (the host wiring, the anchor
         measurement, the readout publish, the settle-epoch seam). -->
    <VizPlate :contract="contract">
        <template v-if="$slots.title" #title><slot name="title" /></template>
        <template v-if="$slots.legend" #legend><slot name="legend" /></template>
        <template v-if="$slots.actions" #actions><slot name="actions" /></template>
        <!-- Forward the #provenance facet slot WITH its scope (the O-A9 residue close). VizPlate
             invokes it ONLY when the contract declares a provenance facet; a geo plate now paints the
             J-VOICE source bar through the SAME slot a VizPlate plate does. -->
        <template v-if="$slots.provenance" #provenance="slotProps">
            <slot name="provenance" v-bind="slotProps" />
        </template>

        <!-- Pre-host content (a status label / control row) — a SIBLING of the host div, the exact
             DOM position the NormalizationFlip status label held inside the viz body. -->
        <slot name="prelude" />

        <!-- `mapHost` is the D1.2 datum-anchor query root (the `[data-key]` mark rects). The consumer
             renders its GeoChoropleth/GeoPointLayer (+ SelectionRegion) here with its full per-plate
             props — byte-identical markup. -->
        <div ref="mapHost" :class="hostClass" v-bind="hostAttrs ?? {}">
            <slot
                name="layer"
                :anchor-for="anchorFor"
                :anchor="anchor"
                :palette-epoch="paletteEpoch"
            />
        </div>
        <!-- D1.2 — NO per-viz HoverCard mount. The platform owns the ONE card; the engine PUBLISHES
             the readout payload (the `readoutFor` watch) to `useHoverReadout`. -->
        <slot name="footer" />
    </VizPlate>
</template>
