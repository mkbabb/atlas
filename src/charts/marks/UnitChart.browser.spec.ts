// UnitChart's Vue edges in a real engine (U/B8 A3): the device pixel ratio reaches the backing store
// through `useDevicePixelRatio` → `UnitCanvas.setSize` (capped at 2), the keyboard walks the marks and
// blur clears the walk, and only a keyboard move speaks in the live line; a pointer hover stays silent.
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import UnitChart from "./UnitChart.vue";
import { gridLayout, type UnitLayout } from "./unit-layouts";

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

/** A chart in a host `hostWidth` px wide, fed `view` as its layout; the resize widths it emits. */
function mountSized(hostWidth: number, view: () => UnitLayout | null, onResize: (w: number) => void = () => {}) {
    el = document.createElement("div");
    el.style.width = `${hostWidth}px`;
    document.body.appendChild(el);
    const resizes: number[] = [];
    app = createApp(
        defineComponent({
            setup: () => () =>
                h(UnitChart, {
                    layout: view(),
                    colors: ["#336", "#663"],
                    summary: "4 marks",
                    onResize: (w: number) => {
                        resizes.push(w);
                        onResize(w);
                    },
                }),
        }),
    );
    app.mount(el);
    return { host: el, canvas: el.querySelector("canvas")!, resizes };
}

/** Two frames: a ResizeObserver delivery and the Vue flush after it. */
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

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

    // A canvas the engine never sized keeps the HTML default backing store, 300 x 150.
    it("mounts at 0 px wide without a layout, then draws the one the consumer builds at the first width", async () => {
        const width = ref(0);
        // The consumer's side: every builder refuses a 0 px frame, so it builds on the first resize.
        expect(() => gridLayout(4, { width: 0 })).toThrow(RangeError);
        const view = computed(() => (width.value > 0 ? gridLayout(4, { width: width.value, cell: 10, gap: 0 }) : null));
        const { host, canvas, resizes } = mountSized(0, () => view.value, (w) => (width.value = w));
        await frames();
        expect(resizes).toEqual([]);
        expect([canvas.width, canvas.height]).toEqual([300, 150]);
        host.style.width = "120px";
        await expect.poll(() => resizes).toEqual([120]);
        await expect.poll(() => [canvas.width, canvas.height]).toEqual([120, 10]);
        expect(canvas.style.width).toBe("120px");
    });

    it("holds a layout's draw while the host measures 0 px wide, and lands it once the host has a width", async () => {
        const { host, canvas } = mountSized(0, () => layout);
        await frames();
        expect([canvas.width, canvas.height]).toEqual([300, 150]);
        expect(canvas.style.width).toBe("0px");
        // A keyboard walk over a chart with nothing drawn moves nothing.
        canvas.focus();
        key(canvas, "ArrowRight");
        host.style.width = "200px";
        await expect.poll(() => [canvas.width, canvas.height]).toEqual([40, 10]);
        expect(canvas.style.width).toBe("40px");
    });
});
