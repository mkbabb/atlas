<script setup lang="ts">
// editorial/RecordSeam.vue — THE EDGE-OF-RECORD SEAM (A-02 · the P-03 lift wave).
//
// The boundary between what was FILED and what was not: the last whole year of the record, the
// forecast that begins past it, the designed void where a report was never published. Three
// dashboards hand-rolled the same device in three voices — demand's "FY2025 · the record as filed"
// (`DemandRidge.vue:283-296` + `:464-544`), demand's "FY2026 · forecast →" (`ContractCliff.vue`),
// usf's 2021 void (`05-decade/Point.vue`) — and demand's hallmark named it "the route's signature
// honesty device … PROPAGATE atlas-wide". This is that device, once, in ONE voice. Each adopting
// touch DELETES its hand-rolled twin.
//
// VERTICAL-ONLY (the α-M-6 strike). All three live seams part the TIME axis, and a horizontal
// variant had no declarer — so there is no `axis` face to choose wrongly. The seam is a vertical
// rule spanning its host plot's block axis; the host is the positioned ancestor.
//
// `record` NAMES WHICH SIDE HOLDS THE FILED RECORD — the whole honesty of the device:
//   · `before` — the record lies BEFORE the seam; what follows is unfiled (a forecast, a projection).
//                The tag anchors in the filed territory and its `→` points INTO the unfiled.
//   · `after`  — the record RESUMES after the seam; what precedes is the gap (a designed void, an
//                unpublished year). The tag anchors forward and its `←` points BACK into the void.
// There is no third value: a seam that cannot say which side is filed is not an honesty device.
//
// THE ONE VOICE: a 2px dashed rule in the diverging warm pole with a Fira tracked-caps tag — the
// SAME pole `trajectory-marks.dropRule` gives its in-canvas boundary, so an HTML plate's seam and a
// canvas plate's drop-rule read as one mark vocabulary across the atlas.
//
// THE REVEAL CLOCK — SCROLL, off the SAME cover scalar the CrownFigure reads (`useCoverProgress`):
// the seam draws in as its beat arrives, so a route can order it FIRST and the reader meets the
// fact/forecast boundary before the marks it parts. OPACITY ONLY (`liftEm: 0` — a rule at a fixed x
// must not translate off it; the emitted `translateY(0)` is an inert no-op). PRM: the scalar pins to
// 1 and the seam mounts drawn — the guard is the SUBSTRATE's, never a per-component fence.
//
// a11y: `aria-hidden` — the seam is a VISIBLE text channel (it names itself in words, so it survives
// forced-colors, where a dashed hairline does not), while the boundary is announced ONCE by the
// consuming plot's own accessible name. That is the convention at both live sites; a second read
// from the seam would only double it.
import { computed, ref } from "vue";
import { revealHostStyle } from "../motion/reveal-register.js";
import { useCoverProgress } from "../motion/useCoverProgress.js";

const props = withDefaults(
    defineProps<{
        /** The seam's own words — the boundary NAMED ("FY2025 · the record as filed",
            "FY2026 · forecast", "2021 · no Monitoring Report"). Required: an unnamed rule is a
            hairline, not an honesty device. */
        label: string;
        /** Which side of the seam holds the FILED record (see the header — it decides the tag's
            anchor and the direction glyph). */
        record: "before" | "after";
        /** The seam's inline position within its host plot, as a CSS length-percentage measured
            from the inline START (the x the boundary sits at). Omit ⇒ the plot's trailing edge (the
            last filed point — demand's ridge seam). */
        at?: string;
    }>(),
    { at: undefined },
);

const host = ref<HTMLElement | null>(null);
const { t } = useCoverProgress(host);

/** The draw-in (opacity only) + the seam's inline seat. */
const seamStyle = computed<Record<string, string>>(() => ({
    ...revealHostStyle(t.value, { liftEm: 0 }),
    ...(props.at != null
        ? { insetInlineStart: props.at, insetInlineEnd: "auto" }
        : {}),
}));

/** The glyph points INTO the unfiled side — forward past a filed record, back into a void. */
const glyph = computed(() => (props.record === "before" ? "→" : "←"));
</script>

<template>
    <span
        ref="host"
        class="record-seam"
        :class="`record-seam--${record}`"
        :style="seamStyle"
        :data-record="record"
        data-testid="record-seam"
        aria-hidden="true"
    >
        <span class="record-seam__rule" />
        <!-- The glyph leads or trails so it always points AWAY from the words, into the unfiled. -->
        <span class="record-seam__tag"
            ><template v-if="record === 'before'">{{ label }}&#8194;{{ glyph }}</template
            ><template v-else>{{ glyph }}&#8194;{{ label }}</template></span
        >
    </span>
</template>

<style scoped>
/* THE EDGE-OF-RECORD SEAM — a vertical rule spanning the host plot's block axis, tagged in words.
   The host is the positioned ancestor; the seam never participates in its layout and never takes a
   pointer event (it parts the marks, it does not compete with them). */
.record-seam {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    display: flex;
    flex-direction: column;
    pointer-events: none;
    z-index: 1;
}
.record-seam__rule {
    inline-size: 0;
    block-size: 100%;
    border-inline-end: 2px dashed var(--viz-diverging-low);
}
/* The tag rides at the rule's head, anchored on the FILED side so it never overhangs the territory
   it declares unfiled. It carries its own paper so a mark passing beneath cannot muddy the words. */
.record-seam__tag {
    position: absolute;
    inset-block-start: -0.2rem;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--ink-diverging-low);
    background: var(--card);
    padding-inline: 0.25rem;
}
.record-seam--before .record-seam__tag {
    inset-inline-end: 0;
    text-align: end;
}
.record-seam--after .record-seam__tag {
    inset-inline-start: 0;
    text-align: start;
}
</style>
