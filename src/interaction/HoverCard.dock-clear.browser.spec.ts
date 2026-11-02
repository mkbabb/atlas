// U/B8 A5: the hover card is fixed in the viewport and so is the platform dock, and the card used to
// seat with no idea where the dock was, so near the bottom bar it sat on it. The dock now binds its
// root to the shell's dock-rect source (`provideDockRect`, SiteShell), and the card seats clear of
// that rect by `AVOID_GAP`. The fixture stands in for the shell: it provides the source and binds a
// fixed bar, so the spec reads the wiring, not the dock's own layout.
import "../../tests/browser/utilities.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, onMounted, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import HoverCard from "./HoverCard.vue";
import { AVOID_GAP } from "./useCardPlacement.js";
import { useHoverReadout } from "../platform/stores/useHoverReadout.js";
import { useSelection } from "../platform/stores/useSelection.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";
import { provideDockRect } from "../platform/chrome/dock/composables/useDockRect.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});
const frames = (n = 4) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });

describe("the hover card seats clear of the platform dock", () => {
    it("does not sit on, or flush against, the bound dock", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        const bar = ref<HTMLElement | null>(null);
        const show = ref(false);
        const el = document.createElement("div");
        document.body.appendChild(el);
        // A bottom bar the full width of the viewport less 1rem gutters, 120 px tall.
        const Shell = defineComponent({
            setup() {
                const dock = provideDockRect();
                onMounted(() => dock.bind(bar.value));
                return () => [
                    h("div", {
                        ref: bar,
                        "data-testid": "fixture-dock",
                        style: "position:fixed;left:16px;right:16px;bottom:16px;height:120px",
                    }),
                    show.value ? h(HoverCard) : null,
                ];
            },
        });
        const app = createApp(Shell);
        app.use(pinia).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        const readout = app.runWithContext(() => useHoverReadout(pinia));
        // The anchor sits just above the bar: below-right would run onto it.
        const dockTop = innerHeight - 16 - 120;
        const anchor = { x: Math.round(innerWidth / 2) - 100, y: dockTop - 60 };
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
        show.value = true;
        await nextTick();
        await frames();
        const card = document.querySelector<HTMLElement>('[data-testid="hover-card"]');
        expect(card, "the card opened").not.toBeNull();
        const r = card!.getBoundingClientRect();
        const d = bar.value!.getBoundingClientRect();
        const clear =
            r.right <= d.left - AVOID_GAP ||
            r.left >= d.right + AVOID_GAP ||
            r.bottom <= d.top - AVOID_GAP + 0.5 ||
            r.top >= d.bottom + AVOID_GAP;
        expect(clear, `card ${[r.left, r.top, r.width, r.height].map(Math.round)} vs dock top ${Math.round(d.top)}`).toBe(true);
        const coversAnchor = anchor.x >= r.left && anchor.x <= r.right && anchor.y >= r.top && anchor.y <= r.bottom;
        expect(coversAnchor).toBe(false);
    });
});
