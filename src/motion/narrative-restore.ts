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

export interface NarrativeLayoutSettle {
    /** The caller has just placed the target itself (the restore's settle re-land), so movement
        seen before the settle is already cured; only movement after the settle is corrected. */
    readonly placed?: boolean;
}

export interface NarrativeLayoutHeal {
    settle: (options?: NarrativeLayoutSettle) => void;
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
 * document root share one bounded ResizeObserver. After the settle, every target movement is
 * corrected; quiet, the deadline or reader input ends the lifecycle. The quiet edge reads the
 * target itself before it stops, so a movement made by a long task whose observer delivery has
 * not run yet is corrected rather than dropped. A settle that the caller `placed` (it re-landed
 * the target itself) takes the target's position as the new baseline.
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
    let movedBeforeSettle = false;
    let lastOffset = target.getBoundingClientRect().top + window.scrollY;
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    const stop = (reason: NarrativeLayoutStop): void => {
        if (stopped) return;
        stopped = true;
        observer?.disconnect();
        clearTimeout(deadlineTimer);
        if (quietTimer) clearTimeout(quietTimer);
        onStop(reason);
    };
    /** Read the target; true when it moved since the last read. */
    const moved = (): boolean => {
        const offset = target.getBoundingClientRect().top + window.scrollY;
        const delta = Math.abs(offset - lastOffset) > 1;
        lastOffset = offset;
        return delta;
    };
    const armQuiet = (): void => {
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
            quietTimer = null;
            if (stopped) return;
            if (!moved()) {
                stop("quiet");
                return;
            }
            reanchor();
            armQuiet();
        }, quietMs);
    };
    const inspect = (): void => {
        if (stopped) return;
        const delta = moved();
        if (!settled) {
            movedBeforeSettle ||= delta;
            return;
        }
        if (delta || movedBeforeSettle) {
            movedBeforeSettle = false;
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
        settle({ placed = false } = {}) {
            if (stopped) return;
            settled = true;
            if (placed) {
                movedBeforeSettle = false;
                moved();
            }
            inspect();
            if (!observer) stop("quiet");
        },
        abort: () => stop("abort"),
    };
}
