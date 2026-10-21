// dock-coarse-phone-handoff.spec.ts — the E25 BORN-RED wide-coarse disclosure + continuous phone
// handoff detectors (B6 · E24-TRIUMVIRATE-ADJUDICATION-C2 §6.6 · critics `E24-UX-A11Y-CRIT-C2` U4/U5 ·
// `E24-BROWSER-PROOF-CRIT-C2` P1-phone-continuity · state critic S5/S8).
//
// U/B7 §2.2 deleted the phone crest→sheet and its scrim (the phone dock is the bottom bar), and with
// them the continuous sheet↔drawer exclusion resolver and its cases. The wide-coarse reveal cases stay.
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
