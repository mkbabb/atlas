<script setup lang="ts">
// Dock — the platform's one dock (U/B7 §2.2, O-1, O-2). `SiteShell` mounts it once, above the
// router, so it outlives every route change: the same node on `/`, on a dashboard, on a subject
// page, under `/data` and on a 404. It reads the active route's `DashboardContext` as a prop
// (undefined off a dashboard route) and renders two layers:
//   • the SITE layer, on every page: the crest (home and progress), Dashboards, Search, Saved views;
//   • the ROUTE layer, only with a context: the chapter rungs, Filters, Compare years, Save this view.
//
// Two registers of the one component, chosen by the viewport (`useMobileRegister`):
//   • ≥ 768 px — the vertical GlassDock rail at the top-left. On `/` it rests open, 280 px wide, and
//     its run lists the ranked roster (DockRoster). Elsewhere it rests as the 44 × 44 crest circle
//     with the progress track on its rim, and opens on hover or focus. Past the top of a dashboard,
//     the section pager (‹ Section n of N ›) sits beside the circle (MembraneTitleLozenge).
//   • < 768 px — a horizontal GlassDock bar on the bottom edge, 56 px tall, with the crest pinned at
//     the start and More at the end, and a cell list per context (§2.2's table). It slides out after
//     a downward scroll of more than one viewport and back on any upward scroll, on focus inside it
//     and at the page end; the content reserve under it does not change, so hiding moves no layout.
//
// The dock carries no figure subject (§L D3-1): per-figure tools live on the figure.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { DarkModeToggle } from "@mkbabb/glass-ui/dark-mode-toggle";
import { DockSeparator, GlassDock } from "@mkbabb/glass-ui/dock";
import { ScrollProgressRim } from "@mkbabb/glass-ui/scroll-progress-rim";
import DockCrest from "./components/DockCrest.vue";
import DockStepperRender from "./components/DockStepperRender.vue";
import DockFoot from "./components/DockFoot.vue";
import DockRoster from "./components/DockRoster.vue";
import DockDashboardSelect from "./components/DockDashboardSelect.vue";
import DockSectionSelect from "./components/DockSectionSelect.vue";
import DockSearch from "./components/DockSearch.vue";
import DockSavedViews from "./components/DockSavedViews.vue";
import DockFilterTrigger from "./components/DockFilterTrigger.vue";
import DockSettings from "./DockSettings.vue";
import MembraneTitleLozenge from "./MembraneTitleLozenge.vue";
import { MEMBRANE_FACETS } from "./membrane-facet.js";
import { spineFill } from "./spine-fill.js";
import { useDockCollapse, type DockExposed } from "./composables/useDockCollapse.js";
import { useDockStepper } from "./composables/useDockStepper.js";
import { useDockDataState } from "./composables/useDockDataState.js";
import { useMobileRegister } from "../../composables/useMobileRegister.js";
import { useScrollChrome } from "./composables/useScrollChrome.js";
import { useDocumentScrollProgress } from "../../../motion/useScrollProgress.js";
import { useReducedMotion } from "../../../motion/useReducedMotion.js";
import { useDockPortals } from "./composables/useDockPortals.js";
import { revealReleasesOnLeave, revealPersists } from "./composables/coarse-reveal.js";
import { useFilterPane } from "../../../filter/composables/useFilterPane.js";
import type { DashboardContext } from "../../../contract/index.js";
import type { SiteSearchSource, SiteSubject } from "./site.js";

const props = withDefaults(
    defineProps<{
        /** The active route's chrome contract; undefined off a dashboard route (the site layer only). */
        context?: DashboardContext;
        /** True on the homepage (`/`): the rail rests open with the roster at ≥ 768 px. */
        home?: boolean;
        /** The subject index the roster's "By subject" row opens. */
        subjects?: readonly SiteSubject[];
        /** Search sources beyond the dashboards (sci: the school units), loaded on first open. */
        searchSources?: readonly SiteSearchSource[];
        /** An ordered ramp for a spectrum dashboard's spine and progress track. */
        ramp?: readonly string[];
        /** Wire glass-ui's no-transition fast path on the theme toggle (an instant re-print). */
        disableTransitions?: boolean;
    }>(),
    {
        context: undefined,
        home: false,
        subjects: () => [],
        searchSources: () => [],
        ramp: undefined,
        disableTransitions: true,
    },
);

const ctx = computed(() => props.context);
const membraneFacets = MEMBRANE_FACETS.join(" ");

// The one document-progress scalar: the progress track, the stepper's end zone, the crown gate.
const scrollProgress = useDocumentScrollProgress();
const ROUTE_TRITONE = [
    "var(--route-accent)",
    "var(--route-accent-warm, var(--route-accent))",
    "var(--route-accent-cool, var(--route-accent))",
] as const;
const identityRamp = computed<readonly string[]>(
    () => props.ramp ?? ctx.value?.theme?.barometerRamp ?? ROUTE_TRITONE,
);

