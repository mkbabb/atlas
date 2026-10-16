import { describe, expect, it } from "vitest";
import { createReaderIntentGate } from "../../src/interaction/reader-intent";

// U-F59a (the U-F29 trigger), homed in atlas by sci-report §H M-5: a keyboard control raises a key
// only while focused, and clears only a key it raised.

describe("U-F59a — the focus-gated cursor", () => {
    it("sends nothing for an unfocused cursor (setup, a re-ordered or narrowed key list)", () => {
        const g = createReaderIntentGate();
        expect(g.move("filer-0001")).toBeNull();
        expect(g.move("filer-0002")).toBeNull();
        expect(g.move(null)).toBeNull();
        expect(g.raised).toBe(false);
    });

    it("raises on focus, follows the cursor while focused, and clears on blur", () => {
        const g = createReaderIntentGate();
        expect(g.focus("a")).toEqual({ key: "a" });
        expect(g.move("b")).toEqual({ key: "b" });
        expect(g.focused).toBe(true);
        expect(g.blur()).toEqual({ key: null });
        expect(g.focused).toBe(false);
        expect(g.raised).toBe(false);
    });

    it("never clears a key it did not raise", () => {
        const g = createReaderIntentGate();
        expect(g.blur()).toBeNull();
        // Focus on an empty list raises nothing, so its blur clears nothing.
        expect(g.focus(null)).toBeNull();
        expect(g.blur()).toBeNull();
    });

    it("releases its key when the list empties under focus, once", () => {
        const g = createReaderIntentGate();
        g.focus("a");
        expect(g.move(null)).toEqual({ key: null });
        expect(g.move(null)).toBeNull();
        expect(g.blur()).toBeNull();
    });

    it("goes quiet again after blur", () => {
        const g = createReaderIntentGate();
        g.focus("a");
        g.blur();
        expect(g.move("b")).toBeNull();
    });
});
