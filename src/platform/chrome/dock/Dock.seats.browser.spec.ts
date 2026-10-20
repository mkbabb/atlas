// The dock's seat contract in a real engine (U RULINGS §M M-4, §L D3-1; the B5 seat census).
//
// glass 10.1.0's GlassDock claims `role="toolbar"` on the element holding its #default slot and roves
// that element's direct children as seats: one Tab stop per run, ArrowUp/Down/Home/End move seat to
// seat, and every non-stop seat's first focusable is written `tabindex=-1`. A seat holding several
// controls (a "container seat") therefore loses all but one of them from the Tab order, and the
// run's arrows jump out of it. The contract the dock keeps:
//   1. every seat in the run is a single control (a chapter rung: glass's own roving is the
//      chapter rail), with exactly one Tab stop across the run: no container seat in the toolbar;
//   2. ArrowUp/Down/Home/End inside the chapter rail move between chapters and stay in the rail;
//   3. a Tab walk through the open dock reaches every dock control: the rail's stop, Filters, the
//      theme toggle and Collapse at the desk; the rail's stop, Filters and the gear on the phone;
//   4. the dock carries no figure subject: no control in it names or pins a figure id.
import { afterEach, describe, expect, it } from "vitest";
import { page, server, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, provide } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import Dock from "./Dock.vue";
import { DASHBOARD_KEY, type DashboardContext } from "../../../contract/index.js";
import { installDashboardRegistry } from "../../../contract/registry-inject.js";
import { useVizRegistry } from "../../../charts/composables/useVizRegistry.js";

const BEATS = ["beat-a", "beat-b", "beat-c", "beat-d"];
const VIZ = "seat-viz";
const ctx = {
    id: "seats",
    title: "Seats",
    brand: "S",
    flagshipRoute: "/seats",
    selectionKey: "seats",
    hasMultiYear: false,
    filterBody: { render: () => null },
    nav: BEATS.map((id) => ({ kind: "beat", id, label: id, icon: { render: () => null } })),
} as unknown as DashboardContext;

// glass's own focus-target selector (`_shared/focus.ts`), so "a seat's target" means what glass means.
const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
const CANDIDATE = "a[href], button, input, select, textarea, summary, [tabindex]";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dockEl = () => document.querySelector<HTMLElement>("[data-testid='dock']")!;
const run = () => dockEl().querySelector<HTMLElement>("[role='toolbar']")!;

function isTabbable(el: Element): boolean {
    if (el.closest("[inert]")) return false;
    if (!el.matches(CANDIDATE) || el.matches(":disabled")) return false;
    const ti = el.getAttribute("tabindex");
    if (ti != null && Number(ti) < 0) return false;
    return (el as HTMLElement).getClientRects().length > 0;
}

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
    const app = createApp(
        defineComponent({
            setup() {
                provide(DASHBOARD_KEY, ctx);
                return () => h(Dock);
            },
        }),
    );
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] }));
    app.use(createPinia());
    // A registered figure: the retired viz-context zone stamped and pinned it (D3-B N4, CX-K2).
    const registry = useVizRegistry();
    registry.__resetRegistry();
    registry.register({ vizId: VIZ, dims: [], filterResponse: "responsive" } as never);
    app.mount(probe);
    return () => {
        app.unmount();
        registry.__resetRegistry();
        probe.remove();
        host.remove();
    };
}

/** Open the dock the reader's way: focus entering the desk rail blooms it; the phone crest is the
    section-menu button. */
async function openDock(phone: boolean): Promise<void> {
    const crest = dockEl().querySelector<HTMLElement>(".dock-persistent [data-testid='dock-brand'], .dock-persistent a, .dock-persistent button")!;
    if (phone) crest.click();
    else crest.focus();
    await nextTick();
    await wait(400);
}

// WebKit on macOS keeps a plain <button> out of the Tab sequence unless the reader asks for every
// control (Safari's "Press Tab to highlight each item", or Option-Tab). That is the platform's
// default, not the dock's: atlas must not force tabindex=0 onto buttons to defeat it. So the walk
// presses the key a WebKit reader uses to reach every control; Chromium and Firefox press Tab.
const walkKey = server.browser === "webkit" ? "{Alt>}{Tab}{/Alt}" : "{Tab}";

/** Tab from the crest until focus leaves the dock; the dock's focus stops, in order. */
async function tabWalk(): Promise<HTMLElement[]> {
    const stops: HTMLElement[] = [];
    for (let i = 0; i < 24; i++) {
        await userEvent.keyboard(walkKey);
        const a = document.activeElement as HTMLElement | null;
        if (!a || !dockEl().contains(a)) break;
        stops.push(a);
    }
    return stops;
}

