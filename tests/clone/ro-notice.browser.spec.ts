// No ResizeObserver loop notice (U/B7 · RULINGS §N N-1 (d), §M M-5), on a sci clone: load, rest
// and an 80-step wheel pass raise no "ResizeObserver loop" error or console message. WebKit raised
// it on /sci and /usf-integrity.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import { CLONE_URL, cells, inCell, launch, record } from "./harness";

let browser: Browser;
const rows: unknown[] = [];
beforeAll(async () => {
    browser = await launch();
});
afterAll(async () => {
    record("ro-notice", rows);
    await browser?.close();
});

describe("no ResizeObserver loop notice", () => {
    it.each(cells())("$route at $width", async ({ route, width }) => {
        const cell = await inCell(browser, width, async (page) => {
            const notices: { phase: string; text: string }[] = [];
            let phase = "load";
            page.on("pageerror", (e) => {
                if (/ResizeObserver/i.test(e.message)) notices.push({ phase, text: e.message.slice(0, 160) });
            });
            page.on("console", (m) => {
                if (/ResizeObserver/i.test(m.text())) notices.push({ phase, text: m.text().slice(0, 160) });
            });
            await page.addInitScript(() => {
                window.addEventListener("error", (e) => {
                    if (/ResizeObserver/i.test(String(e.message))) console.error(`window.onerror: ${e.message}`);
                });
            });
            await page.goto(CLONE_URL + route, { waitUntil: "load", timeout: 90_000 });
            await page.waitForTimeout(2500);
            phase = "scroll";
            await page.mouse.move(width / 2, 400);
            for (let k = 0; k < 80; k++) {
                await page.mouse.wheel(0, 300);
                await page.waitForTimeout(120);
                if (await page.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 1)) break;
            }
            await page.waitForTimeout(800);
            return { route, width, notices };
        });
        rows.push(cell);
        expect(cell.notices).toEqual([]);
    });
});
