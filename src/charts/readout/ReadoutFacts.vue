<script setup lang="ts">
// ReadoutFacts.vue — the one fact grid the hover card and the entity detail share (U/B7 O-13).
//
// Labels sit left on one line (`max-content`), values right in the remaining track
// (`minmax(0,1fr)`), tabular figures. A value wraps at word boundaries inside its own cell and never
// takes width from the label. Under 18rem of container width each row stacks, label over value. The
// breakdown bars use the same label-safe columns. The host sets `container-type`, so a caller that
// sizes to content (the hover card) gives the host a definite width.
import FigureSlug from "../frame/FigureSlug.vue";
import type { Fact } from "../../interaction/HoverCard.vue";
import type { ReadoutBar } from "../../platform/stores/useHoverReadout.js";

withDefaults(
    defineProps<{
        /** The fact rows. */
        facts: Fact[];
        /** `compact` = facts only; `full` also shows the breakdown bars. */
        density?: "compact" | "full";
        /** The breakdown bars, shown at `full` density. */
        breakdown?: ReadoutBar[];
        /** The breakdown's heading (defaults to "By program"). */
        breakdownLabel?: string;
    }>(),
    {
        density: "compact",
        breakdown: undefined,
        breakdownLabel: undefined,
    },
);
</script>

<template>
    <div class="readout-facts-host">
        <dl class="readout-facts">
            <template v-for="f in facts" :key="f.label">
                <hr v-if="f.divider" class="readout-facts__divider" aria-hidden="true" />
                <dt class="readout-facts__label">{{ f.label }}</dt>
                <dd class="readout-facts__value" :title="f.value">
                    <span
                        v-if="f.accent"
                        class="readout-facts__dot"
                        :style="{ background: f.accent }"
                    />
                    <FigureSlug size="card" as="span">{{ f.value }}</FigureSlug>
                </dd>
            </template>
        </dl>

        <div
            v-if="density === 'full' && breakdown && breakdown.length"
            class="readout-facts__breakdown"
        >
            <p class="readout-facts__breakdown-head">{{ breakdownLabel ?? "By program" }}</p>
            <div class="readout-facts__bars">
                <template v-for="bar in breakdown" :key="bar.label">
                    <span class="readout-facts__bar-label">{{ bar.label }}</span>
                    <span class="readout-facts__bar-track">
                        <span
                            class="readout-facts__bar-fill"
                            :style="{
                                width: `${Math.max(2, bar.share * 100)}%`,
                                background: bar.color,
                            }"
                        />
                    </span>
                    <span class="readout-facts__bar-value">{{ bar.value }}</span>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
.readout-facts-host {
    container-type: inline-size;
    container-name: readout-facts;
}
.readout-facts {
    /* the readout figure rung: one golden step below the card figure token */
    --readout-figure-step: calc(var(--type-figure-card, 1rem) / 1.618);
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    column-gap: 0.75rem;
    row-gap: 0.125rem;
    align-items: baseline;
    margin: 0.5rem 0 0;
}
.readout-facts__label {
    white-space: nowrap;
    font-size: var(--type-caption, 0.75rem);
    color: var(--muted-foreground);
}
.readout-facts__value {
    min-inline-size: 0;
    margin: 0;
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 0.375rem;
    text-align: end;
}
.readout-facts__dot {
    display: inline-block;
    inline-size: 0.5rem;
    block-size: 0.5rem;
    flex-shrink: 0;
    border-radius: 50%;
    align-self: center;
}
.readout-facts__value :deep(.figure-slug-card) {
    min-inline-size: 0;
    max-inline-size: 100%;
    white-space: normal;
    overflow-wrap: normal;
    text-align: end;
    font-size: var(--readout-figure-step);
    font-weight: 600;
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "kern" 1;
}
/* the unit reads lighter than the value */
.readout-facts__value :deep(.figure-slug-card .unit) {
    font-weight: 400;
}
.readout-facts__divider {
    grid-column: 1 / -1;
    border: 0;
    border-block-start: 1px solid var(--border, color-mix(in oklab, currentColor 18%, transparent));
    margin-block: 0.25rem 0.1rem;
    opacity: 0.5;
}

.readout-facts__breakdown {
    margin-block-start: 0.75rem;
    padding-block-start: 0.5rem;
    border-block-start: 1px solid color-mix(in oklab, var(--border, currentColor) 40%, transparent);
}
.readout-facts__breakdown-head {
    margin: 0 0 0.25rem;
    font-size: var(--type-caption, 0.75rem);
    font-weight: 600;
}
.readout-facts__bars {
    display: grid;
    grid-template-columns: max-content minmax(2rem, 1fr) max-content;
    column-gap: 0.5rem;
    row-gap: 0.125rem;
    align-items: center;
    font-size: var(--type-caption, 0.75rem);
}
.readout-facts__bar-label {
    white-space: nowrap;
    color: var(--muted-foreground);
}
.readout-facts__bar-track {
    block-size: 0.5rem;
    border-radius: var(--radius-pill, 9999px);
    background: color-mix(in oklab, var(--muted, currentColor) 40%, transparent);
}
.readout-facts__bar-fill {
    display: block;
    block-size: 100%;
    border-radius: inherit;
}
.readout-facts__bar-value {
    text-align: end;
    font-variant-numeric: tabular-nums;
}

@container readout-facts (max-width: 18rem) {
    .readout-facts {
        grid-template-columns: minmax(0, 1fr);
        row-gap: 0;
    }
    .readout-facts__label {
        white-space: normal;
    }
    .readout-facts__value {
        justify-content: flex-start;
        text-align: start;
        margin-block-end: 0.25rem;
    }
    .readout-facts__value :deep(.figure-slug-card) {
        text-align: start;
    }
}
</style>
