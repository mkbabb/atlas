// T-10 (RQ-054, RB-050): dividing lines are thin, untapered, of a sensible length, and drawn in on
// scroll. PLAN §4.2 binds the draw: a rule draws once when it first enters the viewport (not
// scrubbed, not reversed), compositor-friendly, and not at all under reduced motion; a rule already
// in view at mount is painted at rest. Before U/B7c M2 every rule was a static ribbon whose ends
// tapered to a quarter of its body (measured 0.25 on 9 routes) and no rule drew.
import { afterEach, describe, expect, it } from "vitest";
import "../../tests/browser/glass-root.css";
import "../design/tokens/motion.css";
import "../design/tokens/color.css";
import { createApp, h } from "vue";
import { commands } from "vitest/browser";
const motion = commands as unknown as { emulateMotion: (m: "reduce" | "no-preference") => Promise<void> };
import AnimatedRule from "./AnimatedRule.vue";
import { beginNarrativeRestore, resetNarrativeLanding, settleNarrativeRestore } from "../motion/narrative-restore";

const frames = (n = 2) => new Promise<void>((r) => {
    const step = (k: number) => (k <= 0 ? r() : requestAnimationFrame(() => step(k - 1)));
    step(n);
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
    while (cleanups.length) await cleanups.pop()!();
    window.scrollTo(0, 0);
    resetNarrativeLanding(false);
});

/** Mount one rule, `offset` px below the top of a tall page. */
function mount(weight: "full" | "short" | "hero" | "seam", offset: number) {
    const page = document.createElement("div");
    page.style.cssText = `position:relative;block-size:${offset + 3000}px;inline-size:800px`;
    const host = document.createElement("div");
    host.style.cssText = `position:absolute;inset-block-start:${offset}px;inset-inline:0`;
    page.appendChild(host);
    document.body.appendChild(page);
    const app = createApp({ render: () => h(AnimatedRule, { weight }) });
    app.mount(host);
    cleanups.push(() => {
        app.unmount();
        page.remove();
    });
    return host.querySelector<HTMLElement>("[data-testid='animated-rule']")!;
}

/** The inked width at each sample of the drawn path: an even stroke reports its stroke width. */
function inkProfile(rule: HTMLElement) {
    const path = rule.querySelector("path")!;
    const cs = getComputedStyle(path);
    const d = path.getAttribute("d") ?? "";
    // the nib the pen would ink at this box: weight · 0.2 · fs^0.75, weight 1 or 0.7
    return { fill: cs.fill, stroke: cs.stroke, width: parseFloat(cs.strokeWidth), cap: cs.strokeLinecap, closed: /z\s*$/i.test(d.trim()), declared: path.style.strokeWidth, length: path.getAttribute("pathLength") };
}

