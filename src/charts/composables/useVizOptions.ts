// platform/composables/useVizOptions.ts — the PER-VIZ OPTIONS state engine (D13 /
// D4.a · ds-per-viz-options §3.1). The companion of <VizOptions> (the chrome), split
// exactly like useYearScope/FilterPanel (state engine vs chrome shell). Each plate
// declares its option VOCABULARY (the surveyed dials — measure, grain, sizeBy, scale,
// topN); this composable holds each dial's value in the view store's dial memory.
//
// READ ON LOAD, NEVER WRITTEN (U-F60 cl. 4 · RULINGS §I, §K K-2): a deep link may carry
// `?viz.<vizId>.<optKey>=<value>`, and that value seeds the dial. No dial act writes the
// URL: `set` and `reset` change the in-memory value only. The dials register through
// `registerDials` (not `registerKeys`), so the view-level `resetParams` returns every
// dial to its default without writing a dial key.
//
// DEFAULTS: `set(key, default)` (or an out-of-vocabulary value) returns the dial to its
// default. Reads fall back to each spec's default when neither the reader nor the load URL
// gave a value, and an out-of-vocabulary URL value falls back to the default at the ONE
// read site (the `isScaleMode` guard idiom).
//
// ONE SOURCE OF TRUTH, TWO READERS: where a derivation lives in a Pinia store (the
// band-cake's `tierCountsByYear` reading the `measure` dial), the store builds its own
// `useVizOptions` over the SAME vizId and specs, and both read the one dial memory.
//
// A `global` dial is the exception: it is a second surface on a global filter, whose bare key
// the filter itself writes in answer to the reader's act. A `period` dial is a second surface
// on the year scope: it reads the scope and writes through `useYearScope.setPeriod`, the one
// period write path (U · §L 6(f)). A `global` dial may not name a period key.

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
    · `global` — the dial is a SECOND SURFACE on a GLOBAL filter. It reads/writes the BARE
      global key as a MIRROR — ONE source of truth, two surfaces — so a `?viz.<id>.<key>=`
      SHADOW never exists (the B4 scrubber-drift trap). Its `key` IS the global param name; it
      is excluded from the plate dirty-dot/Reset (resetting a plate must never clear a global
      filter). A period key (`year`, `years`, `yearMode`, `sy`) is refused: use `period`.
    · `period` — the dial is a SECOND SURFACE on the YEAR SCOPE. Its choices are period keys
      (`"2024"`); it reads the scope's single year and writes `setSingle` through the one codec
      (U · §L 6(f)). Excluded from the plate dirty-dot/Reset, like `global`. */
export type VizOptionScope = "local" | "global" | "period";

/** URL keys that only the year scope reads or writes (every axis's period and legacy keys). */
const PERIOD_KEYS: ReadonlySet<string> = new Set(["year", "years", "yearMode", "sy"]);

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
    /** Reactive values — `values.measure`, `values.grain`, … Reads fall back to each
        spec's default when neither the reader nor the load URL gave a value. */
    values: Record<string, string | boolean>;
    /** True iff every option sits at its default (drives the dirty dot + the Reset row). */
    isDefault: ComputedRef<boolean>;
    /** Set one option in memory; the default (or an out-of-vocabulary value) returns it to the
        default. A local dial never writes the URL. */
    set(key: string, value: string | boolean): void;
    /** Return this plate's local dials to their defaults (in memory; the URL is not written). */
    reset(): void;
}

/** A `global`-scoped spec mirrors a GLOBAL filter — its key is the BARE global param name (no
    namespace), so it is a second surface on the one source of truth, never a `?viz.*` shadow. */
function isGlobal(spec: VizOptionSpec): boolean {
    return spec.scope === "global" || spec.scope === "period";
}

/** The per-spec URL param name. A `local` spec namespaces under `viz.<vizId>.<optKey>` (the ds §5
    namespace); a `global` spec uses the BARE key (it MIRRORS the global filter store). */
function paramKeyOf(vizId: string, spec: VizOptionSpec): string {
    return isGlobal(spec) ? spec.key : `viz.${vizId}.${spec.key}`;
}

