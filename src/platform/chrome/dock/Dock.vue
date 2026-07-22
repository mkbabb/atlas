<script setup lang="ts">
// Dock — the platform's single floating glass INSTRUMENT (C.W3.2, C3.md §Scope 2,
// CP-2/A2/A3/A4). ONE component, no per-dashboard fork: it injects the active
// DashboardContext and renders that dashboard's crest + nav. There is NO hard-coded nav
// array here; the dock is dumb to the dashboard, reading only the injected seam (G10 §5.2).
//
// ── THE ORCHESTRATOR SHELL (K-H-ARCH · the TEMPLATE-axis split) ──────────────────────────
// K-H-ARCH split the 300-L template into FOUR colocated sub-components under `./components/`,
// each owning the composable it consumes (the composable moves WITH its sub-component):
//   • band 1 — `DockCrest`           (the #persistent TIL crest — a PURE crest; the progress rim
//                                     re-seated UP to this orchestrator at the dock-box level, so
//                                     its ring resolves to the DOCK PILL, not a crest square — OF-21.1)
//   • band 2 — `DockStepperRender`   (the FadingScroll Roman stepper; owns `useDockStepper` — the
//                                     dock's ONE IntersectionObserver relocates here, never a second)
//   •          `DockNavItem`         (the repeating beat/view rung the stepper v-fors)
//   • band 3 — `DockFoot`            (the sticky foot; owns `useDockGear`/`useFilterPane`/
//                                     `useDockDataState` + the foot's sticky CSS, verbatim)
// This SFC is now the thin `<GlassDock>` shell that mounts the four and keeps ONLY what the
// orchestrator itself binds: the `ctx` inject, the `useDockCollapse` `<GlassDock ref>` bind, the
// `isPhone` register read (the GlassDock posture props), the `<GlassDock>` prop literals, and the
// dock PLATE-geometry / liquid-glass-surface / #default-layer CSS. (N.WG1 arm F — the dead
// `--dock-accent`/`--cp-dock-accent` inline writes retired; chrome accent = the ONE `--cp-accent`
// authority + the route's `--route-accent`, never a re-declared dock-local pole.)
//
// ── THE CONSUMED GlassDock — a VERTICAL 3-BAND INSTRUMENT (J-DOCK · C23/C26) ─────
// The CONSUMED `GlassDock` composite reached through `@mkbabb/glass-ui/dock`, mounted
// `orientation="vertical"`. The dock FLOATS (position:fixed off the left margin — A3) and is a
// THREE-BAND persistent instrument, NOT a single scroller (J-DOCK §approach-3, the keystone):
//   • band 1 — the sticky CREST (#persistent slot, top): rendered OUTSIDE the collapsed↔expanded
//     crossfade (the library anchors #persistent above the deck).
//   • band 2 — the scrollable MIDDLE (#default slot, FadingScroll-wrapped): the Roman stepper ONLY
//     (the one growing region; it fades at its scroll edges).
//   • band 3 — the sticky FOOT (a CSS position:sticky foot inside #default): the IDIOMATIC block-END
//     anchor — OQ-1 (R-FOOT-2) proved the singular `#persistent` slot CANNOT serve the foot (it is
//     already consumed by the crest and is hard-anchored to the block-START by glass-ui's
//     `.dock-persistent + .dock-layers` adjacency combinator, with no side/anchor/order prop in
//     4.1.0 OR 4.2.0 to flip it), so the `position:sticky bottom:0` foot self-serves with ZERO
//     glass-ui dependency. The `#persistent-end` re-host is an OPTIONAL future 4.3.0 simplification
//     (R-FOOT-1, off the K critical path), never a dependency.
// The collapse machine the PINNED 4.0.1 SHIPS (`startCollapsed`/`expand()`/`collapse()`/`expanded`)
// is RE-ENABLED here via `useDockCollapse`. The posture is gear-TOGGLED + collapse-on-phone, NOT
// forced-collapsed-everywhere; the desktop register may still rest expanded (a register OPTION,
// J-PATH §8 Decision 2). The `:always-expanded` true-literal opt-OUT is DELETED.
import { computed, inject, onBeforeUnmount, ref, watch } from "vue";
import { GlassDock } from "@mkbabb/glass-ui/dock";
import { ScrollProgressRim } from "@mkbabb/glass-ui/scroll-progress-rim";
import DockCrest from "./components/DockCrest.vue";
import DockStepperRender from "./components/DockStepperRender.vue";
import DockFoot from "./components/DockFoot.vue";
import MembraneVizContext from "./MembraneVizContext.vue";
import MembraneProvenanceDetent from "./MembraneProvenanceDetent.vue";
import MembraneTitleLozenge from "./MembraneTitleLozenge.vue";
import { MEMBRANE_FACETS } from "./membrane-facet.js";
import {
    useDockCollapse,
    type DockExposed,
} from "./composables/useDockCollapse.js";
import { useMobileRegister } from "../../composables/useMobileRegister.js";
import { useScrollChrome } from "./composables/useScrollChrome.js";
import { useDocumentScrollProgress } from "../../../motion/useScrollProgress.js";
import { useDismissArbiter } from "../../interaction/useDismissArbiter.js";
import { DASHBOARD_KEY } from "../../../contract/index.js";