// The stepper outlives the route: it re-seeds on a context change (useDockStepper's route watch).
// The rungs, the section pager and the phone Sections cell share this one handle.
const stepper = useDockStepper(() => ctx.value, scrollProgress);
const spineStyle = computed(() => ({ "--spine-fill": spineFill(identityRamp.value) }));

const { isPhone, isNoHover } = useMobileRegister();
const canHover = computed(() => !isNoHover.value);
const reduced = useReducedMotion();

// ══ ≥ 768 px: THE RAIL ══════════════════════════════════════════════════════════════════════════
const { collapsed, toggle: collapseToggle, bindDock, setIntent } = useDockCollapse();
const dockRef = ref<DockExposed | null>(null);
watch(dockRef, (inst) => bindDock(inst), { immediate: true });

// The rest posture: open on `/` (the roster is the homepage's index), the crest circle elsewhere.
watch(
    [dockRef, () => props.home],
    ([inst, home]) => {
        if (inst) setIntent("register", !home);
    },
    { immediate: true },
);

// An open filter drawer (teleported outside the rail) pins the rail open while it is open.
const { anyHeld: anyPortalOpen } = useDockPortals();
watch(anyPortalOpen, (open) => setIntent("portal", open ? false : null), { immediate: true });

// The bloom: a pointer or focus over the circle opens the rail; leaving releases it. A gesture
// reveal (touch, pen, or any pointer on a no-hover surface) persists until an outside tap or an
// interrupted gesture (coarse-reveal.ts).
let detachBloom: (() => void) | null = null;
function bindBloom(inst: DockExposed | null): void {
    detachBloom?.();
    detachBloom = null;
    const el = (inst as unknown as { $el?: HTMLElement } | null)?.$el;
    if (!el) return;
    const bloom = (): void => setIntent("bloom", false);
    const restFromPointer = (e: PointerEvent): void => {
        if (revealReleasesOnLeave(e.pointerType, canHover.value)) setIntent("bloom", null);
    };
    const onFocusOut = (e: FocusEvent): void => {
        if (!el.contains(e.relatedTarget as Node | null)) setIntent("bloom", null);
    };
    const onOutsidePointerDown = (e: PointerEvent): void => {
        if (!revealPersists(e.pointerType, canHover.value) || anyPortalOpen.value) return;
        if (e.target instanceof Node && el.contains(e.target)) return;
        setIntent("bloom", null);
    };
    const onGestureInterrupt = (e: PointerEvent): void => {
        if (!revealPersists(e.pointerType, canHover.value) || anyPortalOpen.value) return;
        setIntent("bloom", null);
    };
    el.addEventListener("pointerenter", bloom);
    el.addEventListener("pointerleave", restFromPointer);
    el.addEventListener("pointercancel", onGestureInterrupt);
    el.addEventListener("lostpointercapture", onGestureInterrupt);
    el.addEventListener("focusin", bloom);
    el.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onOutsidePointerDown, true);
    detachBloom = (): void => {
        el.removeEventListener("pointerenter", bloom);
        el.removeEventListener("pointerleave", restFromPointer);
        el.removeEventListener("pointercancel", onGestureInterrupt);
        el.removeEventListener("lostpointercapture", onGestureInterrupt);
        el.removeEventListener("focusin", bloom);
        el.removeEventListener("focusout", onFocusOut);
        document.removeEventListener("pointerdown", onOutsidePointerDown, true);
    };
}
watch(dockRef, (inst) => bindBloom(inst), { immediate: true });
onBeforeUnmount(() => detachBloom?.());

// The crown: the section pager shows once the reader has left the top.
const { atTop } = useScrollChrome({ source: scrollProgress });

/** The rail's site layer shows while the rail is open (the circle is the crest alone). */
const railOpen = computed(() => !collapsed.value);

// ══ < 768 px: THE BAR ═══════════════════════════════════════════════════════════════════════════
// The route controls the bar's More sheet carries (Compare years, Save this view) for this context.
const dataState = useDockDataState(() => ctx.value);
const gearOpen = ref(false);
const { open: filterOpen } = useFilterPane();
// One sheet at a time on the bottom edge: the filter drawer closes More, and More closes the drawer.
watch(filterOpen, (open) => {
    if (open) gearOpen.value = false;
});
watch(gearOpen, (open) => {
    if (open && filterOpen.value) filterOpen.value = false;
});

