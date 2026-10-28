// Beat's render skip in a real engine (U/B7b · PLAN §8.1 R-TAB26-PAGE). An interior beat skips its
// rendering until it first enters the viewport. After a full scroll every beat's heading is in
// `document.body.innerText`: Chromium leaves a skipped beat's text out of `innerText`, so a beat that
// went back to skipping once scrolled past dropped out of a copy of the page (/sci section III).
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { createApp, h, nextTick, type App } from "vue";
import Beat from "./Beat.vue";

const frames = (n: number) => new Promise<void>((r) => {
    const tick = (k: number) => (k <= 0 ? r() : requestAnimationFrame(() => tick(k - 1)));
    tick(n);
});

beforeAll(async () => {
    await page.viewport(1024, 700);
});

let app: App | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
    scrollTo(0, 0);
});

const HEADINGS = Array.from({ length: 8 }, (_, i) => `Beat heading number ${i + 1}`);

async function mountEssay(): Promise<HTMLElement> {
    host = document.createElement("div");
    document.body.appendChild(host);
    app = createApp({
        render: () =>
            HEADINGS.map((title, i) =>
                h(
                    Beat,
                    { lift: i > 0, id: `b${i}` },
                    {
                        header: () => h("h2", title),
                        figure: () => h("div", { style: "height: 900px" }, `Figure body ${i + 1}`),
                    },
                ),
            ),
    });
    app.mount(host);
    await nextTick();
    await frames(3);
    return host;
}

const missing = () => {
    const inner = document.body.innerText.replace(/\s+/g, " ");
    return HEADINGS.filter((t) => !inner.includes(t));
};

describe("Beat render skip", () => {
    it("skips a below-fold interior beat before it is seen", async () => {
        const root = await mountEssay();
        const last = root.querySelector<HTMLElement>("#b7")!;
        expect(getComputedStyle(last).contentVisibility).toBe("auto");
        expect(last.classList.contains("beat--rendered")).toBe(false);
        expect(getComputedStyle(root.querySelector<HTMLElement>("#b0")!).contentVisibility).not.toBe("auto");
    });

    it("keeps every heading in innerText after a full scroll and back", async () => {
        await mountEssay();
        // The page grows as skipped beats render at their real height, so walk to the live end.
        const end = () => document.documentElement.scrollHeight - innerHeight;
        for (let y = 0; scrollY < end() - 1; y += 300) {
            scrollTo(0, Math.min(y, end()));
            await frames(3);
        }
        await frames(4);
        scrollTo(0, 0);
        await frames(4);
        expect(missing()).toEqual([]);
        expect(document.querySelectorAll(".beat--rendered").length).toBe(HEADINGS.length - 1);
    });
});
