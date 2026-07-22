// dock-coarse-phone-handoff.spec.ts — the E25 BORN-RED wide-coarse disclosure + continuous phone
// handoff detectors (B6 · E24-TRIUMVIRATE-ADJUDICATION-C2 §6.6 · critics `E24-UX-A11Y-CRIT-C2` U4/U5 ·
// `E24-BROWSER-PROOF-CRIT-C2` P1-phone-continuity · state critic S5/S8).
//
// Lane e25:coarse-phone owns, off the preserved E24 dirty cut:
//   • the WIDE-COARSE reveal semantics — a gesture reveal (touch OR pen, or ANY pointer on a no-hover
//     device) PERSISTS; only a hover-capable mouse releases on leave. Covers touch, pen, cancel,
//     lost-pointer-capture, outside, scroll, and route cleanup (U4/S8);
//   • the CONTINUOUS phone sheet/scrim/drawer STATE handoff — a SINGLE viewport owner at onset, mid,
//     AND settle, bidirectionally, with the scrim hit-inert whenever it is not the owner (never a
//     terminal boolean, U5/S5); PRM keeps the same hit ownership, not a hidden opacity-clock collision.
//
// STATE + EXCLUSIVITY only — the terminal phone FORM (dial-13) stays owner-held; NO bottom-dock /
// safe-frame decision here. G-6 compact-hit + export-pointerdown are GLASS, not this lane.
//
// Each `it` binds the SHIPPED artifact — the two extracted pure resolvers by import, and Dock.vue /
// Dock.css by `readFileSync` for the wiring. Against the E24 scaffolding (an inline
// `pointerType === "touch"` special-case that re-collapses on a pen leave; two terminal
// exclusivity watchers; a leaving scrim that stays pointer-active for its 200ms clock) these FAIL.
// They go GREEN only when the capability-based reveal semantics + the continuous exclusion resolver
// land. No sleep / retry / synthetic-forwarded-click / private-selector / fixed-size shim.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
    pointerRevealModel,
    revealReleasesOnLeave,
    revealPersists,
} from "../../src/platform/chrome/dock/composables/coarse-reveal";
import {
    resolvePhoneExclusion,
    type PhoneSurface,
} from "../../src/platform/chrome/dock/composables/phone-surface-exclusion";

const src = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8");

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WIDE-COARSE REVEAL SEMANTICS — capability-based, not a single event string (U4 · S8)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
describe("wide-coarse reveal — a gesture reveal PERSISTS, only a hover mouse releases (U4/S8)", () => {
    it("a no-hover STYLUS (pen) persists — the E24 pen re-collapse race is cured", () => {
        // the exact U4 ¶2 defect: `pointerType === "touch"` special-case let a pen leave RELEASE the
        // bloom and recreate the second-action race. A pen is a gesture pointer — it must persist.
        expect(pointerRevealModel("pen", false)).toBe("gesture-persistent");
        expect(revealReleasesOnLeave("pen", false)).toBe(false);
        expect(revealPersists("pen", false)).toBe(true);
    });

    it("a touch reveal persists (the banked F9 behavior)", () => {
        expect(revealReleasesOnLeave("touch", false)).toBe(false);
        expect(revealReleasesOnLeave("touch", true)).toBe(false); // touch never hovers, even on a hybrid
        expect(revealPersists("touch", true)).toBe(true);
    });

    it("a hover-capable MOUSE keeps the transient hover-bloom — its leave releases (unchanged)", () => {
        expect(pointerRevealModel("mouse", true)).toBe("hover-transient");
        expect(revealReleasesOnLeave("mouse", true)).toBe(true);
        expect(revealPersists("mouse", true)).toBe(false);
    });

    it("a mouse on a NO-HOVER device has no hover to depart — it persists (capability, not the string)", () => {
        expect(pointerRevealModel("mouse", false)).toBe("gesture-persistent");
        expect(revealReleasesOnLeave("mouse", false)).toBe(false);
    });

    it("outside + cancel dismissal follows PERSISTENCE — pen and touch dismiss, a hover mouse never does", () => {
        // an OUTSIDE pointerdown and an interrupted gesture (pointercancel/lostpointercapture) dismiss a
        // PERSISTED reveal; a hover-transient mouse already released on leave, so it has nothing to
        // dismiss. This is why the outside/cancel arms must NOT gate on `pointerType === "touch"` alone.
        expect(revealPersists("pen", false)).toBe(true); // pen outside-tap / cancel dismisses
        expect(revealPersists("touch", false)).toBe(true); // touch outside-tap / cancel dismisses
        expect(revealPersists("mouse", true)).toBe(false); // a hover mouse: nothing persisted
    });
});

