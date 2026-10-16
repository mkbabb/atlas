// Treemap's layout seam in a real engine (U RULINGS §J J-2): the laid-out boxes are a public, typed
// event emitted after each settled render, so a consumer sizes its labels from the event and never
// polls ECharts' private model on timers (the Firefox /ecf `_pipelineMap` error from sci's
// ChartersTreemap `readBoxWidths`).
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { createPinia } from "pinia";
import Treemap, { type TreemapBoxLayout, type TreemapItem } from "./Treemap.vue";

const items = (n: number): TreemapItem[] =>
    Array.from({ length: n }, (_, i) => ({ key: `k${i}`, name: `Box ${i}`, value: (n - i) * 10 }));

const until = async (ok: () => boolean, ms = 4000) => {
    const t0 = performance.now();
    while (!ok()) {
        if (performance.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 20));
    }
};

describe("Treemap emits its laid-out boxes after each settled render", () => {
    it("lists every box by key, re-emits on a data change and a resize, and never repeats a layout", async () => {
        const style = document.createElement("style");
        style.textContent = ".chart-h-lg{height:320px}.w-full{width:100%}";
        document.head.appendChild(style);
        const el = document.createElement("div");
        el.style.width = "600px";
        document.body.appendChild(el);
        const field = shallowRef(items(5));
        const emitted: TreemapBoxLayout[][] = [];
        const app = createApp(
            defineComponent({
                setup: () => () =>
                    h(Treemap, {
                        items: field.value,
                        fill: () => "#777",
                        onLayout: (boxes: TreemapBoxLayout[]) => emitted.push(boxes),
                    }),
            }),
        );
        app.use(createPinia());
        try {
            app.mount(el);
            await until(() => emitted.length >= 1);
            const first = emitted[0];
            expect(first.map((b) => b.key).sort()).toEqual(["k0", "k1", "k2", "k3", "k4"]);
            for (const b of first) {
                expect(b.width).toBeGreaterThan(0);
                expect(b.height).toBeGreaterThan(0);
                expect(b.x).toBeGreaterThanOrEqual(0);
                expect(b.x + b.width).toBeLessThanOrEqual(600 + 0.5);
            }
            // the largest value owns the largest box (squarify keeps area proportional)
            const area = (b: TreemapBoxLayout) => b.width * b.height;
            const k0 = first.find((b) => b.key === "k0")!;
            expect(first.every((b) => area(b) <= area(k0) + 0.5)).toBe(true);

            // a data change: the new field is laid out and emitted
            const n = emitted.length;
            field.value = items(3);
            await until(() => emitted.length > n && emitted[emitted.length - 1].length === 3);
            expect(emitted[emitted.length - 1].map((b) => b.key).sort()).toEqual(["k0", "k1", "k2"]);

            // a resize: the boxes follow the host
            const m = emitted.length;
            el.style.width = "400px";
            await until(() => emitted.length > m);
            const resized = emitted[emitted.length - 1];
            expect(Math.max(...resized.map((b) => b.x + b.width))).toBeLessThanOrEqual(400 + 0.5);

            // a settled re-render with the same layout (a resize back and forth lands twice, but a
            // repeated identical layout is never re-emitted back to back)
            for (let i = 1; i < emitted.length; i++) {
                expect(JSON.stringify(emitted[i])).not.toBe(JSON.stringify(emitted[i - 1]));
            }
        } finally {
            app.unmount();
            el.remove();
            style.remove();
            await nextTick();
        }
    });
});
