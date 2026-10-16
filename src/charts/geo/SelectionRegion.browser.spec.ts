// SelectionRegion's keyboard entry in a real engine with real DOM focus (U RULINGS §J J-4, the WAI-ARIA
// APG listbox pattern): on focus the active descendant is the first selected option, or the first option
// when none is selected; the key is raised at once and the region's ring is visible. Nothing shows at
// rest and nothing is emitted on mount (§H M-5).
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import SelectionRegion from "./SelectionRegion.vue";

const KEYS = ["k0", "k1", "k2", "k3"];

function mount(selected: string[]) {
    const host = document.createElement("div");
    host.style.cssText = "position:relative;width:300px;height:200px";
    document.body.appendChild(host);
    const emitted: Array<string | null> = [];
    const sel = shallowRef<ReadonlySet<string>>(new Set(selected));
    const app = createApp(
        defineComponent({
            setup: () => () => [
                h("button", { "data-testid": "before" }, "before"),
                h("div", { style: "position:relative;width:300px;height:200px" }, [
                    h(SelectionRegion, {
                        keys: KEYS,
                        label: (k: string) => `Area ${k}`,
                        selectedKeys: sel.value,
                        onActiveChange: (k: string | null) => emitted.push(k),
                    }),
                ]),
                h("button", { "data-testid": "after" }, "after"),
            ],
        }),
    );
    app.mount(host);
    const region = host.querySelector<HTMLElement>('[data-testid="selection-region"]')!;
    const before = host.querySelector<HTMLElement>('[data-testid="before"]')!;
    return {
        region,
        before,
        emitted,
        sel,
        done: () => {
            app.unmount();
            host.remove();
        },
    };
}

const ring = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset };
};

describe("SelectionRegion keyboard entry (J-4)", () => {
    it("shows nothing at rest and emits nothing on mount", async () => {
        const m = mount(["k2"]);
        try {
            await nextTick();
            expect(m.emitted).toEqual([]);
            expect(document.activeElement).not.toBe(m.region);
            expect(ring(m.region).style).toBe("none");
        } finally {
            m.done();
        }
    });

    it("Tab in: the active descendant is the selected option, raised at once, ring visible", async () => {
        const m = mount(["k2"]);
        try {
            m.before.focus();
            await userEvent.tab();
            await nextTick();
            expect(document.activeElement).toBe(m.region);
            expect(m.region.matches(":focus-visible")).toBe(true);
            expect(m.region.getAttribute("aria-activedescendant")).toBe("selopt-k2");
            expect(m.region.querySelector('[role="option"]')?.getAttribute("aria-selected")).toBe("true");
            expect(m.emitted).toEqual(["k2"]);
            expect(ring(m.region)).toEqual({ style: "solid", width: "2px", offset: "-2px" });
            await userEvent.tab(); // out to the next control
            await nextTick();
            expect(m.emitted).toEqual(["k2", null]);
            expect(ring(m.region).style).toBe("none");
        } finally {
            m.done();
        }
    });

    it("nothing selected: the first option is the active descendant on entry", async () => {
        const m = mount([]);
        try {
            m.before.focus();
            await userEvent.tab();
            await nextTick();
            expect(m.region.getAttribute("aria-activedescendant")).toBe("selopt-k0");
            expect(m.emitted).toEqual(["k0"]);
        } finally {
            m.done();
        }
    });

    it("re-entry re-seats the cursor on the selection, not where the arrows left it", async () => {
        const m = mount(["k1", "k3"]);
        try {
            m.before.focus();
            await userEvent.tab();
            await nextTick();
            expect(m.region.getAttribute("aria-activedescendant")).toBe("selopt-k1"); // first selected in key order
            await userEvent.keyboard("{ArrowDown}{ArrowDown}");
            await nextTick();
            expect(m.region.getAttribute("aria-activedescendant")).toBe("selopt-k3");
            await userEvent.tab({ shift: true }); // back out
            await nextTick();
            m.sel.value = new Set(["k2"]);
            await nextTick();
            await userEvent.tab(); // and in again
            await nextTick();
            expect(m.region.getAttribute("aria-activedescendant")).toBe("selopt-k2");
            expect(m.emitted).toEqual(["k1", "k2", "k3", null, "k2"]);
        } finally {
            m.done();
        }
    });
});
