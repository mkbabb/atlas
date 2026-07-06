<script setup lang="ts">
// chrome/filter/components/YearScrubber.vue (I-ARCH.AR-3) — the year-range control, the
// filter's top stratum (B4 §3, FD6 §6.3), lifted out of the FilterPanel host into a
// presentational sub-component (the §Y componentize: the host shrinks, the control is
// reusable). It is the ACHROMATIC year track + the single·aggregate mode toggle. Time is
// not a data ramp (FD6 §10.3), so the track carries no warm signature. PURE presentation:
// it takes the year domain + the active mode/year as props and emits the pick/aggregate
// intents up to the host (the host owns the `useYearScope` write). The DOM is
// BYTE-IDENTICAL to the markup the monolith host carried (the componentize moves code, not
// pixels). NOTE: I-MOBILE will later @media-re-point this control — the structure is kept
// clean (one block, one scope) for that re-point.
import { Button } from "@mkbabb/glass-ui/button";
import { StatusDot } from "@mkbabb/glass-ui/status-dot";
import type { YearMode } from "@/data/useYearScope";
import FilterRow from "./FilterRow.vue";

defineProps<{
    /** The track domain — the feed's full sorted year list. */
    years: number[];
    /** The active mode (single · aggregate) — the toggle + the pip-active gate. */
    mode: YearMode;
    /** The active year — the thumb position. */
    activeYear: number;
}>();

const emit = defineEmits<{
    /** Select a single year — the host writes `?year=` (the round-trip). */
    pick: [year: number];
    /** Toggle aggregate mode over the full span. */
    toggleAggregate: [];
}>();
</script>

<template>
    <!-- The year-scrubber — the top stratum (B4 §3, FD6 §6.3). -->
    <div
        class="cp-drawer__scrubber"
        role="group"
        aria-label="Year scope"
        data-testid="year-scrubber"
    >
        <FilterRow label="Year" class="year-scrubber__head">
            <Button
                :variant="mode === 'aggregate' ? 'accent' : 'outline'"
                size="xs"
                :aria-pressed="mode === 'aggregate'"
                data-testid="year-aggregate"
                @click="emit('toggleAggregate')"
            >
                All years
            </Button>
        </FilterRow>
        <div class="year-scrubber__track" role="radiogroup" aria-label="Year">
            <button
                v-for="y in years"
                :key="y"
                type="button"
                class="year-scrubber__pip"
                :class="{
                    'year-scrubber__pip--active':
                        mode !== 'aggregate' && y === activeYear,
                }"
                role="radio"
                :aria-checked="mode !== 'aggregate' && y === activeYear"
                :aria-label="String(y)"
                :data-testid="`year-pip-${y}`"
                @click="emit('pick', y)"
            >
                <StatusDot
                    variant="custom"
                    size="sm"
                    class="year-scrubber__pip-dot"
                    :color="
                        mode !== 'aggregate' && y === activeYear
                            ? 'var(--foreground)'
                            : 'transparent'
                    "
                />
                <span class="year-scrubber__pip-year">{{ y }}</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
/* ── The year-scrubber (B4 §3) ────────────────────────────────────────────────
   The filter's top stratum: an ACHROMATIC year track + an aggregate toggle. Time is
   not a data ramp (FD6 §10.3), so the track carries no warm signature — a precise dial
   in the muted-ink register. Vignelli-at-rest: crisp pills, no-bounce taps. */
.cp-drawer__scrubber {
    padding: 0.7rem 1rem 0.55rem;
    border-bottom: 1px solid var(--border);
}
/* The head's flex lockup is the FilterRow primitive; the scrubber only adds the spacing
   under it (the label + the agg toggle sit on the FilterRow row). */
.year-scrubber__head {
    margin-bottom: 0.45rem;
}
/* The "All years" toggle is the glass `Button` (accent when on, outline when off) — it
   OWNS its own surface/hover/focus/radius/motion. No bespoke skin remains here. */
.year-scrubber__track {
    display: flex;
    align-items: flex-end;
    gap: 0.15rem;
    padding-block-start: 0.25rem;
}
.year-scrubber__pip {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--muted-foreground);
    transition: color var(--transition-control);
}
/* The year pip rides the consumed glass-ui <StatusDot variant="custom"> — it OWNS the circle
   shape + size + the filled-on-active presence (the `:color` flips transparent→ink on active).
   The thin consumer override below adds ONLY the at-rest hollow ring + the active scale the
   `custom` variant does not carry (J-ABSORB §approach-1, open-Q-1: the dot SHAPE is consumed,
   the at-rest ring + scale a one-rule override). */
.year-scrubber__pip-dot :deep(.status-dot__dot) {
    border: 1px solid color-mix(in srgb, var(--muted-foreground) 55%, transparent);
    transition:
        background-color var(--transition-control),
        border-color var(--transition-control),
        scale var(--transition-control);
}
.year-scrubber__pip-year {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.01em;
    opacity: 0.7;
}
.year-scrubber__pip:hover {
    color: var(--foreground);
}
.year-scrubber__pip:hover .year-scrubber__pip-dot :deep(.status-dot__dot) {
    border-color: var(--foreground);
}
/* The active year — the thumb. The dot fills with ink (achromatic), scaled up a touch;
   no bounce (the no-bounce-tap law, FD6 §9). */
.year-scrubber__pip--active {
    color: var(--foreground);
}
.year-scrubber__pip--active .year-scrubber__pip-dot :deep(.status-dot__dot) {
    border-color: var(--foreground);
    scale: 1.15;
}
.year-scrubber__pip--active .year-scrubber__pip-year {
    opacity: 1;
    font-weight: 600;
}
.year-scrubber__pip:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
    border-radius: var(--radius-mark);
}
@media (prefers-reduced-motion: reduce) {
    .year-scrubber__pip-dot :deep(.status-dot__dot) {
        transition: none;
    }
}
</style>
