import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Chapter } from "../../src/contract/types";

const read = (rel: string) =>
    readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8");

const SCROLL_DRIVEN = read("design/overlays/scroll-driven.css");
const ESSAY = read("editorial/DashboardEssay.vue");

const EXIT_ARM = '[data-reveal-beat][data-scroll-out="fade"] .story-card';

/** The declaration block of the FIRST rule whose selector text contains `selector` — read off the
    shipped stylesheet, so an arm that loses a term (or the whole arm) fails here. */
function ruleBody(selector: string): string {
    const at = SCROLL_DRIVEN.indexOf(selector);
    expect(at, `${selector} is not in scroll-driven.css`).toBeGreaterThan(-1);
    const open = SCROLL_DRIVEN.indexOf("{", at);
    return SCROLL_DRIVEN.slice(open + 1, SCROLL_DRIVEN.indexOf("}", open));
}

/** A-14 · THE EXIT AXIS. `RevealSpec.out` is the grammar's one net-new contract field; these laws
    bind to the shipped stylesheet + host bytes that COMPILE it, never to a restatement of them. */
describe("A-14 exit axis", () => {
    it("compiles `out` into the exit-anchored counter-arm on the card", () => {
        const body = ruleBody(EXIT_ARM);
        // The departure is the arrival PLAYED BACKWARDS — same shared frames, same three terms,
        // sign preserved. `reverse` is what makes it opacity 1→0 toward the entrance axis.
        expect(body).toContain("animation: reveal-beat auto linear both reverse");
        // The host's own literal named timeline, referenced from a descendant — no fresh mint.
        expect(body).toContain("animation-timeline: --beat-tl");
        expect(body).not.toContain("view()");
        // The EXIT phase, front-loaded: the card is gone before its beat has finished leaving.
        expect(body).toContain("animation-range: exit 0% exit 45%");
    });

    it("never clones the reveal frames for the exit", () => {
        // One `reveal-beat` @keyframes tree-wide, and no exit-specific block beside it: the whole
        // curve is the entrance reversed, which is what keeps the two directions in sympathy.
        expect(SCROLL_DRIVEN.match(/@keyframes reveal-beat\b/g) ?? []).toHaveLength(1);
        expect(SCROLL_DRIVEN).not.toMatch(/@keyframes [\w-]*(exit|depart|fade-out)/);
    });

    it("keeps the exit off the beat host's own animation list", () => {
        // A third entry on `[data-reveal-beat]` would REPLACE the `animation` list a scrub beat
        // carries and drop its `scroll-tl-pos` arm (the list-drop law). Every occurrence of the
        // stamp in a selector position must therefore reach a descendant.
        for (const line of SCROLL_DRIVEN.split("\n")) {
            if (line.includes("[data-scroll-out=") && line.trimEnd().endsWith("{")) {
                expect(line).toContain(".story-card");
            }
        }
    });

    it("stamps the exit only where a beat declares the non-default posture", () => {
        // `hold` is the settled terminal every beat rests at today: it must carry NO attribute, so
        // a route that declares nothing is byte-identical (the `data-reveal-shape` convention).
        expect(ESSAY).toContain(':data-scroll-out="scrollOutAttr(chapter)"');
        expect(ESSAY).toContain('return out && out !== "hold" ? out : undefined;');
    });

    it("types the posture as a closed two-name register on RevealSpec", () => {
        // A live typed declaration: the field leaving the interface (or widening past the two
        // names) fails the typecheck this literal rides.
        const declarer = {
            id: "cliff",
            eyebrow: "e",
            title: "t",
            dek: "d",
            viz: "hero",
            reveal: { out: "fade" },
        } as const satisfies Partial<Chapter>;
        expect(declarer.reveal.out).toBe("fade");
    });
});
