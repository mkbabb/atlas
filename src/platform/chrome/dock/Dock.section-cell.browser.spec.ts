// P-12 (U/B8, REPORT-B7E §6): on a phone load of /bead the bottom bar slid sideways about 2.9 s in
// (0.0168 of its 0.0207 CLS, 9 of 9 runs). The bar is centred and `fit-content`, and its 7.5 rem
// Sections cell joined only once its async chunk had arrived and the body had registered a section.
// The cell now holds its slot from the bar's first frame, so the bar never moves as it fills.
import { afterEach, describe, expect, it } from "vitest";
import { mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

describe("the phone bar's Sections cell", () => {
    it("lays the dashboard cells while the context still loads", async () => {
        // The site layer would show Search where the Sections cell goes.
        const cells: string[][] = [];
        let sampling = true;
        const sample = () => {
            const bar = document.querySelector<HTMLElement>("[data-dock-register='bar']");
            if (bar) cells.push([...bar.querySelectorAll<HTMLElement>("[data-dock-cell]")].map((e) => e.dataset.dockCell!));
            if (sampling) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        // The route's chunk and its context arrive 400 ms after the bar's first frame, so the first
        // navigation has not committed yet when the bar paints.
        site = await mountSite("/bead", 390, 844, 400);
        await settle(900);
        sampling = false;
        expect(cells.length).toBeGreaterThan(0);
        expect(cells.filter((c) => c.includes("search"))).toEqual([]);
        expect(cells.every((c) => c.includes("sections"))).toBe(true);
        expect(document.querySelector("[data-dock-register='bar']")?.getAttribute("data-dock-context")).toBe("dashboard");
    });

    it("holds its slot from the bar's first frame, so the bar never slides as the cell fills", async () => {
        const frames: { left: number; width: number; cell: number | null }[] = [];
        let sampling = true;
        const sample = () => {
            const bar = document.querySelector<HTMLElement>("[data-dock-register='bar']");
            if (bar) {
                const r = bar.getBoundingClientRect();
                const cell = bar.querySelector<HTMLElement>("[data-dock-cell='sections']");
                frames.push({ left: Math.round(r.left), width: Math.round(r.width), cell: cell ? Math.round(cell.getBoundingClientRect().width) : null });
            }
            if (sampling) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        site = await mountSite("/sci", 390);
        await settle(1200);
        sampling = false;

        expect(frames.length).toBeGreaterThan(0);
        // From the first frame the bar is drawn, the cell is there at its final 7.5rem width ...
        const final = frames.at(-1)!.cell;
        expect(final).toBeGreaterThan(100);
        expect(frames.filter((f) => f.cell !== final)).toEqual([]);
        // ... and the bar's left edge and width never change.
        expect(new Set(frames.map((f) => f.left)).size).toBe(1);
        expect(new Set(frames.map((f) => f.width)).size).toBe(1);
        // Filled: it names the active section.
        expect(document.querySelector("[data-testid='dock-section-label']")?.textContent?.trim()).toBe("Bandwidth by unit");
    });
});