const props = withDefaults(
    defineProps<{
        /** An ordered multi-stop ramp (base → apex) for a SPECTRUM-thesis dashboard
            (SCI's rainbow, ECF's sequential) — shared by the stepper's identity spine and the
            persistent crest rim. Undefined ⇒ the route theme's ramp, then the route tritone. */
        ramp?: readonly string[];
        /** Wire glass-ui's no-transition fast-path on the dark toggle (C1, T-5) so the
            theme is an INSTANT re-print here too (and the correct hard-cut under PRM). */
        disableTransitions?: boolean;
    }>(),
    { ramp: undefined, disableTransitions: true },
);

// The active dashboard's chrome contract — the dock reads ONLY this.
const ctx = inject(DASHBOARD_KEY);

// The CLOSED eight-facet roster (spec-chrome §c.1/§c.2) stamped as a shipped fact — the membrane
// declares its facet count in the DOM so the closure is inspectable, not merely type-asserted. A
// ninth facet is a compile error at `membrane-facet.ts`'s total switch, never a silent DOM add.
const membraneFacets = MEMBRANE_FACETS.join(" ");

// The ONE document-progress scalar for the whole dock. Collapse behavior, the stepper's terminal
// beat correction, and the collapsed Glass rim all read this same computed; no child instantiates a
// second `useWindowScroll` writer.
const scrollProgress = useDocumentScrollProgress();
const ROUTE_TRITONE = [
    "var(--route-accent)",
    "var(--route-accent-warm, var(--route-accent))",
    "var(--route-accent-cool, var(--route-accent))",
] as const;
const identityRamp = computed<readonly string[]>(
    () => props.ramp ?? ctx?.theme?.barometerRamp ?? ROUTE_TRITONE,
);

// ── ONE responsive Dock (the atlas-unified-register law) ──────────────────────
// The SAME vertical `GlassDock` rail at EVERY viewport — no phone fork, no bottom/horizontal
// register. What J-DOCK ADDS is the COLLAPSE posture: the rail rests collapsed at @media(--phone)
// (reclaiming its width to the prose) and is gear-toggle-collapsible everywhere. The `isPhone`
// register read CONSUMES the ONE `useMobileRegister` seam (the breakpoint-DRY law — no second home);
// it drives the GlassDock `:start-collapsed` rest-posture + the phone class.
const { isPhone } = useMobileRegister();

// ── The COLLAPSE posture (J-DOCK §approach-4 · useDockCollapse · C26) ──────────
// The re-enabled 4.0.1 collapse machine — `useDockCollapse` wraps the GlassDock `expanded` /
// `expand()` / `collapse()` exposed API (bound via the `<GlassDock ref>` below). The orchestrator
// owns the bind (the `<GlassDock ref>` is its node) and threads the live `collapsed` posture down to
// `DockFoot`, which renders the toggle and emits `toggle-collapse` back up to drive the machine.
const {
    collapsed,
    bound,
    toggle: collapseToggle,
    collapse,
    bindDock,
    setIntent,
} = useDockCollapse();
// The `<GlassDock ref>` instance — typed as the minimal exposed slice `useDockCollapse` wraps.
// Vue's component template ref hands back the exposed surface ({ expanded, expand, collapse, … });
// we narrow to `DockExposed` (the slice the collapse wrap reads) on bind.
const dockRef = ref<DockExposed | null>(null);
watch(dockRef, (inst) => bindDock(inst), { immediate: true });

