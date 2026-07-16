<script setup lang="ts">
import type { FootAnatomyContract } from "./foot-anatomy.js";

defineProps<{
    contract: FootAnatomyContract;
}>();

defineSlots<{
    title(props: { title: string }): unknown;
    legend(): unknown;
    gear(): unknown;
    readout(): unknown;
    provenance(): unknown;
    /** Additive EX-70 seam for a site or export colophon inside the record rail. */
    colophon(): unknown;
}>();
</script>

<template>
    <footer
        class="foot-anatomy"
        :aria-label="contract.ariaLabel ?? `${contract.title} figure details`"
        data-foot-anatomy
    >
        <div class="foot-anatomy__grid">
            <div class="foot-anatomy__title" data-seat="title">
                <slot name="title" :title="contract.title">{{ contract.title }}</slot>
            </div>

            <div class="foot-anatomy__legend" data-seat="legend">
                <slot name="legend" />
            </div>

            <div class="foot-anatomy__gear" data-seat="gear">
                <slot name="gear" />
            </div>

            <div class="foot-anatomy__rule" aria-hidden="true" />

            <div class="foot-anatomy__readout" data-seat="readout">
                <slot name="readout" />
            </div>

            <div class="foot-anatomy__provenance" data-seat="provenance">
                <slot name="provenance" />
                <div class="foot-anatomy__colophon" data-colophon-seam>
                    <slot name="colophon" />
                </div>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.foot-anatomy {
    container: plate-foot / inline-size;
    contain-intrinsic-size: auto 10rem;
    overflow: clip;
    color: var(--foreground);
}

.foot-anatomy__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(min-content, auto);
    grid-template-areas:
        "title title"
        "legend gear"
        "rule rule"
        "readout provenance";
    gap: 0.55rem 1rem;
}

.foot-anatomy__title {
    grid-area: title;
    min-inline-size: 0;
    font-size: var(--type-body);
    font-weight: 600;
    line-height: 1.25;
}

.foot-anatomy__legend {
    grid-area: legend;
    min-inline-size: 0;
    font-size: var(--type-caption);
}

.foot-anatomy__gear {
    grid-area: gear;
    display: flex;
    justify-content: end;
    gap: 0.4rem;
    min-inline-size: 0;
    font-size: var(--type-micro);
}

.foot-anatomy__rule {
    grid-area: rule;
    inline-size: 100%;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground), transparent 88%);
}

.foot-anatomy__readout {
    grid-area: readout;
    min-inline-size: 0;
    font-size: var(--type-small);
}

.foot-anatomy__provenance {
    grid-area: provenance;
    min-inline-size: 0;
    max-inline-size: 62ch;
    font-size: var(--type-caption);
}

.foot-anatomy__colophon:empty {
    display: none;
}

@container plate-foot (inline-size < 340px) {
    .foot-anatomy__grid {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
            "title"
            "legend"
            "gear"
            "rule"
            "readout"
            "provenance";
    }

    .foot-anatomy__gear {
        justify-content: start;
    }
}

@media (max-width: 640px) {
    .foot-anatomy__grid {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
            "title"
            "legend"
            "gear"
            "rule"
            "readout"
            "provenance";
    }

    .foot-anatomy__gear {
        justify-content: start;
    }

    .foot-anatomy__gear :deep(button),
    .foot-anatomy__gear :deep(a) {
        min-block-size: 44px;
    }

    .foot-anatomy__gear :deep([data-icon-only]) {
        min-inline-size: 44px;
    }
}

@media print {
    .foot-anatomy {
        overflow: visible;
    }
}
</style>
