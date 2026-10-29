// F9 (U/B7c C1): the document scroll scalar costs one listener and one `scrollY` read per scroll
// event, however many callers it has. Before, each caller ran vueuse's `useWindowScroll`, whose
// handler read the root's computed style and four box metrics per event (its arrived state), once
// per caller: forced style and layout in the scroll path.
import { afterEach, describe, expect, it } from "vitest";
import { effectScope, nextTick } from "vue";
import { useDocumentScrollProgress } from "./useScrollProgress";

const frames = (n = 2) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

describe("useDocumentScrollProgress", () => {
    it("shares one scroll listener and reads no computed style while the page scrolls", async () => {
        const tall = document.createElement("div");
        tall.style.height = "4000px";
        document.body.appendChild(tall);
        cleanups.push(() => tall.remove());

        const realAdd = window.addEventListener.bind(window);
        let scrollListeners = 0;
        window.addEventListener = ((type: string, ...rest: unknown[]) => {
            if (type === "scroll") scrollListeners++;
            return (realAdd as (...a: unknown[]) => void)(type, ...rest);
        }) as typeof window.addEventListener;
        cleanups.push(() => (window.addEventListener = realAdd));

        const scope = effectScope();
        const scalars = scope.run(() => [1, 2, 3, 4].map(() => useDocumentScrollProgress()))!;
        cleanups.push(() => scope.stop());
        for (const s of scalars) expect(s.value).toBe(0);
        expect(scrollListeners, "one scroll listener for four callers").toBe(1);

        const realStyle = window.getComputedStyle.bind(window);
        let styleReads = 0;
        window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
            styleReads++;
            return realStyle(el, pseudo);
        }) as typeof window.getComputedStyle;
        cleanups.push(() => (window.getComputedStyle = realStyle));

        window.scrollTo(0, 1200);
        await frames();
        await nextTick();
        const read = scalars.map((s) => s.value);
        expect(styleReads, "computed-style reads in the scroll path").toBe(0);
        expect(read[0]).toBeGreaterThan(0);
        expect(new Set(read).size, "every caller reads the same scalar").toBe(1);
        window.scrollTo(0, 0);
    });
});
