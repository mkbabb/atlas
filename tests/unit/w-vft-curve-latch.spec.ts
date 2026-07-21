import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildTimeSeriesOption } from "../../src/charts/composables/useTimeSeriesOption";
import type { LineSeries } from "../../src/charts/marks/TimeSeries.vue";

// W-VFT · THE CURVE-LATCH ARM (the CurvePersist hallmark — "click on the curves… persist that").
// The R-5 pre-flight cure: a MINIMAL, additive curve-select capability so the VFT keystone can consume
// a real `@curve-select` producer edge instead of hand-rolling a canvas hit-test. The CLICK rides
// ECharts' own series `click` event; the LATCH VISUAL is option-driven (the matched line thickens —
// live-verified that ECharts' `select` state does NOT restyle a whole line stroke). What is bound here
// is the SHIPPED artifact: the pure option builder (`buildTimeSeriesOption`, the paint) + the SFC /
// lifecycle bytes (`TimeSeries.vue` / `useEChart.ts`, the emit/gate). Each `it` can FAIL under mutation
// (R-1) — remove the latch thickening or the wiring and a row goes red.

/** The resolved palette bridge the builder reads (five live values; no oversub pole needed here). */
const palette = {
    muted: "rgb(120,120,120)",
    grid: "rgb(220,220,220)",
    fontMono: "Fira Code",
    figureAxisPx: 14,
    diverging: { low: "rgb(190,90,60)" },
} as unknown as Parameters<typeof buildTimeSeriesOption>[2];

/** Two real cohort lines + a read-only headroom BAND + a hidden stack base — the full VFT-shaped
    series so the "only real lines latch" discipline is provable (band/hidden must never thicken). */
const series: LineSeries[] = [
    {
        key: "cool",
        label: "no smoke",
        color: "rgb(20,120,120)",
        points: [
            { x: 0, y: 0 },
            { x: 30, y: 86 },
        ],
    },
    {
        key: "warm",
        label: "smoke",
        color: "rgb(190,90,60)",
        points: [
            { x: 0, y: 0 },
            { x: 30, y: 80 },
        ],
    },
    {
        key: "band",
        label: "gap",
        color: "rgb(150,150,150)",
        points: [
            { x: 0, y: 0 },
            { x: 30, y: 6 },
        ],
        areaStyle: { opacity: 0.1 },
        hideInLegend: true,
        silent: true,
    },
    {
        key: "base",
        label: "base",
        color: "rgb(0,0,0)",
        points: [
            { x: 0, y: 0 },
            { x: 30, y: 80 },
        ],
        hidden: true,
        stack: "b",
    },
];

type Built = {
    name?: string;
    lineStyle?: { width?: number; opacity?: number };
};
const built = (latchedKey?: string | null): Built[] =>
    (buildTimeSeriesOption(series, { latchedKey }, palette).series as Built[]) ?? [];
const byName = (rows: Built[], name: string): Built => rows.find((r) => r.name === name)!;

describe("W-VFT — the curve-latch option arm (buildTimeSeriesOption)", () => {
    it("no latch — every real line rests at its base 2px stroke (BYTE-IDENTICAL for existing consumers)", () => {
        for (const k of [undefined, null]) {
            const rows = built(k);
            expect(byName(rows, "no smoke").lineStyle?.width).toBe(2);
            expect(byName(rows, "smoke").lineStyle?.width).toBe(2);
        }
    });

    it("latched — ONLY the matched curve thickens to 3px at full opacity (the persistent read)", () => {
        const rows = built("cool");
        expect(byName(rows, "no smoke").lineStyle?.width).toBe(3);
        expect(byName(rows, "no smoke").lineStyle?.opacity).toBe(1);
        // the other real line is untouched at its base weight
        expect(byName(rows, "smoke").lineStyle?.width).toBe(2);
    });

    it("latched key never thickens a read-only BAND or a HIDDEN stack base (only real lines latch)", () => {
        expect(byName(built("band"), "gap").lineStyle?.width).toBe(0);
        expect(byName(built("base"), "base").lineStyle?.width).toBe(0);
    });

    it("the latch is the ONLY delta — every other series key is unmoved vs the no-latch option", () => {
        const off = built(null);
        const on = built("cool");
        expect(on.length).toBe(off.length);
        on.forEach((row, i) => {
            if (row.name === "no smoke") return; // the one intended delta
            expect(row).toEqual(off[i]);
        });
    });
});

// ── The SHIPPED SFC / lifecycle bytes — the emit/gate/toggle wiring (readFileSync, can fail) ──────
const sfc = readFileSync(
    fileURLToPath(new URL("../../src/charts/marks/TimeSeries.vue", import.meta.url)),
    "utf8",
);
const lifecycle = readFileSync(
    fileURLToPath(new URL("../../src/charts/composables/useEChart.ts", import.meta.url)),
    "utf8",
);

describe("W-VFT — the curve-latch producer edge (shipped TimeSeries.vue / useEChart.ts)", () => {
    it("TimeSeries declares the `curve-select` emit + the opt-in `selectableCurves` prop", () => {
        expect(sfc).toContain('"curve-select": [key: string | null]');
        expect(sfc).toContain("selectableCurves?: boolean");
        // The click seam is wired ONLY when the consumer opts in (byte-no-op otherwise).
        expect(sfc).toContain("props.selectableCurves ? onCurveClick : undefined");
    });

    it("TimeSeries owns the single-latch toggle, feeds the option, and emits the resolved latch", () => {
        // toggle: re-click the latched curve clears it, any other click moves the latch
        expect(sfc).toContain("latchedKey.value === key ? null : key");
        expect(sfc).toContain('emit("curve-select", latchedKey.value)');
        // the latch drives the option-side visual + the re-paint fingerprint
        expect(sfc).toContain("latchedKey: latchedKey.value");
    });

    it("useEChart wires the click→key seam only when `onSelect` is supplied", () => {
        expect(lifecycle).toContain("onSelect?: (key: string | null) => void");
        expect(lifecycle).toContain("if (opts.onSelect && opts.keyOf)");
        expect(lifecycle).toContain('chart.value.on("click"');
    });
});
