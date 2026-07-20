import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { createAtlasEventHub } from "../../src/events";
import {
    reconcileMountedFocus,
    useSourceBrowserEvents,
} from "../../src/filter/ui/source-data-browser";
import { createBrowserFromScope } from "../../src/filter/engine/browser-from-scope";
import { emitSourceFilterState } from "../../src/filter/ui/source-filter-state";
import type { DataScope } from "../../src/platform/provenance/data-scope";
import type { ExportFormat, ExportPayload } from "../../src/charts/lib/source-data";

interface Row {
    lea: string;
    year: number;
    cost: number;
}

/** One declared scope — the A-33 arm the browser now binds from. The dataset carries a district
    TWICE (two years), the shape every real feed has: the entity key repeats, the row identity
    does not, and the browser must key each consumer by the right one. */
const scope: DataScope<Row, string> = {
    source: {
        id: "sci-districts",
        kind: "exact",
        label: "SCI district feed",
        snapshot: "data/sci.snapshot.json",
    },
    encoding: { x: "lea", y: "cost" },
    grainNoun: "districts",
    dataset: () => [
        { lea: "010", year: 2023, cost: 4 },
        { lea: "010", year: 2024, cost: 5 },
        { lea: "020", year: 2024, cost: 6 },
    ],
    filterPredicate: () => ({ op: "any" }),
    selectionKey: (row) => `district:${row.lea}`,
    browseKey: (row) => `${row.lea}-${row.year}`,
    routeUniverse: () => "sci-lea",
    grains: [
        {
            scope: "state",
            by: () => "NC",
            create: (_key, representative) => representative,
        },
    ],
    columns: [
        { key: "lea", label: "District", value: (row) => row.lea },
        {
            key: "cost",
            label: "Cost",
            value: (row) => row.cost,
            measure: { kind: "extensive" },
        },
    ],
};

/** Drive ONE real export and read back what it actually wrote. `serialize` runs through the
    SHIPPED `triggerDownload` (an anchor click on an object URL) and the SHIPPED `exportPrint`
    (`window.print`), so this stubs only the two browser seams those reach and returns the bytes the
    shipped serializer produced — nothing here re-implements a serializer or a preamble. */
async function exportOnce(
    payload: ExportPayload<Row, string>,
    format: ExportFormat,
): Promise<{ file: { name: string; mime: string; text: string } | null; printed: number }> {
    const anchors: Array<{ download: string }> = [];
    const blobs: Blob[] = [];
    let printed = 0;
    const created = vi
        .spyOn(URL, "createObjectURL")
        .mockImplementation((blob: Blob | MediaSource) => {
            blobs.push(blob as Blob);
            return "blob:atlas-test";
        });
    vi.stubGlobal("document", {
        createElement: () => {
            const anchor = { href: "", download: "", style: {}, click() {} };
            anchors.push(anchor);
            return anchor;
        },
        body: { appendChild() {}, removeChild() {} },
    });
    vi.stubGlobal("window", {
        print() {
            printed += 1;
        },
    });
    try {
        payload.serialize(format);
    } finally {
        vi.unstubAllGlobals();
        created.mockRestore();
    }
    const blob = blobs[0];
    return {
        file: blob
            ? { name: anchors[0]!.download, mime: blob.type, text: await blob.text() }
            : null,
        printed,
    };
}

