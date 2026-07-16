// platform/filter/selection.ts — PREDICATE-AS-DATA SELECTION with NAMED RESOLUTION + CLIENT-SCOPED
// predicate. The Mosaic Selection model, atlas-sized. This is the piece the atlas has never had as a
// FORMAL OPERATOR: today `useSelection` toggles a Set (binary replace/union) and the leave-one-out is a
// hand-rolled special case buried in `disjunctiveCounts`. Here it is first-class.
//
// A Selection is a SIGNAL over a list of CLAUSES. Each clause is authored by a `source` (the
// client/interactor id — a viz, a filter dim, a brush). Resolution combines the active clauses
// into ONE predicate by a NAMED strategy:
//
//   single     — only the MOST-RECENT clause (the last interactor wins; the rest are dropped).
//   union      — OR of all clauses (a mark is in the selection if ANY clause admits it).
//   intersect  — AND of all clauses (every clause must admit; the co-filter stack).
//   crossfilter — intersect, EXCEPT clauses whose `source === client` are OMITTED (leave-one-out):
//                 a brush in view A filters B/C/D but NEVER A. This is the exact primitive
//                 `disjunctiveCounts` hand-rolls, now first-class and available to the FOLD, not just
//                 to facet counts.
//
// selection.predicate(client?) is the resolution: pass a client id to get ITS view of the selection
// (crossfilter omits that client's own clauses; the other modes ignore the arg) — the leave-one-out
// formalized. The per-client resolver is MEMOIZED (one `computed` per client), so a route reading
// `sel.predicate("usf-map")` on each render reuses the same reactive node (no computed churn).

import { signal, computed, type Signal } from "./signals.js";
import { compile, type Predicate } from "./predicate.js";
import { markFilterStart } from "../../lib/perf/inp-probe.js";

export type Resolution = "single" | "union" | "intersect" | "crossfilter";

/** One selection clause — a predicate authored by a `source` interactor, with a monotone `seq`
    stamp so `single` can pick the most-recent. `value` is the opaque UI state that produced the
    predicate (a brush extent, a picked category) — carried for round-trip/introspection. */
export interface Clause<Row> {
    source: string;
    seq: number;
    predicate: Predicate<Row>;
    value?: unknown;
}

export interface Selection<Row> {
    /** The reactive clause list (a signal — reads track, writes retrigger the graph). */
    clauses: Signal<readonly Clause<Row>[]>;
    /** The resolution strategy (reactive — flip union↔crossfilter live). */
    resolution: Signal<Resolution>;
    /** Add/replace a clause. A new clause from `source` REPLACES that source's prior clause
        (an interactor owns ONE live clause — a re-brush updates in place). Empty/identity
        predicate from a source CLEARS that source's clause. */
    update(clause: Omit<Clause<Row>, "seq">): void;
    /** Drop a source's clause (deselect). */
    clear(source: string): void;
    /** THE RESOLVER — the compiled predicate for `client` under the active resolution.
        `crossfilter` omits `client`'s own clauses (leave-one-out). Reactive + MEMOIZED per client. */
    predicate(client?: string): Signal<(row: Row) => boolean>;
    /** The active clause list AS resolved for `client` (the DATA, pre-compile — for explain/facets). */
    resolved(client?: string): Signal<Predicate<Row> | null>;
}

/** Combine a list of predicate trees under the resolution (single already narrowed to ≤1 upstream). */
function combine<Row>(preds: readonly Predicate<Row>[], mode: Resolution): Predicate<Row> | null {
    if (preds.length === 0) return null; // identity
    if (preds.length === 1) return preds[0];
    if (mode === "union") return { op: "or", kids: preds };
    // intersect / crossfilter / single(>1 defensive) ⇒ AND
    return { op: "and", kids: preds };
}

export function createSelection<Row>(
    resolution: Resolution = "crossfilter",
): Selection<Row> {
    const clauses = signal<readonly Clause<Row>[]>([]);
    const mode = signal<Resolution>(resolution);
    let seq = 0;

    // Per-client memo of the resolver computeds (the "" key = the no-client resolver). Reusing one
    // `computed` per client keeps the reactive graph stable across re-reads (no per-render churn).
    const resolvedByClient = new Map<string, Signal<Predicate<Row> | null>>();
    const predicateByClient = new Map<string, Signal<(row: Row) => boolean>>();

    function update(c: Omit<Clause<Row>, "seq">): void {
        // THE COORDINATOR'S SELECTION DISPATCH EDGE (N.md §4.F2 · inp-probe.ts §3): the ONE seam that
        // fires when a filter cell / selection / year-scope clause moves. `markFilterStart(source)`
        // brackets it for the INP measurement (N.WF2 drives the throttled report; W0 landed the seam;
        // this is the call only — it no-ops off the browser main thread).
        markFilterStart(c.source);
        const next = clauses.peek().filter((x) => x.source !== c.source);
        // An identity/empty predicate from a source is a CLEAR (drop, don't add an inert clause).
        const isEmpty =
            c.predicate.op === "any" ||
            (c.predicate.op === "oneOf" && c.predicate.values.size === 0);
        clauses.set(isEmpty ? next : [...next, { ...c, seq: ++seq }]);
    }
    function clear(source: string): void {
        clauses.set(clauses.peek().filter((x) => x.source !== source));
    }

    /** The resolved predicate DATA for a client (pre-compile). */
    function resolved(client?: string): Signal<Predicate<Row> | null> {
        const key = client ?? "";
        const cached = resolvedByClient.get(key);
        if (cached) return cached;
        const sig = computed<Predicate<Row> | null>(() => {
            const all = clauses();
            const m = mode();
            let active: readonly Clause<Row>[];
            if (m === "single") {
                // most-recent clause only
                const last = all.reduce<Clause<Row> | null>(
                    (best, cl) => (best == null || cl.seq > best.seq ? cl : best),
                    null,
                );
                active = last ? [last] : [];
            } else if (m === "crossfilter") {
                // leave-one-out: omit THIS client's own clauses
                active = client == null ? all : all.filter((cl) => cl.source !== client);
            } else {
                active = all;
            }
            return combine(active.map((cl) => cl.predicate), m);
        });
        resolvedByClient.set(key, sig);
        return sig;
    }

    function predicate(client?: string): Signal<(row: Row) => boolean> {
        const key = client ?? "";
        const cached = predicateByClient.get(key);
        if (cached) return cached;
        const data = resolved(client);
        const sig = computed(() => compile(data()));
        predicateByClient.set(key, sig);
        return sig;
    }

    return { clauses, resolution: mode, update, clear, predicate, resolved };
}
