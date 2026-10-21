<script setup lang="ts">
// PeriodControl.vue — the figure's period control (U/B7 O-12 S-1, PLAN §5.1, R-INTERACT §3.3).
//
// A glass Select of every period the feed carries, with ‹ and › steppers either side, and ▶, which
// plays the periods once at 900 ms each and stops. Play stops on hover over the figure, on focus
// moving into it, and on any pointer, wheel or key input; it is absent under reduced motion. Every
// change is a reader act: the control emits it and the host writes the period. Scrolling changes
// nothing.
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Button } from "@mkbabb/glass-ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mkbabb/glass-ui/select";
import { ChevronLeft, ChevronRight, Play, Pause } from "@lucide/vue";
import { useReducedMotion } from "../../motion/useReducedMotion.js";

const props = defineProps<{
    /** Every period the feed carries, ascending. */
    periods: readonly number[];
    /** The selected period. */
    modelValue: number;
    /** The reader-facing label of one period ("2025–26"). */
    label: (key: number) => string;
    /** The noun the controls name ("school year"). */
    noun: string;
    /** The figure the control plays over: hover or focus inside it stops play. */
    host?: HTMLElement | null;
}>();
const emit = defineEmits<{ "update:modelValue": [key: number] }>();

/** One period per 900 ms (R-INTERACT §3.3). */
const STEP_MS = 900;

const reduced = useReducedMotion();
const index = computed(() => props.periods.indexOf(props.modelValue));
const atStart = computed(() => index.value <= 0);
const atEnd = computed(() => index.value >= props.periods.length - 1);

function choose(key: number): void {
    if (key !== props.modelValue) emit("update:modelValue", key);
}
function step(by: -1 | 1): void {
    stop();
    const next = props.periods[index.value + by];
    if (next != null) choose(next);
}
function onSelect(v: unknown): void {
    stop();
    const key = Number(v);
    if (Number.isFinite(key)) choose(key);
}

// ── play: once through, then stop ───────────────────────────────────────────────────────────
const playing = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let armed = false;

function tick(): void {
    timer = null;
    if (!playing.value) return;
    const next = props.periods[index.value + 1];
    if (next == null) {
        stop();
        return;
    }
    choose(next);
    if (index.value + 1 >= props.periods.length) {
        stop();
        return;
    }
    timer = setTimeout(tick, STEP_MS);
}

function onInput(): void {
    if (armed) stop();
}
function listen(on: boolean): void {
    if (typeof window === "undefined") return;
    const m = on ? window.addEventListener : window.removeEventListener;
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart"] as const)
        m.call(window, type, onInput, { capture: true } as AddEventListenerOptions);
    const h = props.host;
    if (h) {
        const hm = on ? h.addEventListener : h.removeEventListener;
        hm.call(h, "pointerenter", onInput);
        hm.call(h, "focusin", onInput);
    }
}

function play(): void {
    if (reduced.value || props.periods.length < 2) return;
    if (atEnd.value) choose(props.periods[0]!);
    playing.value = true;
    listen(true);
    // The press that started play is not an input that stops it.
    armed = false;
    setTimeout(() => (armed = true), 0);
    timer = setTimeout(tick, STEP_MS);
}
function stop(): void {
    if (!playing.value && timer === null) return;
    playing.value = false;
    armed = false;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    listen(false);
}
function togglePlay(): void {
    if (playing.value) stop();
    else play();
}
watch(reduced, (r) => r && stop());
onBeforeUnmount(stop);

defineExpose({ playing, stop });
</script>

<template>
    <div class="period-control" role="group" :aria-label="`Choose the ${noun}`" data-testid="period-control">
        <Button
            emphasis="quiet"
            size="sm"
            type="button"
            class="period-control__step"
            :disabled="atStart"
            :aria-label="`Previous ${noun}`"
            data-testid="period-prev"
            @click="step(-1)"
        >
            <ChevronLeft aria-hidden="true" />
        </Button>
        <Select :model-value="String(modelValue)" @update:model-value="onSelect">
            <SelectTrigger class="period-control__select" :aria-label="noun" data-testid="period-select">
                <SelectValue>{{ label(modelValue) }}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem v-for="p in periods" :key="p" :value="String(p)">{{ label(p) }}</SelectItem>
            </SelectContent>
        </Select>
        <Button
            emphasis="quiet"
            size="sm"
            type="button"
            class="period-control__step"
            :disabled="atEnd"
            :aria-label="`Next ${noun}`"
            data-testid="period-next"
            @click="step(1)"
        >
            <ChevronRight aria-hidden="true" />
        </Button>
        <Button
            v-if="!reduced"
            emphasis="quiet"
            size="sm"
            type="button"
            class="period-control__step"
            :aria-pressed="playing"
            :aria-label="playing ? 'Stop' : `Play every ${noun}`"
            data-testid="period-play"
            @click="togglePlay"
        >
            <Pause v-if="playing" aria-hidden="true" />
            <Play v-else aria-hidden="true" />
        </Button>
    </div>
</template>

<style scoped>
.period-control {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}
.period-control__select {
    min-inline-size: 7.5rem;
    font-variant-numeric: tabular-nums lining-nums;
}
.period-control__step :deep(svg) {
    inline-size: 1rem;
    block-size: 1rem;
}
</style>
