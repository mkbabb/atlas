// platform/composables/useAtmosphereActivity.ts — THE ATMOSPHERE ACTIVITY BELT (O-F4 · the safety
// net; motion-arch §2.1 MOVE 4 · §0 · a11y PLAT-7).
//
// A renderer-INDEPENDENT belt over the atmosphere: it parks ALL atmosphere motion when the tab is
// backgrounded (`document.hidden`) OR when there has been no scroll/interaction for the pinned
// `IDLE_PARK_MS`, and RESUMES gracefully on the next interaction / visibility. It caps the worst case
// (a backgrounded or idle tab burning a WebGPU present loop — the tab-hidden hole L10 implied, closed
// here) even if a later regression reintroduces a per-frame loop. It is a BELT regardless of the
// O-F2/O-F3 static-bake renderer: the consumer READS `active` and drives its OWN park lever —
// `<Aurora>`'s exposed `pause()`/`resume()` (the substrate's "manual" suspend reason), `<Constellation
// :freeze>`, and the brand fleck's own rAF gate. This is the atlas-side lever O-F1 proved is
// achievable WITHOUT touching glass-ui: the aurora loop is unparkable from the atlas side by the
// breath scalar ALONE (glass-ui's fBm advances a per-frame time uniform), but suspending the render
// drive through the public pause/freeze surface DOES zero it (verified by the O-F4 probe, not assumed).
//
// THE VISIBILITY OWNER IS NET-NEW. There is NO `visibilitychange` / `document.hidden` hook in the
// chrome today (grep-verified: the only `visibilitychange` in `src/` is `useSavedViews`'s cross-tab
// save re-read, unrelated to motion). This composable is that owner.
//
// COMPOSES WITH THE PRM GUARD (a11y PLAT-7) — it does NOT replace it. Reduced-motion is folded into
// `active` so the belt ALSO parks under PRM, a strict superset of the existing PRM fences (glass-ui's
// own reduced-motion freeze + the fleck's `reduced` gate stay in place — the belt is additive, never
// their substitute). The PRM source is injectable (the `useScrollChrome`/`useAuroraVeil` DI style) so a
// test drives it without a live media query.

import {
    computed,
    onScopeDispose,
    ref,
    toValue,
    type ComputedRef,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";
import { useEventListener } from "@vueuse/core";
import { useReducedMotion } from "../../../../motion/useReducedMotion.js";

/** THE PINNED IDLE-PARK INTERVAL (CH-F L1 · motion-arch §2.1 MOVE 4). Motion parks after EXACTLY this
    many ms of no scroll/interaction. A FIXED export — deterministic, NOT implementer- or
    caller-tunable — so the gate is provable (4 s, mid the 3–5 s idle-park band). */
export const IDLE_PARK_MS = 4000;

/** The interaction signals that mean "the reader is here" — a press/move/wheel/key/scroll/touch
    re-arms the idle clock. All PASSIVE: the belt READS presence, it never `preventDefault`s (no
    scroll-jack, AG8). */
const INTERACTION_EVENTS = [
    "pointerdown",
    "pointermove",
    "wheel",
    "keydown",
    "scroll",
    "touchstart",
] as const;

/** Tuning + dependency-injection surface. `IDLE_PARK_MS` is intentionally NOT an option — it is the
    pinned deterministic gate; only the PRM fence is injectable (for DI/tests). */
export interface UseAtmosphereActivityOptions {
    /** The reduced-motion fence. Defaults to `useReducedMotion()`; injectable for DI/tests. Folded
        into `active` so the belt PARKS under PRM too — it COMPOSES with (never replaces) glass-ui's
        own PRM freeze + the fleck's reduce gate. */
    reducedMotion?: MaybeRefOrGetter<boolean>;
}

/** The belt surface a consumer gates its render drive on (all read-only to it). */
export interface UseAtmosphereActivityReturn {
    /** THE ONE BELT SIGNAL — `true` while the atmosphere MAY run per-frame motion: the tab is VISIBLE
        AND the reader interacted within `IDLE_PARK_MS` AND reduced-motion is OFF. `false` ⇒ park
        (drive `Aurora.pause()`, `<Constellation :freeze>`, and the fleck rAF off; resume on the flip
        back). */
    active: ComputedRef<boolean>;
    /** True when the tab is backgrounded (`document.hidden`) — the tab-hidden hole this belt closes. */
    hidden: Readonly<Ref<boolean>>;
    /** True after `IDLE_PARK_MS` with no interaction; the next interaction / visibility resets it. */
    idle: Readonly<Ref<boolean>>;
    /** The reduced-motion verdict folded into `active`, exposed for register-specific policies. */
    reduced: ComputedRef<boolean>;
}

/**
 * THE ATMOSPHERE ACTIVITY BELT. Owns a `visibilitychange` listener + one pinned idle timer, and
 * projects the two DOM signals (folded with PRM) into the single `active` gate the atmosphere
 * consumers read. Listeners auto-dispose with the effect scope (`useEventListener`); the lone timer is
 * cleared on scope teardown. See the file header for the doctrine (belt-not-renderer, PRM-composition).
 */
export function useAtmosphereActivity(
    opts: UseAtmosphereActivityOptions = {},
): UseAtmosphereActivityReturn {
    // The PRM fence — the ONE reactive source (over @vueuse), injectable for DI/tests (the
    // `useScrollChrome` DI style). Instantiated ONLY when no override is passed (`??` short-circuit).
    const reduced: MaybeRefOrGetter<boolean> =
        opts.reducedMotion ?? useReducedMotion();

    const hasDoc = typeof document !== "undefined";
    const hidden = ref<boolean>(hasDoc ? document.hidden : false);
    const idle = ref<boolean>(false);

    // THE PINNED IDLE TIMER — re-armed on every interaction / visibility return; fires `idle = true`
    // after EXACTLY `IDLE_PARK_MS` of silence. One timer, one deterministic constant (the gate is
    // provable — N is not implementer-chosen).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (): void => {
        if (timer !== undefined) clearTimeout(timer);
        idle.value = false; // any re-arm is a graceful resume out of the idle park
        timer = setTimeout(() => {
            idle.value = true;
        }, IDLE_PARK_MS);
    };

    // visibilitychange — the NET-NEW tab-hidden owner. Going hidden parks (`hidden → true`); returning
    // visible clears it AND re-arms the idle clock (the graceful visibility resume).
    useEventListener(document, "visibilitychange", () => {
        hidden.value = document.hidden;
        if (!document.hidden) arm();
    });

    // Any interaction re-arms the clock (passive readers; the aurora / constellation are aria-hidden
    // backdrops with no events of their own, so a window-level listen is the honest presence signal).
    for (const ev of INTERACTION_EVENTS) {
        useEventListener(window, ev, arm, { passive: true });
    }

    if (hasDoc) arm(); // start the clock at mount — a fresh mount counts as the reader arriving.

    onScopeDispose(() => {
        if (timer !== undefined) clearTimeout(timer);
    });

    const reducedResolved = computed<boolean>(() => toValue(reduced));
    const active = computed<boolean>(
        () => !hidden.value && !idle.value && !reducedResolved.value,
    );

    return { active, hidden, idle, reduced: reducedResolved };
}
