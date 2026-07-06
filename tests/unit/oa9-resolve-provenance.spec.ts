// tests/unit/oa9-resolve-provenance.spec.ts — O-A9 ACCEPTANCE teeth (2)/(3)/(5) at the pure-resolver
// layer: the fusion static ⊕ vintage ⊕ algebra, and the present-when-active gating that the
// ProvenanceBar/Chip/AlgebraReadout render off. (The MOUNTED-plate composition — a facet-declaring
// plate paints a block a reader SEES — is the CONSUMER-side B15 render gate; this asserts the data the
// render binds is EXACT + self-gates.) Pure, no mount.
import { describe, it, expect } from "vitest";
import type { Leaf } from "@/filter/engine/predicate";
import {
    resolveProvenance,
    resolveVintage,
    cadenceOf,
    type AlgebraInputs,
} from "@/platform/provenance/useProvenance";
import { IDENTITY_DIM_LABELS, type DimLabels } from "@/platform/provenance/predicate-prose";
import type { ProvenanceFacet } from "@/platform/provenance/provenance-contract";

const facet: ProvenanceFacet = {
    dataset: "USAC FRN Status",
    sections: ["High Cost", "Low Income"],
    attributes: ["contributions", "disbursements"],
    analysis: "annual sums by program",
    yearRange: "2015–2025",
    encoding: { x: "year", y: "net retention" },
};

const labels: DimLabels = {
    labelOf: (k) => k,
    valueOf: (k, v) => (k === "flow" && v === "receivers" ? "receivers only" : v),
    formatBound: (_k, n) => String(n),
};

const oneOf = (key: string, ...values: string[]): Leaf<unknown> => ({
    op: "oneOf",
    field: () => null,
    values: new Set(values),
    key,
});

const inertAlgebra: AlgebraInputs = {
    predicate: null,
    labels: IDENTITY_DIM_LABELS,
    filteredCount: null,
    grainNoun: "districts",
    aggregationLevel: null,
};

describe("resolveVintage — the live 'data as of …' leg (NEVER hand-typed)", () => {
    it("resolves {asOf, cadence, frozen} off the freshness label + route cadence", () => {
        expect(
            resolveVintage(facet, { asOfLabel: "data as of 7 Jun 2026", kind: "seeded-on-cycle", frozen: false }),
        ).toEqual({ asOf: "data as of 7 Jun 2026", cadence: "annual", frozen: false });
    });
    it("an ILLUSTRATIVE facet wears no false stamp (null)", () => {
        expect(
            resolveVintage({ ...facet, illustrative: true }, {
                asOfLabel: "data as of 7 Jun 2026",
                kind: "continually-updated",
                frozen: false,
            }),
        ).toBeNull();
    });
    it("an unlanded feed (empty label) resolves null (no phantom stamp)", () => {
        expect(resolveVintage(facet, { asOfLabel: "", kind: "seeded", frozen: true })).toBeNull();
    });
    it("cadenceOf maps the ProvenanceKind cadence words", () => {
        expect(cadenceOf("seeded")).toBe("static extract");
        expect(cadenceOf("seeded-on-cycle")).toBe("annual");
        expect(cadenceOf("continually-updated")).toBe("live");
    });
});

describe("resolveProvenance — the fused shape the render reads", () => {
    it("tooth (2): maps the static facet AND, under an active filter, the humanized phrase + count", () => {
        const vintage = resolveVintage(facet, {
            asOfLabel: "data as of 7 Jun 2026",
            kind: "seeded-on-cycle",
            frozen: false,
        });
        const p = resolveProvenance(facet, vintage, {
            predicate: oneOf("flow", "receivers"),
            labels,
            filteredCount: 342,
            grainNoun: "districts",
            aggregationLevel: null,
        });
        expect(p.dataset).toBe("USAC FRN Status");
        expect(p.sections).toEqual(["High Cost", "Low Income"]);
        expect(p.encoding).toEqual({ x: "year", y: "net retention" });
        expect(p.vintage?.asOf).toBe("data as of 7 Jun 2026");
        expect(p.filterActive).toBe(true);
        expect(p.filterPhrases).toEqual(["receivers only"]);
        expect(p.filteredCount).toBe(342);
        expect(p.grainNoun).toBe("districts");
    });

    it("tooth (3)/(5): the IDENTITY predicate self-gates — filterActive false, phrases [], count null", () => {
        const p = resolveProvenance(facet, null, inertAlgebra);
        expect(p.filterActive).toBe(false);
        expect(p.filterPhrases).toEqual([]);
        expect(p.filteredCount).toBeNull();
        // the static legs still resolve (SOURCE/MEASURE/METHOD always render)
        expect(p.dataset).toBe("USAC FRN Status");
        expect(p.analysis).toBe("annual sums by program");
    });

    it("undeclared static fields collapse to []/null (TOTAL)", () => {
        const p = resolveProvenance({ dataset: "Bare" }, null, inertAlgebra);
        expect(p.sections).toEqual([]);
        expect(p.attributes).toEqual([]);
        expect(p.analysis).toBeNull();
        expect(p.yearRange).toBeNull();
        expect(p.encoding).toBeNull();
    });

    it("[ANSWERS Q43]: the aggregationLevel leg passes through for O-A9b to populate", () => {
        const p = resolveProvenance(facet, null, {
            ...inertAlgebra,
            aggregationLevel: {
                yearGrain: "FY2016–2026",
                spatialGrain: "all states",
                entityGrain: "1,150 districts",
                reduceOp: "pooled",
            },
        });
        expect(p.aggregationLevel?.yearGrain).toBe("FY2016–2026");
        expect(p.aggregationLevel?.reduceOp).toBe("pooled");
    });
});
