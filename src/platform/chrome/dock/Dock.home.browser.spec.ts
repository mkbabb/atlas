// The ≥ 768 px posture (U/B7 §2.2, O-2, O-3; R-REQ-CHECK D-04). On `/` the dock rests open, 280 px
// wide, and its run lists the ranked roster: SCI first, the six ranked dashboards in rank order, the
// held entry left out, the companion last. Every other route rests as a 44 × 44 circle.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { dock, mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

const rows = () =>
    [...document.querySelectorAll<HTMLElement>("[data-testid^='dock-roster-']")].filter(
        (el) => el.dataset.testid !== "dock-roster-subjects",
    );

describe("the dock at 1440 px (U/B7 §2.2)", () => {
    it("rests open on / and lists the ranked roster, SCI first, the companion last", async () => {
        site = await mountSite("/", 1440);
        await settle(400);
        const box = dock()!.getBoundingClientRect();
        expect(dock()!.classList.contains("collapsed")).toBe(false);
        expect(Math.round(box.width)).toBe(280);
        expect(rows().map((r) => r.dataset.testid!.replace("dock-roster-", ""))).toEqual([
            "sci",
            "usf",
            "ecf",
            "demand",
            "bead",
            "speedtest",
            "vft-germination",
        ]);
        const sci = rows()[0];
        expect(sci.textContent).toContain("743.6 Gbps");
        expect(sci.textContent).toContain("2025–26");
        expect(document.querySelector("[data-testid='dock-roster-usf-integrity']")).toBeNull();
        expect(document.querySelector("[data-testid='dock-roster-subjects']")?.textContent).toContain("By subject");
    });

    it("rests as a 44 × 44 circle on a dashboard route", async () => {
        site = await mountSite("/sci", 1440);
        await settle(400);
        const el = dock()!;
        expect(el.classList.contains("collapsed")).toBe(true);
        const box = el.getBoundingClientRect();
        expect(Math.round(box.width)).toBe(44);
        expect(Math.round(box.height)).toBe(44);
        expect(Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)).toBeGreaterThanOrEqual(22);
    });

    it("collapses to the circle when the reader leaves / for a dashboard, and reopens on return", async () => {
        site = await mountSite("/", 1440);
        // The reader is not on the dock: a pointer resting over it holds glass's hover expand open
        // (out/b7-i1/atlas-dockhome-hover-probe.log), and the engine lane shares one page, so a
        // previous file can leave the pointer there.
        await userEvent.hover(document.body);
        await site.router.push("/usf");
        await settle(500);
        expect(dock()!.classList.contains("collapsed")).toBe(true);
        await site.router.push("/");
        await settle(500);
        expect(dock()!.classList.contains("collapsed")).toBe(false);
    });
});
