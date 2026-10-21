// The clone-lane harness (vitest.clone.config.ts). One browser per spec file; a new context per
// cell, closed in `finally`. Nothing here launches a server: the caller serves the build and names
// it in CLONE_URL.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit, type Browser, type BrowserContext, type Page } from "playwright";

export const CLONE_URL = (process.env.CLONE_URL ?? "").replace(/\/$/, "");
export const ENGINE = (process.env.ENGINE ?? "chromium") as "chromium" | "firefox" | "webkit";
export const ROUTES = (
    process.env.ROUTES ?? "/,/sci,/usf,/usf-integrity,/ecf,/demand,/bead,/speedtest,/vft-germination"
).split(",");
export const DASHBOARD_ROUTES = ROUTES.filter((r) => r !== "/");
export const WIDTHS = (process.env.WIDTHS ?? "390,1440").split(",").map(Number);

export function viewportFor(width: number): { width: number; height: number } {
    return { width, height: width < 600 ? 844 : 900 };
}

export async function launch(): Promise<Browser> {
    if (!CLONE_URL) throw new Error("CLONE_URL is not set: serve a sci build and name it");
    const engine = { chromium, firefox, webkit }[ENGINE];
    return engine.launch({ headless: true });
}

/** Run `fn` in a fresh context and page; the context closes in `finally`. */
export async function inCell<T>(
    browser: Browser,
    width: number,
    fn: (page: Page, ctx: BrowserContext) => Promise<T>,
    options: { reducedMotion?: "reduce" | "no-preference"; initScript?: () => void } = {},
): Promise<T> {
    const ctx = await browser.newContext({
        viewport: viewportFor(width),
        reducedMotion: options.reducedMotion ?? "no-preference",
    });
    try {
        const page = await ctx.newPage();
        if (options.initScript) await page.addInitScript(options.initScript);
        return await fn(page, ctx);
    } finally {
        await ctx.close();
    }
}

/** Write a spec's cells to CLONE_OUT/<name>-<engine>.json when CLONE_OUT is set. */
export function record(name: string, rows: unknown[]): void {
    const dir = process.env.CLONE_OUT;
    if (!dir) return;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}-${ENGINE}.json`), JSON.stringify(rows, null, 1));
}

export function cells(routes = ROUTES): { route: string; width: number }[] {
    return routes.flatMap((route) => WIDTHS.map((width) => ({ route, width })));
}
