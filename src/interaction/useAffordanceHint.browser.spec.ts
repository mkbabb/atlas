// U/B8 DV repair 1: the first-viz affordance lift obeys the atlas entrance law (motion/useFirstView).
// It plays once, after the first plate has been in view for the dwell; a plate the reader scrolls
// past does not use it up; on a deep-linked page it waits for the restore to land. Fails before: the
// hint armed a raw IntersectionObserver and lifted on its first hit, with no dwell and no hold.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { useAffordanceHint } from "./useAffordanceHint";
import { FIRST_VIEW_DWELL_MS } from "../motion/useFirstView";
import { beginNarrativeRestore, resetNarrativeLanding, settleNarrativeRestore } from "../motion/narrative-restore";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LIFT = "data-affordance-lift";
const cleanups: Array<() => void> = [];

beforeEach(() => {
    sessionStorage.removeItem("atlas:affordance-hint");
    resetNarrativeLanding(false);
});
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
    sessionStorage.removeItem("atlas:affordance-hint");
    resetNarrativeLanding(false);
    window.scrollTo(0, 0);
});

/** A page with one plate `offset` px down, and the hint mounted. Records every lift. */
function mount(offset: number) {
    const page = document.createElement("div");
    page.style.cssText = `position:relative;block-size:${offset + 4000}px`;
    const plate = document.createElement("div");
    plate.setAttribute("data-viz-plate", "");
    plate.style.cssText = `position:absolute;inset-block-start:${offset}px;inset-inline:0;block-size:300px`;
    page.appendChild(plate);
    document.body.appendChild(page);
    const lifts: number[] = [];
    const seen = new MutationObserver(() => {
        if (plate.hasAttribute(LIFT)) lifts.push(performance.now());
    });
    seen.observe(plate, { attributes: true, attributeFilter: [LIFT] });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(defineComponent({ setup: () => (useAffordanceHint(), () => h("span")) }));
    app.mount(host);
    cleanups.push(() => {
        seen.disconnect();
        app.unmount();
        host.remove();
        page.remove();
    });
    return { plate, lifts };
}

describe("the affordance lift under the entrance law", () => {
    it("waits for the dwell, then lifts once", async () => {
        const { lifts } = mount(0);
        await sleep(FIRST_VIEW_DWELL_MS - 70);
        expect(lifts).toHaveLength(0);
        await sleep(400);
        expect(lifts).toHaveLength(1);
        expect(sessionStorage.getItem("atlas:affordance-hint")).toBe("1");
    });

    it("a plate the reader scrolls past does not spend the lift", async () => {
        const { lifts } = mount(2000);
        await sleep(100);
        window.scrollTo(0, 1900); // the plate comes into view…
        await sleep(40);
        window.scrollTo(0, 0); // …and leaves before the dwell ends
        await sleep(400);
        expect(lifts).toHaveLength(0);
        window.scrollTo(0, 1900);
        await sleep(400);
        expect(lifts).toHaveLength(1);
    });

    it("on a deep-linked page, holds until the restore lands", async () => {
        beginNarrativeRestore();
        const { lifts } = mount(0);
        await sleep(500);
        expect(lifts).toHaveLength(0);
        settleNarrativeRestore({ beatId: "x" }, { aborted: false });
        await sleep(400);
        expect(lifts).toHaveLength(1);
    });
});
