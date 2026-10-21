// Escape after enlarge moves the page by 0 (U/B7 · RULINGS §N N-1 (c), §M M-3), on a sci clone.
// For the first figures on each route: centre the figure's enlarge control, press Enter, wait for
// `?fig`, press Escape, wait for `?fig` to clear, and compare scrollY. The walk measured −570 and
// +2,539 px (Chromium), −583 px (Firefox) and +127 px (WebKit, usf-integrity).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import { CLONE_URL, cells, inCell, launch, record } from "./harness";

const FIGURES = Number(process.env.FIGURES ?? 4);

let browser: Browser;
const rows: unknown[] = [];
beforeAll(async () => {
    browser = await launch();
});
afterAll(async () => {
    record("escape-drift", rows);
    await browser?.close();
});


describe("Escape after enlarge never moves the page", () => {
    it.each(cells())("$route at $width", async ({ route, width }) => {
        const cell = await inCell(browser, width, async (page) => {
            await page.goto(CLONE_URL + route, { waitUntil: "load", timeout: 90_000 });
            await page.waitForTimeout(2500);
            const drift: { id: string; y0: number; y1: number; d: number; opened: boolean; focus: boolean }[] = [];
            const done = new Set<string>();
            // Beats mount ahead of the reader (F9), so the controls are found as the page is walked.
            for (let tries = 0; done.size < FIGURES && tries < 12; tries++) {
                const id = await page.evaluate(
                    (seen) => [...document.querySelectorAll<HTMLElement>("[data-action='enlarge'][data-subject]")]
                            // a control in a collapsed act row (display: none) takes no focus
                            .filter((b) => b.getClientRects().length > 0)
                            .map((b) => b.dataset.subject!)
                            .find((x) => !seen.includes(x)) ?? null,
                    [...done],
                );
                if (!id) {
                    await page.mouse.wheel(0, 900);
                    await page.waitForTimeout(900);
                    continue;
                }
                done.add(id);
                const sel = `[data-action='enlarge'][data-subject='${id}']`;
                await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getClientRects().length > 0)!.scrollIntoView({ block: "center" }), sel);
                await page.waitForTimeout(1200);
                const y0 = await page.evaluate(() => scrollY);
                const focused = await page.evaluate((s) => {
                    const b = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getClientRects().length > 0)!;
                    b.focus({ preventScroll: true });
                    return document.activeElement === b;
                }, sel);
                if (!focused) continue;
                await page.keyboard.press("Enter");
                const opened = await page.waitForFunction((want) => new URL(location.href).searchParams.get("fig") === want, id, { timeout: 3000 }).then(() => true, () => false);
                await page.waitForTimeout(500);
                await page.keyboard.press("Escape");
                await page.waitForFunction(() => !new URL(location.href).searchParams.get("fig"), null, { timeout: 3000 }).catch(() => undefined);
                await page.waitForTimeout(700);
                const y1 = await page.evaluate(() => scrollY);
                const focus = await page.evaluate((s) => document.activeElement?.matches(s) ?? false, sel);
                drift.push({ id, y0: Math.round(y0), y1: Math.round(y1), d: Math.round(y1 - y0), opened, focus });
            }
            return { route, width, drift };
        });
        rows.push(cell);
        expect(cell.drift.filter((r) => r.opened && (r.d !== 0 || !r.focus))).toEqual([]);
    });
});
