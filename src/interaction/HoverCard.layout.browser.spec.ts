// O-13 (PLAN §5.3, R-INTERACT §4.2): the readout grid keeps every label on one line and every value
// inside its cell, in the hover card and in the detail's measure host, at 1440 and 390 widths. The
// entity is the S1/S2 one (Pine Springs Preparatory Academy, LEA 93N). The breakdown at the /usf state
// map keeps each program label on one line. Before the fix the label track collapsed beside a long
// value (8 px in the 280 px card) and the breakdown label was a fixed 80 px.
import "../../tests/browser/utilities.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import HoverCard from "./HoverCard.vue";
import ReadoutFacts from "../charts/readout/ReadoutFacts.vue";
import { useHoverReadout } from "../platform/stores/useHoverReadout.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";
import type { Fact } from "./HoverCard.vue";

const FACTS_93N: Fact[] = [
    { label: "Contracted bandwidth", value: "250 Mbps" },
    { label: "Contracted per student", value: "814 kbps" },
    { label: "Peak utilization", value: "41%" },
    { label: "Enrollment (ADM)", value: "307" },
    { label: "Against the 250 kbps line", value: "+564 kbps over the 250 fair-line" },
    { label: "NSLP/EDS", value: "8% NSLP/EDS share" },
];

const BREAKDOWN = [
    { label: "Schools & Libraries", value: "$41.2M", share: 0.62, color: "#4a7" },
    { label: "Rural Health Care", value: "$3.1M", share: 0.05, color: "#47a" },
    { label: "High Cost", value: "$18.9M", share: 0.28, color: "#a74" },
    { label: "Lifeline", value: "$2.4M", share: 0.05, color: "#777" },
];

/** Line count of an element's text: the distinct line boxes its text ranges occupy. Rects on one
    line box can sit a fraction of a pixel apart (Firefox puts a number and its lighter unit 0.4 px
    apart, 22.5 and 22.9), so tops within 2 px are one line; a wrapped line sits a full line lower. */
function lines(el: Element): number {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops: number[] = [];
    for (const r of range.getClientRects())
        if (r.width > 0 && !tops.some((t) => Math.abs(t - r.top) < 2)) tops.push(r.top);
    return tops.length;
}

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

function host(width: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `inline-size:${width};padding:12px;font:14px/1.4 system-ui,sans-serif`;
    document.body.appendChild(el);
    cleanups.push(() => el.remove());
    return el;
}

function mountFacts(width: string, breakdown = false): HTMLElement {
    const el = host(width);
    const app = createApp(
        defineComponent({
            setup: () => () =>
                h(ReadoutFacts, {
                    facts: breakdown ? [] : FACTS_93N,
                    density: "full",
                    breakdown: breakdown ? BREAKDOWN : undefined,
                    breakdownLabel: "By program",
                }),
        }),
    );
    app.mount(el);
    cleanups.push(() => app.unmount());
    return el;
}

function assertFactsFit(root: ParentNode, where: string): void {
    const labels = [...root.querySelectorAll("dt")];
    const values = [...root.querySelectorAll("dd")];
    expect(labels.length, where).toBe(FACTS_93N.length);
    for (const dt of labels) {
        expect(lines(dt), `${where}: label "${dt.textContent}" on one line`).toBe(1);
        expect(dt.getBoundingClientRect().width, `${where}: label track`).toBeGreaterThan(40);
    }
    for (const dd of values) {
        expect(dd.scrollWidth, `${where}: value "${dd.textContent?.trim()}" inside its cell`).toBeLessThanOrEqual(
            dd.clientWidth + 1,
        );
    }
}

