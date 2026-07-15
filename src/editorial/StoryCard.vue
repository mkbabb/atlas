<script setup lang="ts">
import { computed, useSlots } from "vue";
import { Card } from "@mkbabb/glass-ui/card";
import type { ColorKind } from "@/charts/scale/colorKind";
import Beat from "./Beat.vue";
import AnimatedRule from "./AnimatedRule.vue";
import GhostNumeral, { type GhostNumeralSource } from "./GhostNumeral.vue";
import { resolveTitleAlign } from "./title-align";
import { storyCardSurface, type StoryCardFacet } from "./story-card";

const props = withDefaults(
    defineProps<{
        facet?: StoryCardFacet;
        id?: string;
        figure?: number;
        figureLabel?: string;
        colorKind?: ColorKind;
        hinge?: number;
        reveal?: "default" | "dense" | "chrome" | "tail";
        lift?: boolean;
        testid?: string;
        titleOwned?: boolean;
        sticky?: boolean;
    }>(),
    {
        facet: () => ({}),
        id: undefined,
        figure: undefined,
        figureLabel: undefined,
        colorKind: "diverging",
        hinge: 0.5,
        reveal: "default",
        lift: true,
        testid: undefined,
        titleOwned: true,
        sticky: false,
    },
);

const slots = useSlots();
const surface = computed(() => storyCardSurface(props.facet));
const titleAlign = computed(() => resolveTitleAlign(props.facet.pole, "left"));
const ghostSource = computed<GhostNumeralSource | null>(() =>
    props.facet.numeral != null || props.figure != null
        ? { ordinal: props.facet.numeral ?? props.figure ?? 0 }
        : null,
);
const hasFigure = computed(() => Boolean(slots.figure || (slots.default && !slots.prose)));
const firstSeam = computed(
    () => props.facet.seamRule !== false && hasFigure.value && Boolean(slots.prose || slots.appendix),
);
const secondSeam = computed(
    () => props.facet.seamRule !== false && Boolean(slots.appendix) && Boolean(slots.prose),
);
</script>

<template>
    <Beat
        :id="id"
        :figure="figure"
        :figure-label="figureLabel"
        :color-kind="colorKind"
        :hinge="hinge"
        :reveal="reveal"
        :lift="lift"
        :testid="testid"
        :title-owned="titleOwned"
        :sticky="sticky"
    >
        <Card
            as="article"
            :surface="surface"
            :tier="facet.tier ?? 'quiet'"
            :shadow="false"
            :grain="false"
            class="story-card"
            :class="{ 'story-card--keyline': facet.frame === 'keyline' }"
            :data-figure-scale="facet.figureScale ?? 'contained'"
            data-testid="story-card"
        >
            <header
                v-if="$slots.header || $slots.title"
                class="story-card__title-band"
                :data-title-align="titleAlign"
            >
                <GhostNumeral v-if="ghostSource" :source="ghostSource" />
                <div class="atlas-title-align">
                    <slot name="header"><slot name="title" /></slot>
                </div>
            </header>

            <div v-if="hasFigure" class="story-card__sector story-card__figure">
                <slot name="figure"><slot /></slot>
            </div>
            <div v-if="$slots.stats" class="story-card__sector story-card__stats">
                <slot name="stats" />
            </div>
            <AnimatedRule v-if="firstSeam" weight="seam" />
            <div v-if="$slots.prose" class="story-card__sector story-card__prose">
                <slot name="prose" />
            </div>
            <AnimatedRule v-if="secondSeam" weight="seam" />
            <footer v-if="$slots.appendix" class="story-card__sector story-card__appendix">
                <slot name="appendix" />
            </footer>
        </Card>
    </Beat>
</template>

<style scoped>
.story-card {
    --storycard-pad: clamp(1rem, 2.5vw, 2rem);
    padding: var(--storycard-pad);
}
.story-card--keyline {
    border: 1px solid var(--silver-rule, var(--border));
}
.story-card__title-band {
    position: relative;
    isolation: isolate;
}
.story-card__sector {
    min-inline-size: 0;
}
.story-card__figure {
    inline-size: 100%;
}
.story-card[data-figure-scale="contained"] .story-card__figure,
.story-card__stats,
.story-card__prose,
.story-card__appendix {
    max-inline-size: var(--measure-prose, 72ch);
    margin-inline: auto;
}
</style>