describe("wide-coarse SHIPPED wiring — Dock.vue consumes the capability semantics (U4/S8)", () => {
    const dock = src("platform/chrome/dock/Dock.vue");

    it("the reveal decision is capability-based — the raw `pointerType === \"touch\"` fork is struck", () => {
        expect(dock).toContain("revealReleasesOnLeave");
        // the E24 scaffolding branched the leave handler on the raw event string; that fork is gone.
        expect(dock).not.toMatch(/pointerType\s*===\s*["']touch["']/);
    });

    it("outside dismissal covers pen — it gates on persistence, not a touch-only string", () => {
        expect(dock).toContain("revealPersists");
    });

    it("an interrupted gesture (pointercancel + lostpointercapture) releases deterministically (S8)", () => {
        // no idle timer — a cancel / lost-capture is the timer-free deterministic dismissal.
        expect(dock).toContain("pointercancel");
        expect(dock).toContain("lostpointercapture");
    });

    it("route cleanup removes the cancel/lost-capture listeners too (no stranded gesture arm)", () => {
        // the detach closure (onBeforeUnmount) must remove every added listener, including the new arms.
        expect(dock).toMatch(/removeEventListener\(["']pointercancel["']/);
        expect(dock).toMatch(/removeEventListener\(["']lostpointercapture["']/);
    });

    it("an open portal still outranks every release — the banked already-open hold survives a gesture", () => {
        // the pin outranks bloom; the outside/cancel release must respect `anyPortalOpen` (banked).
        expect(dock).toMatch(/anyPortalOpen/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONTINUOUS PHONE HANDOFF — one owner at every frame, the scrim yields hit (U5 · S5)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
describe("phone exclusion — a SINGLE viewport owner at onset/mid/settle, bidirectional (U5/S5)", () => {
    it("nothing open ⇒ no owner, no scrim hit", () => {
        const x = resolvePhoneExclusion({ sheetOpen: false, drawerOpen: false, lastActivated: "none" });
        expect(x.owner).toBe("none");
        expect(x.scrimOwnsHit).toBe(false);
    });

    it("sheet only ⇒ the sheet owns; its scrim owns hit", () => {
        const x = resolvePhoneExclusion({ sheetOpen: true, drawerOpen: false, lastActivated: "sheet" });
        expect(x.owner).toBe("sheet");
        expect(x.scrimOwnsHit).toBe(true);
        expect(x.sheetSubordinated).toBe(false);
        expect(x.drawerSubordinated).toBe(true);
    });

    it("drawer only ⇒ the drawer owns; the scrim never owns hit", () => {
        const x = resolvePhoneExclusion({ sheetOpen: false, drawerOpen: true, lastActivated: "drawer" });
        expect(x.owner).toBe("drawer");
        expect(x.scrimOwnsHit).toBe(false);
        expect(x.drawerSubordinated).toBe(false);
        expect(x.sheetSubordinated).toBe(true);
    });

    it("sheet→drawer crossfade: both momentarily open, the DRAWER (last activated) owns; the leaving scrim yields hit", () => {
        // the U5 cure — during the drawer's open transition the sheet has not yet collapsed, so BOTH
        // flags are true. The just-activated drawer must own the viewport and the still-present scrim
        // must be hit-INERT, so a pointer can never be caught by the outgoing scrim over the drawer.
        const mid = resolvePhoneExclusion({ sheetOpen: true, drawerOpen: true, lastActivated: "drawer" });
        expect(mid.owner).toBe("drawer");
        expect(mid.scrimOwnsHit).toBe(false); // the leaving scrim yields
        expect(mid.sheetSubordinated).toBe(true);
    });

    it("drawer→sheet crossfade: both momentarily open, the SHEET (last activated) owns; its scrim owns hit over the closing drawer", () => {
        const mid = resolvePhoneExclusion({ sheetOpen: true, drawerOpen: true, lastActivated: "sheet" });
        expect(mid.owner).toBe("sheet");
        expect(mid.scrimOwnsHit).toBe(true);
        expect(mid.drawerSubordinated).toBe(true);
    });

    it("exactly ONE surface is unsubordinated at every reachable state (no co-occupancy)", () => {
        const states: PhoneSurface[] = ["none", "sheet", "drawer"];
        for (const sheetOpen of [false, true]) {
            for (const drawerOpen of [false, true]) {
                for (const lastActivated of states) {
                    const x = resolvePhoneExclusion({ sheetOpen, drawerOpen, lastActivated });
                    const live = [x.sheetSubordinated, x.drawerSubordinated].filter((s) => !s).length;
                    // at most one live surface; the scrim owns hit ONLY when the sheet is that surface.
                    expect(live).toBeLessThanOrEqual(1);
                    expect(x.scrimOwnsHit).toBe(x.owner === "sheet");
                }
            }
        }
    });
});

describe("phone handoff SHIPPED wiring — Dock.vue + Dock.css (U5/S5)", () => {
    const dock = src("platform/chrome/dock/Dock.vue");
    const css = src("platform/chrome/dock/Dock.css");

    it("Dock.vue consumes the continuous exclusion resolver — not two terminal watchers alone", () => {
        expect(dock).toContain("resolvePhoneExclusion");
        // the recency tie-break the crossfade needs is tracked (a stack, not a bare boolean pair).
        expect(dock).toMatch(/lastActivated/);
    });

    it("the scrim yields hit-testing when it is not the owner (a class bound to the resolver)", () => {
        expect(dock).toContain("usf-dock-scrim--yield");
    });

    it("a LEAVING scrim is hit-inert for its whole leave clock — pointer-events:none, not just opacity", () => {
        // the U5 core: the outgoing scrim must not stay a pointer-active full-viewport element while it
        // fades. pointer-events:none on the leave-active state + the yield class kills the collision.
        expect(css).toMatch(/\.dock-scrim-leave-active[^{]*\{[^}]*pointer-events:\s*none/s);
        expect(css).toMatch(/\.usf-dock-scrim--yield[^{]*\{[^}]*pointer-events:\s*none/s);
    });

    it("PRM keeps the SAME hit ownership — no prefers-reduced-motion block touches pointer-events", () => {
        // U5 ¶5 / P1: PRM may not use its shorter opacity clock to hide a hit-test collision. The
        // scrim's hit yield is pointer-events (not opacity) and lives OUTSIDE every
        // prefers-reduced-motion block, so it applies to normal motion and PRM identically. Extract
        // each PRM block by BALANCED braces (regex alone cannot match nested rules) and assert none of
        // them alters pointer-events.
        const prmBlocks: string[] = [];
        const open = /@media[^{]*prefers-reduced-motion[^{]*\{/g;
        let m: RegExpExecArray | null;
        while ((m = open.exec(css))) {
            let depth = 1;
            let i = open.lastIndex;
            for (; i < css.length && depth > 0; i++) {
                if (css[i] === "{") depth++;
                else if (css[i] === "}") depth--;
            }
            prmBlocks.push(css.slice(m.index, i));
        }
        expect(prmBlocks.length).toBeGreaterThan(0);
        for (const block of prmBlocks) expect(block).not.toContain("pointer-events");
        // the yield rule itself is present as a standalone (non-PRM) rule.
        expect(css).toMatch(/\.usf-dock-scrim--yield[^{]*\{[^}]*pointer-events:\s*none/s);
    });
});
