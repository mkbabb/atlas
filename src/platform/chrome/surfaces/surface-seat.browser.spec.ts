// One open surface per screen seat (U/B7 PLAN §2.5), in a real engine over the real site frame.
//
// SiteShell mounts the dock; a dashboard route renders PlatformShell with the filter drawer, one
// figure (its plate dock and a mark that selects a unit), and the entity detail. Each test opens one
// surface, then another, through the control a reader uses, and asserts:
//   • the seat holds one open surface: two surfaces of the same seat never stay open together;
//   • a figure dock closes when a seated surface opens, and a seated surface stays when a figure dock
//     opens (the figure dock lives in its plate and takes no seat);
//   • the surface that lost its seat does not pull focus back to its own invoker;
//   • Escape closes the second surface and focus returns to the control that opened it.
// Seats: at 390 the bottom edge holds the dock's sheets (Dashboards, Sections, More), the filter
// drawer and the detail's bottom sheet. At 1440 the right edge holds the filter drawer and the
// detail; the rail's Dashboards list takes no seat, and the rail stays open while the list is open.
//
// A list (a glass Select or the More menu) is modal: it closes on the reader's next tap outside it, and
// that tap reaches nothing else. So after a list the test taps outside first, asserts the list closed,
// then opens the second surface. A control under a non-modal sheet (the phone filter drawer covers the
// page) is reached by keyboard: focus, then Enter.
// The last block is the bottom reserve: the detail's bottom sheet sits above the bar, and the bar
// stays in place under it.
import "../../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, provide } from "vue";
import { createPinia, type Pinia } from "pinia";
import { createMemoryHistory, createRouter, useRoute } from "vue-router";
import SiteShell from "../shell/SiteShell.vue";
import PlatformShell from "../shell/PlatformShell.vue";
import FilterPanel from "../../../filter/ui/FilterPanel.vue";
import { useFilterPane } from "../../../filter/composables/useFilterPane.js";
import SelectionDrilldownPanel from "../../../interaction/SelectionDrilldownPanel.vue";
import PlateDock from "../../../charts/frame/PlateDock.vue";
import { useSelection } from "../../stores/useSelection.js";
import { useEntityDetail, type EntityDescription } from "../../../interaction/describe-entity.js";
import { useSurfaceSeats } from "./useSurfaceSeat.js";
import { DASHBOARD_KEY, installDashboardRegistry, type DashboardContext } from "../../../contract/index.js";
import { makeRegistry } from "../../../../tests/browser/mount-site.js";
import { atRest } from "../../../../tests/browser/at-rest.js";
import "../../../design/tokens/elevation.css";
import "../../../design/tokens/space.css";

const BEATS = ["one", "two", "three", "four"];
const LABELS = ["Bandwidth by unit", "Trend", "Equity", "Sources"];

const PINE: EntityDescription = {
    name: "Pine Springs Preparatory Academy",
    kind: "Charter school",
    ids: [{ label: "LEA", value: "93N", param: "lea" }],
    place: "Wake County",
    measures: [
        { id: "contracted", label: "Contracted bandwidth", value: 250, unit: "Mbps", period: "2025–26", sourceId: "sci", sourceLabel: "SCI feed", stateMedian: 1000, peerMedian: 300, rank: 61, n: 115 },
    ],
    series: [],
} as unknown as EntityDescription;

function contextFor(slug: string): DashboardContext {
    return {
        id: slug,
        title: "School Connectivity Initiative",
        brand: "SCI",
        flagshipRoute: `/${slug}`,
        selectionKey: slug,
        hasMultiYear: false,
        filterBody: { render: () => h("button", { type: "button", "data-testid": "filter-body-control" }, "Region") },
        nav: BEATS.map((id, i) => ({ kind: "beat", id, label: LABELS[i], icon: { render: () => null } })),
    } as unknown as DashboardContext;
}

