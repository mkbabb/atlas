// The idle budget (U/B7 · PLAN §4.2 idle row, §6.1), on a sci clone, every route at 390 and 1440:
// after load plus 5 s with no input, a 3 s window records 0 requestAnimationFrame callbacks and
// 0 ms of long tasks. An init script wraps `requestAnimationFrame`, so this sees the rAF loops
// `document.getAnimations()` cannot (critic P-9): the aurora breath (~86 rAF/s at rest without its
// gate) and the constellation fleck. Long tasks are read in the engines that report them
// (Chromium); elsewhere the count is reported as null and only the rAF budget is asserted.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import { CLONE_URL, cells, inCell, launch, record } from "./harness";

function instrument(): void {
    const w = window as unknown as {
        __idle: { armed: boolean; raf: number; longMs: number; longSupported: boolean; sources: Record<string, number> };
    };
    w.__idle = { armed: false, raf: 0, longMs: 0, longSupported: false, sources: {} };
    const raw = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
        // The caller is on the stack at request time, not inside the callback.
        const where = (new Error().stack ?? "").split("\n").slice(2, 5).map((l) => l.trim()).join(" | ").slice(0, 240);
        return raw((t) => {
            if (w.__idle.armed) {
                w.__idle.raf++;
                w.__idle.sources[where] = (w.__idle.sources[where] ?? 0) + 1;
            }
            cb(t);
        });
    };
    try {
        if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
            w.__idle.longSupported = true;
            new PerformanceObserver((list) => {
                if (!w.__idle.armed) return;
                for (const e of list.getEntries()) w.__idle.longMs += e.duration;
            }).observe({ type: "longtask", buffered: false });
        }
    } catch {
        w.__idle.longSupported = false;
    }
}

let browser: Browser;
const rows: unknown[] = [];
beforeAll(async () => {
    browser = await launch();
});
afterAll(async () => {
    record("idle-budget", rows);
    await browser?.close();
});

describe("nothing runs at rest (PLAN §4.2)", () => {
    it.each(cells())("$route at $width", async ({ route, width }) => {
        const cell = await inCell(
            browser,
            width,
            async (page) => {
                await page.goto(CLONE_URL + route, { waitUntil: "load", timeout: 90_000 });
                await page.waitForTimeout(5000);
                await page.evaluate(() => {
                    (window as unknown as { __idle: { armed: boolean } }).__idle.armed = true;
                });
                await page.waitForTimeout(3000);
                const r = await page.evaluate(() => {
                    const i = (window as unknown as {
                        __idle: { raf: number; longMs: number; longSupported: boolean; sources: Record<string, number> };
                    }).__idle;
                    return { raf: i.raf, longMs: i.longSupported ? Math.round(i.longMs) : null, sources: i.sources };
                });
                return { route, width, ...r };
            },
            { initScript: instrument },
        );
        rows.push(cell);
        expect(cell.raf).toBe(0);
        if (cell.longMs !== null) expect(cell.longMs).toBe(0);
    });
});
