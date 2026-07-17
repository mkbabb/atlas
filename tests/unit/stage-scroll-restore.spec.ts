import { describe, expect, it } from "vitest";

import { createStageScrollRestore } from "../../src/charts/scene/stage-scroll-restore";

// OF-19.1 · CHALLENGE-2 P2 — the ChapterStage source-panel scroll latch. The two paths the stage's
// open/close `watch` drives must both be truthful: a reader who OPENED the panel from a scroll offset
// is returned to it on close; a reader who arrived on an INITIALLY-open panel (deep link / reload
// with `?browse=`) — who never crossed an open edge — is NOT teleported to the top on close.
describe("createStageScrollRestore", () => {
    it("restores the captured offset on close (the reader opened the panel from a scroll position)", () => {
        const latch = createStageScrollRestore();
        latch.capture(742);
        expect(latch.release()).toBe(742);
    });

    it("restores a captured 0 — distinct from 'never captured' (a reader who opened it at the very top)", () => {
        const latch = createStageScrollRestore();
        latch.capture(0);
        // 0 is a real captured offset, not the un-captured sentinel: close still restores to the top.
        expect(latch.release()).toBe(0);
    });

    it("yields null when NO open edge was captured — the initially-open close must not teleport", () => {
        const latch = createStageScrollRestore();
        // No `capture()` ever ran (the non-immediate watch skipped the initial open edge). The stage
        // reads null and leaves the page where the reader stands — never `scrollTo(0)`.
        expect(latch.release()).toBeNull();
    });

    it("consumes the snapshot — a second close never re-restores a stale offset", () => {
        const latch = createStageScrollRestore();
        latch.capture(300);
        expect(latch.release()).toBe(300);
        expect(latch.release()).toBeNull();
    });

    it("re-captures on a fresh open after a close (open → close → open → close round-trips)", () => {
        const latch = createStageScrollRestore();
        latch.capture(120);
        latch.release();
        latch.capture(480);
        expect(latch.release()).toBe(480);
    });
});