const SeatRoute = defineComponent({
    setup() {
        const route = useRoute();
        const ctx = contextFor(String(route.params.slug));
        provide(DASHBOARD_KEY, ctx);
        const selection = useSelection();
        return () =>
            h(PlatformShell, null, {
                default: () => [
                    h("section", { id: "one", class: "essay-beat", style: "min-height:900px" }, [
                        h("h2", null, LABELS[0]),
                        h("div", { "data-viz-plate": "", style: "position:relative;block-size:360px;max-inline-size:340px;margin-block-start:96px" }, [
                            h("div", { style: "display:flex;justify-content:flex-end" }, [
                                h(PlateDock, { id: "fig", title: "Bandwidth by unit", enlarge: () => {} }),
                            ]),
                            h("button", { type: "button", "data-testid": "mark", onClick: () => selection.select("district:93N") }, "Pine Springs"),
                        ]),
                    ]),
                    ...BEATS.slice(1).map((id, i) =>
                        h("section", { id, class: "essay-beat", style: "min-height:1400px" }, [h("h2", null, LABELS[i + 1])]),
                    ),
                    h(SelectionDrilldownPanel),
                ],
                filter: () => h(FilterPanel, { body: ctx.filterBody }),
            });
    },
});

let unmount: (() => void) | null = null;
afterEach(async () => {
    for (let i = 0; i < 4; i++) await userEvent.keyboard("{Escape}");
    unmount?.();
    unmount = null;
    // The drawer's open request is a module singleton; it outlives the app.
    useFilterPane().open.value = false;
    await userEvent.hover(document.body).catch(() => {});
});

async function mount(width: number): Promise<Pinia> {
    await page.viewport(width, width < 768 ? 844 : 900);
    const tokens = document.createElement("style");
    tokens.textContent = ":root{--z-content:10;--card:#fffdf8;--background:#faf7f0;--foreground:#1b1b1b}";
    document.head.appendChild(tokens);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const { registry } = makeRegistry();
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", name: "gallery", component: { render: () => h("main", { id: "main-content" }) } },
            { path: "/:slug/:view?", name: "dashboard", component: SeatRoute },
        ],
    });
    const pinia = createPinia();
    const app = createApp(defineComponent({ setup: () => () => h(SiteShell) }));
    installDashboardRegistry(app, registry);
    app.use(pinia).use(router);
    await router.push("/sci");
    await router.isReady();
    app.mount(host);
    useEntityDetail(pinia).register((key) => (key.id === "93N" ? PINE : null));
    await sleep(600);
    unmount = () => {
        app.unmount();
        host.remove();
        tokens.remove();
        window.scrollTo(0, 0);
        history.replaceState(history.state, "", location.pathname);
    };
    return pinia;
}

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
const shown = (el: Element | null) => !!el && el.getClientRects().length > 0;

type Name = "more" | "dashboards" | "sections" | "filters" | "detail" | "figure";
interface Surface {
    /** The control a reader presses to open it. */
    invoker(): HTMLElement | null;
    isOpen(): boolean;
    /** The screen seat it takes at this width; null for a surface that takes none. */
    seat: "right" | "bottom" | null;
    /** A rail control: the rail opens (focus on the crest) before the control is pressed. */
    inRail?: boolean;
    /** A list that closes on any press outside it. */
    list?: boolean;
}

function surfaces(width: number): Partial<Record<Name, Surface>> {
    const phone = width < 768;
    const figure: Surface = {
        invoker: () => q("[data-plate-dock-handle]")?.closest<HTMLElement>("[tabindex]") ?? null,
        isOpen: () => q("[data-plate-dock][data-expanded]") !== null,
        seat: null,
    };
    const detail: Surface = {
        invoker: () => q("[data-testid='mark']"),
        isOpen: () => shown(q("[data-testid='entity-detail']")),
        seat: phone ? "bottom" : "right",
    };
    const filters: Surface = {
        invoker: () => q("[data-testid='dock-filter-trigger']"),
        isOpen: () => q("[data-testid='dock-filter-trigger']")?.getAttribute("aria-expanded") === "true",
        seat: phone ? "bottom" : "right",
        inRail: !phone,
    };
    const dashboards: Surface = {
        invoker: () => q("[data-testid='dock-dashboards']"),
        isOpen: () => shown(q("[data-testid='dock-dashboards-list']")),
        seat: phone ? "bottom" : null,
        inRail: !phone,
        list: true,
    };
    if (!phone) return { dashboards, filters, detail, figure };
    return {
        more: {
            invoker: () => q("[data-testid='dock-gear']"),
            isOpen: () => shown(q(".usf-dock-settings")),
            seat: "bottom",
            list: true,
        },
        dashboards,
        sections: {
            invoker: () => q("[data-testid='dock-section-select']"),
            isOpen: () => shown(q("[data-testid^='dock-section-option-']")),
            seat: "bottom",
            list: true,
        },
        filters,
        detail,
        figure,
    };
}

