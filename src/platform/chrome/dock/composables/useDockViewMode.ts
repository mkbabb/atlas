// useDockViewMode — the dock's VIEW-MODE register (O-A23 · the stepper ⇄ TOC toggle).
//
// The dock ships TWO wayfinding view-modes in its scroll-middle band: the default figure-number
// STEPPER (the per-beat progress rail — `DockStepperRender`) and the scrollable clickable latex-paper
// TABLE-OF-CONTENTS the owner twice asked for (R-008, 06-27 + 07-02) — `DockTOC`. This composable owns
// the ONE scalar that discriminates them: a SECOND mode TOGGLED beside the stepper, never a
// replacement (J-DOCK view-mode law). The stepper stays the DEFAULT and stays MOUNTED under the TOC
// (`v-show`), so the dock's ONE beat-observer keeps writing `activeBeatId` while the TOC reads it for
// its active-row mark — no second observer is minted (the single-scroll-scalar discipline holds).
//
// ZERO DOM, ZERO observer, ZERO store — a pure state register the orchestrator (`Dock.vue`) composes
// and threads down (it mirrors `useDockCollapse`'s shape: the machine is the orchestrator's, this is
// the thin reactive surface it binds). The in/out ANIMATION is CSS-only (a `<Transition>` off the
// shared motion tokens, AG8-safe — never a JS clock); this register only flips the discriminant.

import { computed, ref, type ComputedRef, type Ref } from "vue";

/** The two dock wayfinding view-modes — the figure-number STEPPER (default) and the TOC index. */
export type DockViewMode = "stepper" | "toc";

/** The view-mode register's reactive surface — the dock composes these into its template
    (the named-return contract, modelled on `UseDockCollapse`). */
export interface UseDockViewMode {
    /** The live view-mode — `"stepper"` (default) or `"toc"`. */
    mode: Ref<DockViewMode>;
    /** True while the scrollable TOC index is the shown mode — drives the `DockTOC` in/out
        `<Transition>` AND the foot toggle's pressed state. The stepper stays mounted underneath. */
    isTOC: ComputedRef<boolean>;
    /** Flip stepper ⇄ TOC (the foot view-mode toggle's click). */
    toggle: () => void;
    /** Set the mode explicitly (e.g. a consumer that resets to the stepper default on a route change). */
    setMode: (next: DockViewMode) => void;
}

/**
 * The dock's view-mode register (O-A23). Holds the ONE `mode` scalar discriminating the stepper from
 * the TOC and the `isTOC` projection the template binds. A pure state register — no DOM, no observer,
 * no store; the orchestrator composes it and owns the (CSS-only, PRM-gated) in/out morph.
 */
export function useDockViewMode(
    initial: DockViewMode = "stepper",
): UseDockViewMode {
    const mode = ref<DockViewMode>(initial);
    const isTOC = computed<boolean>(() => mode.value === "toc");
    const toggle = (): void => {
        mode.value = mode.value === "toc" ? "stepper" : "toc";
    };
    const setMode = (next: DockViewMode): void => {
        mode.value = next;
    };
    return { mode, isTOC, toggle, setMode };
}
