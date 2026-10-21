// useDockStepper in a real engine: U-F60 clause 3 (U RULINGS §K K-3) under U/B7 S-6. `?at` is written
// only by a section control (section-pager.browser.spec.ts). The dock seeds the first beat, the
// observer re-fires while the body lays out, a linked anchor is restored, a program scroll moves the
// page, and a reader's key-press scroll moves it too: none of these writes the URL.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, ref } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { useDockStepper } from "./useDockStepper";
import type { DashboardContext } from "../../../../contract/index.js";
import { installDashboardRegistry } from "../../../../contract/registry-inject.js";

const BEATS = ["beat-a", "beat-b", "beat-c", "beat-d"];
const ctx = {
    id: "k3",
    title: "K-3",
    brand: "K",
    flagshipRoute: "/k3",
    nav: BEATS.map((id) => ({ kind: "beat", id, label: id, icon: { render: () => null } })),
} as unknown as DashboardContext;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mount() {
    const host = document.createElement("div");
    for (const id of BEATS) {
        const section = document.createElement("section");
        section.id = id;
        section.style.height = "1400px";
        host.appendChild(section);
    }
    document.body.appendChild(host);
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    const progress = ref(0);
    const app = createApp(
        defineComponent({
            setup() {
                useDockStepper(ctx, progress);
                return () => h("span");
            },
        }),
    );
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    // A memory router: the stores read the route, and it never touches `location`.
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] }));
    app.use(createPinia());
    app.mount(probe);
    return () => {
        app.unmount();
        probe.remove();
        host.remove();
    };
}

let done: (() => void) | null = null;
const startSearch = location.search;
afterEach(() => {
    done?.();
    done = null;
    history.replaceState(history.state, "", `${location.pathname}${startSearch}`);
    window.scrollTo(0, 0);
});

const atParam = () => new URLSearchParams(location.search).get("at");

describe("the dock's ?at writer waits for a reader act (K-3)", () => {
    // Runs first: the reader-act latch is per document and this case needs it unarmed.
    it("a linked anchor is restored and left as the link gave it, step included", async () => {
        history.replaceState(history.state, "", `${location.pathname}${startSearch ? `${startSearch}&` : "?"}at=beat-c.missing-step`);
        const before = location.href;
        done = mount();
        await wait(1800); // the restore's 700 ms settle, then the 300 ms anchor settle, with margin
        expect(document.getElementById("beat-c")!.getBoundingClientRect().top).toBeLessThan(5);
        expect(location.href).toBe(before);
    });

    it("load, a program scroll and a reader's key-press scroll write nothing", async () => {
        const before = location.href;
        done = mount();
        await wait(700);
        expect(location.href).toBe(before);
        window.scrollTo(0, 2 * 1400 + 50); // program scroll onto beat-c: not a reader act
        await wait(900);
        expect(atParam()).toBeNull();
        expect(location.href).toBe(before);

        await userEvent.keyboard("{End}"); // a trusted key: the reader scrolls to the last beat
        await wait(1200);
        expect(atParam()).toBeNull();
        expect(location.href).toBe(before);
    });
});
