// platform/provenance/predicate-prose.ts — `humanizePredicate` + `DimLabels`: THE READER-FACING
// FORMATTER (the O-A9 render family's load-bearing new piece; provenance-surface §2.4).
//
// `predicate.ts` already ships `explain(p)` — but it emits SYMBOLIC math (`(region ∈ {W,S} ∧
// ¬pop<1000)`), for debug + the `?filter=` codec, NOT for a reader. The Provenance law wants HUMAN
// prose: `["receivers only", "year ≥ 2020", "charter schools"]`. This is a NEW pure function homed in
// `provenance/` (the reader-facing sibling of `explain`, NEVER its replacement — two audiences, two
// formatters, KISS). It reads the SAME `Predicate<Row>` DATA the codec round-trips and the coordinator
// resolves — no second source of filter truth [provenance-surface §2.4, §3.5].
//
// The DIFFERENCE between the three render surfaces (Bar / Chip / AlgebraReadout) is ONLY the client
// arg the coordinator threads (`selection.resolved(vizId)` leave-one-out vs `selection.resolved()`
// global) — ONE algebra, three non-redundant surfaces, ONE formatter [provenance-surface §3.4].

import type { Predicate } from "@/filter/engine/predicate";

/** The route-supplied dim/value dictionary — the ONE route-authored piece (each route has ≤~6
    categorical dims, co-located with the route's dim declaration so labels + filter accessors share
    ONE source, the RC2-R3 single-derivation law generalized from accessors to labels). Every method
    is TOTAL: an unmapped key/value falls back to the raw token (forward-safe, never crashes on a dim
    a route forgot to dictionary) [provenance-surface §2.4]. */
export interface DimLabels {
    /** key → human dim label (e.g. `"region"` → `"Region"`); falls back to the raw key. */
    labelOf(key: string): string;
    /** key,value → human value token (e.g. `flow,"receivers"` → `"receivers only"`;
        `schoolType,"charter"` → `"charter schools"`); falls back to the raw value token. */
    valueOf(key: string, value: string): string;
    /** key,n → the unit/format for a range bound (e.g. `pop,1000` → `"1,000"`; `year,2020` →
        `"2020"`); falls back to the plain number string. */
    formatBound(key: string, n: number): string;
}

/** THE IDENTITY DICTIONARY — every token passes through unmapped (the honest default when a route has
    authored no value dictionary yet). A range bound formats with a thousands separator; a bare key is
    its own label. Lets `humanizePredicate` run before any route authors a `DimLabels`. */
export const IDENTITY_DIM_LABELS: DimLabels = {
    labelOf: (key) => key,
    valueOf: (_key, value) => value,
    formatBound: (_key, n) => n.toLocaleString("en-US"),
};

/** ONE clause → ONE phrase (provenance-surface §2.4 — the reader register):
      oneOf(1 value)  → the value token            "receivers only"
      oneOf(n values) → "dim: a, b, c"             "Region: West, Sandhills"
      range [lo, +∞]  → "dim ≥ lo"                 "year ≥ 2020"
      range [-∞, hi]  → "dim ≤ hi"                 "enrollment ≤ 5,000"
      range [lo, hi]  → "dim lo–hi"                "enrollment 500–5,000"
    Returns `null` for an inert/identity leaf (an empty `oneOf`, an unbounded `range`, `any`) so the
    caller drops it — a rung is never spelled for a constraint that filters nothing. */
function leafPhrase(
    op: "oneOf" | "range",
    key: string,
    labels: DimLabels,
    parts: { values?: ReadonlySet<string>; lo?: number; hi?: number },
): string | null {
    if (op === "oneOf") {
        const values = [...(parts.values ?? [])];
        if (values.length === 0) return null; // rest ⇒ identity, no phrase
        if (values.length === 1) return labels.valueOf(key, values[0]);
        const tokens = values.map((v) => labels.valueOf(key, v)).join(", ");
        return `${labels.labelOf(key)}: ${tokens}`;
    }
    // range
    const lo = parts.lo ?? -Infinity;
    const hi = parts.hi ?? Infinity;
    const label = labels.labelOf(key);
    const loFinite = lo !== -Infinity;
    const hiFinite = hi !== Infinity;
    if (!loFinite && !hiFinite) return null; // unbounded ⇒ identity, no phrase
    if (loFinite && !hiFinite) return `${label} ≥ ${labels.formatBound(key, lo)}`;
    if (!loFinite && hiFinite) return `${label} ≤ ${labels.formatBound(key, hi)}`;
    return `${label} ${labels.formatBound(key, lo)}–${labels.formatBound(key, hi)}`;
}

/**
 * `humanizePredicate(p, labels)` — walk the predicate TREE to reader phrases, joined at the top-level
 * AND. Returns `[]` for the identity predicate (`null`/`any`/all-inert) — the caller's present-when-
 * active gate reads the empty array (no "0 filters" dead affordance).
 *
 * Composition (the tree, provenance-surface §2.4):
 *   - a LEAF (`oneOf`/`range`) → its one phrase (dropped when inert).
 *   - an AND → the FLATTENED phrases of its kids (the top-level conjunction the reader reads as
 *     the " · "-joined list; the render owns the join separator).
 *   - an OR → ONE combined phrase, its kid phrases joined by " or " and parenthesised when >1
 *     (a within-clause disjunction reads as "(a or b)", distinct from the AND list).
 *   - a NOT → "not (…)" over its kid's phrase (v1 has no not-consumer; forward-safe).
 *
 * PURE + TOTAL — no store, no DOM, no allocation beyond the phrase strings. Unit-first (the cheapest
 * strong acceptance signal, provenance-surface §7).
 */
export function humanizePredicate<Row>(
    p: Predicate<Row> | null,
    labels: DimLabels = IDENTITY_DIM_LABELS,
): string[] {
    if (p == null) return [];
    switch (p.op) {
        case "any":
            return [];
        case "oneOf": {
            const phrase = leafPhrase("oneOf", p.key ?? "?", labels, { values: p.values });
            return phrase == null ? [] : [phrase];
        }
        case "range": {
            const phrase = leafPhrase("range", p.key ?? "?", labels, { lo: p.lo, hi: p.hi });
            return phrase == null ? [] : [phrase];
        }
        case "and":
            // The top-level conjunction FLATTENS to the reader's phrase list (inert kids drop).
            return p.kids.flatMap((kid) => humanizePredicate(kid, labels));
        case "or": {
            // A within-clause disjunction reads as ONE "(a or b)" phrase (distinct from the AND list).
            const kidPhrases = p.kids.flatMap((kid) => humanizePredicate(kid, labels));
            if (kidPhrases.length === 0) return [];
            if (kidPhrases.length === 1) return kidPhrases;
            return [`(${kidPhrases.join(" or ")})`];
        }
        case "not": {
            const inner = humanizePredicate(p.kid, labels);
            if (inner.length === 0) return [];
            return [`not (${inner.join(" · ")})`];
        }
        default:
            return [];
    }
}
