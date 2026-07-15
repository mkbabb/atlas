import { describe, expect, it } from "vitest";
import { armMorphPush, withMorphIdentity } from "@/charts/morph";
import { packSwarm } from "@/charts/lib/swarm";
import { resolveColorChannel } from "@/charts/scale/colorChannel";
import { projectDrilldown } from "@/interaction/projectDrilldown";
import type { SelectionKey } from "@/charts/contract/selection-contract";

describe("W-L3 keyed morph and packed swarm", () => {
    it("keys marks by name and arms only the pushed option", () => {
        const inert = withMorphIdentity({ animation: false, series: [{ data: [{ name: "37", value: [1, 2] }] }] }, { kind: "district" });
        const series = (inert.series as Array<Record<string, unknown>>)[0];
        expect(series.id).toBe("district:0");
        expect((series.data as Array<Record<string, unknown>>)[0].id).toBe("37");
        expect(inert.animation).toBe(false);
        expect(armMorphPush(inert, { mode: "blend", reduced: false })).toMatchObject({ animation: true, animationDurationUpdate: 520 });
        expect(armMorphPush(inert, { mode: "staged", reduced: true }).animation).toBe(false);
    });

    it("packs neighbours into deterministic lanes while distant marks reuse the centre", () => {
        const values = [0, 0.02, 0.04, 1];
        const first = packSwarm(values, 0.1);
        expect(packSwarm(values, 0.1)).toEqual(first);
        expect(new Set(first.slice(0, 3)).size).toBe(3);
        expect(first[3]).toBe(0.5);
    });
});

describe("W-L3 derived legend and selection-only drilldown", () => {
    it("derives a continuous hinge and anchors from the same resolved field", () => {
        const diverging = resolveColorChannel(
            [{ value: -10 }, { value: 0 }, { value: 30 }],
            { field: (row) => row.value, scale: { kind: "diverging", hinge: 0 }, title: "Balance" },
        );
        expect(diverging.legend).toMatchObject({ colorKind: "diverging", showHinge: true, hinge: 0.25 });
        expect(diverging.column.map((cell) => cell.color)).toEqual([-10, 0, 30].map(diverging.paint));

        const sequential = resolveColorChannel(
            [1, 2, 3, 100].map((value) => ({ value })),
            { field: (row) => row.value, scale: { kind: "sequential", anchors: true }, title: "Magnitude", format: String },
        );
        expect(sequential.legend.anchors).toEqual(["1", "2", null]);
        expect(sequential.legend.highLabel).toBe("3");
    });

    it("derives categorical swatches from the same paint resolver and wraps the quad", () => {
        const resolved = resolveColorChannel(
            ["A", "B", "C", "D", "E"].map((provider) => ({ provider })),
            { field: (row) => row.provider, scale: { kind: "categorical" }, title: "Provider" },
        );
        expect(resolved.legend.chips?.map((chip) => chip.color)).toEqual(resolved.column.map((cell) => cell.color));
        expect(resolved.paint("E")).toBe("var(--viz-category-1)");
    });

    it("projects exactly the selected identities", () => {
        const keys: SelectionKey[] = [
            { kind: "state", id: "37", key: "state:37" },
            { kind: "county", id: "183", key: "county:183" },
        ];
        const projected = projectDrilldown(keys, (key) => key.key, (group) => group.length);
        expect(projected).toEqual({
            mode: "multi",
            groups: [
                { kind: "state", items: ["state:37"] },
                { kind: "county", items: ["county:183"] },
            ],
            aggregates: [1, 1],
        });
    });
});
