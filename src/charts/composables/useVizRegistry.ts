// platform/composables/useVizRegistry.ts — THE MOUNTED-PLATE REGISTRY (K-FILTER-UNIFIED §4.D ·
// the Component-altitude seam).
//
// THE BLOCKER it solves. `DashboardEssay.vue` mounts feature plates as `<component :is>`, so a
// viz's `filterDimensions` facet is INVISIBLE at the chapter altitude (the chapter never sees the
// plate's contract). Each mounted `VizPlate` ALREADY holds `props.contract` + stamps `data-viz-id`,
// so the plate SELF-REGISTERS its facet on mount; the unified panel reads the registry projected to
// the K-ACTIVE active viz-set (`useFilterPanel`).
//
// A MODULE SINGLETON (the `useFilterPane.ts` one-truth idiom — sanctioned for the pure Vite SPA;
// `main.ts` `createApp`, NO SSR cross-request leak). The registry is `reactive` so the panel
// re-projects the instant a plate mounts, changes its reactive dimensions, or unmounts.
//
// THE per-MOUNT TOKEN (edge J — the HMR / keep-alive double-mount guard). `register` mints a fresh
// `Symbol` per mount and `deregister` deletes the key ONLY when the live entry's token matches — so
// a stale unmount of an old instance (an HMR swap or a keep-alive re-mount that already re-registered
// the SAME `vizId`) never evicts the live one (last-writer-wins the key, the stale unmount is inert).

import { shallowRef, triggerRef, type ShallowRef } from "vue";
import type { FilterDimension } from "@/charts/contract/viz-contract";
import type { UseVizOptions } from "@/charts/composables/useVizOptions";

/** A per-MOUNT identity token — the deregister guard's key (an HMR / keep-alive double-mount never
    evicts the live instance, the stale unmount is inert). */
export type VizToken = symbol;

/** The one truthful image format exposed by a mounted plate's native renderer. */
export type NativeImageFormat = "png" | "svg";

export interface NativeImageExport {
    readonly format: NativeImageFormat;
    export(): boolean;
}

/** ONE registered viz's facet — its id, the per-mount token, the declared `filterDimensions` (the
    panel projects ⋃ over the active set, de-duped by key), and the cross-HIGHLIGHT veil policy. */
export interface RegisteredViz {
    /** The viz's stable id (`contract.id`) — the registry key + the panel-pin target. */
    vizId: string;
    /** The per-mount token (the deregister guard). */
    token: VizToken;
    /** The declared filter dimensions (the contract facet — the panel projects + the `DimDial`
        reads `dataValues`/`format`/`step`/`label`/`arity` off these). */
    dims: readonly FilterDimension[];
    /** `VizContract.crossHighlight ?? true` — the per-viz veil policy (a mark-render policy, H4). */
    crossHighlight: boolean;
    /** The E2 per-viz options controller (the dials the retired inline dock used to host — they
        re-home into the unified panel's OPTIONS band, projected off the pinned/active viz). Null when
        the viz declares no options. */
    optionsController?: UseVizOptions | null;
    /** Native live-renderer export. Absent when the mounted plate cannot serialize an image. */
    imageExport?: NativeImageExport;
}

/** vizId → its registered facet. A `shallowRef`-held Map (the panel re-projects on mount/unmount via
    `triggerRef`) so the stored `optionsController`'s `ComputedRef`s are NOT deep-unwrapped (a deep
    `reactive` would collapse `isDefault: ComputedRef<boolean>` → `boolean` and break the controller
    type). A module singleton: ONE registry for the app (the `useFilterPane` idiom; NO Pinia store). */
const registry: ShallowRef<Map<string, RegisteredViz>> = shallowRef(
    new Map<string, RegisteredViz>(),
);

/**
 * THE MOUNTED-PLATE REGISTRY. A `VizPlate` self-registers on mount, updates that token's reactive
 * dimensions, and deregisters on unmount; the unified panel projects the K-ACTIVE active viz-set.
 * NOT a Pinia store — a module singleton (the `useFilterPane.ts:14` one-truth idiom for the SPA).
 */
export function useVizRegistry() {
    /** Register a mounted plate's facet — mints a fresh per-mount token and writes the entry
        (last-writer-wins the `vizId` key). Returns the token the caller hands back to `deregister`. */
    function register(entry: Omit<RegisteredViz, "token">): VizToken {
        const token: VizToken = Symbol(entry.vizId);
        registry.value.set(entry.vizId, { ...entry, token });
        triggerRef(registry); // the shallowRef Map mutated in place — re-project the panel.
        return token;
    }

    /** Deregister a plate's facet on unmount — deletes the key ONLY when the LIVE entry's token is
        this instance's (the double-mount guard: a stale unmount whose token was already superseded
        by a re-register is inert, so the live instance survives an HMR / keep-alive swap). */
    function deregister(vizId: string, token: VizToken): void {
        if (registry.value.get(vizId)?.token === token) {
            registry.value.delete(vizId);
            triggerRef(registry);
        }
    }

    /** Replace one live mount's reactive dimensions without re-registering it. The token fence makes
        a late watcher from a superseded mount inert, exactly like deregistration. */
    function updateDims(
        vizId: string,
        token: VizToken,
        dims: readonly FilterDimension[],
    ): void {
        const entry = registry.value.get(vizId);
        if (!entry || entry.token !== token || entry.dims === dims) return;
        registry.value.set(vizId, { ...entry, dims });
        triggerRef(registry);
    }

    /** The active set's facets — the registered entries for the ids in `ids`, skipping ids whose
        plate is not mounted (the registry is the truth: an `activeVizId` with no mounted plate
        contributes nothing). De-dup of shared dims is the panel's job (`dimKeyOf`). */
    function facetsFor(ids: Iterable<string>): RegisteredViz[] {
        const out: RegisteredViz[] = [];
        for (const id of ids) {
            const entry = registry.value.get(id);
            if (entry) out.push(entry);
        }
        return out;
    }

    /** TEST HYGIENE — clear the module-singleton registry between specs (the `afterEach` seam; the
        singleton would otherwise bleed a registered facet across specs). */
    function __resetRegistry(): void {
        registry.value = new Map();
    }

    return {
        registry,
        register,
        updateDims,
        deregister,
        facetsFor,
        __resetRegistry,
    };
}
