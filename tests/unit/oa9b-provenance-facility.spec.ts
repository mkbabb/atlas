// tests/unit/oa9b-provenance-facility.spec.ts — O-A9b ACCEPTANCE teeth at the pure-mechanism layer:
//   (8-MECH) the all-items coverage CENSUS flags a synthetic un-sourced NEG + passes a fully-sourced
//            fixture (the anti-theater gate — it NAMES the gap, never counts declarers).
//   (9)      the AGGREGATION-LEVEL resolver folds the live axes AND RE-RESOLVES on a multi→single
//            migration (the displayed scope string CHANGES with the view); NEG: a resolver that does
//            NOT re-read stale axes would keep the old string — the reactive `useAggregationLevel`
//            re-resolves, proven by driving a ref.
//   (10-MECH) the APPENDIX anchor derivation is the ONE source the inline bar's cross-link and the
//            appendix row's id both read (a link ALWAYS resolves to its row).
// Pure + reactive-shell only; the MOUNTED before/after capture + exemplar appendix render are the
// CONSUMER-side prod-build teeth (dist-oa9b) — this asserts the data the render binds is EXACT.
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import {
    resolveAggregationLevel,
    reduceOpFor,
    useAggregationLevel,
    type AxisGrain,
} from "@/platform/provenance/aggregation";
import {
    auditProvenanceCoverage,
    isSourced,
    type CoverageItem,
} from "@/platform/provenance/coverage";
import { appendixAnchorId, type AppendixEntry } from "@/platform/provenance/appendix";
import { scopeParts } from "@/platform/provenance/provenance-lines";
import type { ProvenanceFacet, ResolvedProvenance } from "@/platform/provenance/provenance-contract";

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
});

describe("O-A9b (8-MECH) — auditProvenanceCoverage: the all-items census (anti-theater)", () => {
    const sourced = (id: string): CoverageItem => ({
        id,
        facet: { dataset: "USAC FRN Status", analysis: "annual sums" },
    });

    it("a FULLY-SOURCED roster is complete (every item resolves a record)", () => {
        const report = auditProvenanceCoverage([sourced("map"), sourced("scatter"), sourced("strip")]);
        expect(report).toEqual({ total: 3, sourced: 3, unsourced: [], complete: true });
    });

    it("a synthetic UN-SOURCED item TRIPS the census — NAMED, not counted", () => {
        const report = auditProvenanceCoverage([
            sourced("map"),
            { id: "orphan-figure", facet: null },
            sourced("strip"),
        ]);
        expect(report.complete).toBe(false);
        expect(report.unsourced).toEqual(["orphan-figure"]);
        expect(report.sourced).toBe(2);
    });

    it("a BLANK facet (`dataset: ''`) is as un-sourced as none — no hollow stamp passes", () => {
        expect(isSourced({ dataset: "" } as ProvenanceFacet)).toBe(false);
        expect(isSourced({ dataset: "   " } as ProvenanceFacet)).toBe(false);
        expect(isSourced({ dataset: "USAC" } as ProvenanceFacet)).toBe(true);
        expect(auditProvenanceCoverage([{ id: "hollow", facet: { dataset: "" } }]).complete).toBe(
            false,
        );
    });

    it("an EMPTY roster is vacuously complete (TOTAL)", () => {
        expect(auditProvenanceCoverage([])).toEqual({
            total: 0,
            sourced: 0,
            unsourced: [],
            complete: true,
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
