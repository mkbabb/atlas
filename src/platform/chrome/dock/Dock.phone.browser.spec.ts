// The < 768 px bottom bar (U/B7 §2.2, D-2, D-5, D-6, D-10). At 390 the dock is a horizontal bar on
// the bottom edge, ≤ 56 px tall, with §2.2's cell list per context; its plate is opaque; a section row
// tapped 100 ms after the list opens lands; the last content clears the bar; and the bar slides out
// after a long downward scroll without moving the content.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { dock, mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

const cells = () =>
    [...dock()!.querySelectorAll<HTMLElement>("[data-dock-cell]")].map((el) => el.dataset.dockCell);

function alpha(color: string): number {
    const m = color.match(/rgba?\(([^)]+)\)|color\([^)]*\/\s*([\d.]+)\)/);
    if (!m) return color === "transparent" ? 0 : 1;
    if (m[2]) return Number(m[2]);
    const parts = m[1].split(/[ ,/]+/).filter(Boolean);
    return parts.length > 3 ? Number(parts[3]) : 1;
}

describe("the dock at 390 px is a bottom bar (U/B7 §2.2)", () => {
    const table: [string, string[]][] = [
        ["/", ["crest", "search", "saved", "more"]],
        ["/sci", ["crest", "dashboards", "sections", "filters", "more"]],
        ["/c/funding", ["crest", "dashboards", "search", "more"]],
        ["/data/sci", ["crest", "dashboards", "search", "more"]],
        ["/no-such-page", ["crest", "dashboards", "search", "more"]],
    ];
    for (const [path, expected] of table) {
        it(`on ${path} it sits on the bottom edge with cells ${expected.join(", ")}`, async () => {
            site = await mountSite(path, 390);
            const box = dock()!.getBoundingClientRect();
            expect(box.height).toBeLessThanOrEqual(56);
            expect(box.width).toBeGreaterThan(box.height);
            expect(box.bottom).toBeGreaterThan(window.innerHeight - 40);
            expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
            expect(cells()).toEqual(expected);
            expect(alpha(getComputedStyle(dock()!).backgroundColor)).toBe(1);
        });
    }

    it("a section row tapped 100 ms after the list opens lands on that section", async () => {
        site = await mountSite("/sci", 390);
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-section-select']")!);
        await settle(100);
        const option = document.querySelector<HTMLElement>("[data-testid='dock-section-option-three']")!;
        expect(option).not.toBeNull();
        await userEvent.click(option);
        await settle(1200);
        expect(Math.abs(document.getElementById("three")!.getBoundingClientRect().top)).toBeLessThan(24);
        expect(new URLSearchParams(location.search).get("at")).toBe("three");
    });

    it("the last content clears the bar at the page end", async () => {
        site = await mountSite("/sci", 390);
        window.scrollTo(0, document.documentElement.scrollHeight);
        await settle(400);
        const last = document.getElementById("four")!.getBoundingClientRect();
        expect(last.bottom).toBeLessThanOrEqual(dock()!.getBoundingClientRect().top + 1);
    });

    for (const path of ["/", "/c/funding", "/data/sci", "/no-such-page/at-all"]) {
        it(`on ${path} the page's last box clears the bar at the page end`, async () => {
            site = await mountSite(path, 390);
            window.scrollTo(0, document.documentElement.scrollHeight);
            await settle(400);
            const main = [...document.querySelectorAll("main")].at(-1)!.getBoundingClientRect();
            expect(dock()!.hasAttribute("data-bar-out")).toBe(false);
            expect(main.bottom).toBeLessThanOrEqual(dock()!.getBoundingClientRect().top + 1);
        });
    }

    it("slides out after a downward scroll of more than a viewport, and the content does not move", async () => {
        site = await mountSite("/sci", 390);
        const main = document.querySelector<HTMLElement>("main")!;
        const before = main.getBoundingClientRect().height;
        window.scrollTo(0, 1200);
        await settle(300);
        window.dispatchEvent(new Event("scrollend"));
        await settle(500);
        expect(dock()!.hasAttribute("data-bar-out")).toBe(true);
        expect(main.getBoundingClientRect().height).toBe(before);
        window.scrollTo(0, 900);
        await settle(300);
        window.dispatchEvent(new Event("scrollend"));
        await settle(300);
        expect(dock()!.hasAttribute("data-bar-out")).toBe(false);
    });
});
