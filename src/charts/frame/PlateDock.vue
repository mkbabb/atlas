<script setup lang="ts">
// PlateDock.vue — the figure's own dock (U/B7 O-18, PLAN §5.2, R-FIGDOCK §4).
//
// One collapsed handle (a 44 px circle, Ellipsis) in the figure's top-right corner. A press opens it
// leftward into the lane the plate head reserves: Options, Download (CSV data and PNG image) or View
// data when the plate declares a source scope, Enlarge, and Close in the cell where the handle sat.
// Every control names this figure; a control the figure lacks is absent. Hover, focus and scrolling
// open nothing (glass `expandOn: "press"`). Escape closes an open menu first, then the dock, and
// returns focus to the handle. A sheet taking a screen seat closes the dock (PLAN §2.5).
//
// U/B8 A4 — THE TABLE VIEW TOGGLE. When the host passes a `view`, the dock's persistent region (the
// glass `#persistent` seat, live while the dock is collapsed and while it is open) carries one
// pressed-state toggle: Table view. One click swaps the figure for its rows and back; the toggle is
// never behind the handle. The source-data browser keeps its own control in the open face, with
// its own glyph, so the two tables never share an icon.
import { computed, nextTick, ref, useSlots, watch } from "vue";
import { Database, Download, Ellipsis, Maximize2, SlidersHorizontal, Table2, X } from "@lucide/vue";
import { Button } from "@mkbabb/glass-ui/button";
import { DockControl, GlassDock } from "@mkbabb/glass-ui/dock";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@mkbabb/glass-ui/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@mkbabb/glass-ui/popover";
import { useDismissArbiter } from "../../platform/interaction/useDismissArbiter.js";
import { useSeatYield } from "../../platform/chrome/surfaces/useSurfaceSeat.js";
import { PLATE_LAYER_ATTR, plateLayerClaim, type PlateLayer } from "./plate-layer.js";
import type { PlateView } from "./plate-view.js";

const props = defineProps<{
    /** The plate's id: the one subject every control acts on. */
    id: string;
    /** The figure's title, in every accessible name. */
    title: string;
    /** Open this figure enlarged; absent inside the enlarged layer. */
    enlarge?: () => void;
    /** The figure's CSV and image exports. */
    exportCsv?: () => void;
    exportImage?: () => void;
    /** Present when the plate declares a source scope: the dock offers View data in place of Download. */
    browse?: (() => void) | null;
    /** Any of the figure's options is off its default: the handle carries a dot. */
    dirty?: boolean;
    /** The figure's view. Present ⇒ the dock carries the one-click Table view toggle. */
    view?: PlateView;
}>();
const emit = defineEmits<{ "update:view": [view: PlateView] }>();
function toggleView(): void {
    emit("update:view", props.view === "table" ? "chart" : "table");
}

defineSlots<{ options?(): unknown }>();
const slots = useSlots();

interface DockHandle {
    expanded: { value: boolean } | boolean;
    expand(): void;
    collapse(): void;
    keepOpen(): void;
    release(): void;
}
const dock = ref<DockHandle | null>(null);
const root = ref<HTMLElement | null>(null);
const isOpen = computed(() => {
    const e = dock.value?.expanded;
    return typeof e === "boolean" ? e : Boolean(e?.value);
});

const optionsOpen = ref(false);
const downloadOpen = ref(false);
const layerAttr = (layer: PlateLayer) => ({ [PLATE_LAYER_ATTR]: `${props.id}:${layer}` });

// An open menu keeps the dock open while focus sits in its portal.
watch([optionsOpen, downloadOpen], ([o, d]) => {
    if (o || d) dock.value?.keepOpen();
    else dock.value?.release();
});

const arbiter = useDismissArbiter();
for (const [layer, open] of [
    ["options", optionsOpen],
    ["download", downloadOpen],
] as const)
    arbiter.claim(() => (open.value ? plateLayerClaim(props.id, layer, () => (open.value = false)) : null));
arbiter.claim(() => (isOpen.value && !optionsOpen.value && !downloadOpen.value ? plateLayerClaim(props.id, "dock", close) : null));

function handle(): HTMLElement | null {
    // The handle is glass's collapsed summary: the focusable disclosure that holds our Ellipsis. A
    // generic `[aria-expanded]` query would find the Options trigger first, an inert button.
    return root.value?.querySelector("[data-plate-dock-handle]")?.closest<HTMLElement>("[tabindex]") ?? null;
}
/** Close the dock. Focus goes to the handle when it is stranded (on the body or inside the closing
    dock); a press that closed the dock on another control keeps focus there (PLAN §2.5). */
function close(): void {
    optionsOpen.value = false;
    downloadOpen.value = false;
    dock.value?.collapse();
    void nextTick(() => {
        const active = document.activeElement;
        const stranded = !active || active === document.body || Boolean(root.value?.contains(active));
        if (stranded) handle()?.focus({ preventScroll: true });
    });
}
useSeatYield(() => {
    if (isOpen.value || optionsOpen.value || downloadOpen.value) {
        optionsOpen.value = false;
        downloadOpen.value = false;
        dock.value?.collapse();
    }
});

