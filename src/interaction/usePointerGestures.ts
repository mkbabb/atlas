// platform/interaction/usePointerGestures.ts — THE LIVE POINTER DOM ADAPTER (N.WD1 · §4.D1.4).
//
// The pure 5-state `step()` reducer (pointer-machine.ts) owns the GESTURE LOGIC; this composable is
// its ONE DOM adapter — it maps real PointerEvents onto `PointerInput`, folds `step`, and DISPATCHES
// the emitted intents onto the plate's shipped store verbs (never a parallel feature — the intent bus
// drives what the mouse/keyboard already drive). It owns the two things the pure machine cannot: the
// live DOM binding (pointerdown/move/up/cancel + the long-press tick timer + the `armed` dial edit) and
// the reactive `touch-action` the host paints so the CSS ladder READS BACK LIVE off the machine state:
//
//   rest = `pan-y pinch-zoom`  (native scroll + pinch survive)
//   →  PINCHING (2-finger touch)      = `pan-y`   (the browser owns the pinch; we read the transform)
//   →  brush ARMED (the visible dial) = `none`    (while armed ONLY; `pointercancel` always honored)
//
// The adapter resolves `hit` at down-time via the plate-supplied `hitTest` (the hit-slop nearest-mark
// resolution — 24px coarse / 12px fine); the machine's TAP emits a `pin` intent whose target the
// adapter fills from that hit (a hit pins, a miss CLEARS — the store's sole-same-clears algebra turns
// tap-same into unpin, never re-implemented here). Zoom/pan route to the OPTIONAL view sink (a plate
// with no view transform simply omits them). ONE adapter per plate host; disposed with the scope.

