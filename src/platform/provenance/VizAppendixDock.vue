<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@mkbabb/glass-ui/drawer";
import { useMobileRegister } from "@/platform/composables/useMobileRegister";
import {
    resolveAppendixDetent,
    type AppendixDetent,
    type AppendixDockIntent,
} from "./appendix";

const props = withDefaults(
    defineProps<{
        label?: string;
        peekLabel: string;
        detent?: AppendixDetent;
    }>(),
    {
        label: "Appendix",
        detent: "shut",
    },
);

const emit = defineEmits<{
    "update:detent": [detent: AppendixDetent];
    "detent-change": [detent: AppendixDetent];
}>();

defineSlots<{
    peek(): unknown;
    default(): unknown;
}>();

const paneId = `appendix-pane-${useId().replaceAll(":", "")}`;
const headingId = `${paneId}-heading`;
const state = ref<AppendixDetent>(props.detent);
const { isPhone } = useMobileRegister();

watch(
    () => props.detent,
    (detent) => {
        state.value = detent;
    },
);

function apply(intent: AppendixDockIntent): void {
    const next = resolveAppendixDetent(state.value, intent);
    if (next === state.value) return;
    state.value = next;
    emit("update:detent", next);
    emit("detent-change", next);
}

const drawerOpen = computed({
    get: () => isPhone.value && state.value === "full",
    set: (open: boolean) => {
        if (!isPhone.value) return;
        apply(open ? "expand" : "close");
    },
});

function toggleInline(): void {
    if (!isPhone.value) apply("toggle");
}

defineExpose({
    peek: () => apply("peek"),
    open: () => apply("expand"),
    close: () => apply("close"),
});
</script>

<template>
    <section class="appendix-dock" :data-detent="state" data-appendix-dock>
        <Drawer v-model:open="drawerOpen" direction="bottom" mode="modal">
            <component :is="isPhone ? DrawerTrigger : 'span'" :as-child="isPhone || undefined">
                <button
                    class="appendix-dock__control"
                    type="button"
                    :aria-expanded="state === 'full'"
                    :aria-controls="paneId"
                    @click="toggleInline"
                >
                    <span class="appendix-dock__crest" aria-hidden="true">Σ</span>
                    <span>{{ label }}</span>
                    <span class="appendix-dock__state" aria-hidden="true">
                        {{ state === "full" ? "Close" : "Open" }}
                    </span>
                </button>
            </component>

            <div
                v-if="state === 'peek'"
                class="appendix-dock__peek"
            >
                <dl>
                    <div>
                        <dt>{{ peekLabel }}</dt>
                        <dd><slot name="peek" /></dd>
                    </div>
                </dl>
            </div>

            <component
                :is="isPhone ? DrawerContent : 'div'"
                :id="paneId"
                class="appendix-dock__pane"
                :hidden="isPhone ? undefined : state !== 'full'"
                :role="isPhone ? undefined : 'region'"
                :aria-labelledby="headingId"
                :aria-hidden="isPhone && state !== 'full' ? true : undefined"
                :inert="isPhone && state !== 'full' ? true : undefined"
                :force-mount="isPhone ? true : undefined"
                :show-overlay="isPhone ? true : undefined"
                :surface="isPhone ? 'opaque' : undefined"
            >
                <component :is="isPhone ? DrawerHeader : 'div'" class="appendix-dock__pane-head">
                    <component :is="isPhone ? DrawerTitle : 'h2'" :id="headingId">
                        {{ label }}
                    </component>
                    <DrawerDescription v-if="isPhone" class="sr-only">
                        Source, method, and provenance detail for this figure.
                    </DrawerDescription>
                    <DrawerClose v-if="isPhone" as-child>
                        <button type="button">Close</button>
                    </DrawerClose>
                    <button v-else type="button" @click="apply('close')">Close</button>
                </component>
                <div class="appendix-dock__reading">
                    <slot />
                </div>
            </component>
        </Drawer>
    </section>
</template>

<style scoped>
.appendix-dock {
    display: grid;
    gap: 0.45rem;
    min-inline-size: 0;
    color: var(--foreground);
}

.appendix-dock__control,
.appendix-dock__peek {
    border: 1px solid color-mix(in oklab, var(--foreground), transparent 84%);
    color: inherit;
    background: color-mix(in oklab, var(--background), transparent 12%);
}

.appendix-dock__control {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: 0.45rem;
    min-block-size: 2rem;
    padding-inline: 0.65rem;
    border-radius: var(--radius-full, 999px);
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.appendix-dock__crest {
    color: color-mix(in oklab, var(--foreground), transparent 18%);
}

.appendix-dock__state {
    color: color-mix(in oklab, var(--foreground), transparent 32%);
}

.appendix-dock__peek {
    display: grid;
    align-items: center;
    gap: 0.65rem;
    inline-size: 100%;
    padding: 0.65rem 0.75rem;
    text-align: start;
}

.appendix-dock__peek dl,
.appendix-dock__peek dl > div {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 0.65rem;
    min-inline-size: 0;
    margin: 0;
}

.appendix-dock__peek dt {
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.appendix-dock__peek dd {
    margin: 0;
    min-inline-size: 0;
    overflow: hidden;
    font-size: var(--type-caption);
    color: color-mix(in oklab, var(--foreground), transparent 8%);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.appendix-dock__pane {
    padding-block-start: 0.75rem;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground), transparent 88%);
}

.appendix-dock__pane-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.appendix-dock__pane-head h2 {
    margin: 0;
    font-size: var(--type-body);
    line-height: 1.25;
}

.appendix-dock__pane-head button {
    color: inherit;
    background: transparent;
    border: 0;
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.appendix-dock__reading {
    max-inline-size: 62ch;
    font-size: var(--type-small);
    line-height: 1.55;
}

@media (--phone) {
    .appendix-dock button {
        min-block-size: 44px;
    }

    .appendix-dock__control,
    .appendix-dock__peek {
        inline-size: 100%;
    }

    :global(.appendix-dock__pane[data-glass-drawer]) {
        max-block-size: min(82dvh, 44rem);
        overflow: auto;
    }

    .appendix-dock__reading {
        padding: 1rem;
    }

    .appendix-dock__pane-head button {
        min-inline-size: 44px;
    }
}

@media print {
    .appendix-dock__control,
    .appendix-dock__peek,
    .appendix-dock__pane-head button {
        display: none;
    }

    .appendix-dock__pane,
    :global(.appendix-dock__pane[data-glass-drawer]) {
        position: static;
        display: block;
        max-block-size: none;
        padding: 0;
        overflow: visible;
        box-shadow: none;
        transform: none !important;
    }

    .appendix-dock__pane[hidden] {
        display: block;
    }

    :global([data-stage-scrim]) {
        display: none !important;
    }
}
</style>
