<script setup lang="ts">
// chrome/filter/components/FilterRow.vue (I-ARCH.AR-3) — the ONE labeled filter ROW: a
// `label` lockup beside a `control` slot, the repeated grammar the FilterPanel drawer
// hand-rolled per stratum (the year-scrubber head, and the future per-control rows
// I-MOBILE re-points). The §Y componentize: the row grammar is a single reusable unit, so
// a new control declares `<FilterRow label="…"><control/></FilterRow>` rather than
// re-spelling the head flex + the mono-uppercase label each time. PURE presentation — the
// label is a string, the control is the default slot; the row owns no logic. The markup is
// byte-identical to the inline `__head`/`__label` grammar it replaces.
defineProps<{
    /** The row's label (the mono-uppercase lockup at the lead). */
    label: string;
}>();
</script>

<template>
    <div class="filter-row">
        <span class="filter-row__label">{{ label }}</span>
        <slot />
    </div>
</template>

<style scoped>
/* THE FILTER ROW — a labeled `label + control` lockup, the repeated drawer-stratum
   grammar (B4 §3): the mono-uppercase label lead beside its control (the slot), the control
   pushed to the row's trailing edge by `space-between`. ACHROMATIC (the filter is a dial,
   not a data ramp). The slot is a DIRECT flex child (no wrapper) so the row's geometry is
   byte-identical to the inline `__head`/`__label` grammar it replaces. */
.filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.filter-row__label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted-foreground);
}
</style>
