import { describe, expect, it } from "vitest";
import { resolveActiveHost } from "@/charts/composables/activeViz";

describe("W-L2 host-grain conductor", () => {
    it("selects a private scene host while preserving the stage's public viz identity", () => {
        const resolved = resolveActiveHost(
            [
                { hostKey: "stage:scene:a", id: "stage", progress: 0.46 },
                { hostKey: "stage:scene:b", id: "stage", progress: 0.72 },
                { hostKey: "map", id: "map", progress: 0.2 },
            ],
            "",
        );

        expect(resolved.hostKey).toBe("stage:scene:a");
        expect(resolved.id).toBe("stage");
        expect(resolved.inViewport).toEqual(new Set(["stage", "map"]));
    });

    it("applies centre hysteresis at private-host grain", () => {
        const resolved = resolveActiveHost(
            [
                { hostKey: "stage:scene:a", id: "stage", progress: 0.54 },
                { hostKey: "stage:scene:b", id: "stage", progress: 0.53 },
            ],
            "stage:scene:a",
        );

        expect(resolved.hostKey).toBe("stage:scene:a");
        expect(resolved.id).toBe("stage");
    });
});
