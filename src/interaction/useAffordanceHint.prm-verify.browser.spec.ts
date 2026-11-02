// U/B8 DV verify 2: the PRM fence the repair claims — a reader who switches to reduced motion while
// the first plate waits for its dwell gets no lift; one already in reduced motion gets none either.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { useAffordanceHint } from "./useAffordanceHint";
import { FIRST_VIEW_DWELL_MS } from "../motion/useFirstView";
import { resetNarrativeLanding } from "../motion/narrative-restore";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const realMatchMedia = window.matchMedia.bind(window);
let reduce = false;
const listeners = new Set<(e: { matches: boolean; media: string }) => void>();
const Q = "(prefers-reduced-motion: reduce)";
function fakeMatchMedia(q: string) {
    if (!q.includes("prefers-reduced-motion")) return realMatchMedia(q);
    const matches = q.includes("reduce") ? reduce : !reduce;
    return {
        matches, media: q, onchange: null,
        addEventListener: (_: string, f: any) => listeners.add(f),
        removeEventListener: (_: string, f: any) => listeners.delete(f),
        addListener: (f: any) => listeners.add(f), removeListener: (f: any) => listeners.delete(f),
        dispatchEvent: () => true,
    } as unknown as MediaQueryList;
}
const cleanups: Array<() => void> = [];
beforeEach(() => {
    reduce = false; listeners.clear();
    (window as any).matchMedia = fakeMatchMedia;
    sessionStorage.removeItem("atlas:affordance-hint");
    resetNarrativeLanding(false);
});
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
    (window as any).matchMedia = realMatchMedia;
    sessionStorage.removeItem("atlas:affordance-hint");
});
function mount() {
    const plate = document.createElement("div");
    plate.setAttribute("data-viz-plate", "");
    plate.style.cssText = "block-size:300px";
    document.body.appendChild(plate);
    let lifted = 0;
    const mo = new MutationObserver(() => { if (plate.hasAttribute("data-affordance-lift")) lifted++; });
    mo.observe(plate, { attributes: true });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(defineComponent({ setup: () => (useAffordanceHint(), () => h("span")) }));
    app.mount(host);
    cleanups.push(() => { mo.disconnect(); app.unmount(); host.remove(); plate.remove(); });
    return () => lifted;
}
describe("PRM fence (verify)", () => {
    it("control: no PRM lifts", async () => {
        const n = mount(); await sleep(FIRST_VIEW_DWELL_MS + 300); expect(n()).toBe(1);
    });
    it("already reduced: never lifts", async () => {
        reduce = true; const n = mount(); await sleep(FIRST_VIEW_DWELL_MS + 300); expect(n()).toBe(0);
    });
    it("switch to reduced during the dwell: no lift", async () => {
        const n = mount(); await sleep(30);
        reduce = true; for (const f of [...listeners]) f({ matches: true, media: Q } as any);
        await sleep(FIRST_VIEW_DWELL_MS + 300); expect(n()).toBe(0);
    });
});
