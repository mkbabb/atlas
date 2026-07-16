// platform/composables/useVizOptions.ts — the PER-VIZ OPTIONS state engine (D13 /
// D4.a · ds-per-viz-options §3.1). The companion of <VizOptions> (the chrome), split
// exactly like useYearScope/FilterPanel (state engine vs chrome shell). Each plate
// declares its option VOCABULARY (the surveyed dials — measure, grain, sizeBy, scale,
// topN); this composable binds every key to the URL through `useViewParams` so a copied
// URL reconstructs every plate's lens on reload (the INV-5 URL-as-document floor).
//
// THE ONE GRAMMAR: every option key serializes as `?viz.<vizId>.<optKey>=<value>` (dots
// are legal, unescaped query-key characters the `useUrlSearchParams('history')` bag
// carries as-is). The keys flow through `registerKeys` (NOT a raw `useUrlState`), so the
// view-level `resetParams` sweeps them — one reset resets the whole document.
//
// THE DEFAULT-ELISION RULE (ds §5): a default is NEVER serialized. `set(key, default)`
// clears the param, so a pristine view's URL stays pristine — opening/closing a popover
// at default writes nothing. Reads fall back to each spec's default when the param is
// absent. Out-of-vocabulary URL values fall back to the default at the ONE read site
// (the `isScaleMode` guard idiom).
//
// ONE SOURCE OF TRUTH, TWO READERS: where a derivation lives in a Pinia store (the
// band-cake's `tierCountsByYear` reading the `measure` dial), the store consumes the
// SAME `?viz.*` param this composable writes — the proven `perCapitaScale` pattern. No
// event plumbing: the URL is the single source, chrome + derivation both read it.

import { computed, reactive, type ComputedRef } from "vue";
import { useViewParams } from "../../platform/stores/useViewParams.js";

/** One choice of an enumerated option (a segmented item or a select entry). */
export interface VizOptionChoice {
    /** The wire value (serialized to the URL when non-default). */
    value: string;
    /** The human label rendered in the control. */
    label: string;
    /** Render disabled with a reason (the short-lived-gap form; prefer OMITTING the
        choice until it is real — a dead control is a broken promise, ds §10). */
    disabled?: boolean;
    /** The disabled reason ("month grain — data pending"). */
    hint?: string;
}

/** The SCOPE of an option (f-vizoptions §3 — "effect the global filters if need be"):
    · `local`  — a plate-private lens, serialized as `?viz.<vizId>.<key>` (the default; the
      INV-5 per-plate document arm). The vast majority of dials.
    · `global` — the dial is a SECOND SURFACE on a GLOBAL filter (e.g. the year scope). It
      reads/writes the BARE global key (`?year`/`?yearMode`/`?years`) as a MIRROR — ONE source
      of truth, two surfaces — so a `?viz.<id>.year=` SHADOW never exists (the B4 scrubber-drift
      trap). Its `key` IS the global param name; it is excluded from the plate dirty-dot/Reset
      (resetting a plate must never clear a global filter). */
export type VizOptionScope = "local" | "global";

/** A spec's optional scope (default `local`). A `global` spec's `key` is the bare global param
    name the dial mirrors; a `local` spec's `key` is namespaced under `viz.<vizId>.`. */
type ScopeField = { scope?: VizOptionScope };

/** The declarative option specs — the plate's vocabulary, rendered by <VizOptions>. */
export type VizOptionSpec =
    | ({ kind: "segmented"; key: string; label: string; choices: VizOptionChoice[]; default: string } & ScopeField)
    | ({ kind: "select"; key: string; label: string; choices: VizOptionChoice[]; default: string } & ScopeField)
    | ({ kind: "switch"; key: string; label: string; default: boolean } & ScopeField);

/** The composable surface — the reactive URL-backed values + the chrome's controls. */
export interface UseVizOptions {
    /** The plate's identity (the `?viz.<vizId>.*` namespace + the `?fig=` slug). */
    vizId: string;
    /** The declarative specs the <VizOptions> chrome renders. */
    specs: VizOptionSpec[];
    /** Reactive, URL-backed values — `values.measure`, `values.grain`, … Reads fall
        back to each spec's default when the param is absent (default-elision). */
    values: Record<string, string | boolean>;
    /** True iff every option sits at its default (drives the dirty dot + the Reset row). */
    isDefault: ComputedRef<boolean>;
    /** Set one option; writing the default CLEARS the param (default-elision). */
    set(key: string, value: string | boolean): void;
    /** Clear this plate's `viz.<vizId>.*` params from the URL (back to defaults). */
    reset(): void;
}

