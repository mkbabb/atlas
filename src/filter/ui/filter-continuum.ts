export type FilterRegister = "pip" | "ledger" | "drawer";

export const FILTER_SNAP = Object.freeze({
    pip: 0.12,
    ledger: 0.5,
    drawer: 1,
});

const DESKTOP_SNAPS = Object.freeze([
    FILTER_SNAP.pip,
    FILTER_SNAP.ledger,
    FILTER_SNAP.drawer,
]);
const PHONE_SNAPS = Object.freeze([FILTER_SNAP.pip, FILTER_SNAP.drawer]);

/** The phone omits the summary detent; Glass still owns the same side-lens path. */
export function filterSnapPoints(phone: boolean): readonly number[] {
    return phone ? PHONE_SNAPS : DESKTOP_SNAPS;
}

/** Resolve drag writeback to the closest register in the active ladder. */
export function filterRegisterFor(
    snap: number | string | null,
    phone: boolean,
): FilterRegister {
    const value = typeof snap === "number" ? snap : Number.parseFloat(String(snap));
    const points = filterSnapPoints(phone);
    const nearest = points.reduce((best, point) =>
        Math.abs(point - value) < Math.abs(best - value) ? point : best,
    );
    if (nearest === FILTER_SNAP.drawer) return "drawer";
    if (nearest === FILTER_SNAP.ledger) return "ledger";
    return "pip";
}

export function filterSnapFor(register: FilterRegister): number {
    return FILTER_SNAP[register];
}
