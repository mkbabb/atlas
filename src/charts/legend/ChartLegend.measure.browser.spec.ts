// N-3 (U/B8, REPORT-B7E §6): the /ecf map key drew its ramp 0 px wide and wrapped every word. The key
// is a continuous ramp with value anchors, a no-data swatch and a clamp line, in a 28rem measure; to
// widen the ramp the consumer re-laid the primitive's flex row as one unwrapping line, and the
// ramp (an empty flex item, automatic minimum 0) took the squeeze. The primitive now owns the wide
// key (`measure="wide"`) and the ramp never shrinks below its floor.
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import ChartLegend from "./ChartLegend.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

const ECF = {
    mode: "continuous" as const,
    colorKind: "sequential" as const,
    lowLabel: "less / student",
    highLabel: "more",
    anchors: ["$3.28", "$137", null],
    clamp: { cap: "$445", percentile: "P95", max: "$722", holder: "Hyde County School District" },
    showNoData: true,
    noDataLabel: "No ECF request",
    testid: "legend",
};

async function mount(width: string, props: InstanceType<typeof ChartLegend>["$props"]) {
    const host = document.createElement("div");
    host.style.inlineSize = width;
    document.body.appendChild(host);
    const app = createApp({ render: () => h(ChartLegend, props) });
    app.mount(host);
    cleanups.push(() => {
        app.unmount();
        host.remove();
    });
    await nextTick();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const q = (sel: string) => host.querySelector<HTMLElement>(sel)!;
    return { host, q };
}
/** Lines a one-line element takes: its height over its own line height. */
function lines(el: HTMLElement): number {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2;
    return Math.round(el.getBoundingClientRect().height / lh);
}

describe("the continuous key's measure", () => {
    it("lays the wide key in a 28rem measure with a full ramp and one line per word", async () => {
        const { q } = await mount("28rem", { ...ECF, measure: "wide" });
        const ramp = q(".chart-legend__ramp").getBoundingClientRect();
        // The ramp fills its detail cell: more than half the measure, never under 8rem.
        expect(ramp.width).toBeGreaterThan(28 * 16 * 0.5);
        for (const sel of [".chart-legend__pole", ".chart-legend__chip-label", ".chart-legend__clamp-dt"])
            expect(lines(q(sel)), sel).toBe(1);
        // Each pair is its own row: the no-data word sits below the ramp, the clamp below that.
        const noData = q(".chart-legend__chip-label").getBoundingClientRect();
        const clamp = q(".chart-legend__clamp-dt").getBoundingClientRect();
        expect(noData.top).toBeGreaterThanOrEqual(ramp.bottom);
        expect(clamp.top).toBeGreaterThanOrEqual(noData.bottom - 1);
    });

    it("never squeezes the inline ramp below its 5rem when a narrow row crowds it", async () => {
        const { q } = await mount("6rem", ECF);
        expect(q(".chart-legend__ramp").getBoundingClientRect().width).toBeGreaterThanOrEqual(80 - 0.5);
    });
});
