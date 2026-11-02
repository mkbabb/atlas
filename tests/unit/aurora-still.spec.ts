import { effectScope } from "vue";
import { describe, expect, it } from "vitest";
import { STILL_FIELD } from "@mkbabb/glass-ui/aurora";
import { useAuroraConfig } from "../../src/platform/chrome/background/composables/useAuroraConfig";

/* U/B8 PF (A7 / P-G2; O-16 "the background flashes on scroll"). RED before: the config said
   "at rest ... glass-ui's demand gate parks the loop", but it spread DEFAULT_AURORA_CONFIG's
   drift (nuclei 0.015, palette 0.015, warp 0.008) and PAPER_WASH's clocked film grain (0.008),
   so the gate never parked: the field re-rendered and re-seeded its grain every frame it was
   awake, scrolling included. Mutation: drop the STILL_FIELD spread and every axis below reds. */
describe("useAuroraConfig — the field draws once", () => {
    it("carries glass's STILL_FIELD: no drift on any axis, no clocked grain", () => {
        const scope = effectScope();
        const { config } = scope.run(() => useAuroraConfig(() => undefined))!;
        for (const [k, v] of Object.entries(STILL_FIELD)) {
            expect(config[k as keyof typeof config], k).toBe(v);
        }
        expect(config.nucleiDrift).toBe(0);
        expect(config.paletteDrift).toBe(0);
        expect(config.warpDrift).toBe(0);
        expect(config.breathDepth).toBe(0);
        expect(config.paperGrain).toBe(0);
        scope.stop();
    });
});
