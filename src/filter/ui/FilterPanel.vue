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
import { computed, inject, nextTick, onBeforeUnmount, ref, watch, type Component } from "vue";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
    DrawerDescription,
} from "@mkbabb/glass-ui/drawer";
import { Button } from "@mkbabb/glass-ui/button";
import { Filter, SlidersHorizontal, X } from "@lucide/vue";
import { DASHBOARD_KEY, useDashboardRegistry } from "../../contract/index.js";
import { useFilterPane } from "../composables/useFilterPane.js";
import { useFilterPanel } from "../composables/useFilterPanel.js";
import { useFilterLedger } from "../composables/useFilterLedger.js";
import { useFreshness } from "../../platform/chrome/freshness.js";
import { useSavedViews, currentUrl } from "../../platform/composables/useSavedViews.js";
import { useSelection } from "../../platform/stores/useSelection.js";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import type { YearMode } from "../../data/useYearScope.js";
import YearScrubber from "./components/YearScrubber.vue";
import FilterDrawerFoot from "./components/FilterDrawerFoot.vue";
import { useDismissArbiter } from "../../platform/interaction/useDismissArbiter.js";
import { useDockPortals } from "../../platform/chrome/dock/composables/useDockPortals.js";
import {
    FILTER_SNAP,
    filterRegisterFor,
    filterSnapFor,
    filterSnapPoints,
    type FilterRegister,
} from "./filter-continuum.js";

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

const filterBody = computed<Component | undefined>(() => props.body);
const hasFilter = computed(() => Boolean(filterBody.value));

// The freshness colophon, mirrored in the drawer foot (the data-vintage chip surfaced
// so a filtering user reads the vintage without leaving).
const { label: freshnessLabel } = useFreshness();

// The shared flag requests the full register. Its false state leaves this same
// physical Drawer at the non-occluding PIP detent.
const { open } = useFilterPane();
const { clearPin } = useFilterPanel();
const { appliedCount } = useFilterLedger();

// W-L4 — the Drawer is the continuum. Its one Glass snap scalar moves one physical side lens
// between the PIP tab (at rest) and the full DRAWER (on pull); the shared `open` flag is only the
// public request for the full register, never a second geometry or presence authority. There is NO
// third detent (OF-23/28): the intermediary ledger is gone from the ladder, so no gesture or drag
// can land the drawer on a mostly-empty half-open sheet.
const activeSnapPoint = ref<number | string | null>(
    open.value ? FILTER_SNAP.drawer : FILTER_SNAP.pip,
);
const snapPoints = computed<number[]>(() => [...filterSnapPoints()]);
const register = computed(() => filterRegisterFor(activeSnapPoint.value));
const drawerActive = computed(() => register.value === "drawer");
const doorLabel = computed(() =>
    drawerActive.value
        ? "Close filters"
        : `Open filters${appliedCount.value ? `, ${appliedCount.value} applied` : ""}`,
);

let writingOpenFromSnap = false;

function retarget(next: FilterRegister): void {
    activeSnapPoint.value = filterSnapFor(next);
}

