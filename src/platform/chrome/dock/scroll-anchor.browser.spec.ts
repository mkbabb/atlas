// A section jump lands where it was sent (U/B7d M2). Measured in WebKit 2287 on the Sections select: on
// the first jump after a load, focus moving as the list closed stopped the smooth scroll 360-381 px
// short of Sources, at y 3,779-3,800 of 4,160, with `?at=four` written and the label on section 3. The
// browser fires `scrollend` there and nothing else moves the page. A scroll that the reader did not
// stop resumes once; a reader's wheel or key stops the leg for good.
import { afterEach, describe, expect, it } from "vitest";
import { scrollToSection } from "./scroll-anchor.js";

const frames = (n: number) =>
    new Promise<void>((done) => {
        const step = () => (n-- > 0 ? requestAnimationFrame(step) : done());
        step();
    });
async function restsAt(want: () => number, ms = 4000): Promise<boolean> {
    const end = performance.now() + ms;
    let last = NaN;
    let still = 0;
    while (performance.now() < end) {
        await frames(1);
        still = scrollY === last ? still + 1 : 0;
        last = scrollY;
        if (still > 20) break;
    }
    return Math.abs(scrollY - want()) <= 4;
}

let host: HTMLElement | null = null;
function page(): HTMLElement {
    host = document.createElement("div");
    for (const id of ["a", "b", "c", "d"]) {
        const s = document.createElement("section");
        s.id = id;
        s.style.blockSize = "1600px";
        host.append(s);
    }
    document.body.append(host);
    window.scrollTo({ top: 0, behavior: "instant" });
    return document.getElementById("d")!;
}
afterEach(() => {
    host?.remove();
    host = null;
    window.scrollTo({ top: 0, behavior: "instant" });
});

/** Stop the smooth scroll mid-flight, as a focus move does, without any reader input. */
async function interruptMidFlight(): Promise<void> {
    while (scrollY < 200) await frames(1);
    window.scrollTo({ top: scrollY, behavior: "instant" });
}

describe("scrollToSection", () => {
    it("resumes a leg that something other than the reader stopped short", async () => {
        const d = page();
        const want = () => d.getBoundingClientRect().top + scrollY;
        const cancel = scrollToSection("d");
        await interruptMidFlight();
        expect(await restsAt(want), `rest at ${scrollY}, target ${want()}`).toBe(true);
        cancel();
    });

    it("does not resume a leg the reader's wheel stopped", async () => {
        const d = page();
        const want = () => d.getBoundingClientRect().top + scrollY;
        const cancel = scrollToSection("d");
        while (scrollY < 200) await frames(1);
        window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
        // Firefox carries a smooth scroll past one instant scroll: hold the page until it gives up
        const held = scrollY;
        for (let i = 0; i < 60; i++) {
            window.scrollTo({ top: held, behavior: "instant" });
            await frames(1);
        }
        expect(await restsAt(want), "the reader keeps the page").toBe(false);
        cancel();
    });
});