// ── THE REACTIVE REGISTER BRIDGE (O-D1 · dock-chrome §2.1/§7.1 · mobile §1 resize-strand) ───────
// `:start-collapsed="isPhone"` is a MOUNT-ONLY latch — GlassDock reads it once in `onMounted`, so a
// desktop→phone RESIZE / orientation flip / devtools emulation (mounted at desktop width) never
// re-collapsed the dock: it stranded EXPANDED as the 20rem sheet OVER content (mobile §1). This
// watch reconciles the REST posture to the LIVE register on EVERY entry path — it fires on `isPhone`
// change AND when the `<GlassDock ref>` binds (`dockRef`), so a late bind still lands on the current
// register (register WINS on entry). The A21 scroll edge (below) is a DISTINCT signal — collapse-by-
// scroll — that acts THEREAFTER; on phone it early-returns, so this bridge is the sole phone owner.
watch(
    [dockRef, isPhone],
    ([inst]) => {
        if (!inst) return;
        // W-MEMBRANE COLLAPSED-REST (spec-chrome §a.2 · the gutter death): the rail rests COLLAPSED at
        // EVERY register — the disc + progress rim + the facet-3 lozenge carry wayfinding, the full
        // rail is a transient BLOOM on intent (below), never persistent chrome (W-10/W-14). So the
        // persistent gutter reserves only the disc (112px → 64px). Phone is unchanged (it already
        // rested collapsed; its expand is the crest-tap sheet, a `manual` intent that outranks this).
        setIntent("register", true);
    },
    { immediate: true },
);

// ── THE COLLAPSED-REST BLOOM (spec-chrome §a.2 · W-MEMBRANE) ─────────────────────────────────────
// The resting disc BLOOMS to the full rail on DESKTOP intent — a pointer or keyboard-focus over the
// dock — and re-collapses the instant intent leaves (a transient reveal, never persistent chrome).
// GlassDock forwards ATTRS but not template LISTENERS to its real node (the same reason the sheet Esc
// is a document listener), so we bind pointer/focus NATIVELY to the dock's own `$el`. Phone is fenced:
// its expand is the crest-tap sheet, so hover/focus never blooms there (the CD-01 over-content regress).
let detachBloom: (() => void) | null = null;
function bindBloom(inst: DockExposed | null): void {
    detachBloom?.();
    detachBloom = null;
    const el = (inst as unknown as { $el?: HTMLElement } | null)?.$el;
    if (!el) return;
    const bloom = (): void => {
        if (!isPhone.value) setIntent("bloom", false);
    };
    const rest = (): void => setIntent("bloom", null);
    const onFocusOut = (e: FocusEvent): void => {
        if (!el.contains(e.relatedTarget as Node | null)) rest();
    };
    el.addEventListener("pointerenter", bloom);
    el.addEventListener("pointerleave", rest);
    el.addEventListener("focusin", bloom);
    el.addEventListener("focusout", onFocusOut);
    detachBloom = (): void => {
        el.removeEventListener("pointerenter", bloom);
        el.removeEventListener("pointerleave", rest);
        el.removeEventListener("focusin", bloom);
        el.removeEventListener("focusout", onFocusOut);
    };
}
watch(dockRef, (inst) => bindBloom(inst), { immediate: true });
onBeforeUnmount(() => detachBloom?.());

// ── THE CROWN ZONE — `atTop` off the CD-05 scroll clock (O-A21) ────────────────────────────────
// `useScrollChrome` reads the ONE page scroll clock (PRM-guarded, AG8-safe — no wheel/touch capture)
// and yields `atTop` (progress ≤0.4%, the crown). W-MEMBRANE consumes ONLY that scalar here: it gates
// the facet-3 lozenge's materialise (§a.2 — bare disc at the crown, the pill grows once the reader
// leaves it). The composable's collapse-on-scroll EDGE is no longer driven: the collapsed-rest posture
// (register bridge, above) rests the rail collapsed at every scroll position, so a scroll→collapse
// driver is redundant; the only expansion is the on-intent bloom.
const { atTop } = useScrollChrome({ source: scrollProgress });

// ── THE VIEW-MODE TOGGLE — RETIRED FROM THE SERVED DOCK (O-DIR-4 ARM 3) ──────────────────────────
// The owner's verdict on the A23 TOC interim: "entirely worthless" — it duplicated the stepper
// behind an extra toggle and added nothing. The TOC view-mode toggle + render path (the register
// composable, the TOC component mount, its toggled-visibility gate + select handler, `DockFoot`'s
// toggle button) are REMOVED from the served dock; the stepper renders unconditionally. The retired
// component + composable files STAY on disk, UNCONSUMED, behind the existing
// `GLASS_TOC_ABSTRACTION_AVAILABLE` owner-held seam (off by default, no dead-code delete) — the
// WG-E glass-abstraction arm's flip revives this wiring on the real latex-paper TOC primitive
// (the R-008 ask stays alive via that arm, not this interim).

