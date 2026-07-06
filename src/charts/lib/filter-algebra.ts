// src/platform/charts/lib/filter-algebra.ts — THE PURE TOTAL FILTER ALGEBRA (K-FILTER-UNIFIED §4.A ·
// the make-or-break). ZERO Vue / Pinia / store — a pure total function the route store (the generic
// `useFilteredRows` fold) AND the unified panel both consume (ONE law, two readers — the dissolve of
// the three hand-rolled route codecs `matchByLea`/`matchByFips`/`matchByCrn`).
//
// THE NORMALIZATION. The 4 sourcing arities (`single`/`multi`/`range`/`set` — `useFilterDimensions`'
// `DimCell`) collapse onto a 3-case constraint LATTICE (`any`/`oneOf`/`range`); `composePredicate`
// folds it: an empty spec list ⇒ the IDENTITY (`() => true`); WITHIN a dim the accepted values are
// OR'd; ACROSS dims the per-dim tests are AND'd.
//
// TOTAL BY CONSTRUCTION — every branch returns a function; a wholly-empty spec list returns
// `() => true`. EXHAUSTIVE — `cellToConstraint` keys on the cell's OWN `arity`, and the trailing
// `assertNever(cell)` is the COMPILE-TIME totality proof (a 5th arity fails `tsc`; the FIXED `multi`
// hole, H1). The `multi` cell carries its OWN accepted list — NO `multiValues` side-channel (H1).
//
// PURITY (the `k0-filter-algebra-purity` law): this module imports ZERO runtime Vue/Pinia/store. The
// SOLE import is `import type { DimCell }` (TYPE-ONLY — fully erased by the compiler, so the emitted
// module has NO runtime dependency; the algebra is mount-free and device-free).

import type { DimCell } from "@/filter/composables/useFilterDimensions";

/** The within-OR field projection — a row → the value a dim tests (the panel⇒store accessor seam).
    `null` ⇒ the row carries no value for this dim (it fails an active `oneOf`, no-ops a `range`). */
export type DimAccessor<Row> = (row: Row) => string | number | null;

/** The normalized 3-case constraint lattice every arity collapses onto.
    · `any`   — the IDENTITY (the dim is unconstrained; contributes no clause).
    · `oneOf` — the within-dim OR membership (a stringified value set; `single`/`multi`/`set`).
    · `range` — the inclusive `[lo, hi]` interval (a `range` dim; ±Infinity bounds no-op the open side). */
export type DimConstraint =
    | { kind: "any" }
    | { kind: "oneOf"; values: ReadonlySet<string> }
    | { kind: "range"; lo: number; hi: number };

/** ONE dim's predicate input. `accessor` omitted ⇒ the dim is PANEL-ONLY (it dims/encodes in the
    surface but contributes NO row clause — the migration seam: a dim a viz declares for the panel
    projection but whose store has no row field to fold on). */
export interface DimPredicateSpec<Row> {
    key: string;
    constraint: DimConstraint;
    accessor?: DimAccessor<Row>;
}

/** The exhaustiveness sentinel — a 5th `DimCell` arity narrows to `never` and fails to compile here
    (the COMPILE-TIME totality proof); at runtime it throws rather than silently returning `undefined`. */
export function assertNever(x: never): never {
    throw new Error(`unhandled filter cell arity: ${JSON.stringify(x)}`);
}

/** THE ONE NORMALIZER — map a per-DIMENSION `DimCell` (or `null`, the un-declared dim) onto its
    `DimConstraint`. EXHAUSTIVE over the 4 arities + `assertNever` (H1 — the `multi` case is explicit;
    the cell carries its own accepted list, NO side-channel). A cell at its no-constraint rest (a null
    scalar, an empty list/set, a full-extent range) normalizes to `any` (the identity). */
export function cellToConstraint(cell: DimCell | null): DimConstraint {
    if (cell == null) return { kind: "any" };
    switch (cell.arity) {
        case "single":
            return cell.value == null
                ? { kind: "any" }
                : { kind: "oneOf", values: new Set([String(cell.value)]) };
        case "multi":
            // H1 — the within-OR categorical carries its OWN accepted list (NO `multiValues` side-channel).
            return cell.value.length === 0
                ? { kind: "any" }
                : { kind: "oneOf", values: new Set(cell.value.map(String)) };
        case "set":
            // the selection-grain set — its native-grain ids ARE the accepted values.
            return cell.value.size === 0
                ? { kind: "any" }
                : { kind: "oneOf", values: new Set([...cell.value].map(String)) };
        case "range":
            // the one-sided `[-Infinity, hi]` / `[lo, +Infinity]` arrives WELL-FORMED via the `cellFor`
            // widen (H3); the open side is a no-op bound below.
            return cell.value == null
                ? { kind: "any" }
                : { kind: "range", lo: cell.value[0], hi: cell.value[1] };
        default:
            return assertNever(cell);
    }
}

/** Compile ONE dim's spec to its row test, or `null` (the identity → omitted) when the constraint is
    `any` OR the spec carries no `accessor` (a panel-only dim). The `oneOf` test is within-dim OR
    membership; the `range` test is the inclusive interval (±Infinity bounds no-op the open side). */
function dimTest<Row>(spec: DimPredicateSpec<Row>): ((row: Row) => boolean) | null {
    const { constraint, accessor } = spec;
    if (constraint.kind === "any" || !accessor) return null;
    if (constraint.kind === "oneOf") {
        const { values } = constraint;
        return (row: Row): boolean => {
            const v = accessor(row);
            return v != null && values.has(String(v));
        };
    }
    const { lo, hi } = constraint;
    return (row: Row): boolean => {
        const v = accessor(row);
        return typeof v === "number" && v >= lo && v <= hi;
    };
}

/** `composePredicate` — the ACROSS-dim AND of each dim's WITHIN-OR test. An empty spec list (or one
    whose every spec is `any`/accessor-less) ⇒ the IDENTITY (`() => true`). TOTAL by construction. */
export function composePredicate<Row>(
    specs: readonly DimPredicateSpec<Row>[],
): (row: Row) => boolean {
    const tests = specs
        .map(dimTest)
        .filter((t): t is (row: Row) => boolean => t !== null);
    if (tests.length === 0) return () => true;
    return (row: Row): boolean => tests.every((t) => t(row));
}

/** `disjunctiveCounts` — the leave-one-out FACETED count: for each TARGET dim, the count of every
    value the target's accessor projects across the rows passing ALL OTHER dims' tests (so a facet's
    own buckets stay COMPARABLE while it is constrained — the "select region X, the other regions still
    show comparable counts" law). RANGE targets + accessor-less targets are SKIPPED (H5b — a continuous
    field is not a categorical facet; a range dim still participates as an OTHER-dim AND-clause). */
export function disjunctiveCounts<Row>(
    rows: readonly Row[],
    specs: readonly DimPredicateSpec<Row>[],
): Map<string, Map<string, number>> {
    const out = new Map<string, Map<string, number>>();
    for (const target of specs) {
        if (target.accessor == null || target.constraint.kind === "range") continue; // H5b
        const otherPred = composePredicate(specs.filter((s) => s !== target));
        const counts = new Map<string, number>();
        for (const row of rows) {
            if (!otherPred(row)) continue;
            const v = target.accessor(row);
            if (v == null) continue;
            const key = String(v);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        out.set(target.key, counts);
    }
    return out;
}
