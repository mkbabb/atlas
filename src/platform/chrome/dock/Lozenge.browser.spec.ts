// The section pager beside the circle (U/B7 §2.1 D-7, D-11/D-12; §2.2). At 1440 it never sits on the
// heading of the section it names, and it never renders empty. At 390 there is no lozenge: the bar's
// Sections cell prints the active section's name.
import { afterEach, describe, expect, it } from "vitest";
import { mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

const lozenge = () => document.querySelector<HTMLElement>("[data-testid='membrane-title-lozenge']");
const overlaps = (a: DOMRect, b: DOMRect) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe("the section pager (U/B7 §2.1 D-7)", () => {
    it("at 1440 it never intersects the heading of the section it names, and is never empty", async () => {
        site = await mountSite("/sci", 1440);
        let seen = 0;
        for (let y = 0; y <= 4400; y += 40) {
            window.scrollTo(0, y);
            await settle(60);
            const el = lozenge();
            if (!el) continue;
            seen++;
            const label = el.querySelector("[data-testid='dock-section-label']")?.textContent?.trim() ?? "";
            expect(label, `y=${y}`).not.toBe("");
            const heading = document.getElementById(el.dataset.activeBeat!)!.querySelector("h2")!;
            expect(overlaps(el.getBoundingClientRect(), heading.getBoundingClientRect()), `y=${y}`).toBe(false);
        }
        expect(seen).toBeGreaterThan(10);
    });

    it("at 390 no lozenge renders and the Sections cell prints the active section", async () => {
        site = await mountSite("/sci", 390);
        window.scrollTo(0, 1500);
        await settle(500);
        expect(lozenge()).toBeNull();
        const cell = document.querySelector("[data-dock-cell='sections'] [data-testid='dock-section-label'], [data-dock-cell='sections'][data-testid='dock-section-select'] [data-testid='dock-section-label']");
        expect(cell?.textContent?.trim()).toBe("Trend");
    });
});