let done: (() => void) | null = null;
afterEach(async () => {
    done?.();
    done = null;
    window.scrollTo(0, 0);
});

describe.each([
    { register: "desk", width: 1440, height: 900 },
    { register: "phone", width: 390, height: 844 },
])("the dock's seat contract at the $register register (M-4)", ({ register, width, height }) => {
    const phone = register === "phone";

    it("no container seat sits in the toolbar run: every seat is one chapter control, one Tab stop in all", async () => {
        await page.viewport(width, height);
        done = mount();
        await wait(300);
        await openDock(phone);
        const seats = [...run().children].filter((c): c is HTMLElement => c instanceof HTMLElement);
        // The B5 census's definition: a container seat is one that is not itself focusable but
        // holds focusables (glass then roves it as one stop and drops the rest).
        const containers = seats.filter(
            (s) => !s.matches(FOCUSABLE) && s.querySelectorAll(CANDIDATE).length > 0,
        );
        expect(containers.map((s) => s.className)).toEqual([]);
        // Every seat is a chapter rung (the phone sheet adds its Home row first).
        expect(seats.length).toBe(BEATS.length + (phone ? 1 : 0));
        expect(seats.every((s) => s.classList.contains("usf-dock__step"))).toBe(true);
        expect(seats.every((s) => s.querySelectorAll(CANDIDATE).length === 0)).toBe(true);
        // The run is one Tab stop (glass's roving tabindex).
        expect(seats.filter(isTabbable).length).toBe(1);
    });

    it("ArrowDown, ArrowUp, Home and End move between chapters and stay in the rail", async () => {
        await page.viewport(width, height);
        done = mount();
        await wait(300);
        await openDock(phone);
        const step = (n: number) => document.querySelector<HTMLElement>(`[data-testid='dock-step-${n}']`)!;
        step(1).focus();
        expect(document.activeElement).toBe(step(1));
        await userEvent.keyboard("{ArrowDown}");
        expect(document.activeElement).toBe(step(2));
        await userEvent.keyboard("{ArrowDown}");
        expect(document.activeElement).toBe(step(3));
        await userEvent.keyboard("{End}");
        expect(document.activeElement).toBe(step(4));
        await userEvent.keyboard("{ArrowDown}"); // the last chapter holds: the rail owns the key
        expect(document.activeElement).toBe(step(4));
        await userEvent.keyboard("{ArrowUp}");
        expect(document.activeElement).toBe(step(3));
        await userEvent.keyboard("{Home}");
        const first = phone ? document.querySelector("[data-testid='dock-home-row']") : step(1);
        expect(document.activeElement).toBe(first);
    });

    it("a Tab walk through the open dock reaches every dock control", async () => {
        await page.viewport(width, height);
        done = mount();
        await wait(300);
        await openDock(phone);
        // The controls a reader must reach by Tab, read while the dock is open (the desk rail
        // re-collapses once focus leaves it): the rail's one stop, then every foot control.
        const railStop = [...run().querySelectorAll(".usf-dock__step")].find(isTabbable);
        // Structure-agnostic: every visible control in the dock that is not a chapter row or the crest.
        const foot = [...dockEl().querySelectorAll("button, a[href], input, [role='switch']")].filter(
            (e) =>
                !e.closest("[role='toolbar'], .dock-persistent:not(.dock-persistent-end)") &&
                !e.closest("[inert]") &&
                (e as HTMLElement).getClientRects().length > 0,
        );
        const crest = dockEl().querySelector<HTMLElement>("[data-testid='dock-brand']")!;
        crest.focus();
        const stops = await tabWalk();
        const reached = new Set(stops);
        expect(railStop).toBeTruthy();
        expect(foot.length).toBeGreaterThanOrEqual(phone ? 2 : 3);
        const missed = [railStop!, ...foot].filter((e) => !reached.has(e as HTMLElement)).map((e) => e.getAttribute("data-testid") ?? e.getAttribute("aria-label") ?? e.className);
        expect(missed).toEqual([]);
        expect(stops.some((s) => s.matches("[data-membrane-filter-trigger]"))).toBe(true);
        if (phone) expect(stops.some((s) => s.matches("[data-testid='dock-gear']"))).toBe(true);
        else expect(stops.some((s) => s.matches("[data-testid='dock-collapse-toggle']"))).toBe(true);
    });

    it("no dock control carries a figure subject (§L D3-1)", async () => {
        await page.viewport(width, height);
        done = mount();
        await wait(300);
        await openDock(phone);
        expect(dockEl().querySelectorAll("[data-active-viz]").length).toBe(0);
        expect(dockEl().innerHTML).not.toContain(VIZ);
    });
});
