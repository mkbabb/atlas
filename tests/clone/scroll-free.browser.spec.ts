// Scrolling only scrolls (U/B7 · PLAN §5.1 S-4, S-5; R-INTERACT §3.2 `probes/scroll.mjs`), on a sci
// clone. 80 wheel steps of 300 px, 260 ms apart, on every route at 390 and 1440:
// - every step moves scrollY by 300 ± 2 px until the page end (the S-5 root snap held /usf and
//   /demand at 390 for 80 of 80 steps in Chromium), and the document never collapses under the
//   page (a route that dies mid-walk reads scrollY 0 and an end of 0: scroll-walk.ts);
// - the address does not change (no scroll-driven `?at`, `?year`, `?scene` writes);
// - `html` and `body` compute `scroll-snap-type: none`;
// - no visible text sits below opacity 1 at rest (the scrubbed reveals held up to 29–100 % of
//   visible text below half opacity);
// - /usf at 1440: at scrollY 300 the hero figures do not overprint the sticky page title;
// - after the full pass every beat's heading is in `document.body.innerText` (R-TAB26-PAGE: /sci
//   section III was in textContent and absent from innerText).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser, Page } from "playwright";
import { CLONE_URL, cells, inCell, launch, record } from "./harness";
import { ScrollWalk, type Collapse, type Stuck } from "./scroll-walk";

const STEPS = 80;
const STEP_PX = 300;
const STEP_GAP_MS = 260;
const SETTLE_MS = 2500;

interface Step {
    k: number;
    sy: number;
    moved: number;
    url: string;
    faded: { tag: string; text: string; opacity: number }[];
}

interface Cell {
    route: string;
    width: number;
    snap: { html: string; body: string };
    steps: Step[];
    end: number;
    stuck: Stuck[];
    /** Steps after which the document could not hold the page's position (the route died). */
    collapsed: Collapse[];
    /** Uncaught page errors, for attributing a collapse. */
    pageErrors: string[];
    urlChanges: string[];
    faded: number;
    overprint?: { figure: string; title: string } | null;
    missingFromInnerText: string[];
}

/** Visible text in the viewport whose effective opacity (the product up the tree) is below 1. */
async function fadedText(page: Page): Promise<Step["faded"]> {
    return page.evaluate(() => {
        const out: { tag: string; text: string; opacity: number }[] = [];
        const vh = innerHeight;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set<Element>();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const text = (n.textContent ?? "").trim();
            const el = n.parentElement;
            if (!text || !el || seen.has(el)) continue;
            seen.add(el);
            const r = el.getBoundingClientRect();
            if (r.width <= 1 || r.height <= 1 || r.bottom <= 0 || r.top >= vh) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.clipPath.startsWith("inset(50%")) continue;
            // Screen-reader-only text, and the reader-act surfaces a wheel over a figure raises (the
            // hover card and the dock's transient labels fade in on --duration-fast by design: PLAN
            // §4.2). Visible aria-hidden text counts: per-glyph title spans are aria-hidden.
            if (el.closest(".sr-only, [inert], [role='tooltip'], .hover-card, [data-hover-card]")) continue;
            if ([...el.classList].some((c) => /-(enter|leave)-(active|from|to)$/.test(c))) continue;
            let o = 1;
            for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement)
                o *= Number(getComputedStyle(a).opacity);
            if (o < 1) out.push({ tag: el.tagName.toLowerCase() + "." + (el.getAttribute("class") ?? "").split(/\s+/).slice(0, 2).join("."), text: text.slice(0, 40), opacity: Math.round(o * 1000) / 1000 });
        }
        return out;
    });
}

let browser: Browser;
const rows: Cell[] = [];
beforeAll(async () => {
    browser = await launch();
});
afterAll(async () => {
    record("scroll-free", rows);
    await browser?.close();
});

describe("scrolling only scrolls (PLAN §5.1)", () => {
    it.each(cells())("$route at $width", async ({ route, width }) => {
        const cell = await inCell(browser, width, async (page) => {
            const pageErrors: string[] = [];
            page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));
            await page.goto(CLONE_URL + route, { waitUntil: "load", timeout: 90_000 });
            await page.waitForTimeout(SETTLE_MS);
            const startUrl = await page.evaluate(() => location.pathname + location.search);
            const snap = await page.evaluate(() => ({
                html: getComputedStyle(document.documentElement).scrollSnapType,
                body: getComputedStyle(document.body).scrollSnapType,
            }));
            const c: Cell = { route, width, snap, steps: [], end: 0, stuck: [], collapsed: [], pageErrors, urlChanges: [], faded: 0, missingFromInnerText: [] };

            if (route === "/usf" && width === 1440) {
                await page.evaluate(() => scrollTo(0, 300));
                await page.waitForTimeout(600);
                c.overprint = await page.evaluate(() => {
                    const title = document.querySelector<HTMLElement>(".dashboard-hero__title-band, .dashboard-hero__title");
                    if (!title) return null;
                    const t = title.getBoundingClientRect();
                    for (const f of document.querySelectorAll<HTMLElement>(".dashboard-hero__figure, .dashboard-hero__series [data-attn-mark]")) {
                        const r = f.getBoundingClientRect();
                        if (r.width < 1 || r.height < 1) continue;
                        const overlap = r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top;
                        if (overlap) return { figure: (f.textContent ?? "").trim().slice(0, 24), title: (title.textContent ?? "").trim().slice(0, 24) };
                    }
                    return null;
                });
                await page.evaluate(() => scrollTo(0, 0));
                await page.waitForTimeout(600);
            }

            await page.mouse.move(width / 2, 400);
            const walk = new ScrollWalk(await page.evaluate(() => scrollY), STEP_PX);
            c.end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
            for (let k = 0; k < STEPS; k++) {
                await page.mouse.wheel(0, STEP_PX);
                await page.waitForTimeout(STEP_GAP_MS);
                const { sy, url, end } = await page.evaluate(() => ({
                    sy: scrollY,
                    url: location.pathname + location.search,
                    end: document.documentElement.scrollHeight - innerHeight,
                }));
                c.end = end;
                const { moved, done } = walk.step({ sy, end });
                const faded = await fadedText(page);
                c.steps.push({ k, sy: Math.round(sy), moved, url, faded });
                c.faded += faded.length;
                if (url !== startUrl && !c.urlChanges.includes(url)) c.urlChanges.push(url);
                if (done) break;
            }
            c.stuck = walk.settle();
            c.collapsed = walk.collapsed;
            // Compared without whitespace or case: `innerText` applies `text-transform` (the appendix
            // heading is set in capitals) and breaks a line before a block-level mark (a title's dagger),
            // which `textContent` does not. Neither drops text.
            c.missingFromInnerText = await page.evaluate(() => {
                const fold = (s: string) => s.replace(/\s+/g, "").toLowerCase();
                const inner = fold(document.body.innerText);
                return [...document.querySelectorAll<HTMLElement>(".essay-beat h2")]
                    .map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim())
                    .filter((t) => t && !inner.includes(fold(t)));
            });
            return c;
        });
        rows.push(cell);
        expect(cell.snap).toEqual({ html: "none", body: "none" });
        expect(cell.collapsed).toEqual([]);
        expect(cell.stuck).toEqual([]);
        expect(cell.urlChanges).toEqual([]);
        expect(cell.steps.flatMap((s) => s.faded)).toEqual([]);
        expect(cell.missingFromInnerText).toEqual([]);
        if (route === "/usf" && width === 1440) expect(cell.overprint).toBeNull();
    });
});