describe("AnimatedRule · T-10", () => {
    it("inks an even, thin stroke (no taper) for every drawn weight", async () => {
        for (const weight of ["full", "short", "hero"] as const) {
            const rule = mount(weight, 0);
            await frames(3);
            const ink = inkProfile(rule);
            expect(ink.fill, weight).toBe("none");
            expect(ink.stroke, weight).not.toBe("none");
            expect(ink.cap, weight).toBe("butt");
            expect(ink.closed, `${weight}: an open centreline, not a closed ribbon outline`).toBe(false);
            expect(ink.declared, `${weight}: the nib is declared, not the 1px default`).toMatch(/^\d+(\.\d+)?px$/);
            expect(ink.length, weight).toBe("1");
            expect(ink.width, weight).toBeGreaterThan(0.5);
            expect(ink.width, weight).toBeLessThanOrEqual(2);
        }
    });

    it("a rule in view at mount is painted at rest, with no draw", async () => {
        const rule = mount("full", 40);
        await frames(3);
        expect(rule.dataset.draw).toBe("rest");
        expect(rule.getAnimations({ subtree: true })).toHaveLength(0);
        expect(getComputedStyle(rule.querySelector("path")!).strokeDashoffset).toMatch(/^0(px)?$/);
    });

    it("a rule below the fold draws once on entry, then holds", async () => {
        const rule = mount("full", 2400);
        await frames(3);
        expect(rule.dataset.draw).toBe("pending");
        window.scrollTo(0, 2400 - 300);
        let ran = false;
        for (let i = 0; i < 20 && !ran; i++) {
            await frames(1);
            ran = rule.getAnimations({ subtree: true }).length > 0;
        }
        expect(ran).toBe(true);
        await sleep(900);
        expect(rule.dataset.draw).toBe("drawn");
        expect(rule.getAnimations({ subtree: true })).toHaveLength(0);
        expect(getComputedStyle(rule.querySelector("path")!).strokeDashoffset).toMatch(/^0(px)?$/);
        // Not reversed: leaving and re-entering does not draw again.
        window.scrollTo(0, 0);
        await frames(3);
        window.scrollTo(0, 2400 - 300);
        await frames(4);
        expect(rule.getAnimations({ subtree: true })).toHaveLength(0);
    });

    it("the seam draws in from its start edge on entry", async () => {
        const rule = mount("seam", 2400);
        await frames(3);
        expect(rule.dataset.draw).toBe("pending");
        window.scrollTo(0, 2400 - 300);
        let ran = false;
        for (let i = 0; i < 20 && !ran; i++) {
            await frames(1);
            ran = rule.getAnimations({ subtree: true }).length > 0;
        }
        expect(ran).toBe(true);
        await sleep(900);
        expect(getComputedStyle(rule.querySelector(".animated-rule__seam")!).transform).toBe("none");
    });

    it("under reduced motion nothing draws; the rule is painted at rest", async () => {
        // The engine's own emulation: the rule reads the platform's one reduced-motion source
        // (`useReducedMotion`), which a hand-stubbed matchMedia without listeners cannot drive.
        await motion.emulateMotion("reduce");
        cleanups.push(() => motion.emulateMotion("no-preference"));
        const rule = mount("full", 2400);
        await frames(3);
        expect(rule.dataset.draw).toBe("rest");
        window.scrollTo(0, 2400 - 300);
        await frames(6);
        expect(rule.getAnimations({ subtree: true })).toHaveLength(0);
    });
});

// U/B8 A9 — the entrance law. Before, the rule drew on its first intersection: a scroll that passed
// it in one frame, or a deep-link restore flying past, spent the draw where no one saw it.
describe("AnimatedRule · the entrance law (A9)", () => {
    it("a pass-through shorter than 130 ms does not draw; a real view draws", async () => {
        resetNarrativeLanding(false);
        const rule = mount("full", 2400);
        await frames(3);
        expect(rule.dataset.draw).toBe("pending");
        window.scrollTo(0, 2400 - 300);
        await frames(2);
        window.scrollTo(0, 0);
        await sleep(300);
        expect(rule.dataset.draw, "the pass-through left the draw unspent").toBe("pending");
        window.scrollTo(0, 2400 - 300);
        await sleep(60);
        expect(rule.dataset.draw, "not before the dwell").toBe("pending");
        expect(await until(() => rule.dataset.draw === "drawn", 1000)).toBe(true);
    });

    it("on a page opened on a deep link it waits until the link has landed", async () => {
        resetNarrativeLanding(true);
        beginNarrativeRestore();
        const rule = mount("full", 2400);
        await frames(3);
        expect(rule.dataset.draw, "held, even though it is not in view at mount").toBe("pending");
        window.scrollTo(0, 2400 - 300);
        await sleep(400);
        expect(rule.dataset.draw, "the restore has not settled").toBe("pending");
        settleNarrativeRestore({ beatId: "x" }, { aborted: false });
        expect(await until(() => rule.dataset.draw === "drawn", 1000)).toBe(true);
    });
});

async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}
