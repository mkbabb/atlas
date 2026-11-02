// UnitChart's Vue edges in a real engine (U/B8 A3): the device pixel ratio reaches the backing store
// through `useDevicePixelRatio` → `UnitCanvas.setSize` (capped at 2), the keyboard walks the marks and
// blur clears the walk, and only a keyboard move speaks in the live line; a pointer hover stays silent.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import UnitChart from "./UnitChart.vue";
import { gridLayout } from "./unit-layouts";

// The display ratio as a test-owned ref: a display move or a zoom is a write to it.
const ratio = ref(1);
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@vueuse/core")>()),
    useDevicePixelRatio: () => ({ pixelRatio: ratio }),
}));

const layout = gridLayout(4, { width: 40, cell: 10, gap: 0 });

let app: App | undefined;
let el: HTMLElement | undefined;

afterEach(async () => {
    app?.unmount();
    el?.remove();
    app = el = undefined;
    ratio.value = 1;
    await nextTick();
});

function mountChart() {
    el = document.createElement("div");
    el.style.width = "200px";
    document.body.appendChild(el);
    const hovers: number[] = [];
    app = createApp(
        defineComponent({
            setup: () => () =>
                h(UnitChart, {
                    layout,
                    colors: ["#336", "#663"],
                    summary: "4 marks",
                    markLabel: (i: number) => `mark ${i}`,
                    onHover: (i: number) => hovers.push(i),
                }),
        }),
    );
    app.mount(el);
    const canvas = el.querySelector("canvas")!;
    const live = el.querySelector("[aria-live]")!;
    return { canvas, live, hovers };
}

const key = (canvas: HTMLCanvasElement, k: string) =>
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

function pointAt(canvas: HTMLCanvasElement, x: number, y: number) {
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
}

describe("UnitChart", () => {
    it("sizes the backing store at the display ratio, capped at 2, and follows a change", async () => {
        ratio.value = 1.5;
        const { canvas } = mountChart();
        await nextTick();
        expect([canvas.width, canvas.height]).toEqual([60, 15]);
        ratio.value = 1;
        await nextTick();
        expect([canvas.width, canvas.height]).toEqual([40, 10]);
        ratio.value = 3;
        await nextTick();
        expect([canvas.width, canvas.height]).toEqual([80, 20]);
    });

    it("walks the marks by keyboard, announces each step, and clears on blur", async () => {
        const { canvas, live, hovers } = mountChart();
        canvas.focus();
        key(canvas, "ArrowRight");
        await nextTick();
        expect(hovers).toEqual([0]);
        expect(live.textContent).toBe("mark 0");
        key(canvas, "ArrowRight");
        key(canvas, "End");
        await nextTick();
        expect(hovers).toEqual([0, 1, 3]);
        expect(live.textContent).toBe("mark 3");
        canvas.blur();
        await nextTick();
        expect(hovers.at(-1)).toBe(-1);
        expect(live.textContent).toBe("");
    });

    it("never announces a pointer hover", async () => {
        const { canvas, live, hovers } = mountChart();
        pointAt(canvas, 25, 5);
        await nextTick();
        expect(hovers).toEqual([2]);
        expect(live.textContent).toBe("");
        // A keyboard step speaks; the pointer taking over again silences the line.
        canvas.focus();
        key(canvas, "ArrowRight");
        await nextTick();
        expect(live.textContent).toBe("mark 3");
        pointAt(canvas, 5, 5);
        await nextTick();
        expect(hovers.at(-1)).toBe(0);
        expect(live.textContent).toBe("");
    });
});
