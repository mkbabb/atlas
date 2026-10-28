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

    it("at 1440 it has left by the first frame after a scroll brings any heading into its band", async () => {
        site = await mountSite("/sci", 1440);
        const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
        const hits: string[] = [];
        let seen = 0;
        for (let y = 0; y <= 4400; y += 24) {
            window.scrollTo(0, y);
            await frame();
            const el = lozenge();
            if (!el) continue;
            seen++;
            const box = el.getBoundingClientRect();
            for (const h of document.querySelectorAll("main h1, main h2, main h3")) {
                const hb = h.getBoundingClientRect();
                if (overlaps(box, hb))
                    hits.push(`y=${y} ${h.textContent} pager ${Math.round(box.top)}-${Math.round(box.bottom)} heading ${Math.round(hb.top)}-${Math.round(hb.bottom)}`);
            }
        }
        expect(hits).toEqual([]);
        expect(seen).toBeGreaterThan(10);
    });

    it("at 1440 it leaves for a heading that mounted after the section became active", async () => {
        site = await mountSite("/sci", 1440);
        const two = document.getElementById("two")!;
        window.scrollTo(0, two.getBoundingClientRect().top + scrollY + 200);
        await settle(400);
        expect(lozenge()?.dataset.activeBeat).toBe("two");
        // A lazy figure mounts its own heading inside the active section.
        const late = document.createElement("h3");
        late.textContent = "A figure title";
        late.style.cssText = "margin:600px 0 0;font-size:20px;line-height:28px";
        two.appendChild(late);
        await settle(100);
        window.scrollTo(0, late.getBoundingClientRect().top + scrollY - 30);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const el = lozenge();
        if (el) expect(overlaps(el.getBoundingClientRect(), late.getBoundingClientRect())).toBe(false);
    });

    it("at 1440 its text is painted at full opacity from the first frame it enters (§4.2)", async () => {
        site = await mountSite("/sci", 1440);
        const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
        const faded: string[] = [];
        let entered = 0;
        for (let y = 0; y <= 4400; y += 120) {
            const before = lozenge();
            window.scrollTo(0, y);
            for (let f = 0; f < 6; f++) {
                await frame();
                const el = lozenge();
                if (!el) continue;
                if (!before && f === 0) entered++;
                let o = 1;
                for (let a: Element | null = el.querySelector("[data-testid='dock-section-label']"); a; a = a.parentElement)
                    o *= Number(getComputedStyle(a).opacity);
                if (o < 1) faded.push(`y=${y} frame ${f} opacity ${o.toFixed(3)}`);
            }
        }
        expect(entered).toBeGreaterThan(0);
        expect(faded).toEqual([]);
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
