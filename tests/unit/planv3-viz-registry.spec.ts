import { beforeEach, describe, expect, it } from "vitest";
import { useVizRegistry } from "@/charts/composables/useVizRegistry";
import type { FilterDimension } from "@/charts/contract/viz-contract";

const cost: FilterDimension = {
    key: "bandwidthkbps",
    arity: "range",
    label: "Bandwidth",
};

describe("reactive viz registry facets", () => {
    const registry = useVizRegistry();

    beforeEach(() => registry.__resetRegistry());

    it("updates and removes dimensions on the same guarded mount", () => {
        const token = registry.register({
            vizId: "sci-stage",
            dims: [],
            crossHighlight: true,
        });

        registry.updateDims("sci-stage", token, [cost]);
        expect(registry.facetsFor(["sci-stage"])[0]?.dims).toEqual([cost]);

        registry.updateDims("sci-stage", Symbol("stale"), []);
        expect(registry.facetsFor(["sci-stage"])[0]?.dims).toEqual([cost]);

        registry.updateDims("sci-stage", token, []);
        expect(registry.facetsFor(["sci-stage"])[0]?.dims).toEqual([]);
    });
});
