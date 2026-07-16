<script setup lang="ts">
// FilterPanel — the ONE right-edge filter surface (C.W3.3, W-L4). One Glass
// `Drawer mode="live-behind"` owns the material, geometry, drag, and motion from
// PIP through LEDGER to DRAWER. It overlays one full-width live stage without the
// retired rail, content gutter, or a second page-level trigger.
//
// It is a generic SHELL: it owns the chrome (the "Filters" header, the freshness
// colophon, the cross-links) and renders the ACTIVE dashboard's filter BODY — passed
// by the consumer as the `body` prop — inside it. The reset/apply affordances belong
// to the body; the shell never reaches into the body's logic.
import { computed, inject, onBeforeUnmount, ref, watch, type Component } from "vue";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
    DrawerDescription,
} from "@mkbabb/glass-ui/drawer";
import { Button } from "@mkbabb/glass-ui/button";
import { Filter, SlidersHorizontal, X } from "@lucide/vue";
import { DASHBOARD_KEY, useDashboardRegistry } from "@/contract";
import { useFilterPane } from "@/filter/composables/useFilterPane";
import { useFilterPanel } from "@/filter/composables/useFilterPanel";
import { useFilterLedger } from "@/filter/composables/useFilterLedger";
import { useFreshness } from "@/platform/chrome/freshness";
import { useMobileRegister } from "@/platform/composables/useMobileRegister";
import { useSavedViews, currentUrl } from "@/platform/composables/useSavedViews";
import { useSelection } from "@/platform/stores/useSelection";
import { useViewParams } from "@/platform/stores/useViewParams";
import type { YearMode } from "@/data/useYearScope";
import YearScrubber from "./components/YearScrubber.vue";
import FilterDrawerFoot from "./components/FilterDrawerFoot.vue";
import { useDismissArbiter } from "@/platform/interaction/useDismissArbiter";
import {
    FILTER_SNAP,
    filterRegisterFor,
    filterSnapFor,
    filterSnapPoints,
} from "./filter-continuum";

// The consumer (DashboardView) mounts this shell in PlatformShell's `filter` slot and
// passes the active dashboard's filter BODY as `body`. The shell owns only the chrome
// (header, freshness, cross-links); the body owns its own controls + membership
// machinery. This is the ONE filter for every viewport — the live-behind Drawer is
// the same primitive at every register, dissolving the old desktop/mobile fork.
const props = defineProps<{ body?: Component }>();
const ctx = inject(DASHBOARD_KEY);
// The instance-built registry, injected (L1-INVERSION) — core chrome never imports
// `@/dashboards/registry`. Gates the cross-link "ready" state on a registered target slug.
const { findDashboard } = useDashboardRegistry();
const activeDashboard = computed(() => (ctx ? findDashboard(ctx.id) : undefined));

const filterBody = computed<Component | undefined>(() => props.body);
const hasFilter = computed(() => Boolean(filterBody.value));

// The freshness colophon, mirrored in the drawer foot (the data-vintage chip surfaced
// so a filtering user reads the vintage without leaving).
const { label: freshnessLabel } = useFreshness();

// The shared flag requests the full register. Its false state leaves this same
// physical Drawer at the non-occluding PIP detent.
const { open } = useFilterPane();
const { clearPin } = useFilterPanel();
const { chips, appliedCount, selectionCount, filterResponse } = useFilterLedger();
const { isPhone } = useMobileRegister();

// W-L4 — the Drawer is the continuum. Its one Glass snap scalar moves one physical
// side lens through PIP → LEDGER → DRAWER; the shared `open` flag is only the public
// request for the full register, never a second geometry or presence authority.
const activeSnapPoint = ref<number | string | null>(
    open.value ? FILTER_SNAP.drawer : FILTER_SNAP.pip,
);
const snapPoints = computed<number[]>(() => [...filterSnapPoints(isPhone.value)]);
const register = computed(() => filterRegisterFor(activeSnapPoint.value, isPhone.value));
const ledgerActive = computed(() => register.value === "ledger");
const drawerActive = computed(() => register.value === "drawer");
const doorLabel = computed(() =>
    drawerActive.value
        ? "Close filters"
        : ledgerActive.value
          ? "Open filters"
          : `Review filters${appliedCount.value ? `, ${appliedCount.value} applied` : ""}`,
);
const scopeLabel = computed(() => {
    if (filterResponse.value === "static") return "Static figure · filters do not alter it";
    const grain = activeDashboard.value?.entityGrain ?? "entity";
    return `${grain.charAt(0).toUpperCase()}${grain.slice(1)} view`;
});

