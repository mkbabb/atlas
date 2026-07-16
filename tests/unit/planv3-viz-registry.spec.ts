import { beforeEach, describe, expect, it } from "vitest";
import { useVizRegistry } from "../../src/charts/composables/useVizRegistry";
import { resolveFilterResponse } from "../../src/filter/composables/useFilterPanel";
import type { FilterDimension } from "../../src/charts/contract/viz-contract";

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
            filterResponse: "responsive",
            crossHighlight: true,
        });

        registry.updateFilterFacet("sci-stage", token, {
            dims: [cost],
            filterResponse: "static",
        });
        expect(registry.facetsFor(["sci-stage"])[0]?.dims).toEqual([cost]);

        registry.updateFilterFacet("sci-stage", Symbol("stale"), {
            dims: [],
            filterResponse: "responsive",
        });
        expect(registry.facetsFor(["sci-stage"])[0]?.dims).toEqual([cost]);

        registry.updateFilterFacet("sci-stage", token, {
            dims: [],
            filterResponse: "responsive",
        });
        expect(registry.facetsFor(["sci-stage"])[0]).toMatchObject({
            dims: [],
            filterResponse: "responsive",
        });
    });

    it("projects the active set as static only when every mounted member opts out", () => {
        registry.register({
            vizId: "static",
            dims: [],
            filterResponse: "static",
            crossHighlight: true,
        });
        registry.register({
            vizId: "responsive",
            dims: [],
            filterResponse: "responsive",
            crossHighlight: true,
        });

        expect(resolveFilterResponse(registry.facetsFor(["static"]))).toBe("static");
        expect(resolveFilterResponse(registry.facetsFor(["static", "responsive"]))).toBe(
            "responsive",
        );
        expect(resolveFilterResponse(registry.facetsFor([]))).toBe("responsive");
    });
});
