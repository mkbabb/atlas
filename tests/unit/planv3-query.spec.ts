import { describe, expect, it } from "vitest";
import {
    __resetUniverseRegistry,
    tagUniverse,
    UNIVERSE_ECF_DISTRICT,
    UNIVERSE_SCI_LEA,
} from "../../src/data/routeUniverse";
import { effectScope } from "vue";
import {
    compile,
    createRowsReader,
    normalize,
    type Predicate,
} from "../../src/filter/engine";
import {
    buildVirtualOffsets,
    resolveVirtualRange,
    useVirtualWindow,
} from "../../src/filter/composables/useVirtualWindow";
import { virtualOffset } from "../../src/filter/composables/virtual-window-core";

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

interface QueryRow {
    key: string;
    group: string;
    ratio: number | null;
    weight: number | null;
    total: number | null;
}

const identity = <Row>(): Predicate<Row> => ({ op: "any" });

function queryReader(
    base: readonly QueryRow[],
    options: {
        filterPredicate?: () => Predicate<QueryRow>;
        measures?: readonly {
            key: keyof QueryRow;
            kind: "extensive" | "intensive";
            value: (row: QueryRow) => number | null;
            weight?: (row: QueryRow) => number | null;
        }[];
    } = {},
) {
    return createRowsReader<QueryRow, "group">({
        dataset: () => base,
        filterPredicate: options.filterPredicate ?? identity<QueryRow>,
        rowKey: (row) => row.key,
        routeUniverse: () => UNIVERSE_SCI_LEA,
        groupings: [
            {
                scope: "group",
                by: (row) => row.group,
                compare: (a, b) => String(a).localeCompare(String(b)),
                create: (key) => ({
                    key: `district:${key}`,
                    group: String(key),
                    ratio: null,
                    weight: null,
                    total: null,
                }),
            },
        ],
        measures:
            options.measures ??
            [
                {
                    key: "total",
                    kind: "extensive",
                    value: (row) => row.total,
                },
                {
                    key: "ratio",
                    kind: "intensive",
                    value: (row) => row.ratio,
                    weight: (row) => row.weight,
                },
            ],
    });
}