let dwell: ReturnType<typeof setTimeout> | null = null;
let writingOpenFromSnap = false;

function cancelDwell(): void {
    if (dwell) clearTimeout(dwell);
    dwell = null;
}

function retarget(next: "pip" | "ledger" | "drawer"): void {
    activeSnapPoint.value = filterSnapFor(next);
}

function armLedgerDwell(): void {
    cancelDwell();
    dwell = setTimeout(() => retarget("pip"), 4_000);
}

function showLedger(): void {
    if (isPhone.value || register.value === "drawer") return;
    if (register.value === "ledger") armLedgerDwell();
    else retarget("ledger");
}

function activateContinuum(): void {
    if (register.value === "drawer") {
        open.value = false;
        return;
    }
    if (isPhone.value || register.value === "ledger") open.value = true;
    else retarget("ledger");
}

watch(
    open,
    (expanded) => {
        if (!expanded) clearPin();
        if (writingOpenFromSnap) return;
        const target = expanded ? "drawer" : "pip";
        if (register.value !== target) retarget(target);
    },
    { flush: "sync" },
);

// Glass writes the active detent after drag/fling. Reflect that one target into the
// public full-register flag without feeding a second target back into the spring.
watch(
    activeSnapPoint,
    (snap) => {
        cancelDwell();
        const next = filterRegisterFor(snap, isPhone.value);
        const expanded = next === "drawer";
        if (open.value !== expanded) {
            writingOpenFromSnap = true;
            open.value = expanded;
            writingOpenFromSnap = false;
        }
        if (next === "ledger") armLedgerDwell();
    },
    { flush: "sync" },
);

watch(isPhone, (phone) => {
    if (phone && filterRegisterFor(activeSnapPoint.value, false) === "ledger") retarget("pip");
});
function teardown(): void {
    cancelDwell();
    open.value = false;
    clearPin();
    retarget("pip");
}

watch(
    hasFilter,
    (available) => {
        if (!available) teardown();
    },
    { immediate: true },
);
onBeforeUnmount(teardown);

useDismissArbiter().claim(() =>
    open.value
        ? {
              id: "filter-drawer",
              priority: 30,
              outsidePointer: true,
              escape: true,
              within: (path) => path.some((node) => node instanceof HTMLElement && Boolean(node.closest("[data-testid='filter-panel']"))),
              guards: (path) => path.some((node) => node instanceof HTMLElement && Boolean(node.closest("[data-viz-plate]"))),
              onDismiss: () => (open.value = false),
          }
        : null,
);

// ── The year-scrubber (B4 §3, FD6 §6.3 — the filter's top stratum) ───────────
// The floating filter owns the multi-year scrubber: a year track + a mode toggle
// (single · aggregate) driving the platform `useYearScope` off the active dashboard's
// view-params, writing the year/mode to the URL so a copied link round-trips. The
// track is ACHROMATIC (time is not a data ramp, FD6 §10.3). It mounts only when the
// dashboard `hasMultiYear` and the feed (hence the year-scope) has attached.
const view = useViewParams();
const yearScope = computed(() => view.yearScope);

/** Show the scrubber only on a multi-year dashboard whose feed has landed. */
const hasScrubber = computed(() => Boolean(ctx?.hasMultiYear && yearScope.value));

/** The track domain — the feed's full sorted year list (empty until attached). */
const scrubberYears = computed<number[]>(() => yearScope.value?.years ?? []);

/** The active mode + active year (the thumb position + the re-weight anchor). */
const yearMode = computed<YearMode>(() => yearScope.value?.mode.value ?? "single");
const activeYear = computed<number>(
    () => yearScope.value?.activeYear.value ?? scrubberYears.value.at(-1) ?? 0,
);

/** O-LIB-CARRY (v1.0.29) — the scrubber's per-year data-absence notches, read off the active
    dashboard's own context (mirrors `crossLinks`/`hasMultiYear` above — the panel reads
    `DASHBOARD_KEY` directly rather than requiring the mount site, `DashboardView.vue`, to
    prop-drill a dashboard-specific set through the generic chrome). `ctx.dimYears` is a GETTER
    (not a stored ref, see the contract doc) — calling it here, inside this computed, is what
    establishes the reactive dependency through whatever live source it closes over. Undefined
    ⇒ empty (no dimming, byte-identical to every dashboard that doesn't declare one). */
const dimYears = computed<ReadonlySet<number> | readonly number[]>(
    () => ctx?.dimYears?.() ?? [],
);

/** Select a single year — writes `?year=` (the round-trip), the default mode. */
function pickYear(year: number): void {
    yearScope.value?.setSingle(year);
}

