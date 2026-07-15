import { describe, expect, it } from "vitest";
import type { EChartsOption } from "echarts";
import {
    morphTransition,
    optionsLiveInView,
    resolveFromAlternates,
    resolveVizSurface,
    viewsToOptionSpec,
    type VizSetContract,
} from "@/charts/viz-set";
import {
    assertVizAlternateTruthUp,
    VIZ_ALTERNATES,
} from "@/story/viz-alternates";

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
        expect(resolveFromAlternates(set, "beeswarm").id).toBe("beeswarm");
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

    it("truths up the populated same- and cross-instance world", () => {
        expect(
            assertVizAlternateTruthUp(VIZ_ALTERNATES, {
                mountedViewSets: { "sci-scatter": set },
                wiredCrossInstanceBases: new Set(["ecf-treemap", "ecf-bars"]),
            }),
        ).toEqual([]);
    });

    it("bites on empty, missing, and ahead-of-code surfaces", () => {
        expect(
            assertVizAlternateTruthUp(VIZ_ALTERNATES, {
                mountedViewSets: {},
                wiredCrossInstanceBases: new Set(),
            }),
        ).toContain("truth-up world is empty");

        const violations = assertVizAlternateTruthUp(VIZ_ALTERNATES, {
            mountedViewSets: {
                "sci-scatter": {
                    ...set,
                    views: [{ id: "scatter", label: "Scatter", option }],
                },
            },
            wiredCrossInstanceBases: new Set(["ecf-treemap"]),
        });
        expect(violations.some((v) => v.startsWith("beeswarm:"))).toBe(true);
        expect(violations.some((v) => v.startsWith("lollipop:"))).toBe(true);
    });
});
