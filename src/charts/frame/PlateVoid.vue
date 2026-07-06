<script lang="ts">
// PlateVoid.vue — E8, THE DESIGNED VOID (I2.a · DESIGN §3.8 — the seam; I10 names the reasons).
//
// A blank render is UNREPRESENTABLE. When a plate's data is empty, `VizPlate` swaps the chart body
// for THIS designed void — a composed `⌀`-glyph + a named-reason card — in place of zero marks over
// a ghost, NEVER two rules with empty space between them (the §E8 broken render). The void is ONE
// primitive (generalizing the `DemandChapter` designed-void idiom to every plate, all routes); THIS
// wave opens the seam + wires the known offenders (the speedtest hex-map), I10 names the `reason`
// CONTENT (the feed-reality checks, the J2 adjudication) — so this component carries only the seam.
//
// It fills the chart body's footprint (no collapse, no CLS) so the engraved frame stays whole.
//
// THE SPEEDTEST VOID REASON CONTENT (I10.b — the population-honesty copy the I2 seam left to I10).
// The speedtest hex-map's empty / sparse-cell state is NOT an error: most self-reported tests carry
// no precise enough location to bucket into a privacy-coarse H3 cell, so only the located subset
// reaches the map. The reason names that population truth — the same honesty the hero's reconcile
// sentence renders, expressed as the empty-state copy — rather than reading as "the data is broken".
// `mapped` is the population manifest's `mapped` count (the located subset); a null/absent count
// degrades to the placeable-subset phrasing without a fabricated number.
//
// A module-level export CANNOT live in `<script setup>` (the SFC compiler rejects it); the
// `speedtestVoidReason` builder rides this plain `<script>` block so the seam-side `<script setup>`
// below stays export-free, per the Vue SFC contract.

/** Build the speedtest population-honesty void reason (I10.b). Names the located-subset truth so a
    sparse/empty hex field reads as the honest story of citizen-test geolocation, never fabricated or
    broken data. The `mapped` count is the manifest's `mapped` (the tests precise enough to place on
    the map); omit it (or pass a non-finite value) for the count-free phrasing. */
export function speedtestVoidReason(mapped?: number | null): string {
    return mapped != null && Number.isFinite(mapped)
        ? `These are the ${mapped.toLocaleString()} tests we can place on the map; most self-reported tests carry no precise location.`
        : "Most self-reported tests carry no precise location, so only the placeable subset reaches the map.";
}
</script>

<script setup lang="ts">
defineProps<{
    /** The named reason for the absence (I10 authors the per-plate copy; this is the seam). */
    reason?: string;
    /** The void's accessible label (the plate name). */
    label?: string;
}>();
</script>

<template>
    <div class="plate-void" role="status" data-testid="plate-void">
        <p class="plate-void__mark" aria-hidden="true">⌀</p>
        <p class="plate-void__title">
            {{ label ? `“${label}” has no data to draw` : "No data to draw" }}
        </p>
        <p v-if="reason" class="plate-void__reason text-prose-muted">{{ reason }}</p>
    </div>
</template>

<style scoped>
/* The void sits in the chart body's place — it fills the host so the plate keeps its reserved
   footprint (no collapse, no CLS) and the engraved frame around it is unchanged. The ⌀ glyph is
   the designed absence mark (the DemandChapter void idiom, generalized). */
.plate-void {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-block-size: 12rem;
    block-size: 100%;
    padding: 1.5rem;
    text-align: center;
}
.plate-void__mark {
    margin: 0;
    font-family: var(--font-mono);
    font-size: clamp(2.5rem, 6cqw, 4rem);
    line-height: 1;
    color: var(--muted-foreground);
    opacity: 0.5;
}
.plate-void__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.125rem;
    color: var(--foreground);
}
.plate-void__reason {
    margin: 0;
    max-inline-size: 44ch;
    font-size: 0.9375rem;
}
</style>
