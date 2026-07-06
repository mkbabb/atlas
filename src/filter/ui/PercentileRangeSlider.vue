<script setup lang="ts">
// PercentileRangeSlider.vue — THE RANGE-DIM SLIDER of the unified `DimDial` (K-FILTER-UNIFIED §4.E ·
// the K-G-CONTROLS fold). A dual-thumb glass `<Slider>` over a range dim's LIVE data distribution
// (the `dataValues` thunk's extent), writing `[lo, hi]` in DATA space. It owns NO codec: the cell
// read + the URL write are the host `DimDial`'s (this control is a pure v-model + readout). The
// `min`/`max` clamp to the live distribution extent so a thumb never strays past a real datum (the
// SCI `admBounds` lesson — the domain derives from the feed, never baked).
import { computed } from "vue";
import { Slider } from "@mkbabb/glass-ui/slider";

const props = defineProps<{
    /** The current `[lo, hi]` window (data-space), or null at full extent. */
    modelValue: readonly [number, number] | null;
    /** The live data distribution (the dim's `dataValues` thunk face) — its extent is the track. */
    dataValues: number[];
    /** The readout formatter (a data-space value → its label). Defaults to the rounded integer. */
    format?: (v: number) => string;
    /** The slider step granularity. Defaults to a 100-tick span of the extent. */
    step?: number;
    /** The aria label root (the dim label). */
    label: string;
}>();

const emit = defineEmits<{ "update:modelValue": [[number, number]] }>();

/** The track extent — the live distribution's [min, max] (floored / ceiled to a whole step). */
const extent = computed<[number, number]>(() => {
    const vs = props.dataValues.filter((v) => Number.isFinite(v));
    if (vs.length === 0) return [0, 0];
    return [Math.floor(Math.min(...vs)), Math.ceil(Math.max(...vs))];
});

const sliderStep = computed<number>(() => {
    if (props.step && props.step > 0) return props.step;
    const [lo, hi] = extent.value;
    const span = hi - lo;
    return span > 0 ? Math.max(1, Math.round(span / 100)) : 1;
});

const fmt = computed(() => props.format ?? ((v: number) => String(Math.round(v))));

/** The slider model — the window clamped to the extent, defaulting to the full extent when null. */
const range = computed<number[]>({
    get: () => {
        const [lo, hi] = extent.value;
        const v = props.modelValue;
        if (!v) return [lo, hi];
        return [
            Number.isFinite(v[0]) ? Math.max(lo, v[0]) : lo,
            Number.isFinite(v[1]) ? Math.min(hi, v[1]) : hi,
        ];
    },
    set: (next) => {
        const [a, b] = next;
        emit("update:modelValue", [Math.min(a, b), Math.max(a, b)]);
    },
});
</script>

<template>
    <div
        class="percentile-range-slider"
        data-percentile-slider
        :data-axis-min="range[0]"
        :data-axis-max="range[1]"
    >
        <div class="percentile-range-slider__readout" aria-live="polite">
            <span>{{ fmt(range[0]) }}</span>
            <span aria-hidden="true">–</span>
            <span>{{ fmt(range[1]) }}</span>
        </div>
        <Slider
            v-model="range"
            :min="extent[0]"
            :max="extent[1]"
            :step="sliderStep"
            :aria-label="`${label} range`"
            :data-testid="`dim-dial-slider`"
        />
    </div>
</template>

<style scoped>
.percentile-range-slider {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.percentile-range-slider__readout {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
    color: var(--muted-foreground);
}
</style>
