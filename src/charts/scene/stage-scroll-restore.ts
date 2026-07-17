// stage-scroll-restore — the ChapterStage source-panel scroll latch (OF-19.1 · CHALLENGE-2 P2).
//
// When the source panel takes the stage, the steps' track collapses (`display:none`), shrinking the
// document; on OPEN we snapshot the reader's offset and frame the stage, on CLOSE we restore that
// offset so the reader lands back on the step they left. The latch guards the ONE subtle case: an
// INITIALLY-open panel (a deep link / reload with `?browse=`) never crosses an open edge — the
// stage's `watch` is non-immediate — so NO offset was ever captured. Restoring a phantom `0` there
// teleported the page to the top on the first close (a panel the reader never opened from anywhere
// has no offset to return to). The null sentinel distinguishes "captured 0" from "never captured":
// `release()` yields the offset ONLY when an open edge actually recorded one, else null (do nothing).

export interface StageScrollRestore {
    /** Record the reader's offset on the OPEN edge. */
    capture(offset: number): void;
    /** The offset to restore to on CLOSE, or null when no open edge captured one (leave the page
        where it is). Consuming the snapshot clears it, so a second close never re-restores a stale
        offset. */
    release(): number | null;
}

export function createStageScrollRestore(): StageScrollRestore {
    let saved: number | null = null;
    return {
        capture(offset) {
            saved = offset;
        },
        release() {
            const offset = saved;
            saved = null;
            return offset;
        },
    };
}
