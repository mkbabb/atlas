<script setup lang="ts">
// filter/ui/AlgebraReadout.vue — THE FILTER-VIEW GLOBAL ALGEBRA BAND (provenance-surface §3.2; the law
// "the filter algebra renders in the filter view"). A thin band at the TOP of `UnifiedFilterPanel` —
// the FULL algebra readout the reader reads once, where the dials are:
//
//   ┌─ ACTIVE FILTER ───────────────────────────────────────────────
//   │  Region: West, Sandhills · year ≥ 2020 · enrollment 500–5,000
//   │  1,214 schools match · [clear all]
//   └───────────────────────────────────────────────────────────────
//
// It reads the GLOBAL algebra (`selection.resolved()` — NO client arg, so no leave-one-out; every
// active clause shows) via `humanizePredicate` — the SAME formatter the Bar/Chip use, differing ONLY
// by the client the caller passed to the coordinator [§3.4: one algebra, three non-redundant surfaces].
//
// SELF-GATES ABSENT on the identity predicate (§3.2): an unfiltered panel shows the dials only, no
// phantom "no filters" line (N1 no-dead-affordance). `[clear all]` writes the route's existing clear
// path (the caller's `onClearAll`) — this band owns NO state.
//
// The band takes the GLOBAL predicate + the route dictionary as PROPS (the panel reads them off an
// injected route algebra source, forward-ready: a route that wires its coordinator's global resolved
// predicate lights the band; a route that binds none renders nothing). PURE presentation.
import { computed } from "vue";
import { isIdentity, type Predicate } from "@/filter/engine/predicate";
import {
    humanizePredicate,
    IDENTITY_DIM_LABELS,
    type DimLabels,
} from "@/platform/provenance/predicate-prose";
import type { AggregationLevel } from "@/platform/provenance/provenance-contract";

const {
    predicate = null,
    labels = IDENTITY_DIM_LABELS,
    count = null,
    grainNoun = "items",
    aggregation = null,
} = defineProps<{
    /** the GLOBAL resolved predicate (`selection.resolved()()` — no client arg). `null`/identity ⇒
        the band self-gates absent. */
    predicate?: Predicate<unknown> | null;
    /** the route dim/value dictionary (identity when a route authored none). */
    labels?: DimLabels;
    /** the count of members surviving the global filter; `null` when uncounted. */
    count?: number | null;
    /** the route-declared grain noun ("districts" / "schools" / …). */
    grainNoun?: string;
    /** [O-A9b · ANSWERS Q43] the CURRENT aggregation level (O-A9b's resolver populates); `null` when
        un-aggregated. The band prints it as a SCOPE line that RE-RENDERS as the view narrows. */
    aggregation?: AggregationLevel | null;
}>();

const emit = defineEmits<{ (e: "clear-all"): void }>();

/** ACTIVE only when a non-identity clause is live (self-gate, §3.2). */
const active = computed<boolean>(() => !isIdentity(predicate));
/** The GLOBAL humanized clauses (every active clause — no leave-one-out). */
const phrases = computed<string[]>(() =>
    active.value ? humanizePredicate(predicate, labels) : [],
);
/** [O-A9b] the SCOPE grains ("FY2016–2026 · all states · pooled") — re-derives as the level
    re-resolves (the Q43 migration). `[]` when un-aggregated. */
const scopeParts = computed<string[]>(() => {
    const a = aggregation;
    if (!a) return [];
    return [a.yearGrain, a.spatialGrain, a.entityGrain, a.reduceOp].filter(
        (g): g is string => g != null,
    );
});
/** The band shows when EITHER a filter clause is live OR an aggregation scope is present. */
const shown = computed<boolean>(
    () => (active.value && phrases.value.length > 0) || scopeParts.value.length > 0,
);
</script>

<template>
    <div
        v-if="shown"
        class="algebra-readout"
        data-testid="algebra-readout"
    >
        <h3 class="algebra-readout__crest">{{ active && phrases.length ? "Active filter" : "View scope" }}</h3>
        <p v-if="active && phrases.length" class="algebra-readout__phrases">{{ phrases.join(" · ") }}</p>
        <!-- SCOPE (O-A9b · Q43) — the live aggregation level; re-renders as the view narrows. -->
        <p
            v-if="scopeParts.length"
            class="algebra-readout__scope"
            data-testid="algebra-readout-scope"
        >
            {{ scopeParts.join(" · ") }}
        </p>
        <div class="algebra-readout__foot">
            <span v-if="count != null" class="algebra-readout__count">
                {{ count.toLocaleString("en-US") }} {{ grainNoun }} match
            </span>
            <button
                type="button"
                class="algebra-readout__clear"
                data-testid="algebra-readout-clear"
                @click="emit('clear-all')"
            >
                clear all
            </button>
        </div>
    </div>
</template>

<style scoped>
/* THE FILTER-VIEW BAND — band 0 of the one panel; a recessive lockup above the dials, mono crest,
   the humanized global clauses, a count + clear-all. Theme-aware via platform tokens. */
.algebra-readout {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-block-end: 0.75rem;
    border-block-end: 1px solid color-mix(in oklab, var(--foreground), transparent 88%);
}
.algebra-readout__crest {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
.algebra-readout__phrases {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--foreground);
    text-wrap: pretty;
}
.algebra-readout__scope {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.4;
    color: var(--muted-foreground);
    text-wrap: pretty;
}
.algebra-readout__foot {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.68rem;
    color: var(--muted-foreground);
}
.algebra-readout__clear {
    appearance: none;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    color: var(--muted-foreground);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
}
.algebra-readout__clear:hover {
    color: var(--foreground);
}
</style>