describe("sovereign rows reader", () => {
    it("drops malformed, unknown, foreign-kind, and cross-universe selected keys", () => {
        __resetUniverseRegistry();
        const base: QueryRow[] = [
            { key: "district:1", group: "north", ratio: 0.5, weight: 100, total: 2 },
            { key: "district:2", group: "north", ratio: 0.9, weight: 10, total: 3 },
        ];
        tagUniverse("district:1", UNIVERSE_ECF_DISTRICT);

        const projection = queryReader(base).project(
            { kind: "selection" },
            ["bare", "state:1", "district:404", "district:1", "district:2"],
        );

        expect(projection.selectedKeys).toEqual(["district:2"]);
        expect(projection.rows).toEqual([base[1]]);
        expect(base.filter(compile(projection.predicate))).toEqual(projection.rows);
        __resetUniverseRegistry();
    });

    it("keeps malformed plan row keys as an author error", () => {
        const base: QueryRow[] = [
            { key: "bare", group: "north", ratio: 0.5, weight: 1, total: 1 },
        ];
        expect(() => queryReader(base).project({ kind: "dataset" }, [])).toThrow();
    });

    it("applies the route filter before every grain while keeping grain predicates exact", () => {
        const base: QueryRow[] = [
            { key: "district:1", group: "north", ratio: 0.5, weight: 100, total: 2 },
            { key: "district:2", group: "south", ratio: 0.9, weight: 10, total: 3 },
        ];
        const filterPredicate = (): Predicate<QueryRow> => ({
            op: "oneOf",
            key: "group",
            field: (row) => row.group,
            values: new Set(["north"]),
        });
        const reader = queryReader(base, { filterPredicate });

        const dataset = reader.project({ kind: "dataset" }, ["district:1"]);
        const selection = reader.project(
            { kind: "selection" },
            ["district:1", "district:2"],
        );
        const aggregation = reader.project(
            { kind: "aggregation", scope: "group" },
            ["district:1"],
        );

        expect(dataset.rows).toEqual([base[0]]);
        expect(dataset.predicate).toMatchObject({ op: "any" });
        expect(aggregation.predicate).toMatchObject({ op: "any" });
        expect(selection.selectedKeys).toEqual(["district:1"]);
        expect(selection.rows).toEqual([base[0]]);
        expect(base.filter(compile(selection.filterPredicate)).filter(compile(selection.predicate))).toEqual(
            selection.rows,
        );
    });

    it("reuses one normalized selection accessor across repeated projections", () => {
        const reader = queryReader([
            { key: "district:1", group: "north", ratio: 0.5, weight: 1, total: 1 },
        ]);
        const first = reader.project({ kind: "selection" }, ["district:1"]);
        const second = reader.project({ kind: "selection" }, ["district:1"]);
        expect(second.predicate).toBe(first.predicate);
    });

    it("orders distinct groups and reduces extensive and intensive values", () => {
        const base: QueryRow[] = [
            { key: "district:1", group: "south", ratio: 0.25, weight: 20, total: 5 },
            { key: "district:2", group: "north", ratio: 0.5, weight: 100, total: 2 },
            { key: "district:3", group: "north", ratio: 0.9, weight: 10, total: 3 },
        ];

        const rows = queryReader(base).project(
            { kind: "aggregation", scope: "group" },
            [],
        ).rows;

        expect(rows.map((row) => row.group)).toEqual(["north", "south"]);
        expect(rows[0]).toMatchObject({
            total: 5,
            ratio: (0.5 * 100 + 0.9 * 10) / 110,
        });
        expect(rows[1]).toMatchObject({ total: 5, ratio: 0.25 });
    });

    it("rejects an intensive measure without a weight", () => {
        const base: QueryRow[] = [
            { key: "district:1", group: "north", ratio: 0.5, weight: 1, total: 1 },
        ];
        const reader = queryReader(base, {
            measures: [{ key: "ratio", kind: "intensive", value: (row) => row.ratio }],
        });
        expect(() =>
            reader.project({ kind: "aggregation", scope: "group" }, []),
        ).toThrow("requires a weight");
    });

    it("returns null for zero pooled weight and pools mixed weights correctly", () => {
        const zero = queryReader([
            { key: "district:1", group: "north", ratio: 0.5, weight: 0, total: 1 },
        ]).project({ kind: "aggregation", scope: "group" }, []).rows[0];
        expect(zero?.ratio).toBeNull();

        const mixed = queryReader([
            { key: "district:1", group: "north", ratio: 0.1, weight: 0, total: 1 },
            { key: "district:2", group: "north", ratio: 0.9, weight: 10, total: 1 },
            { key: "district:3", group: "north", ratio: 0.2, weight: null, total: 1 },
        ]).project({ kind: "aggregation", scope: "group" }, []).rows[0];
        expect(mixed?.ratio).toBe(0.9);
    });

    it("returns null for an all-null extensive measure", () => {
        const row = queryReader([
            { key: "district:1", group: "north", ratio: 0.5, weight: 1, total: null },
            { key: "district:2", group: "north", ratio: 0.5, weight: 1, total: null },
        ]).project({ kind: "aggregation", scope: "group" }, []).rows[0];
        expect(row?.total).toBeNull();
    });

    it("rejects an unknown aggregation scope", () => {
        expect(() =>
            queryReader([]).project(
                { kind: "aggregation", scope: "missing" as "group" },
                [],
            ),
        ).toThrow("unknown aggregation scope");
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

    it("applies the same range law at row and indivisible-section grain", () => {
        const rows = buildVirtualOffsets(["stage"], (key) => key, new Map(), 1000);
        const section = [virtualOffset("stage", 0, -999, 1000)];

        expect(resolveVirtualRange(rows, 0, 3000)).toEqual([0, 1]);
        expect(resolveVirtualRange(section, -1000, 3000)).toEqual([0, 1]);
        expect(resolveVirtualRange([virtualOffset("stage", 0, 3001, 1000)], -1000, 3000)).toEqual([0, 0]);
    });

    it("isolates measurements by default and shares them only through an explicit surface", () => {
        const items = [{ id: "a" }, { id: "b" }];
        const key = (item: (typeof items)[number]): string => item.id;
        const viewport = (width: number) =>
            ({
                scrollTop: 0,
                clientHeight: 100,
                clientWidth: width,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
            }) as unknown as HTMLElement;
        const row = (height: number) =>
            ({ getBoundingClientRect: () => ({ height }) }) as unknown as Element;
        const mount = (width: number, measurementSurface?: object | string) => {
            const scope = effectScope();
            const virtual = scope.run(() =>
                useVirtualWindow({
                    items,
                    viewport: viewport(width),
                    key,
                    ...(measurementSurface ? { measurementSurface } : {}),
                }),
            )!;
            return { scope, virtual };
        };

        const first = mount(799.6);
        first.virtual.observe("a", row(72));
        expect(first.virtual.totalSize.value).toBe(112);
        first.scope.stop();

        const isolated = mount(800.4);
        expect(isolated.virtual.totalSize.value).toBe(80);
        isolated.scope.stop();

        const sharedSurface = {};
        const sharedFirst = mount(799.6, sharedSurface);
        sharedFirst.virtual.observe("a", row(72));
        sharedFirst.scope.stop();

        const sharedSameWidth = mount(800.4, sharedSurface);
        expect(sharedSameWidth.virtual.totalSize.value).toBe(112);
        sharedSameWidth.scope.stop();

        const changedWidth = mount(801, sharedSurface);
        expect(changedWidth.virtual.totalSize.value).toBe(80);
        changedWidth.scope.stop();
    });
});
