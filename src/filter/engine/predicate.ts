// platform/filter/predicate.ts — the normalized query algebra. A predicate is DATA — introspectable,
// serializable, and compilable to a row test — not an opaque closure.
//
// THE TWO COMPOSITION LAYERS (kept DISTINCT — the whole point):
//   1. WITHIN one clause: this boolean TREE — arbitrary and/or/not over leaf constraints. This is
//      what a single interactor/dim can now express (e.g. "region ∈ {W,S} AND NOT pop<1000").
//   2. ACROSS clauses: the RESOLUTION strategy (single/union/intersect/crossfilter) — owned by
//      selection.ts, one layer up. This file owns layer 1 only.
//
// TOTALITY: `compile(null)` and `compile({op:"any"})` ⇒ the identity `() => true`. Every branch
// returns a function, with `assertNever` enforcing exhaustive switches.

/** The row-field projection shared by query leaves, declared dimensions, and the URL codec. */
export type DimAccessor<Row> = (row: Row) => string | number | null;

/** Compile-time exhaustiveness sentinel with a named runtime failure. */
export function assertNever(x: never): never {
    throw new Error(`unhandled query variant: ${JSON.stringify(x)}`);
}

/** A leaf constraint bound to the field it tests. `oneOf` = within-OR membership; `range` =
    inclusive interval. `field` null-return ⇒ the row fails `oneOf` / no-ops `range` (algebra rule). */
export type Leaf<Row> =
    | { op: "any" }
    | { op: "oneOf"; field: DimAccessor<Row>; values: ReadonlySet<string>; key?: string }
    | { op: "range"; field: DimAccessor<Row>; lo: number; hi: number; key?: string };

/** THE PREDICATE TREE — a leaf, or an arbitrary boolean composition. Data, not a closure. */
export type Predicate<Row> =
    | Leaf<Row>
    | { op: "and"; kids: readonly Predicate<Row>[] }
    | { op: "or"; kids: readonly Predicate<Row>[] }
    | { op: "not"; kid: Predicate<Row> };

const TOP = Object.freeze({ op: "any" }) as Predicate<never>;
const BOTTOM = Object.freeze({ op: "or", kids: Object.freeze([]) }) as Predicate<never>;
const interned = new Map<string, object>();
const fieldIds = new WeakMap<Function, number>();
let nextFieldId = 0;

function fieldId(field: Function): number {
    const found = fieldIds.get(field);
    if (found != null) return found;
    const id = ++nextFieldId;
    fieldIds.set(field, id);
    return id;
}

const listKey = (values: readonly string[]): string => JSON.stringify(values);
const optionalKey = (value: string | undefined): string => JSON.stringify(value ?? null);

function oneOfKey<Row>(p: Extract<Predicate<Row>, { op: "oneOf" }>): string {
    return `oneOf:${fieldId(p.field)}:${optionalKey(p.key)}:${listKey([...p.values].sort())}`;
}

function rangeKey<Row>(p: Extract<Predicate<Row>, { op: "range" }>): string {
    return `range:${fieldId(p.field)}:${optionalKey(p.key)}:${p.lo}:${p.hi}`;
}

function predicateKey<Row>(p: Predicate<Row>): string {
    switch (p.op) {
        case "any":
            return "any";
        case "oneOf":
            return oneOfKey(p);
        case "range":
            return rangeKey(p);
        case "and":
        case "or":
            return `${p.op}:${listKey(p.kids.map(predicateKey))}`;
        case "not":
            return `not:${predicateKey(p.kid)}`;
        default:
            return assertNever(p);
    }
}

function intern<Row>(key: string, make: () => Predicate<Row>): Predicate<Row> {
    const found = interned.get(key);
    if (found) return found as Predicate<Row>;
    const value = make();
    interned.set(key, value as object);
    return value;
}

function isBottom<Row>(p: Predicate<Row>): boolean {
    return p.op === "or" && p.kids.length === 0;
}

/** Canonicalize a predicate without changing its row semantics. The normal form flattens like
    operators, folds ⊤/⊥, deduplicates and orders structurally equal children, applies absorption,
    and interns the result. Consequently commutativity and idempotence are observable by `===`. */
