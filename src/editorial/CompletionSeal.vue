<script setup lang="ts">
// editorial/CompletionSeal.vue — the earned-gold completion seal, ATLAS-OWNED.
//
// glass-ui 8.0.0 deleted `CompletionSeal` (+ `./completion-seal`, `useCompletionSeal`) with no
// successor and relayed its consumers here: atlas already re-exported and wrapped it
// (`resolveCompletionSeal`), so it owns the seal outright rather than a second library copy.
// Ported from the last shipping glass-ui 6.0.0 source, narrowed to the three shapes the atlas
// category skins wear (`check` · `ring` · `wordmark`; the unused `disc` coin and `personalBest`
// garnish are not carried). The one re-point: the retired `--spring-snappy`/`--spring-bouncy`
// clocks read glass's surviving `--spring-present` rung (MIGRATION §8.0.0: both land there).
//
// ONE-SHOT: the gold stroke inks once when the seal mounts (or when `play` flips true), settles
// with a small overshoot, glints once, then holds the static drawn mark. Under reduced motion the
// seal is the static fully-drawn mark (the whole motion block is PRM-gated).
import { computed, onMounted, ref, watch } from "vue";

export type CompletionSealShape = "check" | "ring" | "wordmark";

export interface CompletionSealProps {
    /** The seal glyph — `check` (default) | `ring` | `wordmark`. */
    shape?: CompletionSealShape;
    /** The accessible completion announcement (the `role="status"` text). */
    label?: string;
    /** The draw trigger; unset plays on mount (the seal draws when it appears). */
    play?: boolean;
}

const props = withDefaults(defineProps<CompletionSealProps>(), {
    shape: "check",
    label: undefined,
    play: undefined,
});

const RING = { cx: 32, cy: 32, r: 24 } as const;
const PATHS: Record<Exclude<CompletionSealShape, "ring">, string> = {
    check: "M16 33 L28 45 L48 19",
    wordmark: "M14 30 L26 42 L50 16 M14 50 L50 50",
};
const markPath = computed(() => PATHS[props.shape === "wordmark" ? "wordmark" : "check"]);

// The one-shot lifecycle: `playing` arms the `data-play` recipe seam for one pass; the `both`
// fill holds the drawn frame afterward.
const playing = ref(false);
function draw(): void {
    playing.value = false;
    requestAnimationFrame(() => {
        playing.value = true;
    });
}
onMounted(() => {
    if (props.play !== false) draw();
});
watch(
    () => props.play,
    (now, was) => {
        if (now && !was) draw();
    },
);
</script>

<template>
    <div
        class="completion-seal"
        :data-shape="shape"
        :data-play="playing ? '' : undefined"
        role="status"
        aria-live="polite"
    >
        <svg class="completion-seal__svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <circle
                v-if="shape === 'ring'"
                class="completion-seal__mark"
                :cx="RING.cx"
                :cy="RING.cy"
                :r="RING.r"
                pathLength="100"
            />
            <path v-else class="completion-seal__mark" :d="markPath" pathLength="100" />
        </svg>
        <span v-if="label" class="sr-only">{{ label }}</span>
    </div>
</template>

<style>
@property --seal-draw {
    syntax: "<percentage>";
    inherits: false;
    initial-value: 100%;
}
@property --seal-scale {
    syntax: "<number>";
    inherits: false;
    initial-value: 1;
}
@property --seal-glint {
    syntax: "<number>";
    inherits: false;
    initial-value: 0;
}
</style>

<style scoped>
.completion-seal {
    /* The earned-gold ink — glass's surviving gold register. */
    --seal-ink: var(--color-gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transform: scale(var(--seal-scale, 1));
}

.completion-seal__mark {
    fill: none;
    stroke: var(--seal-ink);
    stroke-width: var(--seal-stroke-width, 6);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 100;
    stroke-dashoffset: calc(100 - var(--seal-draw, 100%) / 1%);
    /* The one-pass glint: a drop-shadow halo of the seal's own gold at glass's metal-glow seam. */
    --metal-glow-blur: var(--metal-glow-blur-default, 0.5em);
    --metal-glow-opacity: var(--metal-glow-opacity-default, 0.35);
    filter: drop-shadow(
        0 0 calc(var(--metal-glow-blur) * var(--seal-glint, 0))
            color-mix(
                in oklab,
                var(--seal-ink),
                transparent
                    calc(100% - var(--metal-glow-opacity) * var(--seal-glint, 0) * 100%)
            )
    );
}

@media (prefers-reduced-motion: no-preference) {
    .completion-seal[data-play] {
        animation: completion-seal-settle var(--spring-present-duration, 0.57s)
            var(--spring-present) both;
    }
    .completion-seal[data-play] .completion-seal__mark {
        animation:
            completion-seal-draw var(--spring-present-duration, 0.34s) var(--ease-out, ease-out)
                both,
            completion-seal-glint var(--spring-present-duration, 0.34s) var(--ease-out, ease-out)
                var(--spring-present-duration, 0.34s) both;
    }
}

@keyframes completion-seal-draw {
    from {
        --seal-draw: 0%;
    }
    to {
        --seal-draw: 100%;
    }
}
@keyframes completion-seal-settle {
    from {
        --seal-scale: 0.92;
    }
    to {
        --seal-scale: 1;
    }
}
@keyframes completion-seal-glint {
    0% {
        --seal-glint: 0;
    }
    45% {
        --seal-glint: 1;
    }
    100% {
        --seal-glint: 0;
    }
}
</style>
