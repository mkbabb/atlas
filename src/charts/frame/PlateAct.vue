<script setup lang="ts">
// charts/frame/PlateAct.vue — THE PLATE'S OWN ACT ROW (A-39, the plate · RULINGS §I · D3-C P2 port).
//
// A figure's take-away actions live ON the figure they act on, never in page chrome that has to guess
// which figure the reader means (U-F58: one unambiguous subject per act). Every control here is bound
// to ONE plate by construction: `enlarge` opens THIS frame, the exports serialize THIS plate's rows, the
// options are THIS figure's own dials. Each control carries `data-subject` (the plate id) and
// `data-action` (the act), and its accessible name names the figure, so a reader (and a probe) can see
// what an act will take before taking it. The row names its subject in the figure's own serif.
//
//   wide   (plate ≥ 30rem)  the subject line, then Options (when the figure has any), Download (CSV or
//                           image, or "Source data" when the plate declares a scope) and Enlarge, as
//                           quiet stadium buttons. Options opens a glass Popover with the dials.
//   narrow (plate < 30rem)  one 44 px "Take this figure" button that opens a bottom sheet holding the
//                           same acts at touch size. The sheet is the STOCK glass 10 `<Dialog>` +
//                           `<SheetContent side="bottom">` (glass 8 moved edge placement off
//                           `DialogContent`, which is centred only). Any sheet-in-page-flow defect is
//                           glass's (relay R-1, §J H-A1) and is never patched here.
//
// An act chosen inside the sheet runs AFTER the sheet has closed: the sheet and the enlarged figure
// each hold a body scroll lock, and opening the figure under a still-held sheet lock left the body
// locked once both closed (P2 R2.4 residue 1). Close first, then act; the sheet has already returned
// focus to "Take this figure", so Enlarge hands focus back to it when the figure closes.
import { ref, useSlots } from "vue";
import { Download, Maximize2, SlidersHorizontal } from "@lucide/vue";
import { Button } from "@mkbabb/glass-ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@mkbabb/glass-ui/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@mkbabb/glass-ui/popover";
import { Dialog, DialogDescription, DialogTitle, DialogTrigger } from "@mkbabb/glass-ui/dialog";
import { SheetContent } from "@mkbabb/glass-ui/sheet";

const props = defineProps<{
    /** The plate's id: the one subject every act in this row acts on. */
    id: string;
    /** The figure's human title (the subject line and every accessible name). */
    title: string;
    /** Open THIS figure enlarged (the frame's own `?fig=` arm). */
    enlarge: () => void;
    /** The figure's CSV and image exports. Absent on a stage, whose take-away is its source data. */
    exportCsv?: () => void;
    exportImage?: () => void;
    /** Present when the plate declares a source scope: the download act opens its browsable rows. */
    browse: (() => void) | null;
}>();

defineSlots<{ options?(): unknown }>();
const slots = useSlots();

const subjectId = `${props.id}-act-subject`;
const hasExports = () => Boolean(props.exportCsv && props.exportImage);

const sheetOpen = ref(false);
let afterClose: (() => void) | null = null;
function fromSheet(run: (() => void) | undefined): void {
    if (!run) return;
    afterClose = run;
    sheetOpen.value = false;
}
function onSheetClosed(): void {
    const run = afterClose;
    afterClose = null;
    if (!run) return;
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else run();
}
</script>

