// platform/chrome/dock/membrane-facet.ts — THE CLOSED MEMBRANE-FACET UNION (spec-chrome §c.1/§c.2 ·
// the A-39 fold · CHARTER §5·B-6). The membrane is ONE glass instrument with EXACTLY SIX facets;
// this discriminated union names them and a TOTAL switch (`facetBand`, `assertNever`-terminated)
// projects each to the dock band it renders in.
//
// THE TWO-MECHANISM SPLIT (§c.2, named apart):
//   · B6 (RULINGS §L D3-1, §M M-4): the dock keeps no figure subject, so the two facets that carried
//     one are deleted with no alias: facet 5, the viz-context zone (the trigger pinned a "dial"
//     figure), and facet 6, the provenance detent (the dial figure's record teleported in). A figure's
//     record, options and exports are its own, in its plate. The filter trigger stays, route-level.
//   · CROSS-facet count is prevented by THIS closed union — its total-switch consumers make a NINTH
//     member a COMPILE ERROR (the `default: assertNever(facet)` no longer narrows to `never`). A
//     silent facet add is impossible; ordinary type, no gate script (the standing abrogation honored).

/** The membrane's six facets — the CLOSED roster (spec-chrome §c.1, less facets 5 and 6 at B6). A
    member added here without a matching arm in every total switch below is a compile error (the
    `assertNever` exhaustiveness guard); a seventh facet is likewise a compile error at every consumer. */
export type MembraneFacet =
    | "crest" //             1 · the TIL crest + home link (DockCrest)
    | "progress-rim" //      2 · the whole-doc conic (ScrollProgressRim)
    | "title-lozenge" //     3 · navLabel + breadcrumb + D's versal cap (net-new)
    | "stepper" //           4 · the nested Roman rungs (DockStepperRender)
    | "filter-trigger" //    7 · opens the route's filter drawer; no figure subject (DockFilterTrigger)
    | "data-state"; //       8 · year-range · save · dark (DockFoot, gated on declared content)

/** The dock band a facet renders in — the three-band instrument (§approach-3). */
export type MembraneBand = "persistent" | "scroll" | "foot";

/** The CLOSED roster, ordered crest→data-state. `satisfies` pins every entry to a union member (a typo
    or a non-member breaks compilation); the roster is a shipped fact the membrane stamps
    (`data-membrane-facets`) so the six-facet count is inspectable, not merely asserted. */
export const MEMBRANE_FACETS = [
    "crest",
    "progress-rim",
    "title-lozenge",
    "stepper",
    "filter-trigger",
    "data-state",
] as const satisfies readonly MembraneFacet[];

/** The exhaustiveness terminal — a seventh facet reaching here is NOT `never`, so this call fails to
    compile (the §c.2 "tsc surfaces a seventh member at every consumer" guarantee, in one place every
    total switch routes its `default` through). */
function assertNever(facet: never): never {
    throw new Error(`Unhandled membrane facet: ${String(facet)}`);
}

/** TOTAL — map each facet to its dock band. The `default: assertNever(facet)` makes a seventh union
    member a COMPILE ERROR here; the render sites gate their bands off this one truth. */
export function facetBand(facet: MembraneFacet): MembraneBand {
    switch (facet) {
        case "crest":
        case "progress-rim":
        case "title-lozenge":
            return "persistent";
        case "stepper":
            return "scroll";
        case "filter-trigger":
        case "data-state":
            return "foot";
        default:
            return assertNever(facet);
    }
}
