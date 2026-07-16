import type { AtlasEventContract, EventScope } from "../../events/index.js";
import { explain, isIdentity, normalize, type Predicate } from "../engine/predicate.js";

/** Publish the reader's canonical route predicate on the source panel's host-owned hub. */
export function emitSourceFilterState<Row>(
    hub: AtlasEventContract,
    scope: EventScope,
    predicate: Predicate<Row>,
): void {
    const canonical = normalize(predicate);
    hub.emit({
        type: "filter-state",
        scope,
        predicate: explain(canonical),
        active: !isIdentity(canonical),
    });
}
