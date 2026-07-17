export type FilterRegister = "pip" | "drawer";

// OF-23/28 — the filter affordance has EXACTLY two states: at rest the PIP (the small pull tab,
// the drawer retracted to a tab-only sliver) and, on pull, the FULL DRAWER. The intermediary
// LEDGER detent — the half-open sheet that painted a mostly-empty full-height rail beside a lone
// scope chip — is abrogated wholesale (removed from the ladder, not merely hidden), so no gesture
// or drag can land the drawer on a third, in-between register.
export const FILTER_SNAP = Object.freeze({
    pip: 0.12,
    drawer: 1,
});

const SNAPS = Object.freeze([FILTER_SNAP.pip, FILTER_SNAP.drawer]);

/** The two-state ladder — the tab at rest, the full drawer open. One ladder at every viewport. */
export function filterSnapPoints(): readonly number[] {
    return SNAPS;
}

/** Resolve a drag/fling writeback to the nearer of the two registers. */
export function filterRegisterFor(snap: number | string | null): FilterRegister {
    const value = typeof snap === "number" ? snap : Number.parseFloat(String(snap));
    const nearest = SNAPS.reduce((best, point) =>
        Math.abs(point - value) < Math.abs(best - value) ? point : best,
    );
    return nearest === FILTER_SNAP.drawer ? "drawer" : "pip";
}

export function filterSnapFor(register: FilterRegister): number {
    return FILTER_SNAP[register];
}
