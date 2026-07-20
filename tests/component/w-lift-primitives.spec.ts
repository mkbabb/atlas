import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import CrownFigure from "../../src/editorial/CrownFigure.vue";
import RecordSeam from "../../src/editorial/RecordSeam.vue";
import { buildTimeSeriesOption } from "../../src/charts/composables/useTimeSeriesOption";
import { figureLadderScalar } from "../../src/story/beat-template";

// W-LIFT (A-01 · A-02 · A-03 · A-08) — the editorial primitives. What is asserted here is what the
// PRIMITIVE owns and a consumer cannot restate: the crown's terminal render + its ladder rung, the
// seam's direction grammar, and the crossing eyebrow's declarer-vs-default run. The SIZE ladder's
// paint is a live measurement (a track ratio is not a jsdom fact), recorded in the landing record.

/** SSR render (no cover host ⇒ `useCoverProgress` pins terminal — the PRM/host-less parity path). */
const render = (component: unknown, props: Record<string, unknown>) =>
    renderToString(createSSRApp({ render: () => h(component as never, props) }));

describe("A-01 — CrownFigure", () => {
    it("renders the terminal figure with no cover host (the parity path)", async () => {
        const html = await render(CrownFigure, { value: 2026, unit: "the crossing" });
        expect(html).toContain("2026");
        expect(html).toContain("the crossing");
    });

    it("lets the formatter own precision — a multiplier never collapses to a whole step", async () => {
        const html = await render(CrownFigure, {
            value: 7.36,
            format: (n: number) => `${n.toFixed(2)}×`,
        });
        expect(html).toContain("7.36×");
    });

    it("renders a pre-formatted string verbatim (no dial)", async () => {
        const html = await render(CrownFigure, { value: "$1.86B" });
        expect(html).toContain("$1.86B");
    });

    it("publishes its DECLARED ladder as the track rung", async () => {
        const html = await render(CrownFigure, {
            value: 98,
            ladder: { kind: "value-scaled", value: 0.84, domain: [0, 1] },
        });
        expect(html).toContain("--crown-rung:0.84");
    });

    it("declares no rung without a ladder — the crown rests at the full measure", async () => {
        const html = await render(CrownFigure, { value: 98 });
        expect(html).not.toContain("--crown-rung");
    });

    it("carries the record badge only when a pill is handed (the ≤1 scarcity law)", async () => {
        const withPill = await render(CrownFigure, {
            value: 7.36,
            pill: { value: "2020", label: "peak year" },
        });
        expect(withPill).toContain("peak year");
        expect(await render(CrownFigure, { value: 7.36 })).not.toContain("crown-figure__record");
    });
});

describe("A-02 — RecordSeam", () => {
    it("points forward when the record lies BEFORE the seam", async () => {
        const html = await render(RecordSeam, {
            label: "FY2025 · the record as filed",
            record: "before",
        });
        expect(html).toContain("FY2025 · the record as filed");
        expect(html).toContain("→");
        expect(html).toContain('data-record="before"');
    });

    it("points back into the void when the record resumes AFTER the seam", async () => {
        const html = await render(RecordSeam, { label: "2021 · no report", record: "after" });
        expect(html).toContain("←");
        expect(html).not.toContain("→");
    });

    it("seats at the trailing edge unless an inline position is declared", async () => {
        expect(await render(RecordSeam, { label: "x", record: "before" })).not.toContain(
            "inset-inline-start",
        );
        expect(
            await render(RecordSeam, { label: "x", record: "before", at: "62%" }),
        ).toContain("inset-inline-start:62%");
    });
});

describe("A-03 — the crossing's own words", () => {
    const series = [
        {
            key: "peak",
            label: "peak",
            color: "#000",
            points: [
                { x: 2024, y: 1 },
                { x: 2026, y: 3 },
            ],
        },
    ];
    /** The five resolved values the option builder reads off the live palette bridge. */
    const palette = {
        muted: "rgb(120,120,120)",
        grid: "rgb(220,220,220)",
        fontMono: "Fira Code",
        figureAxisPx: 14,
        diverging: { low: "rgb(190,90,60)" },
    } as unknown as Parameters<typeof buildTimeSeriesOption>[2];

    /** The crossing rule's whole markLine datum, read off the built option. */
    const rule = (label?: string): Record<string, unknown> => {
        const opt = buildTimeSeriesOption(
            series,
            {
                overSubscriptionX: 2026,
                ...(label != null ? { overSubscriptionLabel: label } : {}),
            },
            palette,
        );
        const line = (opt.series as { markLine?: { data: Record<string, unknown>[] } }[])[0]!
            .markLine!;
        return line.data[0]!;
    };

    /** The datum the hand-rolled twin built, VERBATIM off the retired block — the byte-compat
        reference. The crossing consumes `dropRule({kind:"oversub"})` now; if that recipe ever
        drifts from this literal, SCI III's rest pixel moves and this fails. */
    const RETIRED_TWIN = {
        xAxis: 2026,
        lineStyle: { color: palette.diverging.low, type: "solid", width: 1, opacity: 0.7 },
        label: {
            formatter: "{yr|2026}{lab|  over ceiling}{arr|  →}",
            position: "insideStartTop",
            rich: {
                yr: { fontFamily: "Fira Code", fontWeight: 500, fontSize: 11, color: palette.diverging.low },
                lab: { fontFamily: "Fira Code", fontWeight: 600, fontSize: 9, color: palette.diverging.low },
                arr: { fontFamily: "Fira Code", fontWeight: 600, fontSize: 11, color: palette.diverging.low },
            },
        },
    };

    it("is byte-identical to the retired hand-rolled twin when no declarer speaks", () => {
        expect(rule()).toEqual(RETIRED_TWIN);
    });

    it("carries the declarer's words when one does — and nothing else moves", () => {
        expect(rule("the crossing")).toEqual({
            ...RETIRED_TWIN,
            label: {
                ...RETIRED_TWIN.label,
                formatter: "{yr|2026}{lab|  the crossing}{arr|  →}",
            },
        });
    });
});

describe("A-08 — the figure-ladder wire", () => {
    it("resolves the five live declarers onto their rungs", () => {
        // demand :66 · vft :61 · sci :92 · ecf :58 · usf :111 — the settled census.
        const rung = (v: number) =>
            figureLadderScalar({ kind: "value-scaled", value: v, domain: [0, 1] });
        expect([0.5, 0.6, 0.72, 0.84, 0.86].map(rung)).toEqual([0.5, 0.6, 0.72, 0.84, 0.86]);
    });
});