/** The bar is out (slid below the edge). Read once per `scrollend`; never under reduced motion. */
const barOut = ref(false);
let lastY = 0;
let travelled = 0;
function onScrollEnd(): void {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    const atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (reduced.value || !isPhone.value || dy < 0 || atEnd) {
        travelled = 0;
        barOut.value = false;
        return;
    }
    travelled += dy;
    if (travelled > window.innerHeight) barOut.value = true;
}
function onBarFocus(): void {
    barOut.value = false;
}
onMounted(() => {
    lastY = window.scrollY;
    window.addEventListener("scrollend", onScrollEnd, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scrollend", onScrollEnd));
watch(gearOpen, (open) => {
    if (open) barOut.value = false;
});
</script>

<template>
    <!-- ≥ 768 px: the vertical rail. -->
    <GlassDock
        v-if="!isPhone"
        id="dock-rail"
        key="rail"
        ref="dockRef"
        orientation="vertical"
        shape="card"
        :collapse="home ? 'open' : 'closed'"
        class="usf-dock"
        :class="{ 'usf-dock--home': home, 'usf-dock--year-fade': stepper.yearFading.value }"
        :style="spineStyle"
        aria-label="Site navigation"
        data-testid="dock"
        data-dock-register="rail"
        :data-dock-context="ctx ? 'dashboard' : home ? 'home' : 'site'"
        :data-membrane-facets="membraneFacets"
    >
        <template #persistent>
            <ScrollProgressRim
                v-if="!home"
                class="usf-dock__progress-rim"
                orientation="vertical"
                :value="scrollProgress"
                :stops="identityRamp"
            />
            <DockCrest :crest="ctx?.crest" :morph-stage="collapsed ? 'seed' : 'full'" />
            <!-- The site layer (open rail, off the homepage): Dashboards, Search, Saved views. -->
            <template v-if="railOpen && !home">
                <DockSeparator class="usf-dock__crest-rule" />
                <div class="usf-dock__site" data-testid="dock-site-layer">
                    <DockDashboardSelect :active="ctx?.id" side="right" />
                    <DockSearch :sources="searchSources" />
                    <DockSavedViews side="right" />
                </div>
            </template>
        </template>

        <!-- The run: the chapter rungs on a dashboard, the ranked roster on the homepage. Every seat
             is one control (B6 · §M M-4). -->
        <template #default>
            <DockStepperRender v-if="ctx" :key="ctx.id" :ctx="ctx" :stepper="stepper" />
            <DockRoster v-else-if="home" :subjects="subjects" />
        </template>

        <template #persistent-end>
            <DockFoot
                v-if="ctx"
                :key="ctx.id"
                :ctx="ctx"
                :disable-transitions="disableTransitions"
                :collapsed="collapsed"
                @toggle-collapse="collapseToggle"
            />
            <div v-else class="usf-dock__site-foot" data-testid="dock-site-foot">
                <template v-if="home">
                    <DockSearch :sources="searchSources" />
                    <DockSavedViews side="right" />
                </template>
                <DarkModeToggle
                    class="usf-dock__theme"
                    :size="home ? 'lg' : 'dock'"
                    :disable-transitions="disableTransitions"
                />
            </div>
        </template>
    </GlassDock>

    <!-- < 768 px: the bottom bar. -->
    <GlassDock
        v-else
        id="dock-bar"
        key="bar"
        orientation="horizontal"
        shape="card"
        :collapse="false"
        class="usf-dock usf-dock--bar"
        :class="{ 'usf-dock--out': barOut }"
        aria-label="Site navigation"
        data-testid="dock"
        data-dock-register="bar"
        :data-dock-context="ctx ? 'dashboard' : home ? 'home' : 'site'"
        :data-bar-out="barOut ? '' : undefined"
        :data-membrane-facets="membraneFacets"
        @focusin="onBarFocus"
    >
        <template #persistent>
            <ScrollProgressRim
                class="usf-dock__progress-rim usf-dock__progress-rim--bar"
                orientation="horizontal"
                :value="scrollProgress"
                :stops="identityRamp"
            />
            <DockCrest :crest="ctx?.crest" morph-stage="seed" data-dock-cell="crest" />
        </template>
        <template #default>
            <template v-if="ctx">
                <DockDashboardSelect :active="ctx.id" side="top" data-dock-cell="dashboards" />
                <DockSectionSelect :stepper="stepper" variant="cell" data-dock-cell="sections" />
            </template>
            <template v-else-if="home">
                <DockSearch :sources="searchSources" data-dock-cell="search" />
                <DockSavedViews side="top" data-dock-cell="saved" />
            </template>
            <template v-else>
                <DockDashboardSelect side="top" data-dock-cell="dashboards" />
                <DockSearch :sources="searchSources" data-dock-cell="search" />
            </template>
        </template>
        <template #persistent-end>
            <!-- Filters sits outside the run (its applied count is a second node), before More. -->
            <DockFilterTrigger v-if="ctx" :ctx="ctx" data-dock-cell="filters" />
            <DockSettings
                v-model:open="gearOpen"
                :has-year-scope="dataState.hasYearScope.value"
                :year-mode-now="dataState.yearModeNow.value"
                :save-flash="dataState.saveFlash.value"
                :can-save="Boolean(ctx)"
                :disable-transitions="disableTransitions"
                data-dock-cell="more"
                @toggle-range="dataState.toggleRange()"
                @save-view="dataState.saveCurrentView()"
            />
        </template>
    </GlassDock>

    <!-- ≥ 768 px, past the top of a dashboard: the section pager beside the circle. -->
    <MembraneTitleLozenge v-if="ctx" :at-top="atTop" :is-phone="isPhone" :stepper="stepper" />
</template>

<style scoped src="./Dock.css"></style>
