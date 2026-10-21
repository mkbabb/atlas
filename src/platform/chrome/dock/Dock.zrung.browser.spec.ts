// REGISTRY 119 in a real engine (U RULINGS §N N-1). The dock is a fixed box; the content stage
// (`main`) is positioned at `--z-content`. A fixed box with `z-index: auto` paints beneath that
// stage, so `main` took every pointer hit over the dock: the 390 crest could not be tapped in 48 of
// 48 B6 walk cells, and at 1440 no rung of the open rail could be pressed. The dock carries its own
// rung (`--z-dock`), above the stage and below the overlays.
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, defineComponent, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import PlatformShell from "../shell/PlatformShell.vue";
import { DASHBOARD_KEY, type DashboardContext } from "../../../contract/index.js";
import { installDashboardRegistry } from "../../../contract/registry-inject.js";
import "../../../design/tokens/elevation.css";

const BEATS = ["beat-a", "beat-b", "beat-c"];
const ctx = {
    id: "z119",
    title: "Z rung",
    brand: "Z",
    flagshipRoute: "/z119",
    nav: BEATS.map((id) => ({ kind: "beat", id, label: id, icon: { render: () => null } })),
} as unknown as DashboardContext;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let done: (() => void) | null = null;
afterEach(() => {
    done?.();
    done = null;
});

async function mount(width: number) {
    await page.viewport(width, 844);
    // glass-ui's stage rung (`--z-content`, 10), which the shell's `main` reads.
    const tokens = document.createElement("style");
    tokens.textContent = ":root{--z-content:10}";
    document.head.appendChild(tokens);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(
        defineComponent({
            setup: () => () =>
                h(PlatformShell, null, {
                    // The stage carries real content under the dock's box, as every route does.
                    default: () =>
                        BEATS.map((id) =>
                            h("section", { id, style: "height:1600px;background:#eee" }, [
                                h("button", { type: "button", style: "width:100%;height:200px" }, id),
                            ]),
                        ),
                }),
        }),
    );
    app.provide(DASHBOARD_KEY, ctx);
    app.use(createPinia());
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:slug?", component: { render: () => null } }],
    });
    app.use(router);
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    await router.push("/z119");
    app.mount(host);
    await wait(400);
    done = () => {
        app.unmount();
        host.remove();
        tokens.remove();
    };
}

const dock = () => document.querySelector<HTMLElement>("[data-testid='dock']")!;
const crest = () => document.querySelector<HTMLElement>("[data-testid='dock-brand']")!;

function hitsDock(el: HTMLElement): boolean {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return Boolean(hit && dock().contains(hit));
}

describe("the dock rides its own z rung above the content stage (REGISTRY 119)", () => {
    for (const width of [390, 1440]) {
        it(`at ${width} px a point on the crest hits the crest, not main`, async () => {
            await mount(width);
            expect(getComputedStyle(dock()).position).toBe("fixed");
            expect(getComputedStyle(dock()).zIndex).toBe("40");
            expect(hitsDock(crest())).toBe(true);
        });
    }

    it("at 390 px a tap on the crest opens the section sheet", async () => {
        await mount(390);
        await userEvent.click(crest(), { timeout: 2000 });
        await wait(300);
        expect(crest().getAttribute("aria-expanded")).toBe("true");
    });
});
