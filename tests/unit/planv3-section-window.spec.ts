import { describe, expect, it } from "vitest";
import { sectionInWindow } from "@/filter/composables/useVirtualSectionWindow";

describe("stage section window", () => {
    it("keeps the whole section through 1x-above/2x-below overscan", () => {
        const viewport = 1000;
        expect(sectionInWindow({ top: -999, bottom: 1 }, viewport)).toBe(true);
        expect(sectionInWindow({ top: 2999, bottom: 3999 }, viewport)).toBe(true);
        expect(sectionInWindow({ top: -2500, bottom: 500 }, viewport)).toBe(true);
        expect(sectionInWindow({ top: -2001, bottom: -1001 }, viewport)).toBe(false);
        expect(sectionInWindow({ top: 3001, bottom: 4001 }, viewport)).toBe(false);
    });
});
