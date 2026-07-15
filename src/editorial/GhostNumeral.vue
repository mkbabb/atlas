<script setup lang="ts">
import { computed } from "vue";
import { toRoman } from "@/platform/composables/useRomanNumeral";

export interface GhostNumeralSource {
    /** The ordinal on the same chapter record that owns the visible masthead. */
    readonly ordinal: number;
}

export type GhostNumeralScale = "chapter" | "plate";

const props = withDefaults(
    defineProps<{
        source: GhostNumeralSource;
        /** `plate` remains a dormant typed seam; the ratified default is chapter mastheads only. */
        scale?: GhostNumeralScale;
    }>(),
    { scale: "chapter" },
);

const roman = computed(() => toRoman(Math.max(1, props.source.ordinal)));
</script>

<template>
    <span
        v-if="scale === 'chapter' && source.ordinal > 0"
        class="ghost-numeral text-ghost-numeral"
        aria-hidden="true"
        data-testid="ghost-numeral"
        :data-ordinal="source.ordinal"
    >{{ roman }}</span>
</template>

<style scoped>
/* Position only: the existing text-ghost-numeral recipe owns face, scale, and theme-aware ink. */
.ghost-numeral {
    position: absolute;
    z-index: -1;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap;
}
</style>