// ── THE PHONE SHEET (M.W1 D2 · N.WG1 Arm B — the I-MOBILE law made code) ──────────────────────
// The crest-BUTTON fires the EXISTING collapse machine into the top-left ruled section-menu SHEET
// (crest→ruled-sheet, NEVER a bottom/horizontal fork): `DockStepperRender` at a register, the
// geometry/morph carved by the `.usf-dock--phone:not(.collapsed)` cascade below. Esc + the scrim
// close it and RETURN FOCUS to the crest (`focus({preventScroll})` — the close never yanks the
// page); a chosen row scrolls, closes, and returns focus the same way.
const crestRef = ref<InstanceType<typeof DockCrest> | null>(null);
// Gate the sheet on the REAL posture (O-D1 · dock-chrome §2.1 secondary flicker): before the
// `<GlassDock ref>` binds, `collapsed` falls back to `false`, so a bare `isPhone && !collapsed`
// armed the scrim + `:sheet` register for one pre-bind tick on phone (a scrim flash). `bound`
// holds the sheet shut until the posture is knowable — the register bridge has collapsed by then.
const sheetOpen = computed(() => bound.value && isPhone.value && !collapsed.value);

function onCrestToggle(): void {
    if (!isPhone.value) return;
    collapseToggle();
}

/** Close the sheet (Esc / scrim / row-select) and return focus to the crest button (D2).
    Focus moves FIRST — the crest lives in the persistent band (never inert), so seating focus
    there before the deck collapses/inertifies means the browser never dumps it to `<body>`. */
function closeSheet(): void {
    if (!sheetOpen.value) return;
    crestRef.value?.focusCrest();
    collapse();
}

/** The sheet-wide Escape — a DOCUMENT listener alive only while the sheet is open (GlassDock's
    attr forwarding does not carry listeners to a real node, so a template `@keydown` never
    binds). Document keydown fires BEFORE PlatformShell's window-level Esc arbiter, and the
    preventDefault makes that arbiter defer (no double-handle — the sheet owns this Escape). */
useDismissArbiter().claim(() =>
    sheetOpen.value
        ? { id: "dock-sheet", priority: 40, escape: true, onDismiss: closeSheet }
        : null,
);
</script>

