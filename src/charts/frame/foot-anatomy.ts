/** The fixed, public anatomy of an Atlas figure foot. */
export const FOOT_ANATOMY_SEATS = [
    "title",
    "legend",
    "gear",
    "readout",
    "provenance",
] as const;

export type FootAnatomySeat = (typeof FOOT_ANATOMY_SEATS)[number];

/** Accessible identity for one figure-foot band. */
export interface FootAnatomyContract {
    /** Human-readable figure title used to name the band. */
    readonly title: string;
    /** Optional explicit accessible name when the visible title is abbreviated. */
    readonly ariaLabel?: string;
}
