// The alternate registry and the legacy cross-component selection binding. Same-instance
// alternatives are represented by VizSetContract; cross-instance consumers retain this binding.

import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { VizSetContract } from "@/charts/viz-set";

/** A VIZ ALTERNATE — one selectable substitute for a base viz. The descriptor the expand menu binds +
    the storybook catalogs; the COMPONENT is the named WG-D owner's (deferred). */
export interface VizAlternate {
    /** The alternate viz id (the option value — e.g. `"beeswarm"`). */
    id: string;
    /** The expand-menu label (the human option copy). */
    label: string;
    /** The BASE viz id this alternate substitutes for (e.g. `"usf-ranked-strip"`). */
    base: string;
    /** Phone-legible at 390 (the Q-30 mobile-compat tooth — an alternate that crops/overflows at 390
        FAILS its owner's CH-D M1 tooth). Every DECLARED alternate targets `true`; the owner's build
        proves it. */
    mobileCompat: boolean;
    /** The named WG-D owner wave that BUILDS the component (deferral contract R4). */
    owner: string;
    /** Whether the COMPONENT ships yet. The facility declares ALL alternates (`built:false` until the
        owner lands it); `built:true` means a real component is wired via `useVizAlternates` at its
        base's own beat — never a claim ahead of the code (O-X12 truth-up: `built:true` must mean
        built, checked both directions — a shipped component marked `false` is as much a lie as an
        unbuilt one marked `true`). */
    built: boolean;
    /** Same mounted ECharts instance vs an explicit component swap. */
    morph: "same-instance" | "cross-instance";
}

/** Registry rows reflect current shipped consumers and tracked Speedtest alternatives. */
export const VIZ_ALTERNATES: readonly VizAlternate[] = Object.freeze([
    { id: "beeswarm", label: "Beeswarm", base: "sci-scatter", mobileCompat: true, owner: "O-D10", built: true, morph: "same-instance" },
    { id: "packed-bars", label: "Packed bars", base: "ecf-treemap", mobileCompat: true, owner: "O-D14", built: true, morph: "cross-instance" },
    { id: "lollipop", label: "Lollipop", base: "ecf-bars", mobileCompat: true, owner: "O-D14", built: true, morph: "cross-instance" },
    { id: "county-choropleth", label: "County choropleth", base: "speedtest-hex", mobileCompat: true, owner: "O-D16", built: false, morph: "cross-instance" },
    { id: "dot-density", label: "Dot density", base: "speedtest-hex", mobileCompat: true, owner: "O-D16", built: false, morph: "cross-instance" },
]);

export interface VizAlternateWorld {
    mountedViewSets: Readonly<Record<string, VizSetContract | undefined>>;
    wiredCrossInstanceBases: ReadonlySet<string>;
}

/** Registry claims and mounted/wired surfaces must agree in both directions. */
export function assertVizAlternateTruthUp(
    registry: readonly VizAlternate[],
    world: VizAlternateWorld,
): string[] {
    const violations: string[] = [];
    const mounted = Object.entries(world.mountedViewSets).filter(
        (entry): entry is [string, VizSetContract] => entry[1] !== undefined,
    );
    if (mounted.length === 0 && world.wiredCrossInstanceBases.size === 0)
        violations.push("truth-up world is empty");

    for (const alternate of registry) {
        if (alternate.morph === "same-instance") {
            const present = world.mountedViewSets[alternate.base]?.views.some(
                (view) => view.id === alternate.id,
            );
            if (alternate.built && !present)
                violations.push(`${alternate.id}: built same-instance alternate has no VizView`);
            if (!alternate.built && present)
                violations.push(`${alternate.id}: built:false alternate has a VizView`);
        } else if (
            alternate.built &&
            !world.wiredCrossInstanceBases.has(alternate.base)
        ) {
            violations.push(
                `${alternate.id}: built cross-instance alternate has no wired consumer`,
            );
        }
    }

    for (const [base, set] of mounted) {
        for (const view of set.views.slice(1)) {
            const alternate = registry.find((item) => item.base === base && item.id === view.id);
            if (!alternate)
                violations.push(`${base}/${view.id}: mounted VizView has no registry alternate`);
            else if (alternate.morph !== "same-instance")
                violations.push(`${base}/${view.id}: mounted VizView is not same-instance`);
            else if (!alternate.built)
                violations.push(`${base}/${view.id}: mounted VizView is marked built:false`);
        }
    }
    return violations;
}