export function normalize<Row>(p: Predicate<Row> | null): Predicate<Row> {
    if (p == null || isIdentity(p)) return TOP as Predicate<Row>;
    switch (p.op) {
        case "any":
            return TOP as Predicate<Row>;
        case "oneOf": {
            const values = new Set([...p.values].sort());
            const normalized = { ...p, values };
            return intern(oneOfKey(normalized), () => Object.freeze(normalized));
        }
        case "range": {
            return intern(rangeKey(p), () => Object.freeze({ ...p }));
        }
        case "not": {
            const kid = normalize(p.kid);
            if (isIdentity(kid)) return BOTTOM as Predicate<Row>;
            if (isBottom(kid)) return TOP as Predicate<Row>;
            if (kid.op === "not") return kid.kid;
            const key = `not:${predicateKey(kid)}`;
            return intern(key, () => Object.freeze({ op: "not", kid }));
        }
        case "and":
        case "or": {
            const op = p.op;
            const flat = p.kids
                .map(normalize)
                .flatMap((kid) => (kid.op === op ? kid.kids : [kid]));
            if (op === "and" && flat.some(isBottom)) return BOTTOM as Predicate<Row>;
            if (op === "or" && flat.some(isIdentity)) return TOP as Predicate<Row>;

            const useful = flat.filter((kid) =>
                op === "and" ? !isIdentity(kid) : !isBottom(kid),
            );
            const unique = new Map(useful.map((kid) => [predicateKey(kid), kid]));
            const direct = new Set(unique.keys());
            const opposite = op === "and" ? "or" : "and";
            const kids = [...unique.entries()]
                .filter(([, kid]) =>
                    kid.op !== opposite ||
                    !kid.kids.some((nested) => direct.has(predicateKey(nested))),
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, kid]) => kid);

            if (kids.length === 0)
                return (op === "and" ? TOP : BOTTOM) as Predicate<Row>;
            if (kids.length === 1) return kids[0];
            const key = `${op}:${listKey(kids.map(predicateKey))}`;
            return intern(key, () => Object.freeze({ op, kids: Object.freeze(kids) }));
        }
        default:
            return assertNever(p);
    }
}

/** Compile a predicate tree to its total row test. `null`/`any` ⇒ identity. Pure; no allocation
    per-row beyond the closures captured at compile. */
export function compile<Row>(p: Predicate<Row> | null): (row: Row) => boolean {
    if (p == null) return () => true;
    switch (p.op) {
        case "any":
            return () => true;
        case "oneOf": {
            const { field, values } = p;
            if (values.size === 0) return () => true; // rest ⇒ identity (algebra parity)
            return (row: Row): boolean => {
                const v = field(row);
                return v != null && values.has(String(v));
            };
        }
        case "range": {
            const { field, lo, hi } = p;
            if (lo === -Infinity && hi === Infinity) return () => true;
            return (row: Row): boolean => {
                const v = field(row);
                return typeof v === "number" && v >= lo && v <= hi;
            };
        }
        case "and": {
            const tests = p.kids.map(compile);
            if (tests.length === 0) return () => true;
            return (row: Row): boolean => tests.every((t) => t(row));
        }
        case "or": {
            const tests = p.kids.map(compile);
            // An empty OR is the EMPTY set (nothing matches) — the dual of AND's identity.
            if (tests.length === 0) return () => false;
            return (row: Row): boolean => tests.some((t) => t(row));
        }
        case "not": {
            const inner = compile(p.kid);
            return (row: Row): boolean => !inner(row);
        }
        default:
            return assertNever(p);
    }
}

/** True when the tree is the identity (no active constraint) — the coordinator's `filterActive`
    negation. Cheap structural walk; does not touch rows. */
export function isIdentity<Row>(p: Predicate<Row> | null): boolean {
    if (p == null) return true;
    switch (p.op) {
        case "any":
            return true;
        case "oneOf":
            return p.values.size === 0;
        case "range":
            return p.lo === -Infinity && p.hi === Infinity;
        case "and":
            return p.kids.every(isIdentity);
        case "or":
            return p.kids.length > 0 && p.kids.every(isIdentity);
        case "not":
            return false; // NOT(identity) = empty set, which is NOT the identity
        default:
            return assertNever(p);
    }
}

/** The identity/empty predicate reads as reader prose — a facet with no active constraint says so
    in words, never a bare ⊤. */
const IDENTITY_PROSE = "All rows — no filter active";

/** Structural pretty-print — the introspectability payoff (predicate-as-data): a filter state is
    a readable STRING, not an opaque closure. The identity reads as prose (`IDENTITY_PROSE`); every
    compound keeps the symbolic algebra below. Drives debug + the source panel's FILTER facet. */
export function explain<Row>(p: Predicate<Row> | null): string {
    if (p == null) return IDENTITY_PROSE;
    switch (p.op) {
        case "any":
            return IDENTITY_PROSE;
        case "oneOf":
            return `${p.key ?? "?"} ∈ {${[...p.values].join(",")}}`;
        case "range": {
            const lo = p.lo === -Infinity ? "-∞" : p.lo;
            const hi = p.hi === Infinity ? "+∞" : p.hi;
            return `${p.key ?? "?"} ∈ [${lo},${hi}]`;
        }
        case "and":
            return `(${p.kids.map(explain).join(" ∧ ")})`;
        case "or":
            return `(${p.kids.map(explain).join(" ∨ ")})`;
        case "not":
            return `¬${explain(p.kid)}`;
        default:
            return assertNever(p);
    }
}
