// The editorial figures paint their final value at rest (U/B7 · PLAN §4.2: no count-ups, no
// scroll-bound fade). Before, CrownFigure and RecordSeam read the nearest beat's cover progress:
// below the fold the crown showed 0 at opacity 0 and dialled up as the reader scrolled.
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h } from "vue";
import CrownFigure from "./CrownFigure.vue";
import RecordSeam from "./RecordSeam.vue";
import "../design/overlays/map-draw.css";
import "../design/overlays/scroll-driven.css";

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
let done: (() => void) | null = null;
afterEach(() => {
    done?.();
    done = null;
});

/** Mount `child` inside a beat host that sits two viewports below the fold. */
async function mountBelowFold(child: () => ReturnType<typeof h>) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(
        defineComponent({
            render: () => [
                h("div", { style: `height:${innerHeight * 2}px` }),
                h("section", { "data-reveal-beat": "", "data-scroll-tl": "", style: "height:600px; position:relative" }, [child()]),
            ],
        }),
    );
    app.mount(host);
    done = () => {
        app.unmount();
        host.remove();
    };
    await frame();
    await frame();
    await new Promise((r) => setTimeout(r, 200));
    return host;
}

describe("figures at rest", () => {
    it("CrownFigure shows its formatted final value at full opacity below the fold", async () => {
        const host = await mountBelowFold(() =>
            h(CrownFigure, { value: 7.36, format: (n: number) => `${n.toFixed(2)}×`, unit: "as wide" }),
        );
        const fig = host.querySelector<HTMLElement>("[data-testid='crown-figure']")!;
        expect(fig.querySelector(".crown-figure__value")!.textContent!.trim()).toBe("7.36×");
        expect(getComputedStyle(fig).opacity).toBe("1");
        expect(getComputedStyle(fig).transform).toBe("none");
    });

    it("RecordSeam paints drawn below the fold", async () => {
        const host = await mountBelowFold(() => h(RecordSeam, { label: "FY2025 · the record as filed", record: "before" }));
        const seam = host.querySelector<HTMLElement>("[data-testid='record-seam']")!;
        expect(getComputedStyle(seam).opacity).toBe("1");
    });
});
