import { divergingScatterDomain, makeDivergingScale, makeSequentialScale } from "./ColorScale.js";
import { vizCategoryToken } from "./colorKind.js";
import type { SequentialMode } from "./colorRamp.js";
import type { VizLegendSpec } from "../contract/viz-contract.js";

export type ColorChannelScale =
    | { kind: "diverging"; hinge?: number; domain?: readonly [number, number] | "robust"; markSafe?: boolean }
    | { kind: "sequential"; mode?: SequentialMode; markSafe?: boolean; anchors?: boolean }
    | { kind: "categorical"; categories?: readonly string[] };

export interface ColorChannel<Row> {
    field: (row: Row) => number | string | null;
    scale: ColorChannelScale;
    title: string;
    format?: (value: number | string | null) => string;
    source?: string;
}

export type DerivedLegend = VizLegendSpec;

export interface ResolvedColorChannel<Row> {
    paint: (value: number | string | null) => string;
    legend: DerivedLegend;
    coverage: { present: number; total: number };
    column: Array<{ row: Row; value: number | string | null; color: string }>;
}

function quantile(sorted: readonly number[], q: number): number | null {
    if (!sorted.length) return null;
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))] ?? null;
}

/** Resolve mark paint and its legend together so the key cannot drift from the fills. */
export function resolveColorChannel<Row>(rows: readonly Row[], channel: ColorChannel<Row>): ResolvedColorChannel<Row> {
    const values = rows.map(channel.field);
    const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const format = channel.format ?? String;
    let paint: ResolvedColorChannel<Row>["paint"];
    let legend: DerivedLegend;

    if (channel.scale.kind === "categorical") {
        const categories = channel.scale.categories ?? [...new Set(values.filter((v): v is string => typeof v === "string"))];
        const colors = new Map(categories.map((category, index) => [category, vizCategoryToken(index + 1)]));
        paint = (value) => typeof value === "string" ? colors.get(value) ?? "var(--viz-no-data)" : "var(--viz-no-data)";
        legend = { mode: "discrete", chips: categories.map((key) => ({ key, label: key, color: colors.get(key)! })) };
    } else if (channel.scale.kind === "diverging") {
        const hinge = channel.scale.hinge ?? 0;
        const extent: [number, number] = channel.scale.domain === "robust"
            ? divergingScatterDomain(numeric, hinge)
            : channel.scale.domain ? [...channel.scale.domain] : [Math.min(...numeric, hinge), Math.max(...numeric, hinge)];
        const scale = makeDivergingScale({ domain: extent, hinge, markSafe: channel.scale.markSafe });
        paint = (value) => scale(typeof value === "number" ? value : null);
        legend = {
            mode: "continuous", colorKind: "diverging", showHinge: true,
            hinge: (hinge - extent[0]) / (extent[1] - extent[0] || 1), hingeLabel: format(hinge),
        };
    } else {
        const sorted = [...numeric].sort((a, b) => a - b);
        const scale = makeSequentialScale({ values: numeric, mode: channel.scale.mode, markSafe: channel.scale.markSafe });
        paint = (value) => scale(typeof value === "number" ? value : null);
        legend = {
            mode: "continuous", colorKind: "sequential",
            ...(channel.scale.anchors ? {
                anchors: [quantile(sorted, 0), quantile(sorted, 0.5), null].map((v) => v == null ? null : format(v)),
                highLabel: format(quantile(sorted, 0.95)),
            } : {}),
        };
    }

    return {
        paint,
        legend,
        coverage: { present: values.filter((value) => value != null).length, total: rows.length },
        column: rows.map((row, index) => ({ row, value: values[index] ?? null, color: paint(values[index] ?? null) })),
    };
}
