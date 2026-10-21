// REGISTRY 119 in a real engine (U RULINGS §N N-1). The dock is a fixed box; the content stage
// (`main`) is positioned at `--z-content`. A fixed box with `z-index: auto` paints beneath that
// stage, so `main` took every pointer hit over the dock: the 390 crest could not be tapped in 48 of
// 48 B6 walk cells, and at 1440 no rung of the open rail could be pressed. The dock carries its own
// rung (`--z-dock`), above the stage and below the overlays.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { mountSite, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

const dock = () => document.querySelector<HTMLElement>("[data-testid='dock']")!;
const crest = () => document.querySelector<HTMLElement>("[data-testid='dock-brand']")!;

function hitsDock(el: HTMLElement): boolean {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return Boolean(hit && dock().contains(hit));
}

describe("the dock rides its own z rung above the content stage (REGISTRY 119)", () => {
    for (const width of [390, 1440]) {
        it(`at ${width} px a point on the crest hits the crest, not main`, async () => {
            site = await mountSite("/sci", width);
            window.scrollTo(0, 600);
            expect(getComputedStyle(dock()).position).toBe("fixed");
            expect(getComputedStyle(dock()).zIndex).toBe("40");
            expect(hitsDock(crest())).toBe(true);
        });
    }

    it("at 390 px a tap on the crest reaches it and takes the reader home", async () => {
        site = await mountSite("/sci", 390);
        await userEvent.click(crest(), { timeout: 2000 });
        await new Promise((r) => setTimeout(r, 300));
        expect(site.router.currentRoute.value.path).toBe("/");
    });

    it("at 1440 px every rung of the open rail takes a pointer", async () => {
        site = await mountSite("/sci", 1440);
        await userEvent.hover(crest());
        await new Promise((r) => setTimeout(r, 600));
        const rungs = [...document.querySelectorAll<HTMLElement>("button[data-testid^='dock-step-']")];
        expect(rungs.length).toBe(4);
        // The rail opens on glass's spring; once it has settled, every rung takes the hit.
        await expect
            .poll(() => rungs.filter((r) => !hitsDock(r)).map((r) => r.dataset.testid), { timeout: 3000 })
            .toEqual([]);
    });
});
