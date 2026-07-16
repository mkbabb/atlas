import type { NarrativeAnchor } from "../platform/stores/useViewParams.js";

export interface NarrativeRestoreSettlement {
    readonly aborted: boolean;
}

type RestoreConsumer = (
    anchor: NarrativeAnchor,
    settlement: NarrativeRestoreSettlement,
) => boolean | void;

const consumers = new Set<RestoreConsumer>();

/** Share the dock's one restore-settled edge with scene hosts without another observer or store. */
export function onNarrativeRestoreSettled(consumer: RestoreConsumer): () => void {
    consumers.add(consumer);
    return () => consumers.delete(consumer);
}

/** Publish one settled deep-link restore. `true` means a scene consumed its authored step. */
export function settleNarrativeRestore(
    anchor: NarrativeAnchor,
    settlement: NarrativeRestoreSettlement,
): boolean {
    let consumed = false;
    for (const consumer of [...consumers])
        consumed = consumer(anchor, settlement) === true || consumed;
    return consumed;
}

export type NarrativeLayoutStop = "quiet" | "deadline" | "abort";

export interface NarrativeLayoutHeal {
    settle: () => void;
    abort: () => void;
}

export interface NarrativeLayoutHealOptions {
    target: HTMLElement;
    root: HTMLElement;
    reanchor: () => void;
    onStop: (reason: NarrativeLayoutStop) => void;
    quietMs?: number;
    deadlineMs?: number;
}

/**
 * Correct a semantic restore only while its first layout is still settling. The target and
 * document root share one bounded ResizeObserver; the first target movement consumes the sole
 * correction and disconnects observation, while quiet, deadline, or reader input ends the lifecycle.
 */
export function watchNarrativeAnchorLayout({
    target,
    root,
    reanchor,
    onStop,
    quietMs = 1_200,
    deadlineMs = 5_000,
}: NarrativeLayoutHealOptions): NarrativeLayoutHeal {
    let settled = false;
    let stopped = false;
    let reanchored = false;
    let movedBeforeSettle = false;
    let lastOffset = target.getBoundingClientRect().top + window.scrollY;
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    const stop = (reason: NarrativeLayoutStop): void => {
        if (stopped) return;
        stopped = true;
        if (!reanchored) observer?.disconnect();
        clearTimeout(deadlineTimer);
        if (quietTimer) clearTimeout(quietTimer);
        onStop(reason);
    };
    const armQuiet = (): void => {
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(() => stop("quiet"), quietMs);
    };
    const inspect = (): void => {
        if (reanchored) return;
        const offset = target.getBoundingClientRect().top + window.scrollY;
        const moved = Math.abs(offset - lastOffset) > 1;
        lastOffset = offset;
        if (!settled) {
            movedBeforeSettle ||= moved;
            return;
        }
        if (moved || movedBeforeSettle) {
            movedBeforeSettle = false;
            reanchored = true;
            observer?.disconnect();
            reanchor();
        }
        armQuiet();
    };
    const observer =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(inspect);
    observer?.observe(target);
    if (root !== target) observer?.observe(root);
    const deadlineTimer = setTimeout(() => stop("deadline"), deadlineMs);
    return {
        settle() {
            if (stopped) return;
            settled = true;
            inspect();
            if (!observer) stop("quiet");
        },
        abort: () => stop("abort"),
    };
}
