// tests/unit/oa9-active-viz.spec.ts — O-A9 ACCEPTANCE tooth (7) + the §4.4 selection-driven
// activation, at the pure-core layer. The write-spy: `buildActiveVizEvent` READS its sources and
// mutates NOTHING (the single-writer gates hold). Pure, no mount.
import { describe, it, expect } from "vitest";
import type { Predicate, Leaf } from "../../src/filter/engine/predicate";
import {
    resolveActiveVizId,
    buildActiveVizEvent,
    type ActiveVizSources,
} from "../../src/interaction/useActiveViz";

const oneOf = (key: string, ...values: string[]): Leaf<unknown> => ({
    op: "oneOf",
    field: () => null,
    values: new Set(values),
    key,
});

/** A spy-backed source: every getter increments a read counter; there is NO setter, so a build that
    only reads leaves the backing state byte-identical (the write-spy witness). */
function makeSources(init: {
    scroll: string;
    beatId: string;
    beatLabel: string;
    primaryKey: string | null;
    selected: string[];
    owner: string;
    predicateFor?: (vizId: string) => Predicate<unknown> | null;
}) {
    const state = { ...init, selectedSet: new Set(init.selected) };
    const reads = { scroll: 0, owner: 0, selected: 0 };
    const src: ActiveVizSources = {
        scrollActiveVizId: () => (reads.scroll++, state.scroll),
        beat: () => ({ id: state.beatId, label: state.beatLabel }),
        primaryKey: () => state.primaryKey,
        selectedKeys: () => (reads.selected++, state.selectedSet),
        resolvedFor: init.predicateFor ?? (() => null),
        selectionOwner: () => (reads.owner++, state.owner),
    };
    return { src, state, reads };
}

describe("resolveActiveVizId — the max(scrollActive, selectionOwner) fold (§4.4)", () => {
    it("scroll-argmin wins when no pin is live", () => {
        const { src } = makeSources({
            scroll: "flow",
            beatId: "b",
            beatLabel: "B",
            primaryKey: null,
            selected: [],
            owner: "map",
        });
        expect(resolveActiveVizId(src)).toBe("flow");
    });

    it("the selection OWNER wins when a pin is live", () => {
        const { src } = makeSources({
            scroll: "flow",
            beatId: "b",
            beatLabel: "B",
            primaryKey: "37001",
            selected: ["37001"],
            owner: "map",
        });
        expect(resolveActiveVizId(src)).toBe("map");
    });

    it("a pin with no owner falls back to scroll (forward-safe)", () => {
        const { src } = makeSources({
            scroll: "flow",
            beatId: "b",
            beatLabel: "B",
            primaryKey: "37001",
            selected: ["37001"],
            owner: "",
        });
        expect(resolveActiveVizId(src)).toBe("flow");
    });
});

describe("buildActiveVizEvent — the event shape + the write-spy", () => {
    it("builds {vizId, beat, filters, selection} off the resolved active viz", () => {
        const pred = oneOf("flow", "receivers");
        const { src } = makeSources({
            scroll: "flow",
            beatId: "chapter-2",
            beatLabel: "The flow",
            primaryKey: null,
            selected: [],
            owner: "",
            predicateFor: (id) => (id === "flow" ? pred : null),
        });
        const e = buildActiveVizEvent(src);
        expect(e.vizId).toBe("flow");
        expect(e.beat).toEqual({ id: "chapter-2", label: "The flow" });
        expect(e.filters).toBe(pred);
        expect(e.selection).toEqual({ primaryKey: null, selectedKeys: new Set() });
    });

    it("tooth (7): building the event MUTATES no source state (write-spy)", () => {
        const { src, state } = makeSources({
            scroll: "flow",
            beatId: "b",
            beatLabel: "B",
            primaryKey: "37001",
            selected: ["37001"],
            owner: "map",
        });
        const before = JSON.stringify({
            scroll: state.scroll,
            owner: state.owner,
            selected: [...state.selectedSet],
        });
        buildActiveVizEvent(src);
        buildActiveVizEvent(src);
        const after = JSON.stringify({
            scroll: state.scroll,
            owner: state.owner,
            selected: [...state.selectedSet],
        });
        expect(after).toBe(before);
    });

    it("filters is null when nothing is centred (vizId '')", () => {
        const { src } = makeSources({
            scroll: "",
            beatId: "",
            beatLabel: "",
            primaryKey: null,
            selected: [],
            owner: "",
            predicateFor: () => oneOf("x", "y"),
        });
        expect(buildActiveVizEvent(src).filters).toBeNull();
    });
});
