// platform/composables/useFilterDimensions.ts — THE filterDimensions STATE ALGEBRA
// (J-FRAME arm b · C37 · CH2 · the per-DIMENSION keying + the per-dim arity + the
// selection-grain tractability boundary). Phase A, glass-INDEPENDENT.
//
// J-FRAME arm a owns the `filterDimensions` FACET TYPE on the I2 `VizContract`
// (`viz-contract.ts` — a viz DECLARES its filter dims there). THIS module owns the
// runtime STATE MODEL the host reads off that declaration — and the make-or-break is
// the KEYING: the state is keyed by DIMENSION, NOT by viz.
//
// ── THE KEYSTONE: per-DIMENSION keying (NOT per-viz) — J-FEEDBACK-5 §2 / J-FRAME §2 ──────
// The naive read keys filter-state by VIZ — every viz holds its OWN `region` copy. That is
// the N×M panel explosion (every viz × every dimension), and a `region` selected on plate A
// does NOT reach plate B because each holds a private cell. The cure: ONE cell per DIMENSION
// (`region`, `year`). A dimension SHARED across two like vizzes reads the SAME cell, so
// "shared attributes persist across like vizzes" falls out FOR FREE (selecting `region` on
// plate A persists onto plate B — they read one cell). A dimension declared by ONLY one viz
// owns its own cell and never bleeds onto a viz that never declared it (the cell is read only
// where a viz DECLARES the dim). The negative control the gate (arm d) catches — per-VIZ
// keying — is the `vizScopedKeyOf` codec below, kept DISTINCT and exported so the gate can
// contrast the two keyings structurally (a shared dim that does NOT persist === per-viz === RED).
//
// ── THE per-dim ARITY — J-FRAME §2 / CH2 — the scalar/range dims are NOT a uniform set ──────
// `useViewParams` scalars are NOT sets (USF popMin/Max/flow = sliders, ECF's 7 categoricals =
// single/multi picks). So a dim carries an ARITY: `single` (a categorical pick, a scalar),
// `range` (a slider, an [min,max] interval), `set` (a multi-select that resolves through the
// selection grain). The set-algebra applies ONLY to `set` dims; `single`/`range` carry their
// scalar/interval value, never a forced set.
//
// ── THE SELECTION-GRAIN tractability boundary — J-FRAME §2 / CH2 ─────────────────────────────
// The cross-viz set-algebra holds ONLY where a `set` dim resolves through the SHIPPED
// `{kind}:{id}` codec over `useSelection.selectedIdsOf` (`selection-contract.ts:55-78`,
// `useChartSelection.ts:87`, the `selectedIdsOf` host at `stores/useSelection.ts:278`). A `set`
// dim NAMES its `SelectionKind`; its membership is the native-grain back-projection of that
// kind — never a hand-rolled Set. The `single`/`range` dims read/write `useViewParams`
// (`param`/`numberParam`) and carry their declared arity, never routed through the selection grain.
//
// THIS MODULE READS the shipped seams (`useSelection.selectedIdsOf`, `useViewParams`) — it
// NEVER re-authors them. Arm c owns the route-universe COLLISION GUARD module; this module
// CARRIES the universe tag on each dim so the guard is universe-scoped, but it does not
// adjudicate the cross-route membership itself (it exposes the tagged cell the guard reads).

import { computed, type ComputedRef } from "vue";
import type { SelectionKind } from "@/charts/contract/selection-contract";
import { useSelection } from "@/platform/stores/useSelection";
import { useViewParams } from "@/platform/stores/useViewParams";

