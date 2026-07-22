// membrane-facet.spec.ts — the CLOSED MEMBRANE-FACET union (spec-chrome §c.1/§c.2 · A-39 / B-6). Binds
// the SHIPPED roster + total switch: the eight-facet closure is a real, falsifiable fact (a ninth
// facet, or a facet dropped from the roster, breaks these). The exhaustiveness itself is COMPILE-time
// (the `assertNever` default in `facetBand`); these bind the runtime shape the DOM stamp reads.
import { describe, it, expect } from "vitest";
import {
    MEMBRANE_FACETS,
    facetBand,
    type MembraneBand,
    type MembraneFacet,
} from "../../src/platform/chrome/dock/membrane-facet";

describe("membrane-facet — the closed eight-facet union", () => {
    it("the roster is EXACTLY the eight facets, in order, no duplicates", () => {
        expect(MEMBRANE_FACETS).toEqual([
            "crest",
            "progress-rim",
            "title-lozenge",
            "stepper",
            "viz-context",
            "provenance-detent",
            "filter-trigger",
            "data-state",
        ]);
        expect(MEMBRANE_FACETS).toHaveLength(8);
        expect(new Set(MEMBRANE_FACETS).size).toBe(MEMBRANE_FACETS.length);
    });

    it("the viz-context zone (facet 5) is the projected context detent", () => {
        expect(MEMBRANE_FACETS[4]).toBe("viz-context");
        expect(facetBand("viz-context")).toBe("context");
    });

    it("facetBand is TOTAL — every rostered facet maps to a valid band", () => {
        const bands: readonly MembraneBand[] = [
            "persistent",
            "scroll",
            "context",
            "foot",
        ];
        for (const facet of MEMBRANE_FACETS) {
            expect(bands).toContain(facetBand(facet as MembraneFacet));
        }
    });

    it("the three-band instrument + the context detent are each populated", () => {
        const byBand = new Map<MembraneBand, MembraneFacet[]>();
        for (const facet of MEMBRANE_FACETS) {
            const band = facetBand(facet as MembraneFacet);
            byBand.set(band, [...(byBand.get(band) ?? []), facet as MembraneFacet]);
        }
        expect(byBand.get("persistent")).toEqual([
            "crest",
            "progress-rim",
            "title-lozenge",
        ]);
        expect(byBand.get("scroll")).toEqual(["stepper"]);
        expect(byBand.get("context")).toEqual(["viz-context"]);
        expect(byBand.get("foot")).toEqual([
            "provenance-detent",
            "filter-trigger",
            "data-state",
        ]);
    });
});
