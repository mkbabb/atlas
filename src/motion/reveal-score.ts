import type { FacetSpec } from "./useScrollTimeline";

/** The three DOM-scale cues RevealScore projects onto the existing scroll conductor. */
export type RevealCueKind = "reveal" | "rule" | "recede";

/** RevealScore cues latch. A view rebuild may re-project them, but one mounted beat fires each id once. */
export type RevealCuePolicy = "once";

export interface RevealCueContext {
    readonly id: string;
    readonly kind: RevealCueKind;
    readonly progress: number;
    /** True when accessibility or platform capability settles the cue without animation. */
    readonly terminal: boolean;
}

export interface RevealCue {
    readonly id: string;
    readonly kind: RevealCueKind;
    /** The cue's window on the existing master position. It fires on the leading edge. */
    readonly window?: readonly [from: number, to: number];
    readonly label?: string;
    readonly policy?: RevealCuePolicy;
    /** The render seam. DOM/SVG consumers apply their existing reveal/draw/recede mechanism here. */
    readonly fire: (context: RevealCueContext) => void;
}

/** Declarative reveal data only: no timeline, observer, frame loop, or geometry reader. */
export interface RevealScore {
    readonly cues: readonly RevealCue[];
}

/** The dock/route restore seam. A deep link releases reveal go-live on its settled edge. */
export interface RevealRestoreEdge {
    deepLink(): boolean;
    onRestoreSettled(callback: () => void): () => void;
}

export interface RevealCuePump {
    /** Cache the conductor position and fire newly crossed cues when live. */
    advance(progress: number): boolean;
    /** Release the once pump and immediately reconcile the last conductor position. */
    goLive(): boolean;
    /** Accessibility/no-SDA terminal bind: fire every cue exactly once without animation. */
    settle(): boolean;
    readonly live: boolean;
    fired(id: string): boolean;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Project the named cue vocabulary onto the incumbent timeline's facet data. Consumers still use
 * one `useScrollTimeline`; RevealScore does not construct a conductor of its own.
 */
export function projectRevealScore(score: RevealScore): readonly FacetSpec[] {
    return score.cues.map((cue) => ({
        id: cue.id,
        kind: cue.kind,
        from: cue.window?.[0],
        to: cue.window?.[1],
        label: cue.label,
    }));
}

/** A pure, latched pump driven only by the position supplied by `activeViz`'s existing frame. */
export function createRevealCuePump(score: RevealScore): RevealCuePump {
    const fired = new Set<string>();
    let position = 0;
    let live = false;

    function fireEligible(terminal: boolean): boolean {
        let changed = false;
        for (const cue of score.cues) {
            if (fired.has(cue.id)) continue;
            const threshold = clamp01(cue.window?.[0] ?? 0);
            if (!terminal && position < threshold) continue;
            fired.add(cue.id);
            cue.fire({
                id: cue.id,
                kind: cue.kind,
                progress: terminal ? 1 : position,
                terminal,
            });
            changed = true;
        }
        return changed;
    }

    return {
        advance(progress) {
            position = clamp01(progress);
            return live ? fireEligible(false) : false;
        },
        goLive() {
            live = true;
            return fireEligible(false);
        },
        settle() {
            position = 1;
            live = true;
            return fireEligible(true);
        },
        get live() {
            return live;
        },
        fired: (id) => fired.has(id),
    };
}

/**
 * Bind go-live to restore ordering. Ordinary top loads release synchronously; deep links wait for
 * `onRestoreSettled`. The edge invokes the pump directly, so this helper adds no clock or double-rAF.
 */
export function bindRevealGoLive(
    pump: RevealCuePump,
    restore?: RevealRestoreEdge,
): () => void {
    if (!restore?.deepLink()) {
        pump.goLive();
        return () => undefined;
    }
    return restore.onRestoreSettled(() => {
        pump.goLive();
    });
}
