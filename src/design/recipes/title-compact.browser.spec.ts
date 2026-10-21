// The sticky page title shrinks without moving layout (U/B7 · PLAN §5.1). The scroll-bound
// `title-compact` keyframe animated font-size (moved every page by 20–100 px) and then a 560 → 600
// weight lift, which re-wrapped the phone hero title and grew /usf and /speedtest by 42 px on the
// first wheel step (clone scroll-free, Chromium, 390). It now animates `scale` and the ground only.
import { describe, expect, it } from "vitest";
import "../../../tests/browser/recipes-root.css";

const frames = (n: number) =>
    new Promise<void>((r) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : r());
        step(n);
    });

describe("title-compact", () => {
    it("keeps the title's layout box and weight while the root scrolls", async () => {
        if (!CSS.supports("animation-timeline: scroll()")) return; // the engine has no scroll timelines: nothing binds
        const host = document.createElement("div");
        host.style.cssText = "inline-size:358px; block-size:4000px";
        host.innerHTML = `<h1 class="text-page-title" style="font: 560 44px/1.05 system-ui; margin:0">USAC Universal Service Fund disbursements by program</h1>`;
        document.body.appendChild(host);
        const h1 = host.querySelector("h1")!;
        try {
            scrollTo(0, 0);
            await frames(3);
            const rest = { h: h1.offsetHeight, w: getComputedStyle(h1).fontWeight, size: getComputedStyle(h1).fontSize };
            scrollTo(0, 300);
            await frames(3);
            const scrolled = { h: h1.offsetHeight, w: getComputedStyle(h1).fontWeight, size: getComputedStyle(h1).fontSize };
            expect(scrolled).toEqual(rest);
            expect(getComputedStyle(h1).scale).not.toBe("1");
        } finally {
            host.remove();
            scrollTo(0, 0);
        }
    });
});
