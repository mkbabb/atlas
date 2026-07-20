<script setup lang="ts">
// VizKeyStats.vue — B4, THE KEY-STAT STRIP (I2.a · DESIGN §2.2.5 / §3.7).
//
// Five-of-seven SCI vizes and most USF plates carry NO figure of their own. The host surfaces 2–3
// key stats per viz — the per-viz thesis as a NUMBER, colour-matched to the data, read from the
// SAME store reducers the chart reads (one source of truth, via the contract's `keyStats()` thunk).
//
// Each stat routes through the cap-box FigureSlug (DESIGN §3.1) so no number shears; the figure ink
// is tinted to its data hue via a CSS custom-property NAME from the contract (never a hex —
// i0-colorkind-law). The ONE superlative per view (`record: true`) wears the record pill (the
// scarcity law). The strip is the natural third figure-family member (hero=3 · cluster=lead+
// supports · pull=1) seated in the contract.
//
// It COMPOSES FigureSlug (the cap-boxed audacious register) — never re-rolling a number layout.
import { computed } from "vue";
import FigureSlug from "../frame/FigureSlug.vue";
import type { KeyStat } from "../contract/viz-contract.js";
import { inkFromAccent } from "../../design/tokens/ink.js";

const props = defineProps<{
    /** The contract's key stats (off the store reducers — 2–3 per viz). */
    stats: KeyStat[];
}>();

/** At most ONE record (gold-scarcity) — defensively keep only the FIRST `record: true`. */
const stats = computed<KeyStat[]>(() => {
    let recordSeen = false;
    return props.stats.map((s) => {
        if (s.record && !recordSeen) {
            recordSeen = true;
            return s;
        }
        return s.record ? { ...s, record: false } : s;
    });
});
</script>

<template>
    <!-- The key-stat cluster — the per-viz thesis as numbers. The `key-stat` class is the
         i0-perviz-keystat gate's header/footer-stat selector (present on every plate). -->
    <dl v-if="stats.length" class="viz-key-stats" data-testid="viz-key-stats">
        <div
            v-for="(s, i) in stats"
            :key="i"
            class="key-stat"
            :class="{ 'key-stat--record': s.record }"
        >
            <dd class="key-stat__value">
                <FigureSlug
                    size="card"
                    :sign="s.sign"
                    :unit="s.unit"
                    :style="s.colorVar ? { color: inkFromAccent(`var(${s.colorVar})`) } : undefined"
                    >{{ s.value }}</FigureSlug
                >
            </dd>
            <dt class="key-stat__caption">{{ s.caption }}</dt>
        </div>
    </dl>
</template>

<style scoped>
/* The cluster is a compact figure-family row at the plate footer/header — recessive captions,
   the figures at the card rung (the cap-boxed FigureSlug). Wraps gracefully at the narrow flank. */
.viz-key-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem 2rem;
    margin: 0;
    padding: 0;
}
.key-stat {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-inline-size: 0;
}
.key-stat__value {
    margin: 0;
    /* the value rides at --attn-data (the chart-mark weight); the tint is the contract's data hue. */
    opacity: var(--attn-data, 0.92);
}
.key-stat__caption {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
/* THE RECORD PILL (DESIGN §2.2.5 — the scarcity superlative, exactly one per view). A 1px tooled
   NEUTRAL rim + a faint ≤8% wash, NEVER opaque; the amount inks the record. The RC-7 three-way
   split, read straight off the retired gold quad: the RIM was never gilt (`--gold-rim` was authored
   nowhere, so its DESIGNED neutral fallback is what shipped — it is now simply AUTHORED, and the
   pixels do not move); the WASH is alive and stays at 8%, now off the route's own record ink
   instead of a phantom brass; the VALUE inks `--emphasis-record`. */
.key-stat--record {
    padding: 0.35rem 0.6rem;
    border: 1px solid color-mix(in oklab, var(--foreground), transparent 70%);
    border-radius: var(--radius-plate-control);
    background: color-mix(in oklab, var(--emphasis-record) 8%, transparent);
}
.key-stat--record .key-stat__value {
    color: var(--emphasis-record);
}
</style>
