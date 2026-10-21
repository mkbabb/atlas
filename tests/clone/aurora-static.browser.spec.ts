// The background holds still (U/B7 · PLAN §5.6, O-16; R-INTERACT §5), on a sci clone, every
// dashboard route:
// - across 12 wheel steps the atmosphere's nodes take 0 `style` attribute changes, at 1440 and 390
//   (R-REQ-CHECK §2 counted 20–27 and 61–184);
// - across the 80-step pass `.aurora-placeholder` takes 0 `--aurora-ground-image` rewrites
//   (R-INTERACT: 30–2,183 in Chromium, 18–70 in Firefox);
// - the left gutter's mean luminance moves < 2 units (of 255) between consecutive steps (R-INTERACT
//   `probes/flash.py` measured jumps of up to 24.4);
// - sampled every 100 ms over the first 5 s after navigation at 1440, the gutter luminance changes
//   by < 2 units in total (no visible ground change when the field mounts).
// The headless engines paint the `css` substrate (R-INTERACT §7); the WebGL path is glass G2's.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright";
import { CLONE_URL, DASHBOARD_ROUTES, inCell, launch, record, viewportFor } from "./harness";

const STEP_PX = 300;
const STEP_GAP_MS = 260;

/** Mean luminance (0..255) of the 8 px gutter at the viewport's left edge. The PNG is decoded in
    the page (an `<img>` drawn into a canvas), so the spec needs no image library. */
async function gutterLuma(page: Page, width: number): Promise<number> {
    const { height } = viewportFor(width);
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 8, height }, animations: "allow" });
    return page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
        return sum / (d.length / 4);
    }, buf.toString("base64"));
}

function watchAtmosphere(): void {
    const w = window as unknown as { __a3: { style: number; ground: number } };
    w.__a3 = { style: 0, ground: 0 };
    const arm = () => {
        new MutationObserver((list) => {
            for (const m of list) {
                const el = m.target as Element;
                if (!el.closest?.(".atmosphere")) continue;
                if (m.attributeName !== "style") continue;
                w.__a3.style++;
                const before = m.oldValue ?? "";
                const after = el.getAttribute("style") ?? "";
                const ground = (s: string) => /--aurora-ground-image:([^;]*)/.exec(s)?.[1] ?? "";
                if (el.classList.contains("aurora-placeholder") && ground(before) !== ground(after))
                    w.__a3.ground++;
            }
        }).observe(document.documentElement, {
            attributes: true,
            attributeOldValue: true,
            subtree: true,
            attributeFilter: ["style"],
        });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
    else arm();
}

const counts = (page: Page) =>
    page.evaluate(() => ({ ...(window as unknown as { __a3: { style: number; ground: number } }).__a3 }));
const reset = (page: Page) =>
    page.evaluate(() => {
        const a = (window as unknown as { __a3: { style: number; ground: number } }).__a3;
        a.style = 0;
        a.ground = 0;
    });

let browser: Browser;
const rows: unknown[] = [];
beforeAll(async () => {
    browser = await launch();
});
afterAll(async () => {
    record("aurora-static", rows);
    await browser?.close();
});

describe("the background holds still (PLAN §5.6)", () => {
    const cases = DASHBOARD_ROUTES.flatMap((route) => [390, 1440].map((width) => ({ route, width })));
    it.each(cases)("$route at $width", async ({ route, width }) => {
        const cell = await inCell(
            browser,
            width,
            async (page) => {
                const t0 = Date.now();
                await page.goto(CLONE_URL + route, { waitUntil: "commit", timeout: 90_000 });
                // The first 5 s, every 100 ms (1440 only): the field's arrival must not change the ground.
                const firstFive: number[] = [];
                if (width === 1440) {
                    await page.waitForLoadState("domcontentloaded");
                    while (Date.now() - t0 < 5000) {
                        firstFive.push(await gutterLuma(page, width));
                        await page.waitForTimeout(100);
                    }
                }
                await page.waitForLoadState("load");
                await page.waitForTimeout(Math.max(0, 5500 - (Date.now() - t0)));
                await page.mouse.move(width / 2, 400);

                await reset(page);
                for (let k = 0; k < 12; k++) {
                    await page.mouse.wheel(0, STEP_PX);
                    await page.waitForTimeout(STEP_GAP_MS);
                }
                const twelve = await counts(page);

                await page.evaluate(() => scrollTo(0, 0));
                await page.waitForTimeout(600);
                await reset(page);
                const lumas: number[] = [await gutterLuma(page, width)];
                for (let k = 0; k < 80; k++) {
                    await page.mouse.wheel(0, STEP_PX);
                    await page.waitForTimeout(STEP_GAP_MS);
                    lumas.push(await gutterLuma(page, width));
                    const atEnd = await page.evaluate(
                        () => scrollY >= document.documentElement.scrollHeight - innerHeight - 1,
                    );
                    if (atEnd) break;
                }
                const eighty = await counts(page);
                const jumps = lumas.slice(1).map((l, i) => Math.abs(l - lumas[i]!));
                const maxJump = Math.max(0, ...jumps);
                const firstFiveRange = firstFive.length
                    ? Math.max(...firstFive) - Math.min(...firstFive)
                    : 0;
                const substrate = await page.evaluate(
                    () => document.querySelector("[data-aurora-substrate]")?.getAttribute("data-aurora-substrate") ?? null,
                );
                return { route, width, twelve, eighty, maxJump, firstFiveRange, firstFive, substrate };
            },
            { initScript: watchAtmosphere },
        );
        rows.push(cell);
        expect(cell.twelve.style).toBe(0);
        expect(cell.eighty.ground).toBe(0);
        expect(cell.maxJump).toBeLessThan(2);
        if (width === 1440) expect(cell.firstFiveRange).toBeLessThan(2);
    });
});
