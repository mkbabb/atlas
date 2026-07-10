<script setup lang="ts">
// FilterPanel — the ONE filter, re-seated as a CLOSED-BY-DEFAULT right
// `Drawer mode="live-behind"` (C.W3.3, CP-1/CP-3). Not a modal, not a left-anchored
// `position:fixed` rail: a glass lens that slides from the RIGHT, over a single
// full-width content stage. The viz stays LIVE behind it the whole time —
// `mode="live-behind"` bundles `modal:false` + no scrim + page-behind-interactive as
// CONFIGURED policy (the "lens not a modal" property, not a re-derived surface).
//
// The B-tranche `.filter-shell` left-`calc` anchor (`inset-inline-start:
// calc(var(--dock-w)…)`) + the hand-rolled collapse-spine + the §K5 open-default
// content gutter are RETIRED: a closed floating drawer occludes NOTHING on first
// paint, so the hero is fully visible (CP-1). The §K5 reactive-gutter machinery in
// `PlatformShell` was deleted by C3.1; here `useFilterPane().open` flips to
// closed-default and there is no gutter for the content to react to.
//
// PROBE (C3-10 / RR-4, resolved): `direction="right" × mode="live-behind"` COMPOSES at
// the resolved 3.9.0 pin — `DrawerDirection` includes `'right'`, vaul-vue owns the
// per-axis transform, and `mode="live-behind"` is overridable per-prop. The detent
// ladder (`snapPoints:[0.12,0.5,1]`, authored for the bottom sheet) is suppressed for
// the right lens via `:snap-points="[]"` → `hasSnapPoints=false` → a plain full-slide
// drawer. No `Sheet` fallback needed.
//
// `Drawer`/`DrawerContent`/`DrawerTitle`/`DrawerDescription` import from the ROOT
// barrel `@mkbabb/glass-ui` (`./drawer` is an UNPUBLISHED subpath — C3-5). The drawer
// width reads `--cp-drawer-w` (Drawer has no `size="dock"`). This drawer is ALSO the
// A4 dock pull-out target (C3.2's affordance drives the same `useFilterPane().open`).
//
// It is a generic SHELL: it owns the chrome (the "Filters" header, the freshness
// colophon, the cross-links) and renders the ACTIVE dashboard's filter BODY — passed
// by the consumer as the `body` prop — inside it. The reset/apply affordances belong
// to the body; the shell never reaches into the body's logic.
import { computed, inject, ref, watch, type Component } from "vue";
// I1 BA→4.0 — the Drawer moved to the published `/drawer` subpath (C3-5's "unpublished
// subpath" forcing the root import is RESOLVED in 4.0; W-DRAWER-ABROGATE rebuilt the body
// on reka+SpringProgress with the vaul-vue prop surface — mode/direction/snapPoints/
// showOverlay — preserved byte-compatible).
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
    DrawerDescription,
} from "@mkbabb/glass-ui/drawer";
import { Button } from "@mkbabb/glass-ui/button";
import { SlidersHorizontal, X } from "@lucide/vue";
import { DASHBOARD_KEY, useDashboardRegistry } from "@/contract";
import { useFilterPane } from "@/filter/composables/useFilterPane";
import { useFilterPanel } from "@/filter/composables/useFilterPanel";
import { useFreshness } from "@/platform/chrome/freshness";
import { useSavedViews, currentUrl } from "@/platform/composables/useSavedViews";
import { useSelection } from "@/platform/stores/useSelection";
import { useViewParams } from "@/platform/stores/useViewParams";
import type { YearMode } from "@/data/useYearScope";
import YearScrubber from "./components/YearScrubber.vue";
import FilterDrawerFoot from "./components/FilterDrawerFoot.vue";

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

// The freshness colophon, mirrored in the drawer foot (the data-vintage chip surfaced
// so a filtering user reads the vintage without leaving).
const { label: freshnessLabel } = useFreshness();

// The drawer open state — the SHARED useFilterPane singleton, flipped to closed by
// default (C3.3): a closed floating drawer occludes nothing on first paint, the hero
// is fully visible. The same `open` is the A4 dock pull-out target (C3.2 drives it).
const { open } = useFilterPane();