/** The one gesture: the tab opens the full drawer; the open drawer's door closes it. */
function activateContinuum(): void {
    open.value = register.value !== "drawer";
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

// Glass writes the active detent after drag/fling. Reflect that one target into the public
// full-register flag without feeding a second target back into the spring.
watch(
    activeSnapPoint,
    (snap) => {
        const expanded = filterRegisterFor(snap) === "drawer";
        if (open.value !== expanded) {
            writingOpenFromSnap = true;
            open.value = expanded;
            writingOpenFromSnap = false;
        }
    },
    { flush: "sync" },
);

function teardown(): void {
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

// The ONE dock/app-scoped registry (provided by PlatformShell) — reached ONCE so the filter and the
// per-plate export claims share the SAME `topmost` stack (two `useDockPortals()` calls without a
// provider would mint two isolated registries).
const { claimOpen, topmost } = useDockPortals();

// TOPMOST SINGLE-SURFACE DISMISSAL (U6) — the filter is the dismissal owner ONLY while it is the
// topmost held surface. When a per-plate export MENU opens over the drawer that menu becomes topmost,
// so the filter YIELDS its escape / outside-pointer authority — Reka dismisses the menu alone on the
// first event, and the filter (and its dock pin) survive. Once the menu closes the filter is topmost
// again and re-claims, so the next Escape dismisses the filter. Null topmost ⇒ the filter is the only
// surface, so it owns dismissal.
const filterTopmost = computed(() => {
    const top = topmost.value;
    return !top || top.key === "filter-drawer";
});

useDismissArbiter().claim(() =>
    open.value
        ? {
              id: "filter-drawer",
              priority: 30,
              // Gated on the filter being topmost (U6) — a higher export menu dismisses alone.
              outsidePointer: filterTopmost.value,
              escape: filterTopmost.value,
              // The OUTSIDE-POINTER exemption (F8 cure) — the filter's own surface AND the co-located
              // dock membrane (`[data-membrane-band]`, which the facet-6 provenance detent carries): a
              // facet-6 / membrane-facet pointer click is NOT "outside", so the two co-located
              // affordances coexist (a provenance click no longer closes an open drawer). Scoped to
              // `within` (pointer only) so ESCAPE from the dock still closes the drawer (guards-only).
              within: (path) => path.some((node) => node instanceof HTMLElement && Boolean(node.closest("[data-testid='filter-panel'], [data-membrane-band]"))),
              guards: (path) => path.some((node) => node instanceof HTMLElement && Boolean(node.closest("[data-viz-plate]"))),
              onDismiss: () => (open.value = false),
          }
        : null,
);

// ── THE DOCK HOLD (E24-ADJUDICATION §6.3 · the typed outside-interaction census) ──────────────────
// This drawer is BODY-TELEPORTED (Reka DialogPortal → <body>) OUTSIDE the dock, so a pointer/focus
// move into it once re-collapsed the dock mid-interaction. Registering the drawer's live `open` as a
// dock claim pins the rail open for the drawer's whole lifetime (`useDockPortals` → the dock's
// `portal` intent above bloom). The claim carries the typed census payload (surface destination,
// trigger, and the concrete reason the hold is required) and auto-releases on scope dispose, so a
// route swap can never strand the pin.
claimOpen(
    () => ({
        key: "filter-drawer",
        trigger: "membrane-filter-trigger",
        surface: "body-teleport",
        reason: "teleported-surface-fires-dock-leave",
    }),
    open,
    // THE CLOSE → FOCUS → RELEASE TRANSACTION (S3) — restoreFilterFocus runs in the `closing` phase
    // (the pin still held, the invoker still rendered) and the pin relinquishes ONLY afterwards, so
    // focus is provably restored BEFORE release and the collapsing rail never strands it at BODY. One
    // ordered owner — never a second watch(open) racing the phase release.
    { restoreFocus: restoreFilterFocus },
);

// ── THE NONMODAL FOCUS POLICY (C3 · U2/U3/§3.2 — seat, invoker-return, named exit) ────────────────
// FilterPanel is DELIBERATELY nonmodal (live-behind, `@open-auto-focus.prevent`): opening it never
// auto-seated focus, so on a KEYBOARD open focus stayed on the (dock) trigger and Tab then WALKED THE
// PAGE — the C3 scroll-jump (0→8053) and the focus-to-BODY on collapse. We do NOT modalize or install a
// hard focus trap (that would change the adjudicated nonmodal semantics — an owner escalation, NOT
// built here). Instead: SEAT on open, RETURN to the EXACT invoker on close, and a NAMED EXIT at the
// Tab boundary — all `preventScroll` so the page never lurches.
const FOCUSABLE_SEL =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="slider"]';

/** A rendered, non-hidden node can receive focus (a collapsed / unmounted invoker cannot). */
function isFocusReceivable(el: HTMLElement): boolean {
    return el.getClientRects().length > 0 && el.getAttribute("aria-hidden") !== "true";
}
/** The focusable node — the element itself when focusable, else its first focusable descendant. */
function focusTarget(el: HTMLElement): HTMLElement {
    return el.matches(FOCUSABLE_SEL) ? el : (el.querySelector<HTMLElement>(FOCUSABLE_SEL) ?? el);
}
/** The close RECEIVER (§3.2 · U3): the exact invoker (the membrane filter trigger) while it is
    rendered + actionable, else the owner-ratified persistent crest. */
function closeReceiver(): HTMLElement | null {
    const invoker = document.querySelector<HTMLElement>("[data-membrane-filter-trigger]");
    if (invoker && isFocusReceivable(invoker)) return focusTarget(invoker);
    return document.querySelector<HTMLElement>("[data-testid='dock-brand']");
}

// on OPEN → seat focus on the drawer's first control (Tab starts INSIDE the panel; scrollY unmoved).
function seatDrawerFocus(): void {
    const body = document.getElementById("filter-drawer-body");
    if (!body) return;
    const first = body.querySelector<HTMLElement>(FOCUSABLE_SEL);
    (first ?? body).focus({ preventScroll: true });
}
// on CLOSE → return focus to the EXACT invoker (U3), else the crest fallback — reclaim ONLY when focus
// is STRANDED (fell to BODY on the teleport teardown, or is still inside the closing panel); never
// yank focus a user has deliberately re-placed elsewhere on the page (§3.2).
function restoreFilterFocus(): void {
    const active = document.activeElement;
    const panel = document.querySelector("[data-testid='filter-panel']");
    const strayed =
        active === document.body ||
        active === null ||
        (active instanceof Node && Boolean(panel?.contains(active)));
    if (!strayed) return;
    closeReceiver()?.focus({ preventScroll: true });
}
watch(open, (isOpen, was) => {
    if (isOpen === was) return;
    if (isOpen) void nextTick(seatDrawerFocus);
    // the CLOSE focus-restore is OWNED by the claimOpen transaction (restoreFilterFocus) so it is
    // provably ordered before the pin releases — no second racing watcher here (S3).
});

// ── THE NONMODAL NAMED EXIT (S4 · §3.2) ──────────────────────────────────────────────────────────
// Nonmodal means the drawer is NOT trapped — but a Tab off its focusable boundary must not sink to
// BODY. The drawer surface is the whole teleported DrawerContent (`[data-testid=filter-panel]`), which
// INCLUDES Glass's leading `role="slider"` "Drawer position" handle emitted BEFORE the body. At the
// first (Shift+Tab) or last (Tab) focusable we redirect to the NAMED receiver (the invoker, else the
// crest) — a real, visible, named control — and normal tabbing continues from there. An EXIT to a
// named receiver, never a wrap-around trap and never BODY.
function drawerBoundary(): { first: HTMLElement; last: HTMLElement } | null {
    const surface = document.querySelector("[data-testid='filter-panel']");
    if (!surface) return null;
    const foci = [...surface.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)].filter(
        (el) => el.getClientRects().length > 0,
    );
    if (foci.length === 0) return null;
    return { first: foci[0]!, last: foci[foci.length - 1]! };
}
function onDrawerTab(event: KeyboardEvent): void {
    if (event.key !== "Tab" || !open.value) return;
    const active = document.activeElement;
    const surface = document.querySelector("[data-testid='filter-panel']");
    if (!(active instanceof Node) || !surface?.contains(active)) return;
    const edge = drawerBoundary();
    if (!edge) return;
    const atBoundary = event.shiftKey ? active === edge.first : active === edge.last;
    if (!atBoundary) return;
    event.preventDefault();
    closeReceiver()?.focus({ preventScroll: true });
}
watch(open, (isOpen) => {
    if (typeof document === "undefined") return;
    if (isOpen) document.addEventListener("keydown", onDrawerTab, true);
    else document.removeEventListener("keydown", onDrawerTab, true);
});
onBeforeUnmount(() => {
    if (typeof document !== "undefined")
        document.removeEventListener("keydown", onDrawerTab, true);
});

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

            <div
                v-show="drawerActive"
                id="filter-drawer-body"
                class="cp-continuum__drawer"
                tabindex="-1"
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
/* OF-23 — at REST the surface is a PULL TAB, nothing else: the DrawerContent's own glass material
   collapses at the pip register so only the door tab (funnel glyph, left-rounded grab lip) paints;
   the invisible side lens is click-through and the figure reads live behind it, nonmodal — zero
   full-height chrome. Glass renders the DrawerContent through Reka's DialogPortal (teleported to
   <body>), so this SFC's scope hash NEVER reaches its root — the R2 scoped override silently missed
   and the full-height paper rail kept painting. We bind the rest-state override through the stable
   `data-filter-continuum` marker with `:global` (the VizAppendixDock idiom for teleported glass), at
   a `.cp-drawer[data-filter-continuum]` specificity that out-ranks Glass's own snap-points fill and
   right-rail border. The drawer register keeps Glass's full material. */
:global(.cp-drawer[data-filter-continuum][data-register="pip"]) {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    pointer-events: none;
}
/* Glass's `.glass-overlay::before` specular pseudo carries a rest-hairline floor + an inset edge
   box-shadow, so even with the material zeroed it still paints a faint full-height edge glint down
   the invisible side lens. Neutralize the pseudo in the SAME teleport-reaching rest-state override. */
:global(.cp-drawer[data-filter-continuum][data-register="pip"])::before {
    display: none;
}
.cp-drawer[data-register="pip"] .cp-continuum__door {
    pointer-events: auto;
    border-start-start-radius: var(--radius-pill);
    border-end-start-radius: var(--radius-pill);
    border-start-end-radius: 0;
    border-end-end-radius: 0;
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
