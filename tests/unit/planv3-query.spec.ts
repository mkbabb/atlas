import { describe, expect, it } from "vitest";
import {
    compile,
    createRowsReader,
    normalize,
    type Predicate,
} from "@/filter/engine";
import {
    buildVirtualOffsets,
    resolveVirtualRange,
} from "@/filter/composables/useVirtualWindow";

interface Row {
    id: string;
    group: string;
    value: number;
}

const group = (row: Row): string => row.group;
const value = (row: Row): number => row.value;

describe("query normal form", () => {
    it("makes commutativity, idempotence, and absorption structural", () => {
        const a: Predicate<Row> = {
            op: "oneOf",
            field: group,
            values: new Set(["north"]),
            key: "group",
        };
        const b: Predicate<Row> = {
            op: "range",
            field: value,
            lo: 2,
            hi: 8,
            key: "value",
        };
        const left = normalize<Row>({ op: "and", kids: [a, b, a] });
        const right = normalize<Row>({ op: "and", kids: [b, a] });

        expect(left).toBe(right);
        expect(normalize(left)).toBe(left);
        expect(normalize<Row>({ op: "and", kids: [a, { op: "or", kids: [a, b] }] })).toBe(
            normalize(a),
        );

        const rows: Row[] = [
            { id: "1", group: "north", value: 4 },
            { id: "2", group: "south", value: 4 },
            { id: "3", group: "north", value: 9 },
        ];
        expect(rows.filter(compile(left))).toEqual([rows[0]]);
    });
});

describe("sovereign rows reader", () => {
    it("projects all three grains from one base frame without mutation", () => {
        const base: Row[] = [
            { id: "1", group: "north", value: 2 },
            { id: "2", group: "north", value: 3 },
            { id: "3", group: "south", value: 5 },
        ];
        const reader = createRowsReader({
            dataset: () => base,
            selection: (): Predicate<Row> => ({
                op: "oneOf",
                field: group,
                values: new Set(["north"]),
            }),
            aggregate: (rows, scope: "group") => {
                expect(scope).toBe("group");
                return [
                    { id: "north", group: "north", value: 5 },
                    { id: "south", group: "south", value: 5 },
                ].filter((row) => rows.some((member) => member.group === row.group));
            },
        });

        expect(reader.rowsAt({ kind: "selection" }).map((row) => row.id)).toEqual(["1", "2"]);
        expect(reader.rowsAt({ kind: "aggregation", scope: "group" })).toHaveLength(2);
        expect(reader.rowsAt({ kind: "dataset" })).toBe(base);
        expect(base).toHaveLength(3);
    });
});

describe("virtual-window core", () => {
    it("binary-searches measured cumulative offsets", () => {
        const items = ["a", "b", "c", "d"];
        const offsets = buildVirtualOffsets(
            items,
            (item) => item,
            new Map([
                ["b", 20],
                ["c", 30],
            ]),
            10,
        );

        expect(offsets.map(({ key, top, bottom }) => ({ key, top, bottom }))).toEqual([
            { key: "a", top: 0, bottom: 10 },
            { key: "b", top: 10, bottom: 30 },
            { key: "c", top: 30, bottom: 60 },
            { key: "d", top: 60, bottom: 70 },
        ]);
        expect(resolveVirtualRange(offsets, 12, 55)).toEqual([1, 3]);
        expect(resolveVirtualRange(offsets, 10, 30)).toEqual([1, 2]);
    });
});
