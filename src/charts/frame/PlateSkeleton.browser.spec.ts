// A pending plate holds still (U/B7 · PLAN §4.2). The F9 beats below the reader wait behind this
// skeleton; its 2.2 s infinite opacity sweep kept seven animations running on /sci, /usf and /ecf at
// rest (clone motion-budget, Chromium).
import { describe, expect, it } from "vitest";
import { createApp, h } from "vue";
import PlateSkeleton from "./PlateSkeleton.vue";

describe("PlateSkeleton at rest", () => {
    it("runs no animation", async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        const app = createApp({ render: () => h(PlateSkeleton) });
        app.mount(host);
        try {
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            expect(host.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName)).toEqual([]);
        } finally {
            app.unmount();
            host.remove();
        }
    });
});
