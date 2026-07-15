import type { NarrativeAnchor } from "@/platform/stores/useViewParams";

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
