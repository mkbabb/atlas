import { describe, expect, it } from "vitest";
import {
    appendixAnchorId,
    appendixOrdinal,
    figureOrdinalFor,
    plateAnchorId,
    resolveAppendixDetent,
} from "../../src/platform/provenance/appendix";

describe("provenance foot contracts", () => {
    it("moves through shut, peek, and full without a late peek collapsing full", () => {
        expect(resolveAppendixDetent("shut", "peek")).toBe("peek");
        expect(resolveAppendixDetent("peek", "expand")).toBe("full");
        expect(resolveAppendixDetent("full", "peek")).toBe("full");
        expect(resolveAppendixDetent("full", "toggle")).toBe("shut");
    });

    it("keeps declared ordinals and anchors independent of mount order", () => {
        expect(["outlook", "overview", "detail"].map((id) => ["overview", "detail", "outlook"].indexOf(id)).map(appendixOrdinal)).toEqual(["A.3", "A.1", "A.2"]);
        expect(appendixAnchorId("detail")).toBe("provenance-appendix-detail");
        expect(plateAnchorId("detail")).toBe("figure-detail");
        expect(figureOrdinalFor({ overview: 1, detail: 2 }, "detail")).toBe(2);
    });
});