// THE clearPin SEAM (K-FILTER-UNIFIED §4.H · the H2 completion) — the panel-LOCAL pin releases on
// the drawer's open false-edge (ONE watcher where the shell already reads the open-truth). A
// scroll-resumed reader re-takes the in-viewport context after close; the pin never strands a stale
// projection. NEVER a K-ACTIVE write — the pin is `useFilterPanel`'s panel-local singleton.
const { clearPin } = useFilterPanel();
watch(open, (o) => {
    if (!o) clearPin();
});

// The right lens carries NO bottom-sheet detents — pass `[]` so vaul renders a plain
// full-slide right drawer (`hasSnapPoints=false`), overriding the live-behind ladder.
const drawerSnapPoints: number[] = [];

const hasFilter = computed(() => Boolean(filterBody.value));

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
    <template v-if="hasFilter">
        <!-- O-D3 — THE FLOATING FILTERS PILL IS KILLED (render-A cross-route; L33 X9). The quiet
             top-right `.cp-filter-trigger` overlaid the AK inset / legends / readouts on every
             route (a THIRD door onto the SAME `useFilterPane().open` singleton). Filter entry is
             now consolidated onto the two LAWFUL doors that already exist and already drive this
             same open flag: the dock instrument (Dock.vue's desktop pull-out row +
             DockSettings.vue's phone gear sheet, both `data-testid="dock-filter-pullout"`) and the
             per-plate icon (VizPlate's `viz-dock__filter-slot` toggle, which pins + opens this
             SAME drawer). No page-level affordance is re-added — the dock instrument already
             fills that role at every viewport, so nothing here occludes content on first paint. -->

        <!-- The right live-behind filter Drawer — closed by default. `mode="live-behind"`
             bundles `modal:false` + no scale-down; `:show-overlay="false"` drops the
             scrim so the viz stays LIVE + interactive behind. `direction="right"` slides
             from the right edge; `:snap-points="[]"` makes it a plain full-slide lens.
             `:dismissible="true"` RESTORES Esc-to-dismiss (D2.b): the glass-ui `Drawer`
             declares `dismissible: {type:Boolean}` with no default, so an ABSENT prop
             resolves to `false` and spreads into vaul — clobbering vaul's own `default:true`
             and making vaul `preventDefault()` the Escape (the dismissable-layer never fires).
             Passing it explicitly true lets the real Escape close the lens + reka returns
             focus to the summoning trigger (the AX round-trip). The surface geometry + the
             FLOATING glass tier live in `platform/design/chrome-overlays.css` (UNSCOPED — the
             body-teleported DrawerContent never receives this SFC's Vue scope attr).
             THE LIQUID REVEAL (arm b · §H4 · i0-filter-liquid): the `.glass-reveal` class composes
             the PUBLISHED BB.W-LIQUID-REVEAL recipe (the spring-snappy-clocked scale + blur-settle +
             fade, keyed off the content's `data-state`), so the lens BLOOMS in over multiple eased
             frames instead of the discrete §H2/§H4 height-step. The `scale:`/`translate:` LONGHANDS
             compose with vaul's own slide `transform` (no clobber), and the recipe carries its own
             PRM carve (the spatial channels snap, the fade survives). -->
        <Drawer
            v-model:open="open"
            mode="live-behind"
            direction="right"
            :snap-points="drawerSnapPoints"
            :dismissible="true"
        >
            <DrawerContent
                :show-overlay="false"
                class="cp-drawer glass-reveal"
                data-testid="filter-panel"
                aria-label="Filters"
            >
                <!-- O-D3/CH-E-2 SEAM (glass-fenced, carried to WG-E·O-E8): reka's DialogPortal
                     drops this `data-testid`/`aria-label` on teleport (the name survives only via
                     reka's OWN internal DialogTitle backstop below); the O-E8 wrapper restores
                     both, queued behind the 5.0.0 cut — unchanged until then. -->
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
                    size="icon-sm"
                    class="cp-drawer__close"
                    aria-label="Close filters"
                    data-testid="filter-close"
                    @click="open = false"
                >
                    <X class="h-4 w-4" aria-hidden="true" />
                </Button>

                <!-- The year-scrubber — the top stratum (B4 §3, FD6 §6.3). The control is
                     the colocated <YearScrubber> sub-component; the host owns the
                     `useYearScope` write the control's pick/aggregate intents drive. -->
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
                    <!-- TRANSPARENT SLOT-FORWARD (O-A11 residue · the band-0 reach): the shell is a
                         generic wrapper, so it FORWARDS every slot it is handed straight through to the
                         injected `body` component. This is the idiomatic Vue transparent-wrapper pattern
                         (`v-for (_, name) in $slots` → a re-emitted `#[name]`), and it is what makes the
                         body's own named slots CONSUMABLE from the route — e.g. `UnifiedFilterPanel`'s
                         band-0 `#algebra` band: a route mounts `<FilterPanel :body="UnifiedFilterPanel">`
                         and paints `<template #algebra>…</template>` on the SHELL, which lands in the
                         panel's algebra band. ADDITIVE: no slots handed ⇒ `$slots` empty ⇒ the forward
                         renders nothing, byte-identical to the prior bare `<component :is>`. -->
                    <component :is="filterBody">
                        <template
                            v-for="(_, name) in $slots"
                            :key="name"
                            #[name]="scope"
                        >
                            <slot :name="name" v-bind="scope ?? {}" />
                        </template>
                    </component>
                </div>

                <!-- The drawer foot — the save-view + cross-links + freshness cluster, the
                     colocated <FilterDrawerFoot> sub-component. The host owns the save-name
                     model + the `useSavedViews` write the foot's intents drive. -->
                <FilterDrawerFoot
                    v-model:save-name="saveName"
                    :cross-links="crossLinks"
                    :freshness="scopedFreshness"
                    :save-open="saveOpen"
                    @open-save="openSave"
                    @commit-save="commitSave"
                    @cancel-save="cancelSave"
                />
            </DrawerContent>
        </Drawer>
    </template>
</template>

<style scoped>
/* ── THE RIGHT LIVE-BEHIND LENS — surface seam ─────────────────────────────────
   The drawer SURFACE (the right-anchor geometry + the `--cp-drawer-w` width clamp +
   the FLOATING glass tier + the grip kill) is NOT here. It cannot be: glass-ui's
   DrawerContent body-teleports through reka's DialogPortal, and a Vue `<style scoped>`
   block's `data-v-*` scope attr does NOT cross the Portal — so a scoped `.cp-drawer`
   rule is DEAD CSS on the teleported element. The surface lives UNSCOPED in
   `platform/design/chrome-overlays.css` (the teleport target sees the global cascade).
   Only the INNER chrome below (title / close / scrubber / body / foot — authored in
   THIS template, so they DO carry the scope attr) is styled here. */

/* The header title — the lens crest. */
.cp-drawer__title {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    padding: 0.95rem 1rem 0.6rem;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--foreground);
}
/* The close affordance is the glass `Button` (variant="ghost" size="icon-sm") — it OWNS
   its own surface/hover/focus/radius. Only the absolute placement in the lens crest is
   the host's to keep. */
.cp-drawer__close {
    position: absolute;
    inset-block-start: 0.75rem;
    inset-inline-end: 0.75rem;
    z-index: 1;
}

/* The year-scrubber (B4 §3) + the drawer foot (save-view · cross-links · freshness) skins
   live with their colocated sub-components (`components/YearScrubber.vue`,
   `components/FilterDrawerFoot.vue`) — the §Y componentize moved their grammar out of this
   host. Only the drawer SHELL chrome (title · close · body · summon trigger) is styled here. */

/* The body region scrolls when the injected filter outgrows the lens — the header +
   foot stay pinned (the chrome frames the body, never clips it). */
.cp-drawer__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1rem 0.5rem;
}

/* THE SUMMON TRIGGER IS RETIRED (O-D3 — the floating FILTERS pill kill, render-A cross-route;
   L33 X9). `.cp-filter-trigger` used to float this drawer's ONE open door at every viewport; it
   now has two lawful doors instead (the dock instrument's pull-out/gear-sheet row + the per-plate
   VizPlate filter icon), so the third floating door — and the top-right content collision it
   caused on every route — is gone, not re-aimed. */
</style>
