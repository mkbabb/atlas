// N-5 / N-W2 (U/B8, REPORT-B7E §6): a /usf map tap at 390 also filters every figure to the tapped
// state, the page above the map grows, and the reader's place moved 289 px; in WebKit Escape left the
// page 290 px off. A change to the selection now holds the figure the reader acted on where it was on
// screen until the layout settles, on the pick and on the clear. `overflow-anchor: none` stands for
// an engine whose scroll anchoring does not hold the figure (WebKit, N-W2); the second case leaves the
// engine's anchoring on.
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSelection } from "./useSelection.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
    window.scrollTo(0, 0);
});
const frames = (n: number) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });

function page(anchoring: boolean) {
    const root = document.createElement("div");
    root.innerHTML = `
        <div data-testid="above" style="height:1200px"></div>
        <div data-viz-plate="map" style="height:400px">
            <button data-testid="mark" style="width:40px;height:40px">A</button>
        </div>
        <div style="height:2400px"></div>`;
    document.body.appendChild(root);
    const was = document.documentElement.style.overflowAnchor;
    if (!anchoring) document.documentElement.style.overflowAnchor = "none";
    cleanups.push(() => {
        root.remove();
        document.documentElement.style.overflowAnchor = was;
    });
    const q = (id: string) => root.querySelector<HTMLElement>(`[data-testid='${id}']`)!;
    return { above: q("above"), mark: q("mark"), plate: root.querySelector<HTMLElement>("[data-viz-plate]")! };
}

for (const anchoring of [false, true]) {
    describe(`a selection holds the reader's figure (engine anchoring ${anchoring ? "on" : "off"})`, () => {
        it("keeps the figure where it was through the reflow a pick sets off, and again on the clear", async () => {
            setActivePinia(createPinia());
            const selection = useSelection();
            const { above, mark, plate } = page(anchoring);
            window.scrollTo(0, 1000);
            await frames(2);
            const y0 = window.scrollY;
            const top0 = plate.getBoundingClientRect().top;
            mark.focus({ preventScroll: true });

            // The pick; the route's filter then grows the page above the figure a tick later.
            selection.select("state:05");
            await nextTick();
            above.style.height = "1500px";
            await frames(20);
            expect(Math.round(plate.getBoundingClientRect().top)).toBe(Math.round(top0));

            // The clear; the filter lifts and the page above shrinks back.
            selection.clearSelection();
            await nextTick();
            above.style.height = "1200px";
            await frames(20);
            expect(Math.round(plate.getBoundingClientRect().top)).toBe(Math.round(top0));
            expect(Math.round(window.scrollY)).toBe(Math.round(y0));
        });

        it.skipIf(anchoring)("never fights the reader: input ends the hold", async () => {
            setActivePinia(createPinia());
            const selection = useSelection();
            const { above, mark, plate } = page(anchoring);
            window.scrollTo(0, 1000);
            await frames(2);
            mark.focus({ preventScroll: true });
            selection.select("state:05");
            // The reader scrolls: the hold lets go at the first input.
            window.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
            await frames(2);
            const top = plate.getBoundingClientRect().top;
            above.style.height = "1300px";
            await frames(12);
            // Released, the hold no longer pulls the page: the figure moves with the reflow.
            expect(Math.round(plate.getBoundingClientRect().top - top)).toBe(100);
        });
    });
}
