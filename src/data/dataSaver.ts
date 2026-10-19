// platform/data/dataSaver.ts — THE DATA-SAVER SEAM (N.WF2 · §4.F2 · B7).
//
// One reactive-safe predicate the chrome reads to respect a user's explicit
// data-frugality signal (the atmosphere tier). TWO sources, either flips it (the platform-neutral OR):
//   • `Save-Data` — the client hint surfaced on `navigator.connection.saveData` (Chromium/
//     Blink; the header the browser also sends). The OS/browser "Data Saver" toggle.
//   • `prefers-reduced-data: reduce` — the CSS media feature (the same intent, the standards
//     track). Read via `matchMedia` so a WebKit/Firefox user who sets it is honoured too.
//
// Feature-detected and SSR/jsdom-safe: a host without `navigator.connection` or `matchMedia`
// reports `false` (no false-frugality — the default full-fidelity path). This is the JS fence
// the CSS `@media (prefers-reduced-data)` cannot reach. The feed loader no longer reads it:
// since U §L H9 (a) the stamped snapshot is the only transport, so there is nothing to choose.

interface SaveDataConnection {
    saveData?: boolean;
}

/** The `Save-Data` client hint, defensively (only Chromium surfaces `navigator.connection`). */
function saveDataHint(): boolean {
    if (typeof navigator === "undefined") return false;
    const conn = (navigator as Navigator & { connection?: SaveDataConnection }).connection;
    return conn?.saveData === true;
}

/** The `prefers-reduced-data: reduce` media feature, defensively (no `matchMedia` on a bare host). */
function prefersReducedDataMedia(): boolean {
    if (typeof matchMedia !== "function") return false;
    try {
        return matchMedia("(prefers-reduced-data: reduce)").matches;
    } catch {
        return false;
    }
}

/**
 * TRUE when the user asked to conserve data — the `Save-Data` client hint OR the
 * `prefers-reduced-data: reduce` media feature. Read at call time (not cached) so a live OS toggle is honoured on
 * the next load; SSR/jsdom → `false` (full fidelity by default).
 */
export function prefersReducedData(): boolean {
    return saveDataHint() || prefersReducedDataMedia();
}
