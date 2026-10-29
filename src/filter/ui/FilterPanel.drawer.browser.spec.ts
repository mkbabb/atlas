// FI-02, FI-04 (U/B7c M2): at ≥ 768 px the Filters drawer floats from the top right, never full width
// or full height, and the dock's Filters control is a toggle that closes it.
//
// Measured on the served build before this cure (PL head 079743b6, Chromium, 1440 × 900): the open
// drawer was 1440 × 900, the whole viewport. Glass sizes a detented side sheet as its rung times
// 100dvw ("THE DETENT IS A SIZE"), and the continuum's drawer rung is 1, so the drawer took the full
// width; it also covered the dock, so the rail's Filters control could not be pressed to close it.
import "../../../tests/browser/glass-root.css";
import "../../design/tokens/space.css";
import "../../design/tokens/elevation.css";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, provide, ref } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter, useRoute } from "vue-router";
import SiteShell from "../../platform/chrome/shell/SiteShell.vue";
import PlatformShell from "../../platform/chrome/shell/PlatformShell.vue";
import FilterPanel from "./FilterPanel.vue";
import { useFilterPane } from "../composables/useFilterPane.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mkbabb/glass-ui/select";
import { DASHBOARD_KEY, installDashboardRegistry, type DashboardContext } from "../../contract/index.js";
import { makeRegistry } from "../../../tests/browser/mount-site.js";
import { atRest } from "../../../tests/browser/at-rest.js";

const picked = ref("");
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(pred: () => boolean, ms = 1500): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}
const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const isOpen = () => q("[data-testid='dock-filter-trigger']")?.getAttribute("aria-expanded") === "true";

function contextFor(slug: string): DashboardContext {
    return {
        id: slug,
        title: "School Connectivity Initiative",
        brand: "SCI",
        flagshipRoute: `/${slug}`,
        selectionKey: slug,
        hasMultiYear: false,
        filterBody: {
            render: () =>
                h("div", null, [
                    ...Array.from({ length: 4 }, (_, i) => h("button", { type: "button", "data-testid": `filter-body-control-${i}` }, `Region ${i}`)),
                    h(Select, { modelValue: picked.value, "onUpdate:modelValue": (v: unknown) => void (picked.value = String(v)) }, {
                        default: () => [
                            h(SelectTrigger, { "data-testid": "filter-body-select", "aria-label": "Window" }, { default: () => h(SelectValue, { placeholder: "All windows" }) }),
                            h(SelectContent, null, { default: () => ["one", "two", "three"].map((v) => h(SelectItem, { value: v, "data-testid": `filter-body-option-${v}` }, { default: () => v })) }),
                        ],
                    }),
                ]),
        },
        nav: ["one", "two"].map((id) => ({ kind: "beat", id, label: id, icon: { render: () => null } })),
    } as unknown as DashboardContext;
}

const Route = defineComponent({
    setup() {
        const ctx = contextFor(String(useRoute().params.slug));
        provide(DASHBOARD_KEY, ctx);
        return () =>
            h(PlatformShell, null, {
                default: () => [
                    h("section", { id: "one", class: "essay-beat", style: "min-height:1400px" }, [h("h2", null, "one")]),
                    h("section", { id: "two", class: "essay-beat", style: "min-height:1400px" }, [h("h2", null, "two")]),
                ],
                filter: () => h(FilterPanel, { body: ctx.filterBody }),
            });
    },
});

let unmount: (() => void) | null = null;
afterEach(async () => {
    for (let i = 0; i < 3; i++) await userEvent.keyboard("{Escape}");
    unmount?.();
    unmount = null;
    useFilterPane().open.value = false;
});

async function mount(width: number, height = 900): Promise<void> {
    await page.viewport(width, height);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const { registry } = makeRegistry();
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", name: "gallery", component: { render: () => h("main", { id: "main-content" }) } },
            { path: "/:slug/:view?", name: "dashboard", component: Route },
        ],
    });
    const app = createApp(defineComponent({ setup: () => () => h(SiteShell) }));
    installDashboardRegistry(app, registry);
    app.use(createPinia()).use(router);
    await router.push("/sci");
    await router.isReady();
    app.mount(host);
    await sleep(600);
    unmount = () => {
        app.unmount();
        host.remove();
        window.scrollTo(0, 0);
    };
}

/** Press the rail's Filters control the reader's way: the crest opens the rail, then the control. */
async function pressTrigger(): Promise<void> {
    q("[data-testid='dock-brand']")?.focus();
    await until(() => (q("[data-testid='dock-filter-trigger']")?.getClientRects().length ?? 0) > 0, 1200);
    await sleep(250);
    const t = q("[data-testid='dock-filter-trigger']");
    if (!t) throw new Error(`no trigger; dock: ${[...document.querySelectorAll("[data-testid]")].map((e) => (e as HTMLElement).dataset.testid).join(",")}; path ${location.pathname}`);
    t.focus({ preventScroll: true });
    const r = t.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit && (hit === t || t.contains(hit))) await userEvent.click(t);
    else await userEvent.keyboard("{Enter}");
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024]] as const) {
    describe(`the Filters drawer at ${width} × ${height}`, () => {
        it("floats from the top right: narrower than the page, shorter than the viewport, inset from both edges", async () => {
            await mount(width, height);
            await pressTrigger();
            expect(await until(isOpen)).toBe(true);
            expect(await atRest("[data-slot='sheet-content']")).toBe(true);
            const r = q(".cp-drawer")!.getBoundingClientRect();
            expect(r.width, "width").toBeLessThanOrEqual(26 * 16 + 1);
            expect(r.width, "width").toBeGreaterThanOrEqual(20 * 16);
            expect(r.right, "inset from the right edge").toBeLessThanOrEqual(width - 8);
            expect(r.top, "inset from the top edge").toBeGreaterThanOrEqual(8);
            expect(r.bottom, "inset from the bottom edge").toBeLessThanOrEqual(height - 8);
            expect(r.height, "never full height").toBeLessThan(height);
            // the body's controls are inside the drawer and the viewport
            for (const c of document.querySelectorAll<HTMLElement>("[data-testid^='filter-body-control-']")) {
                const b = c.getBoundingClientRect();
                expect(b.left).toBeGreaterThanOrEqual(r.left);
                expect(b.right).toBeLessThanOrEqual(r.right);
            }
        });

        it("stays open when a value is chosen from a Select in its body (FI-04)", async () => {
            await mount(width, height);
            await pressTrigger();
            expect(await until(isOpen)).toBe(true);
            expect(await atRest("[data-slot='sheet-content']")).toBe(true);
            await userEvent.click(q("[data-testid='filter-body-select']")!);
            expect(await until(() => !!q("[data-testid='filter-body-option-two']"))).toBe(true);
            await sleep(300);
            await userEvent.click(q("[data-testid='filter-body-option-two']")!);
            await sleep(900);
            expect(picked.value).toBe("two");
            expect(isOpen(), "the drawer is still open after the choice").toBe(true);
            expect(q("#filter-drawer-body")?.checkVisibility()).toBe(true);
        });

        it("the dock's Filters control is a toggle: pressed again, it closes the drawer", async () => {
            await mount(width, height);
            await pressTrigger();
            expect(await until(isOpen)).toBe(true);
            expect(await atRest("[data-slot='sheet-content']")).toBe(true);
            await pressTrigger();
            expect(await until(() => !isOpen())).toBe(true);
            expect(q("#filter-drawer-body")?.checkVisibility()).toBe(false);
        });
    });
}
