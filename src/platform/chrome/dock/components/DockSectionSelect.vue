<script setup lang="ts">
// DockSectionSelect — the section pager (U/B7 §2.2, O-12; R-INTERACT S-6).
//
// The owner's "one page at a time" without scroll-jacking: the page scrolls freely, and the reader
// pages by section from here. The face reads "Section n of N" and opens a glass Select of the
// section titles; ‹ and › jump one section (PageUp/PageDown do the same, `useDockStepper`). These
// controls, with the rail's rungs, are the only writers of `?at=`.
//
// Two registers of one control:
//   • `pager` (≥ 768 px) — ‹ [Section n of N · title] ›, seated beside the collapsed dock once the
//     reader has left the top and the section's heading has cleared the band (`MembraneTitleLozenge`);
//   • `cell` (< 768 px) — the bottom bar's Sections cell: a 120 px face printing the active section's
//     name, with "Section n of N" as its accessible name. Its list's open state is a model, so the
//     dock can seat it (the bar's bottom seat, PLAN §2.5).
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@mkbabb/glass-ui/select";
import type { UseDockStepper } from "../composables/useDockStepper.js";

// The cell is one control (the Select trigger) so it can be a seat of the bar's toolbar run; the
// caller's attributes land on that control, or on the pager's group.
defineOptions({ inheritAttrs: false });

const { stepper, variant = "pager", returnFocus = true } = defineProps<{
    /** The dock's stepper: the beats, the active one, and the section jump. */
    stepper: UseDockStepper;
    /** `pager` (≥ 768 px, with ‹ ›) or `cell` (the phone bar's Sections cell). */
    variant?: "pager" | "cell";
    /** Focus goes back to the trigger when the list closes. The dock clears it when the list
        closed because another surface took its seat: that surface owns focus. */
    returnFocus?: boolean;
}>();

/** The section list is open. */
const open = defineModel<boolean>("open", { default: false });

/** The list closed: keep focus where the surface that displaced it put it. */
function onCloseAutoFocus(event: Event): void {
    if (!returnFocus) event.preventDefault();
}

const total = computed(() => stepper.beatItems.value.length);
const n = computed(() => stepper.activeStep.value);
const position = computed(() => `Section ${n.value} of ${total.value}`);
/** The cell's face: the active section's name, or empty while no section is registered. */
const cellLabel = computed(() => (n.value > 0 ? (stepper.activeLabel.value ?? "") : ""));
const model = computed({
    get: () => stepper.activeBeatId.value,
    set: (id) => {
        if (typeof id === "string" && id) stepper.goToSection(id);
    },
});
const sections = computed(() =>
    stepper.beatItems.value.flatMap((item, i) =>
        item.kind === "beat" ? [{ id: item.id, label: item.label.trim(), roman: stepper.roman(i + 1) }] : [],
    ),
);
</script>

<template>
    <!-- The cell always renders once armed: it keeps the bar's slot while a route's sections register
         (U/B8 P-12), and it cannot open with no section to list. -->
    <Select v-if="variant === 'cell'" v-model="model" v-model:open="open" :disabled="!cellLabel">
        <SelectTrigger
            v-bind="$attrs"
            class="dock-sections__face dock-sections__face--cell"
            data-glass-dock-seat
            :aria-label="cellLabel ? `${position}: ${cellLabel}` : 'Sections'"
            data-testid="dock-section-select"
        >
            <span class="dock-sections__text">
                <span class="dock-sections__label" data-testid="dock-section-label">{{ cellLabel }}</span>
            </span>
        </SelectTrigger>
        <SelectContent side="top" align="center" @close-auto-focus="onCloseAutoFocus">
            <SelectItem
                v-for="s in sections"
                :key="s.id"
                :value="s.id"
                :data-testid="`dock-section-option-${s.id}`"
            >
                {{ s.roman }}. {{ s.label }}
            </SelectItem>
        </SelectContent>
    </Select>
    <div
        v-else-if="variant === 'pager' && n > 0 && stepper.activeLabel.value"
        v-bind="$attrs"
        class="dock-sections"
        data-testid="dock-sections"
    >
        <button
            type="button"
            class="dock-sections__step"
            aria-label="Previous section"
            data-testid="dock-section-prev"
            :disabled="n <= 1"
            @click="stepper.stepSection(-1)"
        >
            <ChevronLeft aria-hidden="true" />
        </button>
        <Select v-model="model" v-model:open="open">
            <SelectTrigger
                class="dock-sections__face"
                :aria-label="cellLabel ? `${position}: ${cellLabel}` : 'Sections'"
                data-testid="dock-section-select"
            >
                <span class="dock-sections__text">
                    <span class="dock-sections__position">{{ position }}</span>
                    <span class="dock-sections__label" data-testid="dock-section-label">{{
                        stepper.activeLabel.value
                    }}</span>
                </span>
            </SelectTrigger>
            <SelectContent side="bottom" align="start" @close-auto-focus="onCloseAutoFocus">
                <SelectItem
                    v-for="s in sections"
                    :key="s.id"
                    :value="s.id"
                    :data-testid="`dock-section-option-${s.id}`"
                >
                    {{ s.roman }}. {{ s.label }}
                </SelectItem>
            </SelectContent>
        </Select>
        <button
            type="button"
            class="dock-sections__step"
            aria-label="Next section"
            data-testid="dock-section-next"
            :disabled="n >= total"
            @click="stepper.stepSection(1)"
        >
            <ChevronRight aria-hidden="true" />
        </button>
    </div>
</template>

<style scoped>
.dock-sections {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-inline-size: 0;
}

/* ‹ › — the dock's own control register: a 44 px target with an engraved outline at rest. */
.dock-sections__step {
    display: grid;
    flex: none;
    place-items: center;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
}
.dock-sections__step :deep(svg) {
    inline-size: 1.1rem;
    block-size: 1.1rem;
}
.dock-sections__step:hover:not(:disabled) {
    color: var(--foreground);
}
.dock-sections__step:disabled {
    opacity: 0.4;
    cursor: default;
}
.dock-sections__step:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: 2px;
}

/* The face rules (the face, its text, the position and label lines, the phone cell's width) live in
   DockSectionCell.vue, unscoped: the bar paints that face from first paint, before this module loads
   (U/B8 P-12), and this module's trigger wears the same rules once it does. */
</style>
