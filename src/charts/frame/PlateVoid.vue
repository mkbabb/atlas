<script setup lang="ts">
// PlateVoid.vue — THE VOID/ABSENCE FAMILY (I2.a · DESIGN §3.8 → O-D16 generalization).
//
// A blank render is UNREPRESENTABLE. When a plate has nothing to draw — genuinely empty, or its
// feed errored — the host swaps the chart body for THIS card in place of zero marks over a ghost,
// NEVER two rules with empty space between them. It fills the chart body's footprint at a 280px
// floor (not the full reserved map/figure aspect — O-D16 §1.2.11) so the engraved frame stays
// whole: no collapse, no CLS.
//
// [ANSWERS Q-16] RULES the family's voice: an EDITORIAL SENTENCE (the face's own words, rendered
// verbatim) with NO ∅ glyph — the old templated mark + auto-wrap ("`label` has no data to draw")
// DIES here. O-D16 generalizes the single-purpose empty-only card into the shared FAMILY grammar
// every absence face wears (I2's void, O-D16's speedtest true-empty/feed-error, O-D19's demand
// cliff resolved-empty/error, O-D24's vft fault timeout/error — AUTHORED HERE, consumed there,
// NEVER re-authored):
//   • the default slot — the "ghost structure" a face may seat behind its words (a faint outline,
//     a pressed-seed glyph, ghost axes). Absent by default (a bare label+caption card).
//   • `label`   — the editorial-sentence heading (Fraunces 26–28px), the face's own words.
//   • `caption` — the supporting line beneath it (the population-honesty / cause prose).
//   • `action`  — an optional ONE 44px text-button (WCAG 2.5.5 `touch-target`) — "Try again",
//     "Reload" — the face's single affordance, never a second competing control.
defineProps<{
    /** The editorial-sentence heading (Fraunces 26–28px) — rendered verbatim, no auto-wrap. */
    label?: string;
    /** The supporting caption beneath the heading (the reason / cause, in plain prose). */
    caption?: string;
    /** The face's ONE affordance — a 44px text-button ("Try again" / "Reload"), or absent. */
    action?: { label: string; onClick: () => void };
}>();
</script>

<template>
    <div class="plate-void" role="status" data-testid="plate-void">
        <div v-if="$slots.default" class="plate-void__ghost" aria-hidden="true">
            <slot />
        </div>
        <div class="plate-void__words">
            <p v-if="label" class="plate-void__label">{{ label }}</p>
            <p v-if="caption" class="plate-void__caption text-prose-muted">{{ caption }}</p>
            <button
                v-if="action"
                type="button"
                class="plate-void__action touch-target"
                data-testid="plate-void-action"
                @click="action.onClick"
            >
                {{ action.label }}
            </button>
        </div>
    </div>
</template>

<style scoped>
/* The void sits in the chart body's place — it fills the host at the O-D16 §1.2.11 280px floor
   (not the full reserved figure aspect) so the plate keeps a reserved footprint (no collapse, no
   CLS) and the engraved frame around it is unchanged. The optional ghost-structure slot seats a
   full-bleed backdrop (a faint outline, a pressed-seed glyph); the words stack centred above it. */
.plate-void {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-block-size: 17.5rem; /* 280px — O-D16 §1.2.11, not the full map/figure aspect */
    block-size: 100%;
    padding: 1.5rem;
    text-align: center;
}
.plate-void__ghost {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}
.plate-void__words {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}
.plate-void__label {
    margin: 0;
    font-family: var(--font-display); /* Fraunces */
    font-size: clamp(1.625rem, 1rem + 1.5vw, 1.75rem); /* 26–28px, [ANSWERS Q-16] */
    color: var(--foreground);
}
.plate-void__caption {
    margin: 0;
    max-inline-size: 44ch;
    font-size: 0.9375rem;
}
.plate-void__action {
    margin-block-start: 0.25rem;
    padding-inline: 1rem;
    color: var(--ncsu-red);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    background: transparent;
    border: none;
    cursor: pointer;
}
.plate-void__action:hover {
    text-decoration: underline;
}
</style>
