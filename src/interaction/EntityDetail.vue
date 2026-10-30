<script setup lang="ts">
// EntityDetail.vue — the detail a click (or a tap at 390) opens on one district, school, county or
// state (U/B7 O-13, PLAN §5.3, R-INTERACT §4.3). It replaces the single-select branch of
// SelectionDrilldownPanel and is the only phone readout sheet.
//
// A non-modal glass Sheet: on the right, 26rem, at >= 768 px; from the bottom with detents at half
// and full height, above the bar's reserve, below. It holds its screen seat through useSeatedOpen
// (PLAN §2.5). Opening moves focus to the name; Escape or the close button clears the selection and
// returns focus to the control that opened it, without scrolling the page.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { Dialog, DialogTitle, DialogDescription } from "@mkbabb/glass-ui/dialog";
import { SheetContent } from "@mkbabb/glass-ui/sheet";
import { Button } from "@mkbabb/glass-ui/button";
import { storeToRefs } from "pinia";
import { useSelection } from "../platform/stores/useSelection.js";
import { useSeatedOpen, useViewportSeat } from "../platform/chrome/surfaces/useSurfaceSeat.js";
import {
    formatMeasure,
    rankText,
    untitledName,
    useEntityDetail,
    type EntityDescription,
    type EntitySeries,
} from "./describe-entity.js";
import type { SelectionKind } from "../charts/contract/selection-contract.js";

const { nameOf } = defineProps<{
    /** A name for an entity the route's describer does not cover (the feed-side name index). */
    nameOf?: (kind: SelectionKind, id: string) => string | null | undefined;
}>();

const emit = defineEmits<{
    /** "Show only this unit": the route writes a filter clause for this unit. */
    promote: [grain: SelectionKind, ids: string[]];
}>();

const selection = useSelection();
const detail = useEntityDetail();
const { selectedItems } = storeToRefs(selection);

const item = computed(() => (selectedItems.value.length === 1 ? selectedItems.value[0]! : null));

const described = computed<EntityDescription | null>(() => (item.value ? detail.describe(item.value) : null));

const title = computed(() => {
    const it = item.value;
    if (!it) return "";
    return described.value?.name || nameOf?.(it.kind, it.id) || untitledName(it.kind);
});

/** The identifier line: kind, identifiers, place. */
const idLine = computed(() => {
    const d = described.value;
    const it = item.value;
    if (!it) return "";
    if (!d) return `${untitledName(it.kind)} ${it.id}`;
    return [d.kind, ...d.ids.map((i) => `${i.label} ${i.value}`), d.place].filter(Boolean).join(" · ");
});

const enrollment = computed(() => described.value?.measures.find((m) => m.id === "enrollment") ?? null);
const tableMeasures = computed(() => described.value?.measures.filter((m) => m.id !== "enrollment") ?? []);

function dataHref(sourceId: string): string {
    const id = described.value?.ids[0];
    return id ? `/data/${sourceId}?${encodeURIComponent(id.param)}=${encodeURIComponent(id.value)}` : `/data/${sourceId}`;
}

/** The rank strip position: 0 at the top rank, 1 at the bottom. */
function rankAt(rank: number, n: number): number {
    return n > 1 ? (rank - 1) / (n - 1) : 0;
}

// ── open state and the seat ──────────────────────────────────────────────────────────────────
const open = ref(false);
const seat = useViewportSeat();
useSeatedOpen(open, seat, "entity-detail");
const isBottom = computed(() => seat() === "bottom");
const detents = [0.5, 1];
const detent = ref<number | null>(0.5);

// The opener is the control the reader used. A keyboard press leaves focus on it. A pointer press
// on a button in WebKit does not focus the button (focus goes to the nearest focusable container),
// so the control the press landed on is recorded and used when focus is not on a control.
const CONTROL = "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
let opener: HTMLElement | null = null;
/** Where focus sat when the sheet opened. Focus still there at close was never moved by anyone. */
let focusAtOpen: Element | null = null;
let pressed: HTMLElement | null = null;
const recordPress = (e: PointerEvent): void => {
    pressed = e.target instanceof Element ? e.target.closest<HTMLElement>(CONTROL) : null;
};
onMounted(() => document.addEventListener("pointerdown", recordPress, true));
onBeforeUnmount(() => document.removeEventListener("pointerdown", recordPress, true));
function currentOpener(): HTMLElement | null {
    const active = document.activeElement as HTMLElement | null;
    const onControl = !!active && active !== document.body && active.matches(CONTROL);
    return !onControl && pressed?.isConnected ? pressed : active;
}
watch(
    () => item.value?.key ?? null,
    (key, was) => {
        if (key && key !== was) {
            if (!open.value) {
                opener = currentOpener();
                focusAtOpen = document.activeElement;
            }
            pressed = null;
            detent.value = 0.5;
            open.value = true;
        } else if (!key) {
            open.value = false;
        }
    },
    { immediate: true },
);
watch(open, (v) => (detail.open = v), { immediate: true });