/** A per-plate EXPAND-MENU OPTION — the base viz itself PLUS each of its alternates, rendered as a
    selectable list. The base is always `id === base` (the default option); the alternates follow. */
export interface VizAlternateOption {
    /** The option value — the base viz id (the default) or an alternate id. */
    id: string;
    /** The menu label. */
    label: string;
    /** True for the base viz option (the un-substituted default). */
    isBase: boolean;
    /** Phone-legible at 390 (the base is always compat; an alternate carries its own flag). */
    mobileCompat: boolean;
    /** Whether the option is renderable yet (the base always; an alternate iff its component ships). */
    built: boolean;
}

/** The alternates declared for a base viz id (empty ⇒ the base has no alternates). */
export function alternatesFor(base: string): VizAlternate[] {
    return VIZ_ALTERNATES.filter((a) => a.base === base);
}

/** THE EXPAND-MENU OPTIONS for a base viz — the base itself (the default) followed by each alternate.
    The ONE list the per-plate expand menu binds; `baseLabel` names the default option (defaults to the
    base id). A base with no alternates yields the single base option (the menu is then inert). */
export function vizMenuOptions(base: string, baseLabel?: string): VizAlternateOption[] {
    const baseOption: VizAlternateOption = {
        id: base,
        label: baseLabel ?? base,
        isBase: true,
        mobileCompat: true,
        built: true,
    };
    const alts = alternatesFor(base).map(
        (a): VizAlternateOption => ({
            id: a.id,
            label: a.label,
            isBase: false,
            mobileCompat: a.mobileCompat,
            built: a.built,
        }),
    );
    return [baseOption, ...alts];
}

/** The per-plate expand-menu BINDING return surface (the named-return floor). */
export interface UseVizAlternatesReturn {
    /** The selectable options — the base (default) + its alternates. */
    options: ComputedRef<VizAlternateOption[]>;
    /** The currently selected viz id (defaults to the base). */
    selected: Ref<string>;
    /** Whether the base viz has any alternate (the menu is worth showing). */
    hasAlternates: ComputedRef<boolean>;
    /** Select an option by id — no-op for an unknown id (total). */
    select(id: string): void;
    /** Reset to the base viz (the default option). */
    reset(): void;
}

/** THE PER-PLATE EXPAND-MENU BINDING — a base viz id → its selectable options + a selected ref. A plate
    binds this to surface its alternates through the expand menu; selecting an option swaps the rendered
    viz-type. The COMPONENT swap is the plate's (the WG-D component); this binding owns the SELECTION. */
export function useVizAlternates(base: string, baseLabel?: string): UseVizAlternatesReturn {
    const options = computed(() => vizMenuOptions(base, baseLabel));
    const selected = ref<string>(base);
    const hasAlternates = computed(() => alternatesFor(base).length > 0);
    const ids = computed(() => new Set(options.value.map((o) => o.id)));
    return {
        options,
        selected,
        hasAlternates,
        select(id: string): void {
            if (ids.value.has(id)) selected.value = id;
        },
        reset(): void {
            selected.value = base;
        },
    };
}

/** A storybook CATALOG group — one base viz + its full option list (base + alternates). */
export interface VizAlternateCatalogGroup {
    base: string;
    options: VizAlternateOption[];
}

/** THE STORYBOOK CATALOG — the grouped gallery data source (one group per base viz that HAS an
    alternate). The repo carries no storybook harness, so this EXPORT is the storybook facility: a
    gallery/storybook route iterates it to render every base ⇄ its alternates. Derived from the registry
    (single source), so a new alternate appears in the catalog automatically. */
export const VIZ_ALTERNATE_CATALOG: readonly VizAlternateCatalogGroup[] = Object.freeze(
    Array.from(new Set(VIZ_ALTERNATES.map((a) => a.base))).map(
        (base): VizAlternateCatalogGroup => ({ base, options: vizMenuOptions(base) }),
    ),
);
