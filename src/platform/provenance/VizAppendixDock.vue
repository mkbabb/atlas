<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@mkbabb/glass-ui/drawer";
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
    // Glass 7 removed DrawerTrigger; the drawer's open state is the v-model
    // `drawerOpen` (bound to `state === "full"`). On phone the control opens the
    // drawer through that model; inline it toggles the in-flow detent.
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
        <Drawer v-model:open="drawerOpen" direction="bottom" mode="modal">
            <!-- THE FOOT WHISPER — the source names itself, then two doors of DIFFERENT shapes:
                 a capsule that discloses the written record, and the one LINK that opens the table.
                 The salience order is the point (spec-data §c.2): the eye must land on the door. -->
            <div class="appendix-dock__head">
                <Button
                    class="appendix-dock__control"
                    type="button"
                    variant="glass"
                    :aria-expanded="state === 'full'"
                    :aria-controls="paneId"
                    @click="onControl"
                >
                    <span class="appendix-dock__crest" aria-hidden="true">Σ</span>
                    <span>{{ label }}</span>
                    <!-- What this control actually opens: the written record — source, measure,
                         method, vintage. It says that, and nothing it cannot keep. -->
                    <span class="appendix-dock__state">
                        {{ state === "full" ? "close" : "source & method ⌄" }}
                    </span>
                </Button>

                <!-- DIAL 11 — the whisper-handle carries WORDS, on the control that keeps them.
                     One click lands the reader in the rows with the CSV/JSON beside them. -->
                <button
                    v-if="browse"
                    type="button"
                    class="appendix-dock__browse"
                    data-testid="appendix-dock-browse"
                    @click="browse()"
                >
                    browse &amp; export <span aria-hidden="true">↗</span>
                </button>
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
                :is="isPhone ? DrawerContent : 'div'"
                :id="paneId"
                class="appendix-dock__pane"
                :hidden="isPhone ? undefined : state !== 'full'"
                :role="isPhone ? undefined : 'region'"
                :aria-labelledby="headingId"
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
                    <Button type="button" variant="ghost" size="sm" @click="apply('close')">
                        Close
                    </Button>
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

.appendix-dock__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.75rem;
    min-inline-size: 0;
}

.appendix-dock__control {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: 0.45rem;
    min-block-size: 2rem;
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

/* THE ONE LINK IN THE FOOT. It wears the only underline here, so a reader scanning for the way in
   finds it against a field of capsules and prose (the info-scent repair). */
.appendix-dock__browse {
    flex: none;
    padding: 0;
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: light-dark(
        color-mix(in oklab, var(--route-accent), var(--foreground) 40%),
        color-mix(in oklab, var(--route-accent), var(--foreground) 12%)
    );
    background: none;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: color-mix(in oklab, currentColor, transparent 45%);
    cursor: pointer;
}
.appendix-dock__browse:hover {
    color: var(--foreground);
    text-decoration-color: currentColor;
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
    .appendix-dock button {
        min-block-size: 44px;
    }

    .appendix-dock__head {
        display: grid;
        justify-items: start;
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
    .appendix-dock__browse,
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