/** True when a press at the control's centre lands on the control. */
function hittable(el: HTMLElement): boolean {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (el === hit || el.contains(hit)) && getComputedStyle(hit).pointerEvents !== "none";
}

/** Where focus is, for a failure message. */
function focusName(): string {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return "body";
    return a.dataset.testid ?? a.getAttribute("aria-label") ?? a.tagName.toLowerCase();
}

/** Close a list the reader's way: a tap on the page outside it. The rail's list at 1440 does not
    close on an outside tap in this build (B7-ATLAS-JOIN open item), so it closes on Escape. */
async function dismissList(s: Surface): Promise<void> {
    if (s.inRail) await userEvent.keyboard("{Escape}");
    else await userEvent.click(document.querySelector<HTMLElement>("#one h2")!, { force: true });
    await sleep(300);
}

/** Every seated sheet: the filter drawer, the detail, and the dock's bottom sheets. */
const SHEETS = "[data-slot='sheet-content'], [data-testid='entity-detail']";

/** Press a surface's control the reader's way: the rail opens first, then a pointer press on the
    control. A control under a non-modal sheet (no press reaches it) is reached by keyboard. */
async function openSurface(s: Surface): Promise<boolean> {
    for (let attempt = 0; attempt < 2 && !s.isOpen(); attempt++) {
        if (s.inRail) {
            q("[data-testid='dock-brand']")?.focus();
            await until(() => shown(s.invoker()), 1200);
            await sleep(250);
        }
        const el = s.invoker();
        if (!el) return false;
        el.focus({ preventScroll: true });
        if (hittable(el)) await userEvent.click(el);
        else await userEvent.keyboard("{Enter}");
        if (await until(() => s.isOpen(), 1500)) break;
        await sleep(200);
    }
    // The next press samples the page, so the sheet must have finished moving in.
    await atRest(SHEETS);
    return s.isOpen();
}

/** The focus receiver of an invoker: the element itself or its focusable child. */
function holdsFocus(invoker: HTMLElement | null): boolean {
    const a = document.activeElement;
    return !!invoker && !!a && (a === invoker || invoker.contains(a));
}

const WIDTHS = [390, 1440] as const;

for (const width of WIDTHS) {
    const table = surfaces(width);
    const names = Object.keys(table) as Name[];
    const pairs = names.flatMap((a) => names.filter((b) => b !== a).map((b) => [a, b] as const));

    describe(`one surface per seat at ${width} px (PLAN §2.5)`, () => {
        for (const [a, b] of pairs) {
            it(`${a}, then ${b}`, async () => {
                const pinia = await mount(width);
                const A = table[a]!;
                const B = table[b]!;

                expect(await openSurface(A), `${a} opens`).toBe(true);
                // A list closes before the reader can reach anything else; a sheet stays.
                if (A.list) {
                    await dismissList(A);
                    expect(A.isOpen(), `${a} closes`).toBe(false);
                }
                expect(await openSurface(B), `${b} opens after ${a} (focus on ${focusName()})`).toBe(true);

                // One open surface per seat.
                if (A.seat && A.seat === B.seat) expect(A.isOpen(), `${a} closed when ${b} took the seat`).toBe(false);
                if (a === "figure" && B.seat) expect(A.isOpen(), "a seated surface closes the figure dock").toBe(false);
                if (b === "figure" && A.seat && !A.list) expect(A.isOpen(), `${a} stays when a figure dock opens`).toBe(true);
                for (const seat of ["right", "bottom"] as const) {
                    const open = names.filter((n) => table[n]!.seat === seat && table[n]!.isOpen());
                    expect(open.length, `${seat} seat holds ${open.join(", ")}`).toBeLessThanOrEqual(1);
                }
                const holders = useSurfaceSeats(pinia).holders;
                if (B.seat) expect(holders[B.seat], `${b} holds the ${B.seat} seat`).not.toBeNull();

                // The displaced surface does not pull focus back to its own invoker.
                await sleep(200);
                if (!A.isOpen())
                    expect(holdsFocus(A.invoker()), `focus stays off ${a}'s control (on ${focusName()})`).toBe(false);

                // Escape closes the second surface; focus returns to its control.
                const invokerB = B.invoker();
                await userEvent.keyboard("{Escape}");
                expect(await until(() => !B.isOpen(), 2000), `Escape closes ${b}`).toBe(true);
                expect(await until(() => holdsFocus(invokerB), 1500), `focus returns to ${b}'s control`).toBe(true);
            });
        }

        if (width === 1440) {
            it("the rail stays open while its Dashboards list is open, and the list routes", async () => {
                await mount(width);
                const s = table.dashboards!;
                expect(await openSurface(s)).toBe(true);
                await sleep(400);
                expect(q("[data-testid='dock']")!.classList.contains("collapsed"), "the rail stays open").toBe(false);
                expect(document.querySelectorAll("[data-testid^='dock-dashboard-option-']").length).toBeGreaterThan(0);
            });
        }
    });
}