<template>
    <div class="plate-act__box" :data-act-of="id">
        <div class="plate-act__row plate-act__row--wide">
            <p :id="subjectId" class="plate-act__subject">{{ title }}</p>
            <Popover v-if="slots.options">
                <PopoverTrigger as-child>
                    <Button
                        emphasis="quiet"
                        size="sm"
                        icon-only
                        :aria-label="`Options for ${title}`"
                        :data-subject="id"
                        data-action="options"
                    >
                        <SlidersHorizontal aria-hidden="true" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    :side-offset="6"
                    class="plate-act__options"
                    :data-subject="id"
                    :aria-label="`Options for ${title}`"
                >
                    <slot name="options" />
                </PopoverContent>
            </Popover>
            <Button
                v-if="browse"
                emphasis="quiet"
                size="sm"
                :data-subject="id"
                data-action="source"
                :aria-describedby="subjectId"
                @click="browse()"
            >
                <Download aria-hidden="true" />
                Source data
            </Button>
            <DropdownMenu v-else-if="hasExports()">
                <DropdownMenuTrigger as-child>
                    <Button
                        emphasis="quiet"
                        size="sm"
                        :data-subject="id"
                        data-action="download"
                        :aria-describedby="subjectId"
                    >
                        <Download aria-hidden="true" />
                        Download
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" :side-offset="6" :data-subject="id">
                    <DropdownMenuItem :data-subject="id" data-action="csv" @select="exportCsv?.()">
                        Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem :data-subject="id" data-action="image" @select="exportImage?.()">
                        Download image
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                emphasis="quiet"
                size="sm"
                icon-only
                :aria-label="`Enlarge ${title}`"
                :data-subject="id"
                data-action="enlarge"
                @click="enlarge()"
            >
                <Maximize2 aria-hidden="true" />
            </Button>
        </div>

        <div class="plate-act__row plate-act__row--narrow">
            <Dialog v-model:open="sheetOpen">
                <DialogTrigger as-child>
                    <Button
                        emphasis="secondary"
                        size="md"
                        class="plate-act__take"
                        :data-subject="id"
                        data-action="take"
                        :aria-describedby="subjectId"
                    >
                        Take this figure
                    </Button>
                </DialogTrigger>
                <SheetContent
                    side="bottom"
                    surface="opaque"
                    :data-plate-sheet="id"
                    :data-subject="id"
                    @close-auto-focus="onSheetClosed"
                >
                    <DialogTitle class="plate-act__sheet-title">{{ title }}</DialogTitle>
                    <DialogDescription class="sr-only">
                        Change this figure's options, download its data or image, or enlarge it.
                    </DialogDescription>
                    <div v-if="slots.options" class="plate-act__sheet-options" :data-subject="id">
                        <slot name="options" />
                    </div>
                    <div class="plate-act__sheet-acts">
                        <Button
                            v-if="browse"
                            emphasis="secondary"
                            size="md"
                            :data-subject="id"
                            data-action="source"
                            @click="fromSheet(browse)"
                        >
                            Source data
                        </Button>
                        <template v-else-if="hasExports()">
                            <Button
                                emphasis="secondary"
                                size="md"
                                :data-subject="id"
                                data-action="csv"
                                @click="fromSheet(exportCsv)"
                            >
                                Download CSV
                            </Button>
                            <Button
                                emphasis="secondary"
                                size="md"
                                :data-subject="id"
                                data-action="image"
                                @click="fromSheet(exportImage)"
                            >
                                Download image
                            </Button>
                        </template>
                        <Button
                            emphasis="quiet"
                            size="md"
                            :data-subject="id"
                            data-action="enlarge"
                            @click="fromSheet(enlarge)"
                        >
                            Enlarge
                        </Button>
                    </div>
                </SheetContent>
            </Dialog>
        </div>
    </div>
</template>

<style scoped>
/* The row is a size container: it answers to the PLATE's width, not the viewport's, so a narrow plate
   in a wide page folds to the phone form and a full-bleed plate keeps the wide row. */
.plate-act__box {
    container: plate-act / inline-size;
    inline-size: 100%;
}
.plate-act__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
/* The subject line: the figure's own serif, set small and muted, so the row reads as the plate's
   caption-foot and says which figure its acts will take. One line; a long title ellipsizes and stays
   whole in every accessible name. */
.plate-act__subject {
    flex: 1 1 auto;
    min-inline-size: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-serif);
    font-size: var(--type-small);
    font-style: italic;
    color: var(--muted-foreground);
    font-variant-numeric: lining-nums;
}
.plate-act__row--narrow {
    display: none;
}
@container plate-act (max-width: 30rem) {
    .plate-act__row--wide {
        display: none;
    }
    .plate-act__row--narrow {
        display: flex;
    }
    .plate-act__take {
        inline-size: 100%;
        min-block-size: 44px;
    }
}
.plate-act__sheet-title {
    font-family: var(--font-serif);
}
.plate-act__options {
    inline-size: min(22rem, calc(100vw - 2rem));
}
.plate-act__sheet-options {
    margin-block-start: 0.75rem;
}
.plate-act__sheet-acts {
    display: grid;
    gap: 0.5rem;
    margin-block-start: 0.75rem;
}
.plate-act__sheet-acts > :deep(button) {
    min-block-size: 44px;
}
</style>