describe("ReadoutFacts: one label-safe grid (O-13)", () => {
    it("the detail measure host (26rem) and the phone sheet (358 px): labels one line, values inside", async () => {
        for (const w of ["26rem", "358px", "280px"]) {
            const el = mountFacts(w);
            await nextTick();
            assertFactsFit(el, w);
        }
    });

    it("a number never parts from its unit: a long label yields its width before a value splits (U/B7b L)", async () => {
        // The served /sci map card at 1440 (Chromium and Firefox, B7b land): the label track took
        // max-content beside "Contracted bandwidth per student", so the value track was 34 px and
        // "2 Gbps", "598 kbps" and "457 Mbps" each broke onto two lines, number over unit.
        const el = host("300px");
        const facts: Fact[] = [
            { label: "Contracted bandwidth per student in the 2025–26 school year", value: "598 kbps" },
            { label: "Average utilization across the whole school year", value: "457 Mbps" },
            { label: "Enrollment (ADM)", value: "3,344" },
        ];
        const app = createApp(defineComponent({ setup: () => () => h(ReadoutFacts, { facts }) }));
        app.mount(el);
        cleanups.push(() => app.unmount());
        await nextTick();
        const rows = [...el.querySelectorAll("dt")].map((dt, i) => [dt, el.querySelectorAll("dd")[i]!] as const);
        for (const [dt, dd] of rows) {
            expect(lines(dd), `value "${dd.textContent?.trim()}" on one line`).toBe(1);
            expect(dd.scrollWidth, `value "${dd.textContent?.trim()}" inside its cell`).toBeLessThanOrEqual(dd.clientWidth + 1);
            expect(dt.getBoundingClientRect().right, `label "${dt.textContent}" clear of its value`).toBeLessThanOrEqual(
                dd.getBoundingClientRect().left + 1,
            );
        }
    });

    it("under 18rem the rows stack, label over value", async () => {
        const el = mountFacts("15rem");
        await nextTick();
        const dt = el.querySelector("dt")!.getBoundingClientRect();
        const dd = el.querySelector("dd")!.getBoundingClientRect();
        expect(dd.top).toBeGreaterThanOrEqual(dt.bottom - 1);
        assertFactsFit(el, "15rem");
    });

    it("the /usf breakdown keeps each program label on one line in a 231 px card", async () => {
        const el = mountFacts("231px", true);
        await nextTick();
        const names = new Set(BREAKDOWN.map((b) => b.label));
        const labels = [...el.querySelectorAll("span,dt,p")].filter(
            (n) => n.children.length === 0 && names.has(n.textContent?.trim() ?? ""),
        );
        expect(labels.length).toBe(BREAKDOWN.length);
        for (const l of labels) expect(lines(l), l.textContent ?? "").toBe(1);
    });
});

describe("HoverCard: the peek (O-13)", () => {
    function mountCard() {
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
        return useHoverReadout(pinia);
    }

    it("at 1440: at least 18rem wide, every label on one line, every value inside, at most four rows", async () => {
        const store = mountCard();
        store.readout = {
            origin: "sci-scatter",
            title: "Pine Springs Preparatory Academy",
            subhead: "LEA 93N · Charter · 2025–26",
            facts: FACTS_93N,
            anchor: { x: 400, y: 300 },
            density: "compact",
            entityKey: "district:93N",
        };
        await nextTick();
        await nextTick();
        const card = document.querySelector<HTMLElement>('[data-testid="hover-card"]')!;
        expect(card).not.toBeNull();
        expect(card.getBoundingClientRect().width).toBeGreaterThanOrEqual(18 * 16 - 1);
        const labels = [...card.querySelectorAll("dt")];
        expect(labels.length).toBeLessThanOrEqual(4);
        for (const dt of labels) expect(lines(dt), dt.textContent ?? "").toBe(1);
        for (const dd of card.querySelectorAll("dd"))
            expect(dd.scrollWidth).toBeLessThanOrEqual(dd.clientWidth + 1);
        expect(card.textContent).toContain("Click for detail");
    });

    it("mounts while a hover is already live (the lazy chunk lands under the pointer)", async () => {
        // U/B7b: the card's open state read the phone flag before its declaration, so a card that
        // mounted with a readout already in the store threw in setup and took the route down (/bead,
        // /usf, /ecf at 1440 in Firefox: the pointer rested on a map when the chunk arrived).
        const pinia = createPinia();
        setActivePinia(pinia);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        const el = document.createElement("div");
        document.body.appendChild(el);
        const errors: unknown[] = [];
        const app = createApp(defineComponent({ setup: () => () => h(HoverCard) }));
        app.config.errorHandler = (e) => void errors.push(e);
        app.use(pinia).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.runWithContext(() => {
            useHoverReadout(pinia).readout = {
                origin: "sci-map",
                title: "Burke County Schools",
                facts: FACTS_93N.slice(0, 2),
                anchor: { x: 400, y: 300 },
                density: "compact",
            };
        });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        await nextTick();
        await nextTick();
        expect(errors.map(String)).toEqual([]);
        expect(document.querySelector('[data-testid="hover-card"]')).not.toBeNull();
    });

    it("no first row repeats the title", async () => {
        const store = mountCard();
        store.readout = {
            origin: "sci-map",
            title: "Burke County Schools",
            facts: [{ label: "In district", value: "Burke County Schools" }, ...FACTS_93N.slice(0, 3)],
            anchor: { x: 400, y: 300 },
            density: "compact",
        };
        await nextTick();
        await nextTick();
        const card = document.querySelector<HTMLElement>('[data-testid="hover-card"]')!;
        const values = [...card.querySelectorAll("dd")].map((d) => d.textContent?.trim());
        expect(values).not.toContain("Burke County Schools");
    });
});
