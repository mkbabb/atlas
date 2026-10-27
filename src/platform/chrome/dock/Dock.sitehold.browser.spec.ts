// The site layer holds the rail open (U/B7 §2.2, O-12; verifier refutation 2026-10-27).
//
// At ≥ 768 px the site layer (Dashboards, Search, Saved views) renders only while the rail is open.
// Each control opens a surface that glass teleports to <body>, outside the rail, so moving focus or
// the pointer into it fires the rail's own focusout and pointerleave. Unless the control holds the
// rail through `useDockPortals`, the rail collapses, the site layer unmounts and takes the open
// surface with it, and focus falls to BODY. Each control must open, stay open, and on close hand focus
// back to its trigger with the rail still open.
import { afterEach, describe, expect, it } from "vitest";
import { server, userEvent } from "vitest/browser";
import { dock, mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

// WebKit's Tab skips buttons unless Option is held (the B6 tabWalk note).
const walkKey = server.browser === "webkit" ? "{Alt>}{Tab}{/Alt}" : "{Tab}";

const CONTROLS = [
    { tid: "dock-dashboards", surface: "[data-testid^='dock-dashboard-option-']" },
    { tid: "dock-search", surface: "[data-testid='dock-search-input']" },
    { tid: "dock-saved-views", surface: "[role='listbox'] [role='option']" },
] as const;

const trigger = (tid: string) => document.querySelector<HTMLElement>(`[data-testid='${tid}']`);
const crest = () => dock()!.querySelector<HTMLElement>("[data-testid='dock-brand']")!;

/** Open the rail by pointer: start the pointer on the page heading, away from the dock, so the move
    onto the crest is a real enter even when the last test left the pointer where the crest sits. */
async function openRail(): Promise<void> {
    await userEvent.hover(document.querySelector<HTMLElement>("h1, h2")!);
    await userEvent.hover(crest());
}

describe("each site-layer control holds the rail open at 1440 (U/B7 §2.2)", () => {
    for (const path of ["/usf", "/c/funding"]) {
        for (const { tid, surface } of CONTROLS) {
            it(`${path}: ${tid} opens by pointer, stays open, and returns focus on Escape`, async () => {
                site = await mountSite(path, 1440);
                await openRail();
                await expect.poll(() => trigger(tid), { timeout: 3000 }).not.toBeNull();
                await userEvent.click(trigger(tid)!);
                await settle(600);
                expect(dock()!.classList.contains("collapsed"), "rail stays open").toBe(false);
                expect(document.querySelectorAll(surface).length, "surface open").toBeGreaterThan(0);
                await userEvent.keyboard("{Escape}");
                await settle(500);
                expect(document.querySelectorAll(surface).length, "surface closed").toBe(0);
                const t = trigger(tid);
                expect(t, "trigger still rendered").not.toBeNull();
                expect(document.activeElement, "focus back on the trigger").toBe(t);
            });

            it(`${path}: ${tid} opens from the keyboard and stays open`, async () => {
                site = await mountSite(path, 1440);
                crest().focus();
                await settle(600);
                let reached = false;
                for (let i = 0; i < 12 && !reached; i++) {
                    await userEvent.keyboard(walkKey);
                    reached = (document.activeElement as HTMLElement | null)?.dataset.testid === tid;
                }
                expect(reached, "Tab reaches the trigger").toBe(true);
                await userEvent.keyboard("{Enter}");
                await settle(600);
                expect(dock()!.classList.contains("collapsed"), "rail stays open").toBe(false);
                expect(document.querySelectorAll(surface).length, "surface open").toBeGreaterThan(0);
            });
        }
    }

    it("/usf: choosing a dashboard from the open list routes there", async () => {
        site = await mountSite("/usf", 1440);
        await openRail();
        await expect.poll(() => trigger("dock-dashboards"), { timeout: 3000 }).not.toBeNull();
        await userEvent.click(trigger("dock-dashboards")!);
        await settle(600);
        const order = [...document.querySelectorAll<HTMLElement>("[data-testid^='dock-dashboard-option-']")].map(
            (o) => o.dataset.testid!.replace("dock-dashboard-option-", ""),
        );
        expect(order).toEqual(["sci", "usf", "ecf", "demand", "bead", "speedtest", "vft-germination"]);
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-dashboard-option-ecf']")!);
        await settle(700);
        expect(site.router.currentRoute.value.path).toBe("/ecf");
    });
});