const heading = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
function headingEl(): HTMLElement | null {
    const h = heading.value;
    if (!h) return null;
    return h instanceof HTMLElement ? h : (h.$el ?? null);
}

function onOpenAutoFocus(e: Event): void {
    e.preventDefault();
    void nextTick(() => headingEl()?.focus({ preventScroll: true }));
}
/** On close, focus goes back to the opener only when it is stranded: on the body, still in the
    closing sheet, or where it sat when the sheet opened (WebKit leaves a pointer press's focus on
    the page container). A surface that took this sheet's seat keeps the focus it moved (PLAN §2.5). */
function onCloseAutoFocus(e: Event): void {
    e.preventDefault();
    const active = document.activeElement;
    const stranded =
        !active || active === document.body || active === focusAtOpen || Boolean(active.closest(".entity-detail"));
    if (stranded && opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
    focusAtOpen = null;
}

const dialogOpen = computed<boolean>({
    get: () => open.value && item.value !== null,
    set: (v) => {
        if (!v) close();
    },
});

function close(): void {
    open.value = false;
    selection.clearSelection();
}

/** A pointer outside closes the detail, except on a figure (the mark's own click re-selects). */
function onPointerDownOutside(e: Event): void {
    const target = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent?.target ?? e.target;
    if (target instanceof Element && target.closest("[data-viz-plate],[data-figure-dock]")) e.preventDefault();
}

// ── actions ──────────────────────────────────────────────────────────────────────────────────
const copied = ref(false);
function addToComparison(): void {
    if (item.value) selection.select(item.value.key, { additive: true });
}
function showOnlyThis(): void {
    if (item.value) emit("promote", item.value.kind, [item.value.id]);
}
async function copyLink(): Promise<void> {
    if (!item.value || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("sel", item.value.key);
    try {
        await navigator.clipboard.writeText(url.toString());
        copied.value = true;
        window.setTimeout(() => (copied.value = false), 1600);
    } catch {
        copied.value = false;
    }
}

// ── the series ───────────────────────────────────────────────────────────────────────────────
const showTable = ref(false);
const SPARK_W = 240;
const SPARK_H = 40;
/** The sparkline's runs: covered points only; an uncovered period breaks the line. */
function sparkRuns(s: EntitySeries): string[] {
    const vals = s.points.filter((p) => p.covered && p.value != null).map((p) => p.value!);
    if (!vals.length) return [];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || 1;
    const step = s.points.length > 1 ? SPARK_W / (s.points.length - 1) : 0;
    const runs: string[] = [];
    let cur: string[] = [];
    s.points.forEach((p, i) => {
        if (!p.covered || p.value == null) {
            if (cur.length) runs.push(cur.join(" "));
            cur = [];
            return;
        }
        const x = i * step;
        const y = SPARK_H - 2 - ((p.value - lo) / span) * (SPARK_H - 4);
        cur.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    });
    if (cur.length) runs.push(cur.join(" "));
    return runs;
}
const series = computed(() => described.value?.series.filter((s) => s.points.some((p) => p.covered)) ?? []);
</script>

<template>
    <Dialog v-model:open="dialogOpen" :modal="false">
        <SheetContent
            v-if="item"
            v-model:detent="detent"
            :side="isBottom ? 'bottom' : 'right'"
            :detents="isBottom ? detents : undefined"
            class="entity-detail"
            :class="isBottom ? 'entity-detail--bottom' : 'entity-detail--right'"
            data-testid="entity-detail"
            :data-seat="isBottom ? 'bottom' : 'right'"
            @open-auto-focus="onOpenAutoFocus"
            @close-auto-focus="onCloseAutoFocus"
            @pointer-down-outside="onPointerDownOutside"
        >
            <header class="entity-detail__head">
                <DialogTitle ref="heading" tabindex="-1" class="entity-detail__name">{{ title }}</DialogTitle>
                <DialogDescription class="entity-detail__ids">{{ idLine }}</DialogDescription>
                <p v-if="enrollment" class="entity-detail__enrollment">
                    {{ formatMeasure(enrollment.value, enrollment.unit) }} students
                    <span class="entity-detail__muted">(Enrollment, {{ enrollment.period }})</span>
                </p>
            </header>

            <nav
                v-if="described?.links?.length"
                class="entity-detail__hops"
                aria-label="Related views"
                data-testid="entity-detail-hops"
            >
                <RouterLink
                    v-for="hop in described.links"
                    :key="hop.to"
                    :to="hop.to"
                    class="entity-detail__hop"
                    data-entity-hop
                    @click="close"
                >
                    {{ hop.label }}
                </RouterLink>
            </nav>

            <div v-if="described" class="entity-detail__body">
                <table v-if="tableMeasures.length" class="entity-detail__table" data-testid="entity-detail-measures">
                    <thead>
                        <tr>
                            <th scope="col">Measure</th>
                            <th scope="col">Value</th>
                            <th scope="col">State median</th>
                            <th scope="col">Peer median</th>
                            <th scope="col">Rank of N</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="m in tableMeasures" :key="m.id" :data-measure="m.id">
                            <th scope="row">
                                <span class="entity-detail__measure">{{ m.label }}</span>
                                <span class="entity-detail__muted entity-detail__source">
                                    {{ m.period }} ·
                                    <RouterLink :to="dataHref(m.sourceId)" data-source-link>{{
                                        m.sourceLabel ?? m.sourceId
                                    }}</RouterLink>
                                </span>
                            </th>
                            <td>{{ formatMeasure(m.value, m.unit) }}</td>
                            <td>{{ formatMeasure(m.stateMedian, m.unit) }}</td>
                            <td>{{ formatMeasure(m.peerMedian, m.unit) }}</td>
                            <td>
                                <template v-if="rankText(m)">
                                    {{ rankText(m) }}
                                    <span class="entity-detail__rank" aria-hidden="true">
                                        <span
                                            class="entity-detail__rank-mark"
                                            :style="{ insetInlineStart: `${rankAt(m.rank!, m.n) * 100}%` }"
                                        />
                                    </span>
                                </template>
                                <span v-else class="entity-detail__muted">—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <section v-for="s in series" :key="s.measureId" class="entity-detail__series" data-testid="entity-detail-series">
                    <div class="entity-detail__series-head">
                        <h3 class="entity-detail__series-title">{{ s.label }} by period</h3>
                        <Button
                            emphasis="quiet"
                            size="sm"
                            type="button"
                            :aria-pressed="showTable"
                            data-testid="entity-detail-table-toggle"
                            @click="showTable = !showTable"
                        >
                            Table
                        </Button>
                    </div>
                    <table v-if="showTable" class="entity-detail__series-table">
                        <thead>
                            <tr><th scope="col">Period</th><th scope="col">{{ s.label }}</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="p in s.points.filter((q) => q.covered)" :key="p.period">
                                <th scope="row">{{ p.period }}</th>
                                <td>{{ formatMeasure(p.value, s.unit) }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <svg
                        v-else
                        class="entity-detail__spark"
                        :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`"
                        preserveAspectRatio="none"
                        role="img"
                        :aria-label="`${s.label}, ${s.points.find((p) => p.covered)?.period} to ${[...s.points].reverse().find((p) => p.covered)?.period}`"
                    >
                        <polyline v-for="(pts, i) in sparkRuns(s)" :key="i" :points="pts" />
                    </svg>
                </section>
            </div>
            <p v-else class="entity-detail__muted entity-detail__empty">
                This dashboard has no measures for this unit.
            </p>

            <footer class="entity-detail__actions">
                <Button emphasis="secondary" size="sm" type="button" data-testid="entity-detail-compare" @click="addToComparison">
                    Add to comparison
                </Button>
                <Button emphasis="secondary" size="sm" type="button" data-testid="entity-detail-only" @click="showOnlyThis">
                    Show only this unit
                </Button>
                <Button emphasis="secondary" size="sm" type="button" data-testid="entity-detail-copy" @click="copyLink">
                    {{ copied ? "Link copied" : "Copy link" }}
                </Button>
                <RouterLink
                    v-if="described && tableMeasures[0]"
                    class="entity-detail__rows"
                    :to="dataHref(tableMeasures[0].sourceId)"
                >
                    All rows for this unit
                </RouterLink>
            </footer>
        </SheetContent>
    </Dialog>
</template>

<!-- The sheet itself is glass's teleported SheetContent: its root carries no scope id, so its own
     rules are global (the class names are this component's alone). -->
<style>
.entity-detail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem 1.25rem calc(1rem + var(--safe-foot, env(safe-area-inset-bottom, 0px)));
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--radius-card, 12px);
}
.entity-detail--right {
    inline-size: min(26rem, 100vw - 2rem);
    max-inline-size: 26rem;
}
.entity-detail--bottom {
    /* Seated above the dock bar's reserve; the bar stays visible under the sheet. */
    inset-block-end: var(--dock-bar-reserve, 0px);
    max-block-size: calc(100dvh - var(--dock-bar-reserve, 0px));
}
</style>

<style scoped>
.entity-detail__head {
    display: grid;
    gap: 0.25rem;
}
.entity-detail__name {
    margin: 0;
    font-family: var(--font-serif, ui-serif, Georgia, serif);
    font-size: var(--type-panel-title, 1.25rem);
    line-height: 1.2;
    outline: none;
}
.entity-detail__name:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 4px;
}
.entity-detail__ids,
.entity-detail__enrollment {
    margin: 0;
    font-size: var(--type-caption, 0.8125rem);
}
.entity-detail__ids,
.entity-detail__muted {
    color: var(--muted-foreground);
}
.entity-detail__table,
.entity-detail__series-table {
    inline-size: 100%;
    border-collapse: collapse;
    font-size: var(--type-caption, 0.8125rem);
    font-variant-numeric: tabular-nums lining-nums;
}
.entity-detail__table th,
.entity-detail__table td,
.entity-detail__series-table th,
.entity-detail__series-table td {
    padding-block: 0.375rem;
    padding-inline: 0 0.5rem;
    text-align: end;
    vertical-align: baseline;
    border-block-end: 1px solid color-mix(in oklab, var(--border, currentColor) 50%, transparent);
    font-weight: 400;
}
.entity-detail__table thead th,
.entity-detail__series-table thead th {
    color: var(--muted-foreground);
    font-weight: 500;
    white-space: nowrap;
}
.entity-detail__table th[scope="row"],
.entity-detail__table thead th:first-child,
.entity-detail__series-table th[scope="row"],
.entity-detail__series-table thead th:first-child {
    text-align: start;
}
.entity-detail__table td:nth-child(2) {
    font-weight: 600;
}
.entity-detail__table td {
    white-space: nowrap;
}
.entity-detail__measure,
.entity-detail__source {
    display: block;
}
.entity-detail__source a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
}
.entity-detail__rank {
    position: relative;
    display: block;
    block-size: 4px;
    margin-block-start: 0.25rem;
    border-radius: 2px;
    background: color-mix(in oklab, var(--muted-foreground, currentColor) 25%, transparent);
}
.entity-detail__rank-mark {
    position: absolute;
    inset-block: -2px;
    inline-size: 2px;
    background: var(--foreground, currentColor);
}
.entity-detail__series-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}
.entity-detail__series-title {
    margin: 0;
    font-size: var(--type-caption, 0.8125rem);
    font-weight: 600;
}
.entity-detail__spark {
    inline-size: 100%;
    block-size: 40px;
    fill: none;
    stroke: var(--route-accent, currentColor);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
}
.entity-detail__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-block-start: auto;
}
.entity-detail__rows {
    font-size: var(--type-caption, 0.8125rem);
    color: var(--muted-foreground);
    text-decoration: underline;
    text-underline-offset: 2px;
}
.entity-detail__hops {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    font-size: var(--type-caption, 0.8125rem);
}
.entity-detail__hop {
    color: var(--foreground, currentColor);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklab, currentColor 40%, transparent);
    text-underline-offset: 3px;
    border-radius: 2px;
}
.entity-detail__hop:hover {
    text-decoration-color: currentColor;
}
.entity-detail__hop:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}
.entity-detail__empty {
    margin: 0;
    font-size: var(--type-caption, 0.8125rem);
}
</style>
