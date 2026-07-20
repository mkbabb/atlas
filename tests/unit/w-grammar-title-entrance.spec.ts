import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveLayout } from "../../src/editorial/useBeatLayout";
import type { Chapter } from "../../src/contract/types";

const read = (rel: string) =>
    readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8");

const SCROLL_DRIVEN = read("design/overlays/scroll-driven.css");
const VIZ_PLATE = read("charts/frame/VizPlate.vue");

/** The declaration block of the FIRST rule whose selector text contains `selector` — read off the
    shipped stylesheet, so an arm that loses a term (or the whole arm) fails here. */
function ruleBody(selector: string): string {
    const at = SCROLL_DRIVEN.indexOf(selector);
    expect(at, `${selector} is not in scroll-driven.css`).toBeGreaterThan(-1);
    const open = SCROLL_DRIVEN.indexOf("{", at);
    return SCROLL_DRIVEN.slice(open + 1, SCROLL_DRIVEN.indexOf("}", open));
}

/** A-13 · THE TITLE'S OWN ENTRANCE. The compiled arms are the wave's deliverable, so the laws bind
    to the shipped stylesheet bytes rather than to a restatement of them. */
describe("A-13 title entrance arms", () => {
    it.each(["left", "right", "up"] as const)(
        "pins the whole axis triple on the %s arm",
        (axis) => {
            const body = ruleBody(`.essay-masthead-cluster[data-title-in="${axis}"]`);
            // Custom properties INHERIT: an arm that names only its own term would let the cluster
            // pick up the BEAT's other two and travel a compound of two axes (the relative shear).
            expect(body).toContain("--reveal-x:");
            expect(body).toContain("--reveal-lift:");
            expect(body).toContain("--reveal-scale-from:");
        },
    );

    it("binds the shared reveal keyframes over the later, narrower window", () => {
        const body = ruleBody(".essay-masthead-cluster[data-title-in] {");
        // The SHARED `reveal-beat` frames re-scrubbed off the beat's own literal `--beat-tl` — no
        // cloned keyframes and no fresh `view()` mint (which would cost a second timeline).
        expect(body).toContain("animation: reveal-beat auto linear both");
        expect(body).toContain("animation-timeline: --beat-tl");
        expect(body).not.toContain("view()");
        // Later than the beat's own `entry 5% → 22%`, so the header settles INTO the landed card.
        expect(body).toContain("animation-range: entry 10% entry 30%");
    });

    it("halves the beat's amplitude on both axes", () => {
        expect(ruleBody('[data-title-in="left"]')).toContain(
            "calc(-0.5 * var(--reveal-shift, 6vw))",
        );
        expect(ruleBody('[data-title-in="right"]')).toContain(
            "calc(0.5 * var(--reveal-shift, 6vw))",
        );
        // the beat's own vertical rise is 6vh (the `reveal-beat` FROM frame default)
        expect(ruleBody('[data-title-in="up"]')).toContain("--reveal-lift: 3vh");
    });

    it("keeps the corridor recede the single writer on its own clusters", () => {
        // Both rules declare `animation` on the same element, so they must never both match. The
        // host refuses the `data-title-in` stamp on a receding cluster; this holds the CSS side of
        // that contract — neither selector may widen to cover the other's beats.
        expect(SCROLL_DRIVEN).toContain(".essay-masthead-cluster[data-corridor-recede] {");
        expect(SCROLL_DRIVEN).not.toContain(
            ".essay-masthead-cluster[data-corridor-recede][data-title-in]",
        );
    });
});

/** A-11 · THE NUMERALS POLE. The zebra is the resolver's, and the top seat that never rendered it
    is struck — the ONE band is placed by the pole the card carries. */
describe("A-11 numerals zebra", () => {
    const beat = (numbers?: "top" | "bottom"): Chapter =>
        ({
            id: "b",
            eyebrow: "e",
            title: "t",
            dek: "d",
            viz: "hero",
            reveal: numbers ? { layout: { numbers } } : undefined,
        }) as unknown as Chapter;

    it("alternates even=top / odd=bottom by masthead phase", () => {
        expect(resolveLayout(beat(), 0).numbers).toBe("top");
        expect(resolveLayout(beat(), 1).numbers).toBe("bottom");
        expect(resolveLayout(beat(), 2).numbers).toBe("top");
    });

    it("yields the zebra to an authored pole", () => {
        expect(resolveLayout(beat("bottom"), 0).numbers).toBe("bottom");
        expect(resolveLayout(beat("top"), 1).numbers).toBe("top");
    });

    it("leaves no aggregate-stats template addressed at a slot ChartFrame never declares", () => {
        expect(VIZ_PLATE).not.toContain("aggregate-stats-top");
        expect(VIZ_PLATE.match(/name="aggregate-stats"/g) ?? []).toHaveLength(1);
    });
});
