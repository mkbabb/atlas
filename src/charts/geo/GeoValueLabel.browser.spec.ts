// The map value-label channel in a real engine (U/B7b · PLAN §4.2: no visible text below full
// opacity). A label is either hidden (at rest, or a region that fails the X10 gate) or painted at
// full ink (the redundant channel). It used to rest at opacity 0.04 and lift to 0.6, which the clone
// scroll-free witness counted as 1,474 faded samples across the map routes.
import "./GeoChoropleth.css";
import { afterEach, describe, expect, it } from "vitest";

let host: HTMLElement | null = null;
afterEach(() => {
    host?.remove();
    host = null;
});

function labels(redundant: boolean): { plain: SVGTextElement; failing: SVGTextElement } {
    host = document.createElement("div");
    host.innerHTML = `<svg width="200" height="100"><g class="geo-value-labels${redundant ? " geo-value-labels--redundant" : ""}">
        <text class="geo-value-label" x="10" y="40">1,234</text>
        <text class="geo-value-label geo-value-label--gate-fail" x="10" y="80">56</text>
    </g></svg>`;
    document.body.appendChild(host);
    const [plain, failing] = host.querySelectorAll<SVGTextElement>("text");
    return { plain: plain!, failing: failing! };
}

/** Painted means visible and at full opacity; anything else must not be visible at all. */
const state = (el: Element) => {
    const cs = getComputedStyle(el);
    return { visible: cs.visibility === "visible", opacity: Number(cs.opacity) };
};

describe("geo value labels are hidden or painted whole", () => {
    it("rests hidden when the ramp carries the magnitude", () => {
        const { plain, failing } = labels(false);
        expect(state(plain).visible).toBe(false);
        expect(state(failing).visible).toBe(false);
    });

    it("paints the redundant channel at full opacity, and hides a label that fails the gate", () => {
        const { plain, failing } = labels(true);
        expect(state(plain)).toEqual({ visible: true, opacity: 1 });
        expect(state(failing).visible).toBe(false);
    });
});
