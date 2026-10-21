<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@mkbabb/glass-ui/dialog";
import { SheetContent } from "@mkbabb/glass-ui/sheet";
import { Button } from "@mkbabb/glass-ui/button";
import { useMobileRegister } from "../composables/useMobileRegister.js";
import {
    resolveAppendixDetent,
    type AppendixDetent,
    type AppendixDockIntent,
} from "./appendix.js";

const props = withDefaults(
    defineProps<{
        label?: string;
        peekLabel: string;
        detent?: AppendixDetent;
        /** [W-56 · A-32] the plate's VIEWER door, supplied only when the plate declares a
            `DataScope`. The dial-11 words ride THIS handle, because this is the control that keeps
            them: it opens the browsable, exportable table. The dock's own control opens the written
            record, and says so. A plate with no scope passes nothing and grows no browse handle —
            the absence is the honest state, not a disabled control. */
        browse?: (() => void) | null;
    }>(),
    {
        label: "Appendix",
        detent: "shut",
        browse: null,
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

function onControl(): void {
    // The sheet's open state is the Dialog v-model `drawerOpen` (bound to
    // `state === "full"`). On phone the control opens the sheet through that model;
    // inline it toggles the in-flow detent. (glass 8 folded `Drawer` whole into
    // `Dialog` + `SheetContent`.)
    if (isPhone.value) drawerOpen.value = true;
    else apply("toggle");
}

defineExpose({
    peek: () => apply("peek"),
    open: () => apply("expand"),
    close: () => apply("close"),
});
</script>

<template>
    <section class="appendix-dock" :data-detent="state" data-appendix-dock>
        <Dialog v-model:open="drawerOpen">
            <!-- THE STRIP (O-17, PLAN §5.7): one 36 px line at every width. The source names itself
                 in sentence case and ellipsizes; one trailing action opens the written record. -->
            <div class="appendix-dock__strip" data-appendix-strip>
                <span class="appendix-dock__crest" aria-hidden="true">Σ</span>
                <span class="appendix-dock__source" :title="`Source: ${label}`">Source: {{ label }}</span>
                <Button
                    class="appendix-dock__control"
                    type="button"
                    emphasis="quiet"
                    size="sm"
                    :aria-expanded="state === 'full'"
                    :aria-controls="paneId"
                    @click="onControl"
                >
                    {{ state === "full" ? "Close" : "Source & method" }}
                </Button>
            </div>

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
                :is="isPhone ? SheetContent : 'div'"
                :id="paneId"
                class="appendix-dock__pane"
                :hidden="isPhone ? undefined : state !== 'full'"
                :role="isPhone ? undefined : 'region'"
                :aria-labelledby="headingId"
                :side="isPhone ? 'bottom' : undefined"
                :surface="isPhone ? 'opaque' : undefined"
            >
                <component :is="isPhone ? DialogHeader : 'div'" class="appendix-dock__pane-head">
                    <component :is="isPhone ? DialogTitle : 'h2'" :id="headingId">
                        Source &amp; method
                    </component>
                    <DialogDescription v-if="isPhone" class="sr-only">
                        Source, method, and provenance detail for this figure.
                    </DialogDescription>
                    <Button
                        v-if="browse"
                        type="button"
                        emphasis="secondary"
                        size="sm"
                        data-testid="appendix-dock-browse"
                        @click="browse()"
                    >
                        Browse &amp; export
                    </Button>
                    <!-- On the phone the sheet's own ✕ (glass SheetContent) is the close. -->
                    <Button
                        v-if="!isPhone"
                        type="button"
                        emphasis="quiet"
                        size="sm"
                        @click="apply('close')"
                    >
                        Close
                    </Button>
                </component>
                <div class="appendix-dock__reading">
                    <slot />
                </div>
            </component>
        </Dialog>
    </section>
</template>

<style scoped>
.appendix-dock {
    display: grid;
    gap: 0.45rem;
    min-inline-size: 0;
    color: var(--foreground);
}

.appendix-dock__strip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-inline-size: 0;
    block-size: 36px;
    padding-inline: 0.75rem 0.25rem;
    border-radius: var(--radius-bar, var(--radius-panel, 12px));
    background: color-mix(in oklab, var(--muted, currentColor) 35%, transparent);
    /* one type step above the caption (PV-03) */
    font-size: var(--type-small, 0.875rem);
    line-height: 1;
}
.appendix-dock__crest {
    flex: none;
    color: color-mix(in oklab, var(--foreground), transparent 30%);
}
.appendix-dock__source {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.appendix-dock__control {
    flex: none;
    min-block-size: 28px;
    font-size: inherit;
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
    font-size: var(--type-caption);
    font-weight: 600;
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

.appendix-dock__reading {
    max-inline-size: 62ch;
    font-size: var(--type-small);
    line-height: 1.55;
}

@media (--phone) {
    .appendix-dock__pane button,
    .appendix-dock__peek button {
        min-block-size: 44px;
    }

    .appendix-dock__peek {
        inline-size: 100%;
    }

    :global(.appendix-dock__pane[data-slot="sheet-content"]) {
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
    :global(.appendix-dock__pane[data-slot="sheet-content"]) {
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

    :global(.bg-overlay-scrim) {
        display: none !important;
    }
}
</style>
