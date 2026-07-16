import { describe, expect, it } from "vitest";
import type { EChartsOption } from "echarts";
import {
    morphTransition,
    optionsLiveInView,
    resolveVizSurface,
    viewsToOptionSpec,
    type VizSetContract,
} from "../../src/charts/viz-set";
const option = (): EChartsOption => ({ series: [] });
const set: VizSetContract = {
    views: [
        { id: "scatter", label: "Scatter", option },
        {
            id: "beeswarm",
            label: "Beeswarm",
            option,
            options: [{ kind: "switch", key: "jitter", label: "Jitter", default: true }],
        },
    ],
    identity: { field: "leaNumber" },
    transition: morphTransition(false),
};

describe("W-L0 canonical viz set", () => {
    it("resolves one stable surface and derives the view dial", () => {
        expect(resolveVizSurface(set).id).toBe("scatter");
        expect(resolveVizSurface(set, "beeswarm").id).toBe("beeswarm");
        expect(resolveVizSurface(set, "missing").id).toBe("scatter");
        expect(optionsLiveInView(set.views[1])).toHaveLength(1);
        expect(viewsToOptionSpec(set)).toMatchObject({
            kind: "segmented",
            key: "view",
            default: "scatter",
        });
        expect(morphTransition(true, "staged")).toEqual({
            mode: "staged",
            reduced: true,
        });
    });

});