/** Toggle aggregate mode over the full span (the pooled all-years distribution),
    or fall back to single-at-latest when leaving aggregate. */
function toggleAggregate(): void {
    const ys = yearScope.value;
    if (!ys) return;
    if (ys.mode.value === "aggregate") ys.setSingle(ys.latestYear);
    else ys.setAggregate(scrubberYears.value);
}

// The freshness chip RE-WEIGHTS to the selected year (B4 §3, G10 §8.3): the vintage
// label folds in the active scope, so a filtering user reads "data as of … · FY{year}"
// (or "· all years" in aggregate).
const scopedFreshness = computed<string>(() => {
    const base = freshnessLabel.value;
    if (!hasScrubber.value) return base;
    const scope =
        yearMode.value === "aggregate" ? "all years" : `FY${activeYear.value}`;
    return base ? `${base} · ${scope}` : scope;
});

// ── Cross-links (the ECF↔USF fips hand-off, G10 §7.3) ────────────────────────
// A cross-link is a URL hand-off, NOT a shared store: the RouterLink carries the live
// selection key as `?fips=` so the sibling dashboard opens on the same state. The fips is
// the `primaryKey` scalar bridge — the FIRST pin of the set-valued selection (C.W4.2 S4a),
// now ACTUALLY populated (the old `selectedKey` was always null — no producer). When
// nothing is pinned the link still resolves, just without a pre-selection.
const selection = useSelection();

interface ResolvedCrossLink {
    label: string;
    to: { path: string; query?: Record<string, string> };
    /** True when the target dashboard is in the registry (else a marked stub). */
    ready: boolean;
}

