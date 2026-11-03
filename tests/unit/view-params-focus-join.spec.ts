import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveFocusToGrain } from "../../src/platform/stores/useViewParams";
import { leaToCountyFips } from "../../src/data/leaJoin";

/* U/B8 PF (entry JS, P-8). RED before: useViewParams imported leaJoin statically, and the store is
   in every route's entry chain, so the LEA name tables (lea-to-geoid.json 5,452 B and
   nc-county.names.json 1,803 B, raw) shipped on first paint for a hop only a `?focus` deep link to
   a county grain takes. Mutation: restore the static import and the source arm reds. */
describe("the ?focus county hop loads its join on demand", () => {
    it("useViewParams has no static import of leaJoin", () => {
        const src = readFileSync(new URL("../../src/platform/stores/useViewParams.ts", import.meta.url), "utf8");
        expect(src).not.toMatch(/^import[^;]*from\s+"\.\.\/\.\.\/data\/leaJoin\.js";/m);
        expect(src).toMatch(/import\("\.\.\/\.\.\/data\/leaJoin\.js"\)/);
    });

    it("resolves a district to its county through the join it is handed", () => {
        const wake = { kind: "district", id: "Wake County Schools", key: "district:Wake County Schools" } as const;
        expect(resolveFocusToGrain(wake, "county", leaToCountyFips)).toEqual({
            kind: "county",
            id: "37183",
            key: "county:37183",
        });
        expect(resolveFocusToGrain(wake, "state", () => null)?.kind).toBe("state");
        expect(resolveFocusToGrain(wake, "school", leaToCountyFips)).toBeNull();
    });
});
