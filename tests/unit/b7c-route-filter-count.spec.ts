// FI-03 (U/B7c M2): the dock's Filters control prints how many filters are applied. Measured on the
// served PL head (sci 079743b6): with Type = District on /sci, or Urban / rural = Rural on /ecf, the
// dock read "Filters: <route>" and showed no count, because the ledger counted only atlas-declared
// panel dims and no route declares any; the routes' dials live in their route folds.
import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { appliedClauses, useRouteFilterCount, useRouteFold } from "../../src/filter/engine/route-fold";
import type { Predicate } from "../../src/filter/engine/predicate";

interface Row {
    id: string;
    kind: string;
    n: number;
}
const kind = (r: Row) => r.kind;
const n = (r: Row) => r.n;
const ROWS: Row[] = [
    { id: "a", kind: "district", n: 10 },
    { id: "b", kind: "charter", n: 3 },
    { id: "c", kind: "district", n: 7 },
];

describe("appliedClauses", () => {
    it("counts the conjuncts of the normal form", () => {
        expect(appliedClauses<Row>(null)).toBe(0);
        expect(appliedClauses<Row>({ op: "any" })).toBe(0);
        expect(appliedClauses<Row>({ op: "and", kids: [{ op: "any" }] })).toBe(0);
        expect(appliedClauses<Row>({ op: "oneOf", field: kind, values: new Set(["district"]) })).toBe(1);
        expect(
            appliedClauses<Row>({
                op: "and",
                kids: [
                    { op: "oneOf", field: kind, values: new Set(["district"]) },
                    { op: "range", field: n, lo: 5, hi: 20 },
                ],
            }),
        ).toBe(2);
    });
});

describe("useRouteFilterCount", () => {
    it("reads the route's dials, once per dial however many folds read them, and forgets a disposed fold", async () => {
        const dial = ref<Predicate<Row>>({ op: "any" });
        const scope = effectScope();
        const count = useRouteFilterCount();
        scope.run(() => {
            for (const vizId of ["b7c-a", "b7c-b"])
                useRouteFold<Row>({
                    rows: () => ROWS,
                    filter: () => dial.value,
                    selection: () => ({ op: "any" }),
                    figOpen: () => false,
                    vizId,
                    idOf: (r) => r.id,
                });
        });
        expect(count.value).toBe(0);
        dial.value = { op: "oneOf", field: kind, values: new Set(["district"]) };
        await nextTick();
        expect(count.value).toBe(1);
        dial.value = { op: "and", kids: [dial.value, { op: "range", field: n, lo: 5, hi: 20 }] };
        await nextTick();
        expect(count.value).toBe(2);
        scope.stop();
        expect(count.value).toBe(0);
    });
});
