<script setup lang="ts">
// DockSectionCell — the phone bar's Sections cell, seated from first paint (U/B8 P-12).
//
// The cell was the async section Select itself, so it joined the bar only when its chunk had arrived
// and the body had registered its sections: about 2.9 s into a phone load. The bar is centred and
// `fit-content`, so the 7.5 rem cell's arrival slid the whole bar sideways (0.0168 of /bead's 0.0207
// CLS). The cell is now a seat (DockSelectSeat): its face holds the slot, at its final width, from the
// bar's first frame, and prints the active section once the body has registered one. Pressing it
// loads and opens the live Select in the face's place. The reservation is the cell's own, never a
// wrapper around it, so it stays a seat of the bar's toolbar run.
import { computed } from "vue";
import DockSelectSeat from "./DockSelectSeat.vue";
import type { UseDockStepper } from "../composables/useDockStepper.js";

defineOptions({ inheritAttrs: false });

const { stepper, returnFocus = true } = defineProps<{
    /** The dock's stepper: the beats, the active one, and the section jump. */
    stepper: UseDockStepper;
    /** Focus goes back to the trigger when the list closes (cleared when another surface took the
        bottom seat: that surface owns focus). */
    returnFocus?: boolean;
}>();

/** The section list is open. */
const open = defineModel<boolean>("open", { default: false });

const load = () => import("./DockSectionSelect.vue");
const n = computed(() => stepper.activeStep.value);
const label = computed(() => (n.value > 0 ? (stepper.activeLabel.value ?? "") : ""));
/** No section is registered yet: the face holds the slot but has no list to open. */
const empty = computed(() => label.value === "");
const name = computed(() =>
    empty.value ? "Sections" : `Section ${n.value} of ${stepper.beatItems.value.length}: ${label.value}`,
);
</script>

<template>
    <DockSelectSeat
        v-bind="$attrs"
        v-model:open="open"
        :load="load"
        :bind="{ stepper, variant: 'cell', returnFocus }"
        :face="{
            class: 'dock-sections__face dock-sections__face--cell',
            'aria-label': name,
            disabled: empty,
            'data-testid': 'dock-section-select',
            'data-empty': empty ? '' : undefined,
        }"
    >
        <span class="dock-sections__text">
            <span class="dock-sections__label" data-testid="dock-section-label">{{ label }}</span>
        </span>
    </DockSelectSeat>
</template>

<style>
/* The face: glass's Select trigger (a row ending in its chevron). The text block holds two lines on
   the pager (the position over the title) and one in the phone cell. */
.dock-sections__face {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-inline-size: 0;
    max-inline-size: 18rem;
    min-block-size: 2.75rem;
    padding-inline: 0.625rem 0.5rem;
    border-radius: 0.75rem;
    text-align: start;
}
.dock-sections__text {
    display: grid;
    flex: 1 1 auto;
    min-inline-size: 0;
    justify-items: start;
}
.dock-sections__position {
    color: var(--muted-foreground);
    font-size: 0.75rem;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
}
.dock-sections__label {
    max-inline-size: 100%;
    overflow: hidden;
    color: var(--foreground);
    font-size: 0.875rem;
    font-weight: 550;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* The phone bar's Sections cell: 120 px wide, one line, the bar's cell height. */
.dock-sections__face--cell {
    inline-size: 7.5rem;
    max-inline-size: 7.5rem;
}
</style>
