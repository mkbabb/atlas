import type { Component } from "vue";
import type { HeroFacet } from "./editorial-contract.js";

export interface HeroSystemSource {
    /** The existing DashboardHero declaration; no second hero contract is minted. */
    readonly hero: HeroFacet;
}

export interface HeroSystem {
    readonly heroProps: Omit<HeroFacet, "provenance">;
    readonly provenance?: Component;
}

/**
 * Organize the existing DashboardHero tree. This is deliberately pure: no wrapper component,
 * clock, state owner, or parallel CSS system. (OF-22 · the atmosphere ghost-numeral yields, so
 * the cover no longer carries a chapter ordinal — the eyebrow is the sole numeral seat.)
 */
export function resolveHeroSystem(source: HeroSystemSource): HeroSystem {
    const { provenance, ...hero } = source.hero;
    return {
        heroProps: hero,
        ...(provenance ? { provenance } : {}),
    };
}
