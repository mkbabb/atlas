// The margin glyph paints at full opacity (U/B7 repair 1 · PLAN §4.2: no text below full opacity).
// RC6 receded the whole egg with `opacity: var(--attn-chrome)`, so the dagger read at 0.46 in the
// clone scroll-free witness on /sci, /usf and /ecf at 390 and 1440. The recession is now ink mixed
// into the ground.
import { describe, expect, it } from "vitest";
import { createApp, h } from "vue";
import EasterEgg from "./EasterEgg.vue";

describe("EasterEgg at rest", () => {
    it("paints its glyph at effective opacity 1, recessed by ink", async () => {
        // The tokens the egg reads, at their elevation.css and theme values.
        const root = document.documentElement.style;
        root.setProperty("--attn-chrome", "0.46");
        root.setProperty("--muted-foreground", "rgb(100, 100, 100)");
        root.setProperty("--background", "rgb(255, 255, 255)");
        const host = document.createElement("div");
        document.body.appendChild(host);
        const app = createApp({ render: () => h(EasterEgg, { label: "A note", reveal: "The detail." }) });
        app.mount(host);
        try {
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const glyph = host.querySelector<HTMLElement>(".easter-egg__glyph")!;
            let o = 1;
            for (let a: Element | null = glyph; a && a !== document.documentElement; a = a.parentElement)
                o *= Number(getComputedStyle(a).opacity);
            expect(o).toBe(1);
            const ink = getComputedStyle(host.querySelector(".easter-egg__marker")!).color;
            expect(ink).not.toBe("rgb(100, 100, 100)");
        } finally {
            app.unmount();
            host.remove();
            for (const t of ["--attn-chrome", "--muted-foreground", "--background"]) root.removeProperty(t);
        }
    });
});
