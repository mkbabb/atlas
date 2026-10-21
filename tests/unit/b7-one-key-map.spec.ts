// M-02 (PLAN §10.1): click selects; Cmd-click adds. The keyboard map is one table (`keyStep`) for a
// figure's nav and for SelectionRegion: Enter or Space selects, and with the add chord (Shift, Cmd or
// Ctrl) adds. Before B7 `KeyInput` carried only Shift, so Cmd+Enter in a figure selected instead of
// adding, Space did nothing, and SelectionRegion kept its own switch.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { keyStep, type KeyboardNavSpec } from "../../src/interaction/keyboard";
import { isMultiSelect } from "../../src/charts/contract/selection-contract";

const spec: KeyboardNavSpec<string> = {
    archetype: "geo",
    order: () => ["a", "b", "c"],
    keyOf: (k) => k,
    labelOf: (k) => k,
    anchorOf: () => ({ x: 0, y: 0 }),
};
const at = { index: 1, engaged: true };

describe("one key map (M-02)", () => {
    it("Enter selects; Enter with the add chord adds", () => {
        expect(keyStep(spec, at, { key: "Enter", multi: false } as never).intent).toEqual({ verb: "pin", key: "b", additive: false });
        for (const mod of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }]) {
            const multi = isMultiSelect(mod);
            expect(keyStep(spec, at, { key: "Enter", multi } as never).intent).toEqual({ verb: "pin", key: "b", additive: true });
        }
    });

    it("Space selects like Enter", () => {
        expect(keyStep(spec, at, { key: " ", multi: false } as never).intent).toEqual({ verb: "pin", key: "b", additive: false });
    });

    it("SelectionRegion folds its keys through keyStep and keeps no switch of its own", () => {
        const src = readFileSync(join(__dirname, "../../src/charts/geo/SelectionRegion.vue"), "utf8");
        expect(src).toMatch(/keyStep\(/);
        expect(src).not.toMatch(/case "ArrowDown":/);
    });
});
