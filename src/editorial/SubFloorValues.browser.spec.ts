// SubFloorValues in a real engine (U RULINGS §J J-6): a value sits beside its label at a 1440 plate
// (the measured 934 px row), the values of every row share one column, a narrow plate stacks them,
// and value cells are keyed by a stable id, so two values that share a unit both render and update.
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import SubFloorValues, { type SubFloorRow } from "./SubFloorValues.vue";
import { countNoun } from "./evidence-floor";

const ROWS: SubFloorRow[] = [
    { key: "a", label: "Consultant A", values: [{ id: "req", value: "41", unit: "requests" }, { id: "app", value: "9", unit: "applicants" }] },
    { key: "b", label: "Educational Technology Consulting Services of the Piedmont", values: [{ id: "req", value: "3", unit: "requests" }] },
];

function mount(width: number, rows: SubFloorRow[]) {
    const host = document.createElement("div");
    host.style.width = `${width}px`;
    document.body.appendChild(host);
    const data = shallowRef(rows);
    const warns: string[] = [];
    const app = createApp(
        defineComponent({
            setup: () => () =>
                h(SubFloorValues, {
                    rows: data.value,
                    n: data.value.length,
                    noun: countNoun("filer"),
                    withheld: "A peer band",
                    listLabel: "Each filer's own counts",
                }),
        }),
    );
    app.config.warnHandler = (msg) => void warns.push(msg);
    app.mount(host);
    return { host, data, warns, done: () => (app.unmount(), host.remove()) };
}
const box = (el: Element | null) => el!.getBoundingClientRect();

describe("SubFloorValues layout and keys (J-6)", () => {
    it("at a 934 px plate each value sits beside its label and the rows share one value column", async () => {
        const m = mount(934, ROWS);
        try {
            await nextTick();
            const rows = [...m.host.querySelectorAll(".subfloor__row")];
            const firstValueLeft = rows.map((r) => box(r.querySelector(".subfloor__value")).left);
            for (const r of rows) {
                const label = box(r.querySelector(".subfloor__label"));
                const value = box(r.querySelector(".subfloor__value"));
                // beside: same line, and the gap from the label's start is at most the label column
                // cap (16rem) plus the gutter (1.5rem) at a 16 px root
                expect(Math.abs(value.top - label.top)).toBeLessThan(label.height);
                expect(value.left - label.left).toBeLessThanOrEqual(16 * 16 + 24 + 1);
            }
            expect(Math.abs(firstValueLeft[0] - firstValueLeft[1])).toBeLessThan(1);
            // the list keeps a reading measure, not the plate's width
            expect(box(m.host.querySelector(".subfloor__list")).width).toBeLessThanOrEqual(40 * 16 + 1);
        } finally {
            m.done();
        }
    });

    it("a narrow plate stacks the values under the label", async () => {
        const m = mount(320, ROWS);
        try {
            await nextTick();
            const r = m.host.querySelector(".subfloor__row")!;
            expect(box(r.querySelector(".subfloor__value")).top).toBeGreaterThanOrEqual(box(r.querySelector(".subfloor__label")).bottom - 1);
        } finally {
            m.done();
        }
    });

    it("two values sharing a unit both render and update in place (keyed by id)", async () => {
        const rows = (a: string, b: string): SubFloorRow[] => [
            { key: "t", label: "Hex 8a2a", values: [{ id: "down", value: a, unit: "Mbps" }, { id: "up", value: b, unit: "Mbps" }] },
        ];
        const m = mount(934, rows("767", "41"));
        try {
            await nextTick();
            const text = () => [...m.host.querySelectorAll(".subfloor__num")].map((e) => e.textContent);
            expect(text()).toEqual(["767", "41"]);
            m.data.value = rows("512", "38");
            await nextTick();
            expect(text()).toEqual(["512", "38"]);
            expect([...m.host.querySelectorAll(".subfloor__value")].map((e) => e.getAttribute("data-value-id"))).toEqual(["down", "up"]);
            expect(m.warns.filter((w) => /duplicate keys/i.test(w))).toEqual([]);
        } finally {
            m.done();
        }
    });
});
