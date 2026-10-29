// F-14 (U/B7c L): the hover card takes the pointer, so it must never seat over it, or the next click
// lands on the card instead of the mark. Sites mount the card lazily on the first publish
// (DashboardView `v-if="readOnce"`), after the pointer has stopped moving, so the card cannot learn the
// pointer from its own listener: the readout store, which every publisher creates at setup, tracks it.
import "../../tests/browser/utilities.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import HoverCard from "./HoverCard.vue";
import { useHoverReadout } from "../platform/stores/useHoverReadout.js";
import { useSelection } from "../platform/stores/useSelection.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});
const frames = (n = 4) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });

describe("the first hover card seats clear of the pointer", () => {
    it("a card mounted on the first publish does not cover the pointer that raised it", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        const show = ref(false);
        const el = document.createElement("div");
        document.body.appendChild(el);
        const app = createApp(defineComponent({ setup: () => () => (show.value ? h(HoverCard) : null) }));
        app.use(pinia).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        // The publisher's setup creates the store; the pointer then moves onto the mark.
        const readout = app.runWithContext(() => useHoverReadout(pinia));
        const anchor = { x: Math.round(innerWidth / 2) - 100, y: 160 };
        const pointer = { x: anchor.x + 60, y: anchor.y + 60 };
        window.dispatchEvent(new PointerEvent("pointermove", { clientX: pointer.x, clientY: pointer.y, bubbles: true }));
        app.runWithContext(() => useSelection(pinia)).hover("district:73A", "map");
        readout.publish({
            origin: "map",
            title: "Bethel Hill Charter School",
            facts: [
                { label: "Contracted bandwidth", value: "250 Mbps" },
                { label: "Enrollment (ADM)", value: "344" },
            ],
            anchor,
            density: "compact",
        });
        show.value = true; // the lazy card mounts now, after the pointer stopped
        await nextTick();
        await frames();
        const card = document.querySelector<HTMLElement>('[data-testid="hover-card"]');
        expect(card, "the card opened").not.toBeNull();
        const r = card!.getBoundingClientRect();
        const covers = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
        expect(covers, `card ${[r.left, r.top, r.width, r.height].map(Math.round)} over pointer ${pointer.x},${pointer.y}`).toBe(false);
    });
});