describe("SourceDataBrowser", () => {
    it("folds a declared scope into the one generic browser's props", () => {
        let vintage = "";
        const bound = createBrowserFromScope(scope, () => vintage);
        expect(bound.columns.map((c) => c.key)).toEqual(["lea", "cost"]);
        expect(bound.availableGrains).toEqual([
            { kind: "dataset" },
            { kind: "aggregation", scope: "state" },
            { kind: "selection" },
        ]);

        // The two keys fan out to their two consumers: the entity key repeats across the years the
        // reader intersects on; the table's identities are one per row, so nothing collides.
        expect(scope.dataset().map(scope.selectionKey)).toEqual([
            "district:010",
            "district:010",
            "district:020",
        ]);
        expect(new Set(scope.dataset().map(bound.rowKey)).size).toBe(3);

        const projection = bound.rowsReader.project({ kind: "dataset" }, []);
        expect(projection.rows).toHaveLength(3);

        const payload = bound.exportPayload(projection, "districts");
        expect(payload.rows).toHaveLength(3);
        // W-21 — the export names the RECORD, not its key: the exact tier's own label is what a
        // reader of the downloaded file needs, and the id told them nothing.
        expect(payload.meta.source.label).toBe("SCI district feed");
        expect(payload.meta.filterExplain).toBe("All rows — no filter active");

        // W-56 — the as-of is the HOST's resolved vintage, read at export time. The feed lands
        // after the binding is built, so a value captured at construction would ship the empty
        // stamp forever; a downloaded file must name the bake it actually came from.
        expect(payload.meta.asOf).toBe("");
        vintage = "data as of March 2026";
        expect(bound.exportPayload(projection, "districts").meta.asOf).toBe(
            "data as of March 2026",
        );
    });

    // W-56/A-32 — THE FILE CARRIES ITS OWN PROVENANCE. The download is the one artifact that
    // leaves the site, so it must state what it is: the record's name, the grain, the query that
    // reproduces it, that query in prose, and the bake it was taken from. A slice that begins at
    // the column header is a table of numbers no reader can trace.
    it("leads every exported file with the record's own provenance", async () => {
        const bound = createBrowserFromScope(scope, () => "data as of March 2026");
        const projection = bound.rowsReader.project({ kind: "dataset" }, []);
        const payload = bound.exportPayload(projection, "districts");

        const csv = await exportOnce(payload, "csv");
        expect(csv.file?.name).toBe("districts.csv");
        const lines = csv.file!.text.split("\r\n");
        expect(lines.slice(0, 2)).toEqual(["Source,SCI district feed", "Grain,dataset"]);
        expect(lines[2]).toMatch(/^Filter query,/);
        expect(lines[3]).toBe("Filter,All rows — no filter active");
        expect(lines[4]).toBe("As of,data as of March 2026");
        // the blank line keeps the data header + rows byte-for-byte tabular beneath the preamble.
        expect(lines[5]).toBe("");
        expect(lines[6]).toBe("District,Cost");
        expect(lines[7]).toBe("010,4");
        expect(lines).toHaveLength(10);

        const json = await exportOnce(payload, "json");
        expect(json.file?.name).toBe("districts.json");
        const parsed = JSON.parse(json.file!.text);
        expect(Object.keys(parsed)).toEqual(["meta", "rows"]);
        expect(parsed.meta.source.label).toBe("SCI district feed");
        expect(parsed.meta.asOf).toBe("data as of March 2026");
        expect(parsed.meta.grain).toEqual({ kind: "dataset" });
        expect(parsed.rows).toHaveLength(3);
        expect(parsed.rows[0]).toEqual({ lea: "010", cost: 4 });

        // an aggregated export names its scope, so two files off one feed are distinguishable.
        const aggregated = await exportOnce(
            bound.exportPayload(
                bound.rowsReader.project({ kind: "aggregation", scope: "state" }, []),
                "districts",
            ),
            "csv",
        );
        expect(aggregated.file!.text.split("\r\n")[1]).toBe("Grain,aggregation:state");
    });

    // A control the toolbar ENABLES must keep what it says: PRINT prints. It serializes nothing —
    // it renders the open panel through the browser's own dialog — so it writes no file.
    it("prints from the toolbar's print control, and writes no file doing it", async () => {
        const bound = createBrowserFromScope(scope, () => "data as of March 2026");
        const payload = bound.exportPayload(
            bound.rowsReader.project({ kind: "dataset" }, []),
            "districts",
        );
        const printed = await exportOnce(payload, "print");
        expect(printed.printed).toBe(1);
        expect(printed.file).toBeNull();
    });

    it("restores one tab stop when pointer scrolling recycles the focused row", () => {
        expect(reconcileMountedFocus("row-1", ["row-20", "row-21"])).toBe("row-20");
        expect(reconcileMountedFocus("row-20", ["row-20", "row-21"])).toBe("row-20");
        expect(reconcileMountedFocus("row-1", [])).toBe("row-1");
    });

    it("projects the five live browser events by active viz and resets viz-local state", () => {
        const hub = createAtlasEventHub();
        const scope = effectScope();
        const state = scope.run(() => useSourceBrowserEvents(hub, "initial"))!;
        const vizScope = { grain: "viz" as const, vizId: "districts" };

        hub.emit({
            type: "active-viz",
            scope: vizScope,
            vizId: "districts",
            beat: { id: "cost", label: "Cost" },
        });
        hub.emit({
            type: "selected-viz",
            scope: vizScope,
            vizId: "districts",
            primaryKey: "district:1",
            selectedKeys: ["district:1"],
        });
        hub.emit({
            type: "selected-viz",
            scope: { grain: "viz", vizId: "foreign" },
            vizId: "foreign",
            primaryKey: "foreign:1",
            selectedKeys: ["foreign:1"],
        });
        hub.emit({
            type: "granularity",
            scope: vizScope,
            vizId: "districts",
            grain: "selection",
        });
        hub.emit({
            type: "provenance",
            scope: vizScope,
            vizId: "districts",
            fields: ["leaNumber", "cost"],
            filterExplain: "state = NC",
        });
        hub.emit({
            type: "filter-state",
            scope: vizScope,
            predicate: "state = NC",
            active: true,
        });
        expect(state.activeVizId.value).toBe("districts");
        expect(state.selectedKeys.value).toEqual(["district:1"]);
        expect(state.grain.value).toBe("selection");
        expect(state.fields.value).toEqual(["leaNumber", "cost"]);
        expect(state.filter.value).toEqual({ predicate: "state = NC", active: true });

        hub.emit({
            type: "active-viz",
            scope: { grain: "viz", vizId: "schools" },
            vizId: "schools",
            beat: { id: "map", label: "Map" },
        });
        expect(state.activeVizId.value).toBe("schools");
        expect(state.selectedKeys.value).toEqual([]);
        expect(state.grain.value).toBeNull();
        expect(state.fields.value).toEqual([]);

        scope.stop();
    });

    it("publishes canonical filter state from the reader predicate", () => {
        const hub = createAtlasEventHub();
        const seen: Array<{ predicate: string; active: boolean }> = [];
        hub.on("filter-state", ({ predicate, active }) =>
            seen.push({ predicate, active }),
        );
        const scope = { grain: "viz" as const, vizId: "districts" };

        emitSourceFilterState(hub, scope, { op: "any" });
        emitSourceFilterState(hub, scope, {
            op: "oneOf",
            key: "state",
            field: () => "NC",
            values: new Set(["VA", "NC"]),
        });

        expect(seen).toEqual([
            { predicate: "All rows — no filter active", active: false },
            { predicate: "state ∈ {NC,VA}", active: true },
        ]);
    });
});
