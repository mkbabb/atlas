<script setup lang="ts">
// PlateError.vue — the broken-plate FALLBACK CARD (C8.3 / pf-hardening H2). When a viz
// inside a ChartFrame throws (a malformed EChartsOption, a `null.x` in a chart computed,
// a failed lazy chunk), the frame's `onErrorCaptured` boundary swaps the chart body for
// THIS card instead of letting the throw propagate to the route root and white-screen the
// whole dashboard (the pre-C8 state: NO error boundary anywhere). The isolation is
// per-plate: one broken figure degrades to a quiet card, every sibling plate + the chrome
// keep rendering.
//
// The voice is the HOUSE voice (the NotFound register): an eyebrow kicker, a measured line
// of prose, no stack trace, no alarm — an engraved "this figure could not be drawn" note
// that reads as part of the atlas, not a framework crash. It carries an OPTIONAL retry so a
// transient failure (a chunk blip) can be re-attempted without a full reload.
defineProps<{
    /** The figure's accessible label (the frame's `ariaLabel`), named in the note so the
        reader knows WHICH figure is absent. */
    label?: string;
    /** When set, a quiet "Try again" affordance the boundary wires to a re-render attempt. */
    onRetry?: () => void;
}>();
</script>

<template>
    <div class="plate-error" role="status" data-testid="plate-error">
        <span class="eyebrow">Figure unavailable</span>
        <p class="plate-error__prose text-prose-muted">
            {{ label ? `“${label}” could not be drawn.` : "This figure could not be drawn." }}
        </p>
        <button
            v-if="onRetry"
            type="button"
            class="plate-error__retry"
            data-testid="plate-error-retry"
            @click="onRetry"
        >
            Try again
        </button>
    </div>
</template>

<style scoped>
/* The fallback sits in the chart body's place — it fills the host so the plate keeps its
   reserved footprint (no collapse, no CLS) and the engraved frame around it is unchanged. */
.plate-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-block-size: 8rem;
    block-size: 100%;
    padding: 1.5rem;
    text-align: center;
}
.plate-error__prose {
    margin: 0;
    max-inline-size: 36ch;
    font-size: 0.9375rem;
}
.plate-error__retry {
    margin-block-start: 0.25rem;
    color: var(--ncsu-red);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    background: transparent;
    border: none;
    cursor: pointer;
}
.plate-error__retry:hover {
    text-decoration: underline;
}
</style>
