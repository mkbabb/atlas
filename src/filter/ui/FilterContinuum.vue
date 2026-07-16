<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from "vue";
import { Filter, SlidersHorizontal } from "@lucide/vue";
import { Button } from "@mkbabb/glass-ui/button";
import { DASHBOARD_KEY } from "@/contract";
import { useMobileRegister } from "@/platform/composables/useMobileRegister";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { instrumentSpringStyle } from "@/motion/instrument-spring";
import { useFilterLedger } from "@/filter/composables/useFilterLedger";
import { useFilterPane } from "@/filter/composables/useFilterPane";

type Register = "pip" | "ledger" | "drawer";

const ctx = inject(DASHBOARD_KEY);
const { open } = useFilterPane();
const { isPhone } = useMobileRegister();
const reducedMotion = useReducedMotion();
const { chips, appliedCount, selectionCount } = useFilterLedger();
const register = ref<Register>("pip");
let settleTimer: ReturnType<typeof setTimeout> | null = null;

const hasFilter = computed(() => Boolean(ctx?.filterBody));
const scopeLabel = computed(() =>
    hasFilter.value ? `${ctx?.title ?? "Dashboard"} view` : "whole program · unfiltered",
);
const style = computed(() => instrumentSpringStyle(reducedMotion.value));

function cancelSettle(): void {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = null;
}
function showLedger(): void {
    if (open.value) return;
    register.value = "ledger";
    cancelSettle();
    settleTimer = setTimeout(() => (register.value = "pip"), 4_000);
}
function activate(): void {
    if (open.value) {
        open.value = false;
        return;
    }
    if (!hasFilter.value) return showLedger();
    if (!isPhone.value && register.value === "pip") return showLedger();
    open.value = true;
}
watch(open, (value) => {
    cancelSettle();
    register.value = value ? "drawer" : "pip";
});
onBeforeUnmount(cancelSettle);
</script>

<template>
    <aside
        class="filter-continuum"
        :class="`filter-continuum--${register}`"
        :style="style"
        :data-register="register"
        data-filter-continuum
        @pointerenter="showLedger"
        @focusin="showLedger"
    >
        <Button
            type="button"
            variant="glass"
            class="filter-continuum__trigger"
            :aria-expanded="open"
            :aria-label="open ? 'Close filters' : 'Open filters'"
            data-filter-door
            @click="activate"
        >
            <SlidersHorizontal v-if="register === 'drawer'" aria-hidden="true" />
            <Filter v-else aria-hidden="true" />
            <span v-if="register === 'pip' && appliedCount" class="filter-continuum__count">{{ appliedCount }}</span>
            <span v-if="register === 'ledger'" class="filter-continuum__ledger">
                <span class="filter-continuum__scope" :class="{ 'filter-continuum__scope--static': !hasFilter }">{{ scopeLabel }}</span>
                <span v-for="chip in chips" :key="chip.key" class="filter-continuum__chip">{{ chip.label }}</span>
                <span v-if="selectionCount" class="filter-continuum__chip" data-selection-count>{{ selectionCount }} selected</span>
            </span>
        </Button>
    </aside>
</template>

<style scoped>
.filter-continuum { position: fixed; inset-inline-end: 0; inset-block-start: 66.667%; z-index: var(--z-dock); }
.filter-continuum__trigger { min-block-size: 44px; min-inline-size: 44px; transition: inline-size var(--instrument-spring-duration) var(--instrument-spring-ease); }
.filter-continuum__trigger > svg { inline-size: 1.15rem; block-size: 1.15rem; flex: none; }
.filter-continuum__count { display: grid; min-inline-size: 1.1rem; block-size: 1.1rem; place-items: center; border-radius: 999px; background: var(--foreground); color: var(--background); font: 700 .625rem/1 var(--font-mono); }
.filter-continuum__ledger { display: flex; align-items: center; gap: .3rem; white-space: nowrap; }
.filter-continuum__scope,.filter-continuum__chip { padding: .2rem .4rem; border: 1px solid var(--border); border-radius: 999px; font: .6875rem/1.2 var(--font-mono); }
.filter-continuum__scope--static { border-style: dashed; }
@media (--phone) { .filter-continuum { inset-block-start: auto; inset-block-end: calc(1rem + env(safe-area-inset-bottom)); } }
</style>