import {
    computed,
    ref,
    toValue,
    watch,
    onScopeDispose,
    type ComputedRef,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";
import {
    step,
    touchActionFor,
    initialPointerState,
    LONG_MS,
    HIT_SLOP_COARSE,
    HIT_SLOP_FINE,
    type PointerState,
    type PointerInput,
    type PointerKind,
    type PointerPhase,
    type Intent,
    type BrushRect,
} from "./pointer-machine";

/** The plate-supplied SINKS — the shipped store verbs the intent bus drives. `hitTest` resolves the
    nearest mark within the effective hit radius (`coarse` picks 24px vs 12px); `pin`/`clear` are the
    selection verbs (a tap on a hit pins, a miss clears); `brush`/`bloom` and the `view` `zoom`/`pan`
    are OPTIONAL (a plate declares only the sinks it drives). No sink here re-implements an algebra —
    each is the plate's existing verb (the unification thesis: touch drives what the mouse drives). */
export interface PointerSinks {
    /** Resolve the mark under `(x, y)` in viewport px (nearest within hit-slop), or null on a miss. */
    hitTest(x: number, y: number, coarse: boolean): { key: string } | null;
    /** Pin (select) a mark — the store's sole-same-clears algebra turns tap-same into unpin. */
    pin(key: string, additive: boolean): void;
    /** Drop the pinned selection (a tap-miss / an explicit clear). */
    clear(): void;
    /** The DRAGGING brush rectangle (commit:false while dragging, true on release). */
    brush?(rect: BrushRect, commit: boolean): void;
    /** The long-press haptic/visual bloom (rides the additive pin). */
    bloom?(): void;
    /** The view-transform ZOOM (pinch) → the plate's dataZoom/roam. */
    zoom?(scale: number, centroid: { x: number; y: number }): void;
    /** The view-transform PAN (pinch centroid drift) → the plate's dataZoom/roam. */
    pan?(dx: number, dy: number): void;
}

/** Adapter options — the brush ARMED dial (a visible plate control) + an injectable monotonic clock. */
export interface UsePointerGesturesOptions {
    /** The explicit brush ARMED dial (a visible mode; default false). Edits dispatch an `arm` input. */
    armed?: MaybeRefOrGetter<boolean>;
    /** The monotonic ms clock the long-press reads (injectable for tests; default `performance.now`). */
    now?: () => number;
}

/** The adapter's reactive read-back surface — the live `touch-action` the host paints + the machine
    phase / armed dial (the CSS ladder + a debug read; the exact peer of a `UseXReturn` named contract). */
export interface UsePointerGesturesReturn {
    /** The live `touch-action` off the machine state — the CSS ladder READS BACK here (host binds it). */
    touchAction: ComputedRef<"pan-y pinch-zoom" | "pan-y" | "none">;
    /** The live machine phase (IDLE/PRESSED/PINCHING/YIELDED/DRAGGING) — a read-back for tests/debug. */
    phase: ComputedRef<PointerPhase>;
    /** The live brush ARMED state (the resolved dial). */
    armed: ComputedRef<boolean>;
}

/** Map a DOM pointer kind string onto the machine's `PointerKind` (unknown/"" ⇒ mouse degrade). */
function pointerKindOf(t: string | undefined): PointerKind {
    return t === "touch" || t === "pen" ? t : "mouse";
}

/**
 * `usePointerGestures(host, sinks, opts)` — bind the pure pointer machine to real PointerEvents on
 * `host`, dispatching intents onto `sinks`. Returns the live `touch-action` (bind it on the host) +
 * the phase/armed read-back. The listeners are passive observers — they NEVER `preventDefault`, so the
 * `touch-action` CSS is the SOLE arbiter of native scroll/pinch (the ladder is honest). Re-binds on a
 * host swap; disposed with the owning scope.
 */
export function usePointerGestures(
    host: Ref<HTMLElement | null>,
    sinks: PointerSinks,
    opts: UsePointerGesturesOptions = {},
): UsePointerGesturesReturn {
    const now = opts.now ?? (() => performance.now());
    const state = ref<PointerState>(initialPointerState(toValue(opts.armed) ?? false));

    // The mark resolved at the most recent `down` (the machine's TAP emits a keyless `pin` — the
    // adapter fills the target from THIS, so a hit pins + a miss clears, per the machine header).
    let pendingKey: string | null = null;
    // The long-press tick timer — a held TOUCH inside the slop past LONG_MS pins additively + blooms.
    let longTimer: ReturnType<typeof setTimeout> | null = null;
    const clearLongTimer = (): void => {
        if (longTimer !== null) {
            clearTimeout(longTimer);
            longTimer = null;
        }
    };

    function route(intent: Intent): void {
        if (intent.sink === "selection") {
            switch (intent.verb) {
                case "pin":
                    // A hit pins (the pendingKey resolved at down); a miss clears (the header's
                    // "TAP: hit ? pin : clear" — the store's sole-same-clears turns tap-same to unpin).
                    if (pendingKey != null) sinks.pin(pendingKey, intent.additive);
                    else sinks.clear();
                    break;
                case "clear":
                    sinks.clear();
                    break;
                case "brush":
                    sinks.brush?.(intent.rect, intent.commit);
                    break;
                case "bloom":
                    sinks.bloom?.();
                    break;
                // `inspect` is a KEYBOARD-only intent (the pointer machine never emits it); no route.
            }
        } else {
            if (intent.verb === "zoom") sinks.zoom?.(intent.scale, intent.centroid);
            else sinks.pan?.(intent.dx, intent.dy);
        }
    }

    function dispatch(input: PointerInput): void {
        const { state: next, intents } = step(state.value, input);
        state.value = next;
        for (const intent of intents) route(intent);
    }

    function onDown(e: PointerEvent): void {
        const kind = pointerKindOf(e.pointerType);
        const coarse = kind === "touch";
        pendingKey = sinks.hitTest(e.clientX, e.clientY, coarse)?.key ?? null;
        dispatch({
            type: "down",
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            t: now(),
            kind,
            hit: pendingKey != null,
        });
        // Arm the long-press clock for a coarse pointer (a mouse NEVER long-presses — the machine
        // guards it too, but skipping the timer keeps the desktop path allocation-free).
        if (coarse) {
            clearLongTimer();
            longTimer = setTimeout(() => dispatch({ type: "tick", t: now() }), LONG_MS);
        }
    }
    function onMove(e: PointerEvent): void {
        dispatch({ type: "move", id: e.pointerId, x: e.clientX, y: e.clientY, t: now() });
    }
    function onUp(e: PointerEvent): void {
        clearLongTimer();
        dispatch({ type: "up", id: e.pointerId, x: e.clientX, y: e.clientY, t: now() });
    }
    function onCancel(e: PointerEvent): void {
        clearLongTimer();
        dispatch({ type: "cancel", id: e.pointerId });
    }

    // Bind on the live host (re-binds on a host swap; the listeners are passive observers — no
    // preventDefault, so `touch-action` is the sole native-gesture arbiter). happy-dom + the browser
    // both fire these synchronously; the machine + the reactive touch-action update in the same tick.
    watch(
        host,
        (el, _old, onCleanup) => {
            if (!el) return;
            el.addEventListener("pointerdown", onDown as EventListener);
            el.addEventListener("pointermove", onMove as EventListener);
            el.addEventListener("pointerup", onUp as EventListener);
            el.addEventListener("pointercancel", onCancel as EventListener);
            onCleanup(() => {
                el.removeEventListener("pointerdown", onDown as EventListener);
                el.removeEventListener("pointermove", onMove as EventListener);
                el.removeEventListener("pointerup", onUp as EventListener);
                el.removeEventListener("pointercancel", onCancel as EventListener);
            });
        },
        { immediate: true },
    );

    // The brush ARMED dial — a visible plate control; an edit dispatches the machine's `arm` input
    // (a global phase-preserving edit) so the touch-action ladder flips to `none` while armed ONLY.
    if (opts.armed !== undefined) {
        watch(
            () => toValue(opts.armed),
            (a) => dispatch({ type: "arm", armed: !!a }),
            // SYNC — the visible dial must flip the `touch-action` (→ `none`) in the SAME tick it is
            // toggled, so native scroll is blocked the instant the brush arms (no one-frame window).
            { flush: "sync" },
        );
    }

    onScopeDispose(clearLongTimer);

    return {
        touchAction: computed(() => touchActionFor(state.value)),
        phase: computed(() => state.value.phase),
        armed: computed(() => state.value.armed),
    };
}

/** The effective hit radius for a pointer kind — the plate's `hitTest` reads this to size its nearest-
    mark search (24px coarse / 12px fine, WCAG 2.5.8 target-size split; re-exported so a plate's
    `hitTest` uses the SAME constants the machine documents, never a re-derived magic number). */
export function hitSlopFor(coarse: boolean): number {
    return coarse ? HIT_SLOP_COARSE : HIT_SLOP_FINE;
}
