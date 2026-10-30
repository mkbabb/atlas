// F-14 (U/B7d M3): a route hovers its marks by raw id, so the card could not name the entity it stands
// for and offered no detail. The kind travels beside the key; the raise still reads the raw id.
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSelection } from "../../src/platform/stores/useSelection";
import { useHoverReadout } from "../../src/platform/stores/useHoverReadout";

const payload = { origin: "map", title: "Wake County Schools", facts: [], anchor: { x: 400, y: 300 }, density: "compact" as const };

describe("the hovered entity", () => {
    beforeEach(() => setActivePinia(createPinia()));

    it("composes a raw id with its kind and leaves the raise on the raw id", () => {
        const s = useSelection();
        s.hover("920", "map", "district");
        expect(s.hoveredKey).toBe("920");
        expect(s.hoveredEntity).toBe("district:920");
    });

    it("reads a composite key as itself", () => {
        const s = useSelection();
        s.hover("state:37", "map");
        expect(s.hoveredEntity).toBe("state:37");
    });

    it("is null for a mark that names no entity", () => {
        const s = useSelection();
        s.hover("x:2019", "trend");
        expect(s.hoveredEntity).toBeNull();
        s.hover("920", "map");
        expect(s.hoveredEntity).toBeNull();
    });

    it("stamps the published card, so the card can open the detail", () => {
        const s = useSelection();
        const r = useHoverReadout();
        s.hover("920", "map", "district");
        r.publish(payload);
        expect(r.readout?.entityKey).toBe("district:920");
    });
});