/**
 * Bind a plate's surveyed option set. `vizId` is the plate's one slug (the same one
 * passed to `<ChartFrame :fig-id>`); `specs` are the declarative dials. Returns a
 * reactive `values` bag (read in the plate's derivations) + the chrome controls.
 */
export function useVizOptions(vizId: string, specs: VizOptionSpec[]): UseVizOptions {
    for (const spec of specs) {
        if (spec.scope === "global" && PERIOD_KEYS.has(spec.key)) {
            throw new Error(
                `useVizOptions(${vizId}): the global dial "${spec.key}" names a period key; declare it scope: "period" so it writes through the year scope`,
            );
        }
    }
    const view = useViewParams();

    // Register every LOCAL dial so the view-level `resetParams` returns it to its default (one
    // document reset resets every plate's dials). GLOBAL keys are NOT registered: a reset must
    // never clear a global filter — the global scope owns its own round-trip (the year-scope),
    // and this dial only MIRRORS it. Idempotent.
    view.registerDials(specs.filter((s) => !isGlobal(s)).map((s) => paramKeyOf(vizId, s)));

    const specByKey = new Map(specs.map((s) => [s.key, s] as const));

    /** A local dial's wire value comes from the dial memory (seeded from the load URL); a global
        dial's from the global filter's own key. */
    function wireOf(spec: VizOptionSpec): string | undefined {
        const pk = paramKeyOf(vizId, spec);
        if (spec.scope === "period") {
            const scope = view.yearScope?.scope.value;
            return scope?.mode === "single" ? String(scope.year) : undefined;
        }
        return isGlobal(spec) ? view.param(pk) : view.dialParam(pk);
    }
    /** Write a wire value: a period dial writes through the year scope, a global dial writes its
        global filter's key (the reader's act on that filter); a local dial writes memory only. */
    function writeOf(spec: VizOptionSpec, wire: string | undefined): void {
        const pk = paramKeyOf(vizId, spec);
        if (spec.scope === "period") {
            const year = Number(wire ?? (spec.kind === "switch" ? undefined : spec.default));
            if (Number.isInteger(year)) view.yearScope?.setSingle(year);
        } else if (isGlobal(spec)) view.setParam(pk, wire);
        else view.setDial(pk, wire);
    }

    /** Read one option, validated against its vocabulary, falling back to the default. */
    function read(spec: VizOptionSpec): string | boolean {
        const raw = wireOf(spec);
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
    // shared dial memory (a flip re-runs every reader's computeds). A plain
    // `reactive` of computeds: `reactive` auto-UNWRAPS the nested `ComputedRef`s, so a
    // reader gets `values.measure` as the bare string/boolean (the `.value` is stripped).
    const values = reactive(
        Object.fromEntries(specs.map((s) => [s.key, computed(() => read(s))])),
    ) as unknown as Record<string, string | boolean>;

    function set(key: string, value: string | boolean): void {
        const spec = specByKey.get(key);
        if (!spec) return;
        if (spec.kind === "switch") {
            // The default is held as "no value"; the non-default as `1`/`0`.
            writeOf(spec, value === spec.default ? undefined : value ? "1" : "0");
            return;
        }
        const str = String(value);
        // A default-valued (or out-of-vocab) set returns the dial to its default.
        const isDefaultOrForeign = str === spec.default || !spec.choices.some((c) => c.value === str);
        writeOf(spec, isDefaultOrForeign ? undefined : str);
    }

    function reset(): void {
        // Reset returns only LOCAL dials (the plate's own lens) to their defaults. A global-scoped
        // dial mirrors a global filter; resetting the plate must never clear the year scope (the
        // one-source-of-truth contract — the global filter has its own Reset).
        for (const s of specs) if (!isGlobal(s)) view.setDial(paramKeyOf(vizId, s), undefined);
    }

    // The dirty-dot/Reset reflect only LOCAL dials: a global dial sitting off its plate-default
    // is the GLOBAL filter's state, not the plate's re-projection, so it never lights the plate's
    // dirty-dot (excluded from the plate dirty-dot/Reset — f-vizoptions §3).
    const isDefault = computed<boolean>(() =>
        specs.filter((s) => !isGlobal(s)).every((s) => values[s.key] === s.default),
    );

    return { vizId, specs, values, isDefault, set, reset };
}
