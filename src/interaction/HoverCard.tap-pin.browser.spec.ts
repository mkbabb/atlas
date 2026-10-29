// O-13 on the phone (U/B7c C1): a tap on a mark that is not an entity pins its readout. Before, the
// phone register suppressed the hover card and only an entity tap had a readout (EntityDetail), so a
// tier band, a period or a cohort bar showed nothing. The phone register is the `phoneTouch` media
// query; the spec answers it as a phone does.
import "../../tests/browser/utilities.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import HoverCard from "./HoverCard.vue";
import { useHoverReadout } from "../platform/stores/useHoverReadout.js";
import { useSelection } from "../platform/stores/useSelection.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";
import { MQ } from "../design/foundations/breakpoints.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

const frames = (n = 3) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });
const card = () => document.querySelector<HTMLElement>('[data-testid="hover-card"]');

function phone(): void {
    const real = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) =>
        query === MQ.phoneTouch
            ? ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
            : real(query)) as typeof window.matchMedia;
    cleanups.push(() => (window.matchMedia = real));
}

function touch(type: "pointerdown" | "pointerup", x: number, y: number, target: EventTarget = document.body): void {
    target.dispatchEvent(new PointerEvent(type, { pointerType: "touch", clientX: x, clientY: y, bubbles: true }));
}

function mount() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const app = createApp(defineComponent({ setup: () => () => h(HoverCard) }));
    app.use(pinia).use(router);
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.mount(el);
    cleanups.push(() => {
        app.unmount();
        el.remove();
    });
    return { readout: useHoverReadout(pinia), selection: useSelection(pinia) };
}

/** A plate's tap on a band: the touch lands a readout, then the pointer leaves (the plate clears). */
async function tapBand(stores: ReturnType<typeof mount>, x: number, y: number, moveBy = 0) {
    touch("pointerdown", x, y);
    stores.selection.hover("tier:500", "band-cake");
    stores.readout.publish({
        origin: "band-cake",
        title: "500 Mbps to 1 Gbps",
        facts: [{ label: "School units", value: "62" }],
        anchor: { x, y },
        density: "compact",
    });
    await nextTick();
    touch("pointerup", x + moveBy, y);
    stores.selection.hover(null, "band-cake");
    stores.readout.clear("band-cake");
    await frames();
}

describe("HoverCard on the phone: a tap pins a mark that is not an entity", () => {
    it("pins the tapped band's card, keeps it after the plate clears, and a tap elsewhere releases it", async () => {
        phone();
        const stores = mount();
        await nextTick();
        await tapBand(stores, 160, 300);
        expect(card(), "the pinned card").not.toBeNull();
        expect(card()!.textContent).toContain("500 Mbps to 1 Gbps");
        expect(card()!.textContent).toContain("Tap elsewhere to close");
        expect(card()!.hasAttribute("data-tap-pinned")).toBe(true);
        touch("pointerdown", 20, 700);
        touch("pointerup", 20, 700);
        await frames();
        expect(card(), "released by a tap elsewhere").toBeNull();
    });

    it("a touch that moves (a scroll) pins nothing", async () => {
        phone();
        const stores = mount();
        await nextTick();
        await tapBand(stores, 160, 300, 60);
        expect(card()).toBeNull();
    });
});
