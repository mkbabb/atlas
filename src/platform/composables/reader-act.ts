// reader-act.ts — the reader-act latch (U-F60 clause 3; RULINGS §K K-3).
//
// Clause 3: nothing writes a vocabulary key on load. A key is written only in answer to a reader
// act, and `?at` only after a reader scroll settles. Load, layout, restore and program scrolls are
// not reader acts: they move the page, but nobody asked them to. This latch is the one place that
// tells the two apart. It arms on the first TRUSTED input event the reader makes (a press, a key,
// a wheel turn or a touch), and stays armed for the rest of the document. A program scroll
// (`scrollTo`, `scrollIntoView`) dispatches none of these, so it never arms the latch.
//
// The URL writers that are driven by scroll position (the dock's `?at`, a scene step's year, a
// stage's `?scene`) ask `readerHasActed()` before they write.

/** The trusted input events that count as a reader act. Capture phase, so no handler can hide one. */
const READER_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

let acted = false;
let installed = false;
const waiters = new Set<() => void>();

function arm(event: Event): void {
    if (!event.isTrusted || acted) return;
    acted = true;
    for (const name of READER_EVENTS) window.removeEventListener(name, arm, true);
    const pending = [...waiters];
    waiters.clear();
    for (const fn of pending) fn();
}

function install(): void {
    if (installed || typeof window === "undefined") return;
    installed = true;
    for (const name of READER_EVENTS)
        window.addEventListener(name, arm, { capture: true, passive: true });
}

/** Has the reader made a trusted input since the document loaded? */
export function readerHasActed(): boolean {
    install();
    return acted;
}

/** Run `fn` once, on the reader's first act (at once if the reader has already acted). Returns a
    disposer that cancels a call still waiting. */
export function onFirstReaderAct(fn: () => void): () => void {
    install();
    if (acted) {
        fn();
        return () => {};
    }
    waiters.add(fn);
    return () => waiters.delete(fn);
}

