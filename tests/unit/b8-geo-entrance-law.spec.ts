// U/B8 DV · the A1 chase: the choropleth entrance plays under the one atlas entrance law. The a1
// branch armed its ripple and threads on a vueuse IntersectionObserver's first intersection, with
// no dwell and no deep-link hold. Fails before (b5f417d): useGeoEntrance imported
// useIntersectionObserver and not useFirstViewTarget.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the geo entrance obeys the entrance law", () => {
    it("arms through useFirstViewTarget and owns no observer of its own", () => {
        const src = readFileSync(join(__dirname, "../../src/charts/geo/useGeoEntrance.ts"), "utf8");
        expect(src).toMatch(/import \{ useFirstViewTarget \} from "\.\.\/\.\.\/motion\/useFirstView\.js"/);
        expect(src).not.toMatch(/useIntersectionObserver|new IntersectionObserver/);
    });
});
