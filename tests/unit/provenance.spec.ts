// Provenance resolution, aggregation, coverage, appendix, and reader prose.
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import type { Leaf, Predicate } from "../../src/filter/engine/predicate";
import {
    resolveProvenance,
    resolveVintage,
    cadenceOf,
    type AlgebraInputs,
} from "../../src/platform/provenance/useProvenance";
import { humanizePredicate, IDENTITY_DIM_LABELS, type DimLabels } from "../../src/platform/provenance/predicate-prose";
import type { ProvenanceFacet, ResolvedProvenance } from "../../src/platform/provenance/provenance-contract";
import { resolveAggregationLevel, reduceOpFor, useAggregationLevel, type AxisGrain } from "../../src/platform/provenance/aggregation";
import { appendixAnchorId, type AppendixEntry } from "../../src/platform/provenance/appendix";
import { scopeParts } from "../../src/platform/provenance/provenance-lines";
import type { DashboardContext } from "../../src/contract/types";

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

// Aggregation, coverage, and appendix behavior.
const axis = (pooled: string, single: string, narrowed: boolean): AxisGrain => ({
    pooled,
    single,
    narrowed,
});

describe("O-A9b (9) — resolveAggregationLevel: the live fold + the multi→single migration", () => {
    it("POOLED view — every axis un-narrowed shows the pool label AND the reduce-op", () => {
        const level = resolveAggregationLevel({
            year: axis("FY2016–2026", "FY2025", false),
            spatial: axis("all states", "NC", false),
            entity: axis("1,150 districts", "single district", false),
            reduceOp: "pooled",
        });
        expect(level).toEqual({
            yearGrain: "FY2016–2026",
            spatialGrain: "all states",
            entityGrain: "1,150 districts",
            reduceOp: "pooled",
        });
    });

    it("MIGRATION — narrowing every axis to a single member repaints the SINGLE labels AND collapses the reduce-op (no false 'pooled ×' over one item)", () => {
        const single = resolveAggregationLevel({
            year: axis("FY2016–2026", "FY2025", true),
            spatial: axis("all states", "NC", true),
            entity: axis("1,150 districts", "single district", true),
            reduceOp: "pooled",
        });
        expect(single).toEqual({
            yearGrain: "FY2025",
            spatialGrain: "NC",
            entityGrain: "single district",
            reduceOp: null,
        });
    });

    it("a PARTIAL narrow keeps the reduce-op while a pool remains (some axis un-narrowed)", () => {
        const level = resolveAggregationLevel({
            year: axis("FY2016–2026", "FY2025", true),
            spatial: axis("all states", "NC", false),
            entity: null,
            reduceOp: "Σ",
        });
        expect(level).toEqual({
            yearGrain: "FY2025",
            spatialGrain: "all states",
            entityGrain: null,
            reduceOp: "Σ",
        });
    });

    it("NO axis at all ⇒ null (an un-aggregated viz shows no SCOPE rung)", () => {
        expect(
            resolveAggregationLevel({ year: null, spatial: null, entity: null, reduceOp: "pooled" }),
        ).toBeNull();
    });

    it("reduceOpFor encodes the AGGREGATE LAW — extensive Σ, intensive pooled (no plain mean)", () => {
        expect(reduceOpFor("extensive")).toBe("Σ");
        expect(reduceOpFor("intensive")).toBe("pooled");
    });

    it("useAggregationLevel RE-RESOLVES when a live axis ref migrates (the Q43 re-render, driven)", () => {
        const narrowed = ref(false);
        const level = useAggregationLevel({
            year: () => axis("FY2016–2026", "FY2025", narrowed.value),
            spatial: () => axis("all states", "NC", narrowed.value),
            entity: null,
            reduceOp: () => "pooled" as const,
        });
        // BEFORE — the pooled scope string.
        expect(scopeParts({ aggregationLevel: level.value } as ResolvedProvenance).join(" · ")).toBe(
            "FY2016–2026 · all states · pooled",
        );
        // MIGRATE the view.
        narrowed.value = true;
        // AFTER — the computed re-resolved; a STALE string would fail this (the NEG the gate catches).
        expect(scopeParts({ aggregationLevel: level.value } as ResolvedProvenance).join(" · ")).toBe(
            "FY2025 · NC",
        );
    });

    it("A-19 (spec-contract §b·D-1) — a ROUTE DECLARES the resolver on its DashboardContext and the seam folds live", () => {
        const narrowed = ref(false);
        // The node-1 DECLARATION: the route names its grain axes on the context it already provides
        // (getters, so the level re-resolves as the view narrows). The RENDER stays the membrane's.
        const ctx: Pick<DashboardContext, "id" | "aggregation"> = {
            id: "sci",
            aggregation: {
                year: () => axis("FY2016–2026", "FY2025", narrowed.value),
                spatial: () => axis("all states", "NC", narrowed.value),
                entity: () => axis("1,150 districts", "single district", narrowed.value),
                reduceOp: () => "pooled" as const,
            },
        };
        const level = useAggregationLevel(ctx.aggregation);
        expect(level.value).toEqual({
            yearGrain: "FY2016–2026",
            spatialGrain: "all states",
            entityGrain: "1,150 districts",
            reduceOp: "pooled",
        });
        narrowed.value = true;
        expect(level.value).toEqual({
            yearGrain: "FY2025",
            spatialGrain: "NC",
            entityGrain: "single district",
            reduceOp: null,
        });
    });
});

