export type DismissReason = "outside-pointer" | "escape";

export interface DismissClaim {
    id: string;
    priority: number;
    within?: (path: readonly EventTarget[]) => boolean;
    guards?: (path: readonly EventTarget[]) => boolean;
    outsidePointer?: boolean;
    escape?: boolean;
    onDismiss: (reason: DismissReason) => void;
}

export interface DismissArbiter {
    claim: (claim: DismissClaim) => () => void;
    destroy: () => void;
}

function eventPath(event: Event): readonly EventTarget[] {
    return typeof event.composedPath === "function"
        ? event.composedPath()
        : event.target
          ? [event.target]
          : [];
}

/** One capture listener per gesture family; one verdict dismisses at most one claim. */
export function createDismissArbiter(
    doc: Document,
    { gestureEpsilonMs = 32 }: { gestureEpsilonMs?: number } = {},
): DismissArbiter {
    const claims = new Map<string, DismissClaim>();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const top = (predicate: (claim: DismissClaim) => boolean): DismissClaim | undefined =>
        [...claims.values()].filter(predicate).sort((a, b) => b.priority - a.priority)[0];

    function onPointer(event: PointerEvent): void {
        const path = eventPath(event);
        if ([...claims.values()].some((claim) => claim.within?.(path))) return;
        if ([...claims.values()].some((claim) => claim.guards?.(path))) return;
        const winner = top((claim) => claim.outsidePointer === true);
        if (!winner) return;
        const timer = setTimeout(() => {
            timers.delete(timer);
            if (claims.get(winner.id) === winner)
                winner.onDismiss("outside-pointer");
        }, gestureEpsilonMs);
        timers.add(timer);
    }
    function onKey(event: KeyboardEvent): void {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        const path = eventPath(event);
        if ([...claims.values()].some((claim) => claim.guards?.(path))) return;
        top((claim) => claim.escape === true)?.onDismiss("escape");
    }

    doc.addEventListener("pointerdown", onPointer, true);
    doc.addEventListener("keydown", onKey, true);
    return {
        claim(next) {
            claims.set(next.id, next);
            return () => {
                if (claims.get(next.id) === next) claims.delete(next.id);
            };
        },
        destroy() {
            doc.removeEventListener("pointerdown", onPointer, true);
            doc.removeEventListener("keydown", onKey, true);
            for (const timer of timers) clearTimeout(timer);
            timers.clear();
            claims.clear();
        },
    };
}
