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

// ── THE LANDING HOLD (U/B8 A9) ──────────────────────────────────────────────────────────────────
// A page opened on a deep link scrolls to its anchor once the sections have mounted. Until then,
// every element above the anchor sits in view at the top of the page; an entrance that played there
// would be used up off the reader's screen. So entrances wait for the landing: `whenNarrativeLanded`
// runs its callback at once when no restore is owed, and after the restore settles when one is.
// The dock's stepper is the one restorer: it marks the restore begun when it has an anchor, and
// publishes the settle (aborted or not) on every path, including an anchor that names nothing.

/** The URL keys that carry a narrative anchor (read by `useViewParams`; the `#fragment` is the third). */
export const NARRATIVE_AT_KEY = "at";
export const NARRATIVE_SCENE_KEY = "scene";

type LandingState = "unknown" | "landing" | "landed";
let landing: LandingState = "unknown";
let openedOnLink: boolean | null = null;
const afterLanding = new Set<() => void>();

/** Whether the document was opened on a narrative link: read once, from the address it loaded with. */
function pageOpenedOnLink(): boolean {
    if (openedOnLink === null) {
        if (typeof location === "undefined") openedOnLink = false;
        else {
            const q = new URLSearchParams(location.search);
            openedOnLink = q.has(NARRATIVE_AT_KEY) || q.has(NARRATIVE_SCENE_KEY) || location.hash.length > 1;
        }
    }
    return openedOnLink;
}

/** True while a deep-link restore is owed and has not settled. */
export function narrativeLandingHeld(): boolean {
    return landing === "landing" || (landing === "unknown" && pageOpenedOnLink());
}

/** Run `start` once no deep-link restore is owed: now, or when the owed restore settles. */
export function whenNarrativeLanded(start: () => void): () => void {
    if (!narrativeLandingHeld()) {
        start();
        return () => undefined;
    }
    afterLanding.add(start);
    return () => afterLanding.delete(start);
}

function land(): void {
    landing = "landed";
    for (const start of [...afterLanding]) {
        afterLanding.delete(start);
        start();
    }
}

/** The restorer has an anchor and is driving to it: entrances hold until its settle. */
export function beginNarrativeRestore(): void {
    landing = "landing";
}

/** The restorer found no anchor to restore: nothing is owed, entrances go live. */
export function markNarrativeRestoreAbsent(): void {
    land();
}

/** Test seam: forget the landing state (a new document). */
export function resetNarrativeLanding(opened: boolean | null = null): void {
    landing = "unknown";
    openedOnLink = opened;
    afterLanding.clear();
}

/** Publish one settled deep-link restore. `true` means a scene consumed its authored step. */
export function settleNarrativeRestore(
    anchor: NarrativeAnchor,
    settlement: NarrativeRestoreSettlement,
): boolean {
    land();
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
