/** Reader-selectable constellation posture. `auto` follows the shared atmosphere belt. */
export type ConstellationRegister = "live" | "bake" | "auto";

/** The four observable phases of the live↔raster hand-off. */
export type ConstellationPhase = "asleep" | "waking" | "live" | "sleeping";

export type ConstellationPhaseEvent = "wake" | "woke" | "sleep" | "slept";

export const WAKE_CROSSFADE_MS = 400;

export interface ConstellationActivity {
    active: boolean;
    hidden: boolean;
    reduced: boolean;
}

/**
 * Resolve whether the on-screen field should remain mounted. Reduced motion wins every register;
 * `live` ignores idle but still respects visibility, `bake` is always raster, and `auto` follows
 * the existing shared activity belt.
 */
export function constellationShouldRun(
    register: ConstellationRegister,
    activity: ConstellationActivity,
): boolean {
    if (activity.reduced || register === "bake") return false;
    if (register === "live") return !activity.hidden;
    return activity.active;
}

/** Pure phase law. It owns no observer, canvas, timer, or animation frame. */
export function nextConstellationPhase(
    phase: ConstellationPhase,
    event: ConstellationPhaseEvent,
): ConstellationPhase {
    switch (event) {
        case "wake":
            return phase === "asleep" || phase === "sleeping" ? "waking" : phase;
        case "woke":
            return phase === "waking" ? "live" : phase;
        case "sleep":
            return phase === "live" || phase === "waking" ? "sleeping" : phase;
        case "slept":
            return phase === "sleeping" ? "asleep" : phase;
    }
}
