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

import {
    computed,
    shallowRef,
    triggerRef,
    type Component,
    type ComputedRef,
    type ShallowRef,
} from "vue";
import type {
    FilterDimension,
    FilterResponse,
} from "../contract/viz-contract.js";
import type { UseVizOptions } from "./useVizOptions.js";

/** A per-MOUNT identity token — the deregister guard's key (an HMR / keep-alive double-mount never
    evicts the live instance, the stale unmount is inert). */
export type VizToken = symbol;

/** The one truthful image format exposed by a mounted plate's native renderer. */
export type NativeImageFormat = "png" | "svg";

export interface NativeImageExport {
    readonly format: NativeImageFormat;
    export(): boolean;
}

/** ONE registered viz's facet — its id, the per-mount token, and the declared `filterDimensions` (the
    panel projects ⋃ over the active set, de-duped by key). */
export interface RegisteredViz {
    /** The viz's stable id (`contract.id`) — the registry key + the panel-pin target. */
    vizId: string;
    /** The per-mount token (the deregister guard). */
    token: VizToken;
    /** The declared filter dimensions (the contract facet — the panel projects + the `DimDial`
        reads `dataValues`/`format`/`step`/`label`/`arity` off these). */
    dims: readonly FilterDimension[];
    /** The contract's explicit filter-response policy, normalized by the mounting host. */
    filterResponse: FilterResponse;
    /** The E2 per-viz options controller (the dials the retired inline dock used to host — they
        re-home into the unified panel's OPTIONS band, projected off the pinned/active viz). Null when
        the viz declares no options. */
    optionsController?: UseVizOptions | null;
    /** Native live-renderer export. Absent when the mounted plate cannot serialize an image. */
    imageExport?: NativeImageExport;
}

/** THE S-20 ChapterStage ANATOMY ADAPTER (spec-chrome §e.3). A composed `ChapterStage` does NOT
    render through `VizPlate`, so it never self-registers a plate facet — yet the fold's facet-5 zone
    must project the stage's bespoke, scene-aware gear controls (`anatomy.gear.controls`, e.g. the /sci
    scatter `Controls.vue`), NOT the raw plate `optionsController` the stage's OWN graphic happens to
    register under the same id (`Graphic.vue :viz-id="SCI_SCATTER_STAGE_ID"`). This is that projection —
    the controls Component + the props it needs (`stageId`/`eventHub`) — carried in a SEPARATE
    stage-anatomy seam (below) so it never collides with, nor is clobbered by, the graphic's volatile
    plate entry under the same vizId. The facet-5 zone reads it via `stageControlsFor(activeVizId)`. */
export interface RegisteredStageControls {
    /** The gear cluster's label (`stage.anatomy.gear.label`) — the facet-5 zone's accessible name. */
    readonly label: string;
    /** The stage's bespoke controls Component (`stage.anatomy.gear.controls`). */
    readonly component: Component;
    /** The props the controls need when the facet-5 zone renders them OUTSIDE ChapterStage's own
        template (`stageId` + `eventHub`). */
    readonly props: Record<string, unknown>;
}

/** vizId → its registered facet. A `shallowRef`-held Map (the panel re-projects on mount/unmount via
    `triggerRef`) so the stored `optionsController`'s `ComputedRef`s are NOT deep-unwrapped (a deep
    `reactive` would collapse `isDefault: ComputedRef<boolean>` → `boolean` and break the controller
    type). A module singleton: ONE registry for the app (the `useFilterPane` idiom; NO Pinia store). */
const registry: ShallowRef<Map<string, RegisteredViz>> = shallowRef(
    new Map<string, RegisteredViz>(),
);

/** vizId → the ChapterStage anatomy controls registered by the mounted stage (the S-20 seam). A
    SEPARATE `shallowRef` Map from `registry`: a stage's anatomy is owned by the long-lived
    ChapterStage section, DECOUPLED from the graphic's volatile plate entry under the same id, so the
    two never race for one key (the graphic's `register`/`deregister` churns; this seam does not).
    Token-guarded exactly like `registry` — an HMR / keep-alive re-mount is inert. */
const stageControls: ShallowRef<
    Map<string, { token: VizToken; controls: RegisteredStageControls }>
> = shallowRef(new Map());

/** THE ROUTE'S PRIMARY VIZ — the FIRST-registered still-mounted plate. A `Map` preserves insertion
    order, and `register`'s `set` on an already-present key keeps that key's ORIGINAL slot (an
    HMR / keep-alive re-mount is inert), so the first key is the oldest live plate — stable across
    scroll as later plates append. The membrane's facet-5 zone falls back to this on a PLAIN-PLATE
    route (no scrub host writes `activeVizId`) so the zone + its facet-7 filter trigger PAINT at rest
    — the A-19 route-gate for a route with no centre-grain host. `""` when nothing is mounted. Reads
    the `shallowRef` (re-projects on every `register`/`deregister` `triggerRef`). */
const primaryVizId: ComputedRef<string> = computed(() => {
    for (const id of registry.value.keys()) return id;
    return "";
});

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

    /** Replace one live mount's reactive filter facet without re-registering it. */
    function updateFilterFacet(
        vizId: string,
        token: VizToken,
        facet: Pick<RegisteredViz, "dims" | "filterResponse">,
    ): void {
        const entry = registry.value.get(vizId);
        if (
            !entry ||
            entry.token !== token ||
            (entry.dims === facet.dims && entry.filterResponse === facet.filterResponse)
        )
            return;
        registry.value.set(vizId, { ...entry, ...facet });
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

    /** THE S-20 SEAM (§e.3) — register a mounted ChapterStage's bespoke gear controls; mints a fresh
        per-mount token (last-writer-wins the key). Returns the token for `deregisterStageControls`. */
    function registerStageControls(
        vizId: string,
        controls: RegisteredStageControls,
    ): VizToken {
        const token: VizToken = Symbol(vizId);
        stageControls.value.set(vizId, { token, controls });
        triggerRef(stageControls);
        return token;
    }

    /** Deregister a stage's controls on unmount — deletes ONLY when the live entry's token matches
        (the double-mount guard: a stale unmount superseded by a re-register is inert). */
    function deregisterStageControls(vizId: string, token: VizToken): void {
        if (stageControls.value.get(vizId)?.token === token) {
            stageControls.value.delete(vizId);
            triggerRef(stageControls);
        }
    }

    /** The ChapterStage anatomy controls registered for `vizId`, or `undefined` when no stage owns it
        (the facet-5 zone projects the stage's controls off THIS, never the graphic's plate facet).
        Reads `stageControls.value` so a caller's `computed` tracks the ref (re-projects on register). */
    function stageControlsFor(vizId: string): RegisteredStageControls | undefined {
        return stageControls.value.get(vizId)?.controls;
    }

    /** TEST HYGIENE — clear the module-singleton registries between specs (the `afterEach` seam; the
        singleton would otherwise bleed a registered facet across specs). */
    function __resetRegistry(): void {
        registry.value = new Map();
        stageControls.value = new Map();
    }

    return {
        registry,
        primaryVizId,
        register,
        updateFilterFacet,
        deregister,
        facetsFor,
        registerStageControls,
        deregisterStageControls,
        stageControlsFor,
        __resetRegistry,
    };
}
