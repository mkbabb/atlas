// O-05 (spec-contract R-4 · §b·D-1) — THE A-ROOT FILTER SUBSTRATE. The coordinator's fold, its
// leave-one-out, and the memo hygiene the W-ROOT hardening pass owes: one node per client/field,
// shed on disconnect, never aliased across a separator. The 0.05 ms/update perf profile of record
// is a LIVE stage measurement, not asserted here — this spec is the substrate's correctness.
import { describe, it, expect } from "vitest";
import { createCoordinator, createSelection } from "../../src/filter/engine/coordinator";

interface Row {
    id: string;
    state: string;
    year: number;
}

const rows: readonly Row[] = [
    { id: "a", state: "NC", year: 2024 },
    { id: "b", state: "NC", year: 2025 },
    { id: "c", state: "SC", year: 2025 },
];

const ncOnly = {
    source: "map",
    predicate: {
        op: "oneOf" as const,
        field: (r: Row) => r.state,
        values: new Set(["NC"]),
        key: "state",
    },
    value: ["NC"],
};

describe("O-05 — the coordinator substrate (fold · leave-one-out · memo hygiene)", () => {
    it("folds each client's rows off the selection and OMITS the client's own clause (crossfilter)", () => {
        const coord = createCoordinator<Row>(rows);
        const selection = createSelection<Row>();
        coord.connect({ id: "map", filterBy: selection, fields: { state: (r) => r.state } });
        coord.connect({ id: "bars", filterBy: selection, fields: { state: (r) => r.state } });
        selection.update(ncOnly);

        // the AUTHOR of the clause sees the unfiltered frame; every other client sees it applied.
        expect(coord.filteredFor("map")().map((r) => r.id)).toEqual(["a", "b", "c"]);
        expect(coord.filteredFor("bars")().map((r) => r.id)).toEqual(["a", "b"]);
        expect(coord.filterActive("map")()).toBe(false);
        expect(coord.filterActive("bars")()).toBe(true);
        expect(coord.facetsFor("bars", "state")()).toEqual(new Map([["NC", 2]]));
    });

    it("memoizes ONE node per client/field and SHEDS them on disconnect (no cache accretion)", () => {
        const coord = createCoordinator<Row>(rows);
        const selection = createSelection<Row>();
        const disconnect = coord.connect({
            id: "map",
            filterBy: selection,
            fields: { year: (r) => r.year },
        });
        const filtered = coord.filteredFor("map");
        const domain = coord.domainFor("map", "year");
        expect(coord.filteredFor("map")).toBe(filtered); // one stable node per read
        expect(coord.domainFor("map", "year")).toBe(domain);
        expect(domain()).toEqual([2024, 2025]);

        disconnect();
        // the client's memo nodes went with it — a fresh registration mints fresh nodes.
        expect(coord.filteredFor("map")).not.toBe(filtered);
        expect(coord.domainFor("map", "year")).not.toBe(domain);
    });

    it("a re-mount under the same id is NOT unregistered by the previous mount's stale disconnect", () => {
        const coord = createCoordinator<Row>(rows);
        const selection = createSelection<Row>();
        const staleDisconnect = coord.connect({ id: "map", filterBy: selection, presents: "state" });
        coord.connect({ id: "map", filterBy: selection, presents: "year" }); // the re-mount
        staleDisconnect();

        expect(coord.presentedFieldFor(() => "map")()).toBe("year");
    });

    it("the memo key never aliases two client/field pairs that share a separator", () => {
        const coord = createCoordinator<Row>(rows);
        const selection = createSelection<Row>();
        coord.connect({ id: "a b", filterBy: selection, fields: { c: (r) => r.state } });
        coord.connect({ id: "a", filterBy: selection, fields: { "b c": (r) => r.year } });

        expect(coord.domainFor("a b", "c")()).toEqual(["NC", "SC"]);
        expect(coord.domainFor("a", "b c")()).toEqual([2024, 2025]);
    });
});