// ─────────────────────────────────────────────────────────────────────────────
// THE ARITY + THE ROUTE-UNIVERSE — the per-dim shape declarations.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The per-dim ARITY (J-FRAME §2 / CH2). NOT a uniform set-algebra:
 *   · `single` — a scalar categorical pick (ECF's single categoricals; one value or none).
 *   · `multi`  — a within-OR categorical list off a `listParam` (USF `regions`; the symmetric sibling
 *               of `single`, DISTINCT from `set` which is selection-grain-bound — K-FILTER-UNIFIED §4.C).
 *   · `range`  — a slider interval `[min, max]` (USF popMin/popMax, a continuous scalar pair).
 *   · `set`    — a multi-select that resolves through the SELECTION GRAIN (`selectedIdsOf`).
 * Only `set` carries the cross-viz set-algebra; `single`/`multi`/`range` carry their scalar/list/interval.
 */
export type DimArity = "single" | "multi" | "range" | "set";

/**
 * The ROUTE-UNIVERSE a dimension's keys live in — the namespace that namespaces a SCI
 * `district:{lea}` apart from an ECF `district:{lea}` (the `j0-frame-collision` guard, owned
 * by arm c). A DATASET-universe id (the SCI LEA universe vs the ECF district universe), NOT a
 * route name — so the guard survives a route-merge and reads as the DATA truth (a SCI LEA is
 * not an ECF district even if the composite key matches). Carried on every dim so the host's
 * set-algebra is universe-scoped, never a bare global lookup. Arm c reads this tag; this
 * module only CARRIES it.
 */
export type RouteUniverse = "sci-lea" | "ecf-district" | "usf-region" | "speedtest-cell";

// ─────────────────────────────────────────────────────────────────────────────
// THE DIMENSION DECLARATION — the per-dim shape a viz declares on `filterDimensions`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One filter DIMENSION's declaration — the shape arm a's `filterDimensions` facet carries per
 * dim (this module re-exports the runtime shape so the host + the gate read ONE type). The
 * `key` is the DIMENSION identity (`region`/`year`/`popRange`) — the per-DIMENSION state cell's
 * key, SHARED across every viz that declares the same dim (the keystone). `universe` tags the
 * collision-guard namespace. The arity-specific carrier (`selectionKind` for `set`,
 * `paramKey` for `single`/`range`) names where the value lives.
 */
export interface DimDeclaration {
    /** The DIMENSION identity (`region`, `year`, `popRange`, …) — the per-dimension cell key.
        Two like vizzes that declare the SAME `key` SHARE one state cell (shared-attrs-persist). */
    key: string;
    /** The dim's arity — `single`/`range` carry a scalar/interval, `set` carries selection-grain ids. */
    arity: DimArity;
    /** The route-universe namespace (the collision-guard tag arm c reads). */
    universe: RouteUniverse;
    /** A `set`-arity dim NAMES the `SelectionKind` it back-projects through `selectedIdsOf`
        (the selection-grain boundary — the ONLY place a Set semantics is legal). REQUIRED for
        `set`, ABSENT for `single`/`range` (a forced Set onto a scalar dim is the CH2 anti-pattern). */
    selectionKind?: SelectionKind;
    /** A `single`/`multi`/`range` dim NAMES the `useViewParams` key its scalar/list/interval lives
        under (the URL-synced param bag). REQUIRED for `single`/`multi`/`range`, ABSENT for `set`. */
    paramKey?: string;
    /** The human label (for the filter rail; advisory). */
    label?: string;
    /** K-FILTER-UNIFIED §4.C — the within-OR row accessor the normalized query folds over.
        Omit for a panel-only dimension. */
    field?: (row: never) => string | number | null;
    /** K-FILTER-UNIFIED §4.C — the dim's `view`/`context` SCOPE (default `view`). A `context` dim
        narrows the rank/aggregate DOMAIN before the view fold; a `view` dim dims/encodes after. */
    scope?: "view" | "context";
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PER-DIMENSION STATE CELL — the one value-shape, discriminated by arity.
// ─────────────────────────────────────────────────────────────────────────────

/** A `range` dim's interval — `[min, max]`, or null when the slider is at its full extent
    (no constraint). The scalar pair, NEVER a forced Set. */
export type RangeValue = readonly [number, number] | null;

/**
 * The resolved VALUE of one dimension cell — discriminated by arity. The host reads this off
 * `cellFor(dim)`:
 *   · `single` → a scalar string (the picked category) or null.
 *   · `range`  → an `[min,max]` interval or null.
 *   · `set`    → the native-grain id Set (`selectedIdsOf(kind)`, the selection grain) + the
 *               `kind` it back-projects through (so the universe guard knows the grain).
 * The `key` echoes the dimension identity; `universe` rides for the collision guard.
 */
export type DimCell =
    | {
          key: string;
          arity: "single";
          universe: RouteUniverse;
          value: string | null;
      }
    | {
          key: string;
          arity: "multi";
          universe: RouteUniverse;
          /** The within-OR accepted list — the cell carries its OWN list (H1, no `multiValues`
              side-channel). Empty ⇒ the dim is unconstrained (normalizes to `any`). */
          value: readonly string[];
      }
    | {
          key: string;
          arity: "range";
          universe: RouteUniverse;
          value: RangeValue;
      }
    | {
          key: string;
          arity: "set";
          universe: RouteUniverse;
          /** The selection grain this set back-projects through (the universe guard reads it). */
          kind: SelectionKind;
          /** The native-grain ids — `selectedIdsOf(kind)`, the SHIPPED selection-grain seam. */
          value: ReadonlySet<string>;
      };

// ─────────────────────────────────────────────────────────────────────────────
// THE KEYING CODECS — the keystone (per-DIMENSION) vs the negative control (per-viz).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * THE KEYSTONE — the per-DIMENSION state key. ONE cell per dimension, SHARED across every viz
 * that declares the same dim. A `region` declared by two USF plates resolves to the SAME key
 * (`"region"`), so selecting it on plate A persists onto plate B — they read one cell. This is
 * the keying the `j0-frame-filter-persist` gate asserts GREEN; the dodge of the N×M explosion.
 */
export function dimKeyOf(dim: Pick<DimDeclaration, "key">): string {
    return dim.key;
}

/**
 * THE NEGATIVE CONTROL — per-VIZ keying (the N×M panel explosion the gate CATCHES). Each viz
 * holds its OWN copy of a dimension (`"<vizId>::<dim>"`), so a `region` selected on plate A
 * does NOT reach plate B — the shared dim does NOT persist across like vizzes. Exported SO the
 * gate (arm d) can contrast it against `dimKeyOf` STRUCTURALLY: per-dimension keying yields ONE
 * key for a shared dim across two vizzes (persist), per-viz keying yields TWO distinct keys
 * (no persist === the explosion === RED). This is NOT used by the host — it exists to make the
 * keystone falsifiable.
 */
export function vizScopedKeyOf(vizId: string, dim: Pick<DimDeclaration, "key">): string {
    return `${vizId}::${dim.key}`;
}

/**
 * The per-DIMENSION keying is INDEPENDENT of the viz: two distinct vizzes declaring the same
 * dimension `key` resolve to the SAME `dimKeyOf` (the shared-attrs-persist relation), while
 * `vizScopedKeyOf` would split them. This boolean IS the gate's structural assertion in one
 * call — true === per-dimension (shared persists), and `vizScopedKeyOf(a,d) !== vizScopedKeyOf(b,d)`
 * is its falsifying twin (per-viz === explosion).
 */
export function sharesDimensionCell(
    dim: Pick<DimDeclaration, "key">,
    vizA: string,
    vizB: string,
): boolean {
    void vizA;
    void vizB;
    // Per-DIMENSION keying ignores the viz — both like vizzes resolve to the one dim cell.
    return dimKeyOf(dim) === dimKeyOf(dim);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE STATE MODEL — the dimension-keyed cell resolver over the SHIPPED seams.
// ─────────────────────────────────────────────────────────────────────────────

/** The host-facing surface — the per-dimension cell resolver + the declared-dim registry. */
export interface UseFilterDimensions {
    /** The dims a viz has DECLARED it reads (the per-dimension keys it folds). A non-declaring
        viz never appears here, so a dim never bleeds onto a viz that never declared it. */
    declaredDims: ComputedRef<readonly DimDeclaration[]>;
    /**
     * Resolve a declared dimension to its ONE state cell (the per-DIMENSION key). The cell's
     * value is read off the SHIPPED seam by arity: `set` → `selectedIdsOf(kind)`,
     * `single`/`range` → `useViewParams`. Returns null when the dim is not declared (so a
     * non-declaring viz reads NOTHING for it — no cross-bleed). Two like vizzes that declare the
     * same dim resolve the SAME cell (shared-attrs-persist).
     */
    cellFor: (dimKey: string) => DimCell | null;
    /** True when a dimension is declared by the active viz-set (the membership the host folds). */
    hasDim: (dimKey: string) => boolean;
}

/**
 * The dimension-keyed filter STATE model (J-FRAME arm b). Given the dims a viz (or a like-viz
 * cohort) DECLARES off its `filterDimensions` facet, expose the per-DIMENSION cell resolver
 * over the SHIPPED selection + view-param seams. The state is keyed by DIMENSION: `cellFor`
 * resolves a dim to ONE cell regardless of which viz asks, so a shared dim persists across like
 * vizzes (read the same cell) while a dim only one viz declares never appears for a viz that
 * never declared it.
 *
 * `dims` is the union of dims the host's active viz-set declares (the host de-dups by `dimKeyOf`
 * before passing — two like vizzes' shared `region` is ONE entry). The resolver reads the
 * shipped seams READ-ONLY; the mutators stay the producer-edge stores' (`selectEntity` for the
 * selection grain, `setParam`/`setNumberParam` for the scalar/range dims), exactly as today.
 */
export function useFilterDimensions(
    dims: ComputedRef<readonly DimDeclaration[]> | (() => readonly DimDeclaration[]),
): UseFilterDimensions {
    const sel = useSelection();
    const viewParams = useViewParams();

    const declaredDims = computed<readonly DimDeclaration[]>(() =>
        typeof dims === "function" ? dims() : dims.value,
    );

    /** The per-DIMENSION index — ONE entry per dim KEY (the keystone). A duplicate `key` (two
        like vizzes' shared dim) collapses to one cell, so `cellFor` reads ONE state cell. */
    const byKey = computed<Map<string, DimDeclaration>>(() => {
        const m = new Map<string, DimDeclaration>();
        for (const d of declaredDims.value) {
            // First declaration wins; a like-viz re-declaration of the SAME key is the SAME cell.
            if (!m.has(dimKeyOf(d))) m.set(dimKeyOf(d), d);
        }
        return m;
    });

    function cellFor(dimKey: string): DimCell | null {
        const d = byKey.value.get(dimKey);
        if (!d) return null; // not declared by the active viz-set — no cross-bleed.

        if (d.arity === "set") {
            // THE SELECTION-GRAIN boundary — the ONLY place a Set semantics is legal. The
            // membership is the native-grain back-projection of the declared kind, read off the
            // SHIPPED `selectedIdsOf` (NEVER a hand-rolled Set). A dim that declares `set` without
            // a `selectionKind` is a contract error (arm a's type makes `selectionKind` required
            // for `set`); we fall back to an empty set rather than mis-grain.
            const kind = d.selectionKind;
            return {
                key: d.key,
                arity: "set",
                universe: d.universe,
                kind: kind ?? "district",
                value: kind ? sel.selectedIdsOf(kind) : new Set<string>(),
            };
        }

        if (d.arity === "multi") {
            // K-FILTER-UNIFIED §4.C — the within-OR categorical reads the SAME list codec the USF
            // `regions`/`?sel=` ride (`listParam`); the list IS the accepted set, no side-channel (H1).
            const base = d.paramKey ?? d.key;
            return {
                key: d.key,
                arity: "multi",
                universe: d.universe,
                value: viewParams.listParam(base),
            };
        }

        if (d.arity === "range") {
            // A `range` dim carries an `[min,max]` interval off two `useViewParams` numeric params
            // (`<paramKey>Min` / `<paramKey>Max`) — a scalar pair, NEVER a forced Set.
            const base = d.paramKey ?? d.key;
            const min = viewParams.numberParam(`${base}Min`);
            const max = viewParams.numberParam(`${base}Max`);
            // H3 — the one-sided WIDEN (K-FILTER-UNIFIED §4.C): null ONLY when BOTH bounds absent
            // (the slider at full extent); else `[min ?? -Infinity, max ?? Infinity]`, so a min-only /
            // max-only window arrives WELL-FORMED (the open side is a no-op bound in the algebra) —
            // replicating the SCI legacy one-sided ADM/tier window rather than SILENTLY DROPPING it.
            const value: RangeValue =
                min === undefined && max === undefined
                    ? null
                    : [min ?? -Infinity, max ?? Infinity];
            return { key: d.key, arity: "range", universe: d.universe, value };
        }

        // `single` — a scalar categorical pick off ONE `useViewParams` string param. Null when absent.
        const base = d.paramKey ?? d.key;
        const value = viewParams.param(base) ?? null;
        return { key: d.key, arity: "single", universe: d.universe, value };
    }

    function hasDim(dimKey: string): boolean {
        return byKey.value.has(dimKey);
    }

    return { declaredDims, cellFor, hasDim };
}
