// U/B7c M1 · O-7 phone TBT. `Number.prototype.toLocaleString("en-US")` builds a new Intl number
// formatter on every call. formatCount ran for every count the /sci route renders at mount; the phone
// load profile (4× CPU, 079743b6 + this lane's fixes) put it among the top self-time functions. The
// grouped whole-number faces now share one formatter built once.
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCount, formatNumberAbbrev, formatUsdAbbrev } from "../../src/charts/lib/format";

describe("the grouped whole-number faces share one Intl formatter", () => {
    afterEach(() => vi.restoreAllMocks());

    it("formats without Number.prototype.toLocaleString, with the same output", () => {
        const spy = vi.spyOn(Number.prototype, "toLocaleString");
        expect(formatCount(160429)).toBe("160,429");
        expect(formatCount(296.6)).toBe("297");
        expect(formatNumberAbbrev(150)).toBe("150");
        expect(formatNumberAbbrev(-42)).toBe("-42");
        expect(formatUsdAbbrev(722)).toBe("$722");
        expect(spy).not.toHaveBeenCalled();
    });
});