<template>
    <!-- The CONSUMED GlassDock composite (C3-2) — the VERTICAL 3-BAND rail. `position="fixed"`
         floats it off the left margin (A3); the content stage flows full-bleed UNDER it. The
         `:always-expanded` opt-OUT is DELETED; the dock binds its `<GlassDock ref>` so
         `useDockCollapse` reaches the exposed `expand()` / `collapse()` / `expanded`. The rail rests
         COLLAPSED at @media(--phone) (`:start-collapsed="isPhone"`) and is gear-toggle-collapsible
         everywhere (the desktop register may still rest expanded — J-PATH §8 Decision 2).

         `interaction="manual"` (the glass-7 dock-interaction axis — PA-3 / OF-5, and the owner
         no-consumer-fallback ruling) makes `useDockCollapse` the SOLE posture owner: it quiets
         glass's six internal environmental writers (hover / focus / idle / outside-click /
         collapsed-tap / touch) at BOTH poles, leaving only the imperative `expand()` / `collapse()`
         this dock drives — retiring the two-machine fight (PA-3 D1) with NO consumer-side watcher,
         mask, pointer-suppression, or forced pole (the bind IS the whole posture story).
         `start-collapsed` stays the mount pole; the structural `alwaysExpanded` contract is a
         DISTINCT axis, KEPT unchanged. The attr is INERT on the pinned glass 6 bytes — an additive,
         not-yet-read prop until the glass 7.0.0 tag lands and atlas consumes it at #226; atlas
         tsconfig runs no `strictTemplates`, so the not-yet-typed attr passes vue-tsc today. -->
    <!-- THE SHEET SCRIM (D2) — phone-sheet-open only: the paper-wash veil the ruled menu floats
         over; a tap closes the sheet with the same focus return as Esc. Sits ONE rung under the
         raised sheet (`--z-overlay`; the sheet rides `--z-overlay + 1` below). -->
    <Transition name="dock-scrim">
        <div
            v-if="ctx && sheetOpen"
            class="usf-dock-scrim"
            aria-hidden="true"
            data-testid="dock-scrim"
            @click="closeSheet"
        />
    </Transition>

    <GlassDock
        v-if="ctx"
        ref="dockRef"
        orientation="vertical"
        position="fixed"
        shape="card"
        density="comfortable"
        overflow="grow"
        :start-collapsed="isPhone"
        interaction="manual"
        class="usf-dock"
        :class="{ 'usf-dock--phone': isPhone }"
        aria-label="Section navigation"
        data-testid="dock"
        :data-membrane-facets="membraneFacets"
    >
        <!-- band 1 — THE PERSISTENT CREST + THE DOCK-BOX PROGRESS RIM (#persistent slot, H9 §B.1).
             The library renders this slot OUTSIDE the collapsed↔expanded crossfade, so the crest
             affordance is always reachable: the HOME link at the desktop rail, the section-menu
             BUTTON at the phone register (D2 — home then rides the sheet's labeled first row).
             The `ScrollProgressRim` seats HERE (a sibling of the crest, NOT nested inside it) so its
             `position:absolute` box resolves to the GlassDock ROOT — `.dock-persistent` is static,
             `.glass-dock` is the position:relative + `contain:layout` containing block — letting the
             conic ring trace the DOCK PILL's own rounded-rect border at rest, never an inner square
             around the crest raster (OF-21.1). The pill radius + the expand-yield fade live in
             Dock.css; the value/stops are the same whole-document scalar + identity ramp the crest
             once forwarded. -->
        <template #persistent>
            <ScrollProgressRim
                class="usf-dock__progress-rim"
                :value="scrollProgress"
                :stops="identityRamp"
            />
            <DockCrest
                ref="crestRef"
                :as-button="isPhone"
                :expanded="sheetOpen"
                :crest="ctx?.crest"
                :morph-stage="collapsed ? 'seed' : 'full'"
                @toggle="onCrestToggle"
            />
        </template>

        <!-- band 2 + band 3 — THE 3-BAND BODY (#default slot). The crest is band 1 (#persistent
             above). Here: band 2 is the `FadingScroll`-wrapped SCROLLING MIDDLE (the Roman stepper —
             the one growing region) and band 3 is the STICKY FOOT (the gear / controls + dark-toggle
             + the selection-chip opener), CSS `position:sticky`-pinned to the rail's block-end so it
             does NOT scroll away (the idiomatic block-END anchor — R-FOOT-2). On the phone the SAME
             two bands render inside the SHEET register (D2) — labeled ruled rows + the foot. -->
        <template #default>
            <!-- band 2 — THE STEPPER (the TOC view-mode toggle RETIRED, O-DIR-4 ARM 3 — see the
                 script-block note above). -->
            <div class="usf-dock__viewport">
                <DockStepperRender
                    :ctx="ctx"
                    :ramp="identityRamp"
                    :progress="scrollProgress"
                    :sheet="sheetOpen"
                    @close="closeSheet"
                />
            </div>
            <!-- FACET 5 — THE VIZ-CONTEXT ZONE (spec-chrome §c.1 · the A-39 fold). The ONE
                 registry-projected detent: the ACTIVE viz's controls + enlarge, `facetsFor([activeVizId])`
                 SINGULAR. Self-gates on a live active id; replaces the N per-plate VizGearDock capsules
                 (the per-plate renders still compile until the stage-3 subtraction). -->
            <MembraneVizContext />
            <!-- FACET 6 — THE PROVENANCE DETENT (spec-chrome §c.1 · the A-39 fold · STRAND A). The
                 ONE teleport target the active plate's provenance + CSV/image export relocate into
                 (`useMembraneProvenance`); atlas never imports the dashboards' PlateProvenance. Self-
                 gates on the SAME dial viz the facet-5 zone tracks; `detent:"shut"`. -->
            <MembraneProvenanceDetent />
            <DockFoot
                :ctx="ctx"
                :disable-transitions="props.disableTransitions"
                :collapsed="collapsed"
                @toggle-collapse="collapseToggle"
            />
        </template>

    </GlassDock>

    <!-- FACET 3 — THE TITLE LOZENGE (spec-chrome §a · §c.1 · the A-39 fold). The wayfinding pill
         grafted onto the collapsed disc's right edge: it carries the active beat's navLabel
         (`useActiveBeat`, the ONE dock-IO scalar — the seam-15 seat) once the reader leaves the crown
         (`!atTop`), and re-collapses to the bare disc at the top as the in-content title re-reveals.
         A fixed sibling of the rail so it survives the collapse (never inside `.dock-layers`), yet is
         one membrane at the node grain. Desktop-only: the phone readout is the O-03 bar (dial-13). -->
    <MembraneTitleLozenge v-if="ctx" :at-top="atTop" :is-phone="isPhone" />
</template>

<style scoped src="./Dock.css"></style>