const crossLinks = computed<ResolvedCrossLink[]>(() => {
    const links = ctx?.crossLinks ?? [];
    const fips = selection.primaryKey;
    return links.map((l) => {
        const slug = l.to.replace(/^\//, "").split("/")[0] ?? "";
        return {
            label: l.label,
            // The hand-off: the pinned fips rides as `?fips=` (omitted when unpinned).
            to: { path: l.to, query: fips ? { fips } : undefined },
            // The link lights up only once the target dashboard is registered; until
            // then it renders as a marked, inert stub.
            ready: Boolean(findDashboard(slug)),
        };
    });
});

// ── Saved views (RECAP.md #8, G10 §7.2) ──────────────────────────────────────
// The current view — filter dims + year-scope + pinned selection — already round-trips
// to the URL. So saving it is just bookmarking the full URL under a name. The drawer
// foot offers the SAVE door; the shelf is listed + restored from the gallery.
const savedViews = useSavedViews();
const saveOpen = ref(false);
const saveName = ref("");

/** Open the name prompt, pre-filling the dashboard title as the default label. */
function openSave(): void {
    saveName.value = ctx?.title ?? "";
    saveOpen.value = true;
}

/** Commit the current full URL to the shelf under the typed name, then close. */
function commitSave(): void {
    const slug = ctx?.id;
    if (!slug) return;
    savedViews.save({ name: saveName.value, slug, url: currentUrl() });
    saveOpen.value = false;
    saveName.value = "";
}

/** Dismiss the name prompt without saving. */
function cancelSave(): void {
    saveOpen.value = false;
    saveName.value = "";
}
</script>

<template>
    <Drawer
        v-if="hasFilter"
        :open="true"
        mode="live-behind"
        direction="right"
        :snap-points="snapPoints"
        v-model:active-snap-point="activeSnapPoint"
    >
        <DrawerContent
            :show-overlay="false"
            class="cp-drawer"
            :data-register="register"
            data-filter-continuum
            data-testid="filter-panel"
            aria-label="Filters"
            @open-auto-focus.prevent
            @escape-key-down.prevent
            @interact-outside.prevent
        >
            <Button
                type="button"
                variant="glass"
                class="cp-continuum__door"
                :aria-expanded="drawerActive"
                :aria-label="doorLabel"
                aria-controls="filter-drawer-body"
                data-filter-door
                @pointerenter="showLedger"
                @focusin="showLedger"
                @click="activateContinuum"
            >
                <SlidersHorizontal v-if="drawerActive" aria-hidden="true" />
                <Filter v-else aria-hidden="true" />
                <span
                    v-if="register === 'pip' && appliedCount"
                    class="cp-continuum__count"
                    aria-hidden="true"
                >
                    {{ appliedCount }}
                </span>
            </Button>

            <section
                v-if="!isPhone"
                v-show="ledgerActive"
                class="cp-continuum__ledger"
                aria-label="Filter summary"
            >
                <span
                    class="cp-continuum__scope"
                    :class="{ static: filterResponse === 'static' }"
                >
                    {{ scopeLabel }}
                </span>
                <span
                    v-for="chip in chips"
                    :key="chip.key"
                    class="cp-continuum__chip"
                >
                    {{ chip.label }}
                </span>
                <span
                    v-if="selectionCount"
                    class="cp-continuum__chip"
                    data-selection-count
                >
                    {{ selectionCount }} selected
                </span>
            </section>

            <div
                v-show="drawerActive"
                id="filter-drawer-body"
                class="cp-continuum__drawer"
            >
                <DrawerTitle class="cp-drawer__title">
                    <SlidersHorizontal class="h-4 w-4" aria-hidden="true" />
                    Filters
                </DrawerTitle>
                <DrawerDescription class="sr-only">
                    Filter and scope the active dashboard. The visualization stays live
                    behind this panel.
                </DrawerDescription>
                <Button
                    variant="ghost"
                    size="sm"
                    class="cp-drawer__close"
                    aria-label="Close filters"
                    data-testid="filter-close"
                    @click="open = false"
                >
                    <X class="h-4 w-4" aria-hidden="true" />
                </Button>

                <YearScrubber
                    v-if="hasScrubber"
                    :years="scrubberYears"
                    :mode="yearMode"
                    :active-year="activeYear"
                    :dim-years="dimYears"
                    @pick="pickYear"
                    @toggle-aggregate="toggleAggregate"
                />

                <div class="cp-drawer__body">
                    <component v-if="filterBody" :is="filterBody">
                        <template
                            v-for="(_, name) in $slots"
                            :key="name"
                            #[name]="scope"
                        >
                            <slot :name="name" v-bind="scope ?? {}" />
                        </template>
                    </component>
                </div>

                <FilterDrawerFoot
                    v-model:save-name="saveName"
                    :cross-links="crossLinks"
                    :freshness="scopedFreshness"
                    :save-open="saveOpen"
                    @open-save="openSave"
                    @commit-save="commitSave"
                    @cancel-save="cancelSave"
                />
            </div>
        </DrawerContent>
    </Drawer>
</template>

<style scoped>
/* Glass owns the material, side-lens geometry, drag, and motion. */
.cp-continuum__door {
    position: absolute;
    inset-block-start: 66.667%;
    inset-inline-start: 0;
    z-index: 2;
    display: grid;
    inline-size: 44px;
    block-size: 44px;
    min-inline-size: 44px;
    padding: 0;
    place-items: center;
    transform: translateY(-50%);
}
.cp-continuum__door > svg {
    inline-size: 1.15rem;
    block-size: 1.15rem;
}
.cp-continuum__count {
    position: absolute;
    inset-block-start: 0.2rem;
    inset-inline-end: 0.2rem;
    display: grid;
    min-inline-size: 1rem;
    block-size: 1rem;
    padding-inline: 0.15rem;
    place-items: center;
    border-radius: var(--radius-pill);
    background: var(--foreground);
    color: var(--background);
    font: 700 0.625rem/1 var(--font-mono);
}
.cp-continuum__ledger {
    position: absolute;
    inset-block-start: 66.667%;
    inset-inline-start: 44px;
    display: flex;
    inline-size: calc(50% - 44px);
    padding: 0.6rem;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    transform: translateY(-50%);
}
.cp-continuum__scope,
.cp-continuum__chip {
    padding: 0.25rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    font: 0.6875rem/1.2 var(--font-mono);
}
.cp-continuum__scope.static {
    border-style: dashed;
}
.cp-continuum__drawer {
    position: absolute;
    inset: 0;
    display: flex;
    min-block-size: 0;
    padding-block-start: var(--touch-target, 2.75rem);
    flex-direction: column;
}
.cp-drawer__title {
    display: flex;
    inline-size: 100%;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    padding: 0.95rem 3.5rem 0.75rem 1rem;
    border-block-end: 1px solid var(--border);
    color: var(--foreground);
    font-family: var(--font-display);
    font-size: 1rem;
}
.cp-drawer__close {
    position: absolute;
    inset-block-start: 3.25rem;
    inset-inline-end: 0.75rem;
}
.cp-drawer__body {
    flex: 1 1 auto;
    min-block-size: 0;
    padding: 0 1rem 0.5rem;
    overflow-y: auto;
}
@media (--phone) {
    .cp-continuum__door {
        inset-block-start: auto;
        inset-block-end: calc(1rem + env(safe-area-inset-bottom));
        transform: none;
    }
}
</style>