const hasExports = computed(() => Boolean(props.exportCsv && props.exportImage));
/** Run a control's act from the handle: the dock closes first and the handle takes focus, so a
    surface the act opens (the enlarged figure) returns focus to the handle when it closes. */
async function run(fn: (() => void) | null | undefined): Promise<void> {
    if (!fn) return;
    dock.value?.collapse();
    await nextTick();
    handle()?.focus({ preventScroll: true });
    fn();
}
</script>

<template>
    <div
        ref="root"
        class="plate-dock"
        data-plate-dock
        :data-subject="id"
        v-bind="layerAttr('dock')"
        :data-expanded="isOpen || undefined"
    >
        <GlassDock
            ref="dock"
            orientation="horizontal"
            collapse="closed"
            expand-on="press"
            anchor="end"
            :collapsed-label="`Tools for ${title}`"
            backdrop-mode="static"
            shape="pill"
            data-preset="cockpit"
            class="plate-dock__dock"
        >
            <template v-if="view" #persistent>
                <DockControl
                    class="plate-dock__view"
                    :active="view === 'table'"
                    :aria-label="`Table view of ${title}`"
                    :title="view === 'table' ? `Show ${title} as a chart` : `Show ${title} as a table`"
                    :data-subject="id"
                    data-action="view"
                    @click="toggleView"
                >
                    <Table2 aria-hidden="true" />
                </DockControl>
            </template>
            <template #collapsed>
                <span class="plate-dock__handle" data-plate-dock-handle :data-subject="id">
                    <Ellipsis aria-hidden="true" />
                    <span v-if="dirty" class="plate-dock__dirty" aria-hidden="true" />
                </span>
            </template>
            <Popover v-if="slots.options" v-model:open="optionsOpen">
                <PopoverTrigger as-child>
                    <Button
                        emphasis="quiet"
                        size="md"
                        icon-only
                        :aria-label="`Options for ${title}`"
                        :title="`Options for ${title}`"
                        :data-subject="id"
                        data-action="options"
                    >
                        <SlidersHorizontal aria-hidden="true" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    :side-offset="6"
                    class="plate-dock__options"
                    v-bind="layerAttr('options')"
                    :data-subject="id"
                    :aria-label="`Options for ${title}`"
                >
                    <slot name="options" />
                </PopoverContent>
            </Popover>
            <Button
                v-if="browse"
                emphasis="quiet"
                size="md"
                icon-only
                :aria-label="`View data for ${title}`"
                :title="`View data for ${title}`"
                :data-subject="id"
                data-action="source"
                @click="run(browse)"
            >
                <Database aria-hidden="true" />
            </Button>
            <DropdownMenu v-else-if="hasExports" v-model:open="downloadOpen" :modal="false">
                <DropdownMenuTrigger as-child>
                    <Button
                        emphasis="quiet"
                        size="md"
                        icon-only
                        :aria-label="`Download ${title}`"
                        :title="`Download ${title}`"
                        :data-subject="id"
                        data-action="download"
                    >
                        <Download aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" :side-offset="6" v-bind="layerAttr('download')" :data-subject="id">
                    <DropdownMenuItem :data-subject="id" data-action="csv" @select="run(exportCsv)">
                        CSV data
                    </DropdownMenuItem>
                    <DropdownMenuItem :data-subject="id" data-action="image" @select="run(exportImage)">
                        PNG image
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                v-if="enlarge"
                emphasis="quiet"
                size="md"
                icon-only
                :aria-label="`Enlarge ${title}`"
                :title="`Enlarge ${title}`"
                :data-subject="id"
                data-action="enlarge"
                @click="run(enlarge)"
            >
                <Maximize2 aria-hidden="true" />
            </Button>
            <Button
                emphasis="quiet"
                size="md"
                icon-only
                :aria-label="`Close tools for ${title}`"
                :title="`Close tools for ${title}`"
                :data-subject="id"
                data-action="close"
                @click="close"
            >
                <X aria-hidden="true" />
            </Button>
        </GlassDock>
    </div>
</template>

<style scoped>
.plate-dock {
    display: flex;
    justify-content: flex-end;
    min-inline-size: 44px;
}
.plate-dock__handle {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 44px;
    block-size: 44px;
}
.plate-dock__handle :deep(svg) {
    inline-size: 1.125rem;
    block-size: 1.125rem;
}
.plate-dock__view :deep(svg) {
    inline-size: 1.125rem;
    block-size: 1.125rem;
}
.plate-dock__dirty {
    position: absolute;
    inset-block-start: 9px;
    inset-inline-end: 9px;
    inline-size: 6px;
    block-size: 6px;
    border-radius: 50%;
    background: var(--route-accent, currentColor);
}
.plate-dock__options {
    max-inline-size: min(22rem, 100vw - 2rem);
}
</style>