// A dock list at 390 is modal, so the pairs above close it with a tap before the second surface opens.
// A seated sheet can still open while a list is up without a tap: a selection lands (a history step,
// a linked mark) and the detail opens; a plate's filter affordance opens the drawer through the shared
// pane. The list must give up the bottom seat, and focus must not stay on its control.
describe("a dock list held open loses the bottom seat at 390 px (PLAN §2.5)", () => {
    const LISTS = ["more", "dashboards", "sections"] as const;
    const arrivals = {
        detail: (pinia: Pinia) => useSelection(pinia).select("district:93N"),
        filters: () => void (useFilterPane().open.value = true),
    } as const;
    for (const a of LISTS) {
        for (const b of Object.keys(arrivals) as (keyof typeof arrivals)[]) {
            it(`${a} is open, then ${b} arrives`, async () => {
                const pinia = await mount(390);
                const table = surfaces(390);
                const A = table[a]!;
                const B = table[b]!;
                expect(await openSurface(A), `${a} opens`).toBe(true);
                expect(useSurfaceSeats(pinia).holders.bottom, `${a} holds the bottom seat`).toBe(`dock-${a}`);

                arrivals[b](pinia);
                expect(await until(() => B.isOpen(), 2000), `${b} opens`).toBe(true);
                expect(await until(() => !A.isOpen(), 1500), `${a} closes when ${b} takes the seat`).toBe(true);
                const holder = useSurfaceSeats(pinia).holders.bottom;
                expect(holder, `${b} holds the bottom seat`).toBe(b === "detail" ? "entity-detail" : "filter-drawer");
                const open = (Object.keys(table) as Name[]).filter((n) => table[n]!.seat === "bottom" && table[n]!.isOpen());
                expect(open, "the bottom seat holds one surface").toEqual([b]);

                await sleep(300);
                expect(holdsFocus(A.invoker()), `focus stays off ${a}'s control (on ${focusName()})`).toBe(false);
            });
        }
    }
});

describe("the bottom reserve at 390 px: the detail sheet sits above the bar", () => {
    it("the bar stays in place under the detail, and the sheet's foot clears the bar's top", async () => {
        await mount(390);
        const detail = surfaces(390).detail!;
        expect(await openSurface(detail)).toBe(true);
        const bar = q("[data-testid='dock']")!;
        const check = () => {
            const sheet = q("[data-testid='entity-detail']")!.getBoundingClientRect();
            const top = bar.getBoundingClientRect().top;
            expect(bar.hasAttribute("data-bar-out"), "the bar stays in under the detail").toBe(false);
            expect(top).toBeLessThan(window.innerHeight);
            expect(sheet.bottom, "the sheet's foot clears the bar").toBeLessThanOrEqual(top + 1);
        };
        check();
        // A long downward read with the detail open does not slide the bar out from under it.
        for (let i = 0; i < 3; i++) {
            window.scrollBy(0, window.innerHeight * 0.9);
            await sleep(300);
        }
        await sleep(400);
        expect(detail.isOpen()).toBe(true);
        check();
    });
});
