// useDockCollapse — the dock's COLLAPSE-POSTURE register (J-DOCK §approach-4/§6 · C26).
//
// The 2026-06-20 review named the defect: `Dock.vue` hard-coded `:always-expanded="true"`,
// opting OUT of the collapse machine the PINNED 4.0.1 ALREADY ships (`useDockShellProps`:
// `startCollapsed` / `collapseDelay`; `GlassDock` exposes `expand()` / `collapse()` /
// `expanded`). The prior plan FORBADE the machine (the C-arc I6-FIX revert killed the broken-4.0
// dual-driver race + the BB.W-LIQUID-REVEAL content-blur-at-rest). The j2 re-audit (G1) confirmed
// the BC close RETIRED that root bug (the morph is layout-isolated, no reflow), so the machine is
// now safe to re-enable — the user's explicit collapse-state request (J-FEEDBACK-2 §1).
//
// This composable WRAPS the GlassDock exposed API (a template-ref consume of `expanded` /
// `expand()` / `collapse()`) — it does NOT hand-roll a CSS-only collapse and it mints ZERO new
// observer. It drives THREE collapse triggers, each OWNED by the orchestrator that composes this wrap:
//   • gear-toggled  (general, all registers): the gear (`useDockGear`) toggles the posture.
//   • collapse-by-register (`isPhone`): the rail rests collapsed at @media(--phone). Dock.vue's
//     REACTIVE register bridge (`watch([dockRef, isPhone], …)`, O-D1) reconciles the rest posture on
//     EVERY entry path — curing the mount-only `:start-collapsed` latch that stranded the dock
//     expanded on a desktop→phone resize (the broken read-once, NOT the broken-4.0 hover).
//   • collapse-on-scroll (`@/platform/chrome/dock/composables/useScrollChrome`): the atlas-LOCAL scroll-edge hook
//     (O-A21 is its ruled owner — NOT a `@mkbabb/glass-ui/motion-core` reader). Dock.vue binds a
//     `watch` on its discrete edge to drive this machine; the hook writes nothing back here.
//
// The posture is gear-TOGGLED, not forced-collapsed-everywhere (J-PATH §8 Decision 2: "keep
// always-expanded as a register OPTION, but ADD a collapse state") — the desktop register may
// still rest expanded; the gate asserts the API is CONSUMED + the `:always-expanded="true"`
// literal is GONE, not that the dock is collapsed at a given viewport.

import { computed, ref, type ComputedRef } from "vue";

/** The minimal slice of the GlassDock exposed API this composable wraps — `expanded` (the live
    posture flag) + the imperative `expand()` / `collapse()` (the morph drivers). The dock binds
    its `<GlassDock ref=…>` instance to `bindDock`; Vue's component public instance AUTO-UNWRAPS
    the exposed `Ref<boolean>` to a plain `boolean`, so the slice reads `expanded: boolean`. */
export interface DockExposed {
    expanded: boolean;
    expand: () => void;
    collapse: () => void;
}

/** The collapse posture's reactive surface — the dock composes these into its template. */
export interface UseDockCollapse {
    /** True when the dock rests collapsed (mirrors the GlassDock `expanded` ref, inverted). */
    collapsed: ComputedRef<boolean>;
    /** True once the `<GlassDock ref>` instance has bound — the REAL posture is knowable. Before
        bind `collapsed` falls back to `false`, so consumers that arm chrome off the collapsed
        posture (the phone scrim/sheet) gate on `bound` to skip the pre-bind flicker (O-D1). */
    bound: ComputedRef<boolean>;
    /** Toggle the collapse posture (the gear-toggle trigger, all registers). */
    toggle: () => void;
    /** Collapse the dock (consumes the GlassDock `collapse()` exposed driver). */
    collapse: () => void;
    /** Expand the dock (consumes the GlassDock `expand()` exposed driver). */
    expand: () => void;
    /** Bind the `<GlassDock ref>` instance so the wrap reaches its exposed `expand`/`collapse`. */
    bindDock: (instance: DockExposed | null) => void;
}

/**
 * Wrap the GlassDock collapse machine. The dock binds its `<GlassDock>` template ref via
 * `bindDock`; this composable then drives the exposed `expand()` / `collapse()` and projects the
 * live `expanded` posture. ZERO hand-rolled CSS collapse, ZERO new observer — the three triggers
 * (gear-toggle, the reactive `isPhone` register bridge, and the atlas-local `useScrollChrome`
 * collapse-on-scroll edge) all COMPOSE this wrap from Dock.vue; none is authored here.
 */
export function useDockCollapse(): UseDockCollapse {
    // The bound GlassDock instance (set once the `<GlassDock ref>` mounts). Null until bind.
    const dock = ref<DockExposed | null>(null);
    const bindDock = (instance: DockExposed | null): void => {
        dock.value = instance;
    };

    // The live posture — mirrors the GlassDock `expanded` ref (inverted). Falls back to expanded
    // (collapsed=false) before the instance binds, so the first paint reads as the open rail.
    const collapsed = computed(() => {
        const inst = dock.value;
        return inst ? !inst.expanded : false;
    });

    // Whether the `<GlassDock ref>` has bound — so consumers can tell "collapsed=false because it IS
    // expanded" from "collapsed=false because we cannot see the posture yet" (the pre-bind window).
    const bound = computed(() => dock.value !== null);

    // The three drivers wrap the exposed imperative API (no-op before the instance binds).
    const collapse = (): void => {
        dock.value?.collapse();
    };
    const expand = (): void => {
        dock.value?.expand();
    };
    // The gear-toggle trigger (general, all registers) — flip the posture off the live `expanded`.
    const toggle = (): void => {
        const inst = dock.value;
        if (!inst) return;
        if (inst.expanded) inst.collapse();
        else inst.expand();
    };

    return { collapsed, bound, toggle, collapse, expand, bindDock };
}
