import type { Component } from "vue";
import type { HeroFacet } from "./editorial-contract.js";

export interface HeroSystemSource {
    /** The same ordinal that the chapter masthead announces. */
    readonly ordinal: number;
    /** The existing DashboardHero declaration; no second hero contract is minted. */
    readonly hero: HeroFacet;
}

export interface HeroSystem {
    readonly heroProps: Omit<HeroFacet, "provenance"> & { readonly ordinal: number };
    readonly provenance?: Component;
}

/**
 * Organize the existing DashboardHero tree and its chapter-owned numeral. This is
 * deliberately pure: no wrapper component, clock, state owner, or parallel CSS system.
 */
export function resolveHeroSystem(source: HeroSystemSource): HeroSystem {
    const { provenance, ...hero } = source.hero;
    return {
        heroProps: { ...hero, ordinal: source.ordinal },
        ...(provenance ? { provenance } : {}),
    };
}
