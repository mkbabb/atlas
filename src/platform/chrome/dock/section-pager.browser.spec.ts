// Scrolling only scrolls (U/B7 §5.1 S-6, §2.2; O-12; R-INTERACT S-6). `?at=` is written by a section
// control alone: the Sections select, ‹ ›, PageUp/PageDown (and the rail's rungs). Each moves one
// section. A reader's scroll, wheel or key-press scroll writes nothing (K-3 holds by construction).
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
const startSearch = location.search;
afterEach(() => {
    site?.unmount();
    site = null;
    history.replaceState(history.state, "", `${location.pathname}${startSearch}`);
});

const at = () => new URLSearchParams(location.search).get("at");
const top = (id: string) => document.getElementById(id)!.getBoundingClientRect().top;
const reserve = () => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-head-reserve")) * 16;

describe("the section pager writes ?at=, scrolling writes nothing (S-6)", () => {
    it("a reader's wheel and key-press scrolls write no ?at", async () => {
        site = await mountSite("/sci", 1440);
        document.body.focus();
        for (let i = 0; i < 12; i++) {
            await userEvent.wheel?.(document.body, { delta: { y: 300 } }).catch(() => window.scrollBy(0, 300));
            await settle(80);
        }
        await userEvent.keyboard("{End}");
        await settle(1200);
        expect(at()).toBeNull();
    });

    it("PageDown and PageUp move one section each and write ?at", async () => {
        site = await mountSite("/sci", 1440);
        document.body.focus();
        await userEvent.keyboard("{PageDown}");
        await settle(1200);
        expect(at()).toBe("two");
        expect(Math.abs(top("two") - reserve())).toBeLessThan(4);
        await userEvent.keyboard("{PageDown}");
        await settle(1200);
        expect(at()).toBe("three");
        await userEvent.keyboard("{PageUp}");
        await settle(1200);
        expect(at()).toBe("two");
    });

    it("› and ‹ move one section each and write ?at", async () => {
        site = await mountSite("/sci", 1440);
        window.scrollTo(0, 1800);
        await settle(600);
        expect(at()).toBeNull();
        const next = document.querySelector<HTMLElement>("[data-testid='dock-section-next']")!;
        expect(next).not.toBeNull();
        await userEvent.click(next);
        await settle(1200);
        expect(at()).toBe("three");
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-section-prev']")!);
        await settle(1200);
        expect(at()).toBe("two");
    });

    it("the Sections select jumps to the chosen section and writes ?at", async () => {
        site = await mountSite("/sci", 1440);
        window.scrollTo(0, 1800);
        await settle(600);
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-section-select']")!);
        await settle(200);
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-section-option-four']")!);
        await settle(1200);
        expect(at()).toBe("four");
        expect(document.querySelector("[data-testid='dock-section-select']")?.getAttribute("aria-label")).toMatch(
            /^Section 4 of 4: Sources$/,
        );
    });
});

// PageDown reads where the reader is, not a stale rung (U/B7b M1, found by the served K-3 walk).
// sci routes open on a cover that is not a section, so the reading line starts above the first
// section; and a jump from the page end back to the top (Home, a program scroll) leaves no section
// in the band, so the observer never moves the rung off the last one. Before the fix PageDown from
// the cover skipped the first section (/sci landed on `map`, /usf on `retention`, /ecf on
// `item-mix`), and after End then a jump to the top it stepped past the LAST section's index.
describe("PageDown from above the first section", () => {
    function addCover(): void {
        const cover = document.createElement("div");
        cover.id = "cover-not-a-section";
        cover.style.blockSize = "900px";
        document.getElementById("one")!.before(cover);
    }

    it("from the cover, PageDown lands on the first section", async () => {
        site = await mountSite("/sci", 1440);
        addCover();
        window.scrollTo(0, 0);
        await settle(600);
        document.body.focus();
        await userEvent.keyboard("{PageDown}");
        await settle(1200);
        expect(at()).toBe("one");
        expect(Math.abs(top("one") - reserve())).toBeLessThan(4);
    });

    it("after the page end and a jump back to the top, PageDown lands on the first section", async () => {
        site = await mountSite("/sci", 1440);
        addCover();
        window.scrollTo(0, document.documentElement.scrollHeight);
        await settle(800);
        window.scrollTo(0, 0);
        await settle(800);
        document.body.focus();
        await userEvent.keyboard("{PageDown}");
        await settle(1200);
        expect(at()).toBe("one");
    });

    // A section control's leg ends when it lands or when the reader scrolls against it (U/B7b M1,
    // repair round 1). Before, the leg was never cleared, so a reader who scrolled back inside an old
    // leg's span had PageDown answered from that leg's section and skipped the section in between.
    it("after PageDown lands and the reader scrolls back onto the cover, PageDown lands on the first section again", async () => {
        site = await mountSite("/sci", 1440);
        addCover();
        window.scrollTo(0, 0);
        await settle(600);
        document.body.focus();
        await userEvent.keyboard("{PageDown}");
        await settle(1200);
        expect(at()).toBe("one");
        window.scrollTo(0, Math.round(document.scrollingElement!.scrollTop / 3));
        await settle(800);
        expect(top("one")).toBeGreaterThan(window.innerHeight * 0.35);
        document.body.focus();
        await userEvent.keyboard("{PageDown}");
        await settle(1200);
        expect(at()).toBe("one");
    });

    it("after a Sections jump and a scroll back, PageUp moves on from the section the reader is in", async () => {
        site = await mountSite("/sci", 1440);
        window.scrollTo(0, 1800);
        await settle(600);
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-section-select']")!);
        await settle(200);
        await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-section-option-four']")!);
        await settle(1200);
        expect(at()).toBe("four");
        // Back to `three`, which lies inside the jump's span (from 1800, in `two`, to `four`).
        window.scrollTo(0, Math.round(document.scrollingElement!.scrollTop + top("three") - reserve()));
        await settle(800);
        expect(Math.abs(top("three") - reserve())).toBeLessThan(4);
        document.body.focus();
        await userEvent.keyboard("{PageUp}");
        await settle(1200);
        expect(at()).toBe("two");
    });

    it("two quick PageDowns move two sections", async () => {
        site = await mountSite("/sci", 1440);
        document.body.focus();
        await userEvent.keyboard("{PageDown}");
        await settle(120);
        await userEvent.keyboard("{PageDown}");
        await settle(1500);
        expect(at()).toBe("three");
    });
});