/** A `global`-scoped spec mirrors a GLOBAL filter — its key is the BARE global param name (no
    namespace), so it is a second surface on the one source of truth, never a `?viz.*` shadow. */
function isGlobal(spec: VizOptionSpec): boolean {
    return spec.scope === "global";
}

/** The per-spec URL param name. A `local` spec namespaces under `viz.<vizId>.<optKey>` (the ds §5
    namespace); a `global` spec uses the BARE key (it MIRRORS the global filter store). */
function paramKeyOf(vizId: string, spec: VizOptionSpec): string {
    return isGlobal(spec) ? spec.key : `viz.${vizId}.${spec.key}`;
}

/**
 * Bind a plate's surveyed option set to the URL. `vizId` is the plate's one slug (the
 * same one passed to `<ChartFrame :fig-id>`); `specs` are the declarative dials. Returns
 * a reactive `values` bag (read in the plate's derivations) + the chrome controls.
 */
export function useVizOptions(vizId: string, specs: VizOptionSpec[]): UseVizOptions {
    const view = useViewParams();

    // Register every LOCAL key so the view-level `resetParams` sweeps them (the ds §5 reset
    // contract — one document reset clears every plate's dials). GLOBAL keys are NOT registered:
    // a plate reset (or a per-plate sweep) must never clear a global filter — the global scope
    // owns its own round-trip (the year-scope), and this dial only MIRRORS it. Idempotent.
    view.registerKeys(specs.filter((s) => !isGlobal(s)).map((s) => paramKeyOf(vizId, s)));

    const specByKey = new Map(specs.map((s) => [s.key, s] as const));

    /** Read one option, validated against its vocabulary, falling back to the default. */
    function read(spec: VizOptionSpec): string | boolean {
        const raw = view.param(paramKeyOf(vizId, spec));
        if (spec.kind === "switch") {
            // A switch serializes only its NON-default state (the default is elided): the
            // param present at all means "flipped from default."
            if (raw == null) return spec.default;
            return raw === "1" || raw === "true" ? true : raw === "0" || raw === "false" ? false : spec.default;
        }
        // An enum value out of vocabulary falls back to the default (the guard idiom).
        if (raw != null && spec.choices.some((c) => c.value === raw)) return raw;
        return spec.default;
    }

    // The reactive values bag — `values.measure`, `values.grain`, … recomputed off the
    // shared reactive URL query (a scrub/flip re-runs every reader's computeds). A plain
    // `reactive` of computeds: `reactive` auto-UNWRAPS the nested `ComputedRef`s, so a
    // reader gets `values.measure` as the bare string/boolean (the `.value` is stripped).
    const values = reactive(
        Object.fromEntries(specs.map((s) => [s.key, computed(() => read(s))])),
    ) as unknown as Record<string, string | boolean>;

    function set(key: string, value: string | boolean): void {
        const spec = specByKey.get(key);
        if (!spec) return;
        const pk = paramKeyOf(vizId, spec);
        if (spec.kind === "switch") {
            // Default-elision: writing the default clears the param; the non-default
            // serializes as `1`/`0` (the shortest honest wire form).
            if (value === spec.default) view.setParam(pk, undefined);
            else view.setParam(pk, value ? "1" : "0");
            return;
        }
        const str = String(value);
        // Default-elision: a default-valued (or out-of-vocab) write clears the param.
        if (str === spec.default || !spec.choices.some((c) => c.value === str)) {
            view.setParam(pk, undefined);
        } else {
            view.setParam(pk, str);
        }
    }

    function reset(): void {
        // Reset clears only LOCAL dials (the plate's own lens). A global-scoped dial mirrors a
        // global filter; resetting the plate must never clear the year scope (the one-source-of-
        // truth contract — the global filter has its own Reset).
        for (const s of specs) if (!isGlobal(s)) view.setParam(paramKeyOf(vizId, s), undefined);
    }

    // The dirty-dot/Reset reflect only LOCAL dials: a global dial sitting off its plate-default
    // is the GLOBAL filter's state, not the plate's re-projection, so it never lights the plate's
    // dirty-dot (excluded from the plate dirty-dot/Reset — f-vizoptions §3).
    const isDefault = computed<boolean>(() =>
        specs.filter((s) => !isGlobal(s)).every((s) => values[s.key] === s.default),
    );

    return { vizId, specs, values, isDefault, set, reset };
}
