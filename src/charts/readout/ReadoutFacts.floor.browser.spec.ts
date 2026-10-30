// U/B7d M3 repair 1 · T-02: the readout's figure is one golden step below the card figure token, which
// is 11.87 px at the token's 1.2rem. Once the /sci school-year facts took their width, that is reader
// text under the 12 px floor.
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import ReadoutFacts from "./ReadoutFacts.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

describe("the readout figure", () => {
    it("holds the 12 px floor under a card token that would put it at 11.87 px", async () => {
        const el = document.createElement("div");
        el.style.cssText = "width:400px;--type-figure-card:1.2rem";
        document.body.appendChild(el);
        const app = createApp({ render: () => h(ReadoutFacts, { facts: [{ label: "School units", value: "302" }] }) });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        await nextTick();
        const figure = el.querySelector<HTMLElement>(".figure-slug-card")!;
        expect(parseFloat(getComputedStyle(figure).fontSize)).toBeGreaterThanOrEqual(12);
    });

    it("is never smaller than its own label", async () => {
        const el = document.createElement("div");
        el.style.cssText = "width:400px;--type-figure-card:1.2rem;--type-caption:16px";
        document.body.appendChild(el);
        const app = createApp({ render: () => h(ReadoutFacts, { facts: [{ label: "School units", value: "302" }] }) });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        await nextTick();
        const figure = el.querySelector<HTMLElement>(".figure-slug-card")!;
        const label = el.querySelector<HTMLElement>(".readout-facts__label")!;
        expect(parseFloat(getComputedStyle(figure).fontSize)).toBeGreaterThanOrEqual(parseFloat(getComputedStyle(label).fontSize));
    });
});
