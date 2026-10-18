// charts/scene/stage-provenance.ts — THE STAGE'S PROVENANCE DETENT AND ITS OPEN COMMAND (U RULINGS
// §K K-2 · U-F60 cl. 4).
//
// A composed stage's provenance appendix has one detent (shut, peek or full). It moves in answer to
// the reader (the appendix's own control) and to one command, `openProvenance(detent)`, which a stage
// consumer may call and which the stage calls once on load to honour a deep link's `?drawer`.
// `?drawer` is read-only on load and never written: the detent lives here, in memory, and every move
// is announced on the stage's event hub (`provenance-drawer`), so a late subscriber still learns it.
import { ref, type Ref } from "vue";
import type { AtlasEventContract } from "../../events/index.js";
import type { AppendixDetent } from "../../platform/provenance/appendix.js";

const DETENTS: readonly AppendixDetent[] = ["shut", "peek", "full"];

/** Parse a `?drawer` value: an open detent (`peek` or `full`), else null. `shut` is the absence of a
    link, so it never overrides the stage's authored resting detent. */
export function linkedDetent(raw: string | undefined): AppendixDetent | null {
    return raw === "peek" || raw === "full" ? raw : null;
}

export interface StageProvenance {
    /** The appendix's current detent. */
    readonly detent: Readonly<Ref<AppendixDetent>>;
    /** Move the appendix to `detent` and announce it on the stage hub. */
    openProvenance(detent: AppendixDetent): void;
}

export function createStageProvenance(options: {
    hub: AtlasEventContract;
    scope: { readonly grain: "stage"; readonly stageId: string };
    /** The stage's authored resting detent. */
    authored: AppendixDetent | undefined;
    /** The `?drawer` value on load (read once; never written). */
    linked: string | undefined;
}): StageProvenance {
    const detent = ref<AppendixDetent>(options.authored ?? "shut");
    function openProvenance(next: AppendixDetent): void {
        if (!DETENTS.includes(next)) return;
        detent.value = next;
        options.hub.emit({ type: "provenance-drawer", scope: options.scope, detent: next });
    }
    const linked = linkedDetent(options.linked);
    if (linked) openProvenance(linked);
    return { detent, openProvenance };
}
