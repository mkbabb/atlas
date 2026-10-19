// membrane-facet.spec.ts — the CLOSED MEMBRANE-FACET union (spec-chrome §c.1/§c.2 · A-39 / B-6). Binds
// the SHIPPED roster + total switch: the six-facet closure is a real, falsifiable fact (a seventh
// facet, or a facet dropped from the roster, breaks these). The exhaustiveness itself is COMPILE-time
// (the `assertNever` default in `facetBand`); these bind the runtime shape the DOM stamp reads.
import { describe, it, expect } from "vitest";
import {
    MEMBRANE_FACETS,
    facetBand,
    type MembraneBand,
    type MembraneFacet,
} from "../../src/platform/chrome/dock/membrane-facet";

describe("membrane-facet — the closed six-facet union", () => {
    it("the roster is EXACTLY the six facets, in order, no duplicates", () => {
        expect(MEMBRANE_FACETS).toEqual([
            "crest",
            "progress-rim",
            "title-lozenge",
            "stepper",
            "filter-trigger",
            "data-state",
        ]);
        expect(MEMBRANE_FACETS).toHaveLength(6);
        expect(new Set(MEMBRANE_FACETS).size).toBe(MEMBRANE_FACETS.length);
    });

    it("no facet carries a figure subject (B6 · RULINGS §L D3-1): facets 5 and 6 are deleted", () => {
        expect(MEMBRANE_FACETS).not.toContain("viz-context");
        expect(MEMBRANE_FACETS).not.toContain("provenance-detent");
    });

    it("facetBand is TOTAL — every rostered facet maps to a valid band", () => {
        const bands: readonly MembraneBand[] = ["persistent", "scroll", "foot"];
        for (const facet of MEMBRANE_FACETS) {
            expect(bands).toContain(facetBand(facet as MembraneFacet));
        }
    });

    it("the three-band instrument is each populated", () => {
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
        expect(byBand.get("foot")).toEqual(["filter-trigger", "data-state"]);
    });
});
