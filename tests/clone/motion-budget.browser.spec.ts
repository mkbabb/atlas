// The motion budget (U/B7 · PLAN §4.2), on a sci clone, every route at 390 and 1440:
// - the hero figures' first text with a digit in it equals their final text (no count-up);
// - 1.5 s after load, `document.getAnimations()` holds nothing that is running (the lead figure's
//   one draw is the only allowance, and no route declares one today);
// - hovering a button, chip or tab leaves its computed scale at 1 (the press/hover scale is glass
//   G1's to remove; this records it per route).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import { CLONE_URL, cells, inCell, launch, record } from "./harness";

function watchHero(): void {
    const w = window as unknown as { __hero: string | null };
    w.__hero = null;
    const read = (): boolean => {
        const el = document.querySelector(".dashboard-hero__series");
        const text = el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (!/\d/.test(text)) return false;
        w.__hero = text;
        return true;
    };
    const arm = () => {
        if (read()) return;
        const mo = new MutationObserver(() => {
            if (read()) mo.disconnect();
        });
        mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
    else arm();
}

let browser: Browser;
const rows: unknown[] = [];
beforeAll(async () => {
    browser = await launch();
});
afterAll(async () => {
    record("motion-budget", rows);
    await browser?.close();
});

describe("load and rest carry no motion (PLAN §4.2)", () => {
    it.each(cells())("$route at $width", async ({ route, width }) => {
        const cell = await inCell(
            browser,
            width,
            async (page) => {
                await page.goto(CLONE_URL + route, { waitUntil: "load", timeout: 90_000 });
                await page.waitForTimeout(1500);
                const running = await page.evaluate(() =>
                    document
                        .getAnimations()
                        .filter((a) => a.playState === "running")
                        .map((a) => {
                            const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
                            const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.id;
                            const timeline = a.timeline && "source" in a.timeline ? "scroll" : "document";
                            return { name, timeline, target: t ? `${t.tagName.toLowerCase()}.${(t.getAttribute("class") ?? "").split(/\s+/).slice(0, 2).join(".")}` : "" };
                        })
                        .filter((a) => a.timeline === "document"),
                );
                await page.waitForTimeout(2500);
                const hero = await page.evaluate(() => {
                    const first = (window as unknown as { __hero: string | null }).__hero;
                    const el = document.querySelector(".dashboard-hero__series");
                    return { first, final: el?.textContent?.replace(/\s+/g, " ").trim() ?? null };
                });
                const scaled: string[] = [];
                const targets = await page.$$("main button:visible, main [role='tab']:visible, main .chip:visible");
                for (const t of targets.slice(0, 8)) {
                    try {
                        await t.hover({ timeout: 1000 });
                        await page.waitForTimeout(250);
                        const s = await t.evaluate((el) => {
                            const cs = getComputedStyle(el);
                            const m = cs.transform === "none" ? 1 : new DOMMatrixReadOnly(cs.transform).a;
                            const sc = cs.scale === "none" ? 1 : Number(cs.scale.split(" ")[0]);
                            return { m, sc, name: (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 24) };
                        });
                        if (Math.abs(s.m - 1) > 1e-3 || Math.abs(s.sc - 1) > 1e-3) scaled.push(`${s.name} (${s.m.toFixed(3)}/${s.sc})`);
                    } catch {
                        /* covered or detached: not a hover target */
                    }
                }
                return { route, width, running, hero, scaled };
            },
            { initScript: watchHero },
        );
        rows.push(cell);
        if (cell.hero.first !== null) expect(cell.hero.first).toBe(cell.hero.final);
        expect(cell.running).toEqual([]);
        expect(cell.scaled).toEqual([]);
    });
});