describe("O-A9b (10-MECH) — appendixAnchorId: the ONE cross-link derivation", () => {
    it("derives a stable fragment id per viz — the bar's link target == the appendix row's id", () => {
        expect(appendixAnchorId("usf-net-retention-map")).toBe(
            "provenance-appendix-usf-net-retention-map",
        );
    });

    it("an appendix ENTRY carries the viz id the row anchors on (link ⇄ row round-trip)", () => {
        const entry: AppendixEntry = {
            vizId: "sci-utilization",
            title: "Utilization over time",
            provenance: { dataset: "SCI" } as ResolvedProvenance,
        };
        // the inline bar links `#${appendixAnchorId(vizId)}`; the appendix row `id` is the same →
        // every inline provenance resolves to an appendix row.
        expect(`#${appendixAnchorId(entry.vizId)}`).toBe("#provenance-appendix-sci-utilization");
    });
});

// Reader-facing predicate prose.
const dummyField = (): string | null => null;

// A route dictionary: `flow=receivers` → "receivers only"; `region` values title-cased; year/enrollment
// bounds formatted (year bare, enrollment thousands-separated).
const predicateLabels: DimLabels = {
    labelOf: (key) =>
        ({ region: "Region", year: "year", enrollment: "enrollment" })[key] ?? key,
    valueOf: (key, value) => {
        if (key === "flow" && value === "receivers") return "receivers only";
        if (key === "schoolType" && value === "charter") return "charter schools";
        const regionNames: Record<string, string> = { W: "West", S: "Sandhills" };
        if (key === "region") return regionNames[value] ?? value;
        return value;
    },
    formatBound: (key, n) => (key === "year" ? String(n) : n.toLocaleString("en-US")),
};

const predicateOneOf = (key: string, ...values: string[]): Leaf<unknown> => ({
    op: "oneOf",
    field: dummyField,
    values: new Set(values),
    key,
});
const predicateRange = (key: string, lo: number, hi: number): Leaf<unknown> => ({
    op: "range",
    field: dummyField,
    lo,
    hi,
    key,
});

describe("humanizePredicate — the reader-facing formatter", () => {
    it("tooth (1): the canonical AND fixture returns EXACT prose", () => {
        const p: Predicate<unknown> = {
            op: "and",
            kids: [predicateOneOf("flow", "receivers"), predicateRange("year", 2020, Infinity)],
        };
        expect(humanizePredicate(p, predicateLabels)).toEqual(["receivers only", "year ≥ 2020"]);
    });

    it("a single-value oneOf reads as the value token", () => {
        expect(humanizePredicate(predicateOneOf("schoolType", "charter"), predicateLabels)).toEqual([
            "charter schools",
        ]);
    });

    it("a multi-value oneOf reads as 'Label: a, b'", () => {
        expect(humanizePredicate(predicateOneOf("region", "W", "S"), predicateLabels)).toEqual([
            "Region: West, Sandhills",
        ]);
    });

    it("range bounds: ≥ / ≤ / lo–hi", () => {
        expect(humanizePredicate(predicateRange("year", 2020, Infinity), predicateLabels)).toEqual(["year ≥ 2020"]);
        expect(humanizePredicate(predicateRange("enrollment", -Infinity, 5000), predicateLabels)).toEqual([
            "enrollment ≤ 5,000",
        ]);
        expect(humanizePredicate(predicateRange("enrollment", 500, 5000), predicateLabels)).toEqual([
            "enrollment 500–5,000",
        ]);
    });

    it("an OR reads as one '(a or b)' phrase", () => {
        const p: Predicate<unknown> = {
            op: "or",
            kids: [predicateOneOf("region", "W"), predicateOneOf("region", "S")],
        };
        expect(humanizePredicate(p, predicateLabels)).toEqual(["(West or Sandhills)"]);
    });

    it("the IDENTITY predicate and all inert leaves return [] (no dead '0 filters' rung)", () => {
        expect(humanizePredicate(null)).toEqual([]);
        expect(humanizePredicate({ op: "any" })).toEqual([]);
        expect(humanizePredicate(predicateOneOf("region"), predicateLabels)).toEqual([]); // empty set ⇒ inert
        expect(humanizePredicate(predicateRange("year", -Infinity, Infinity), predicateLabels)).toEqual([]);
        expect(
            humanizePredicate({ op: "and", kids: [predicateOneOf("region"), { op: "any" }] }, predicateLabels),
        ).toEqual([]);
    });

    it("the identity dictionary passes tokens through unmapped (forward-safe)", () => {
        expect(humanizePredicate(predicateOneOf("flow", "receivers"), IDENTITY_DIM_LABELS)).toEqual([
            "receivers",
        ]);
    });
});
