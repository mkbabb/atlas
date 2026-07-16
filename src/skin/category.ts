import { inject, type Component, type InjectionKey } from "vue";
import type { CompletionSealShape } from "@mkbabb/glass-ui/completion-seal";
import type {
    AtmosphereFacet,
    ChromeIdentity,
    DashboardCategory,
} from "../contract/index.js";

export type BackgroundFamily = "aurora" | "constellation";
export type SkinBackground = "liquid-grid" | "watercolor-dot" | "blob";

export interface SkinTypeScale {
    masthead?: string;
    audacious?: string;
}

export interface SkinCover {
    versal?: Component;
    device?: Component;
}

interface SkinBase {
    id: string;
    category: DashboardCategory;
    atmosphere: AtmosphereFacet;
    chrome: ChromeIdentity;
    barometerRamp?: readonly string[];
    type?: SkinTypeScale;
    cover?: SkinCover;
}

/** Data surfaces preserve the platform's aurora-only decision at compile time. */
export type DataSkinContract = SkinBase & {
    surfaceKind: "data";
    backgroundFamily: "aurora";
};

/** Brand surfaces may opt into either shipped field family. */
export type BrandSkinContract = SkinBase & {
    surfaceKind: "brand";
    backgroundFamily: BackgroundFamily;
};

export type SkinContract = DataSkinContract | BrandSkinContract;

/** The category-home presentation fields retained beside the first-class skin contract. */
export type CategorySkin = BrandSkinContract & {
    label: string;
    accent: string;
    background: SkinBackground;
    shape: CompletionSealShape;
};

export function defineSkin<const Skin extends SkinContract>(skin: Skin): Readonly<Skin> {
    return Object.freeze(skin);
}

export const SKINS = {
    funds: defineSkin({
        id: "funds",
        category: "funds",
        surfaceKind: "brand",
        backgroundFamily: "constellation",
        atmosphere: {},
        chrome: { accent: "var(--viz-diverging-high)" },
        label: "The funds",
        accent: "var(--viz-diverging-high)",
        background: "liquid-grid",
        shape: "wordmark",
    }),
    connectivity: defineSkin({
        id: "connectivity",
        category: "connectivity",
        surfaceKind: "brand",
        backgroundFamily: "aurora",
        atmosphere: {},
        chrome: { accent: "var(--rainbow-signature-1)" },
        label: "Connectivity",
        accent: "var(--rainbow-signature-1)",
        background: "watercolor-dot",
        shape: "check",
    }),
    outcomes: defineSkin({
        id: "outcomes",
        category: "outcomes",
        surfaceKind: "brand",
        backgroundFamily: "aurora",
        atmosphere: {},
        chrome: { accent: "var(--viz-speedtest-bright)" },
        label: "Outcomes",
        accent: "var(--viz-speedtest-bright)",
        background: "blob",
        shape: "ring",
    }),
} as const satisfies Record<DashboardCategory, CategorySkin>;

export type SkinId = keyof typeof SKINS;

/** The resolved story skin shared by the essay subtree. */
export const SKIN_KEY: InjectionKey<Readonly<SkinContract>> = Symbol("atlas:skin");

export function resolveSkin(id: SkinId): CategorySkin {
    return SKINS[id];
}

/** Bind a skin through the same inherited token contract as the platform shell. */
export function skinCssVars(skin: SkinContract): Record<string, string> {
    const { chrome, type } = skin;
    const style: Record<string, string> = { "--route-accent": chrome.accent };
    if (chrome.accentWarm) style["--route-accent-warm"] = chrome.accentWarm;
    if (chrome.accentCool) style["--route-accent-cool"] = chrome.accentCool;
    if (chrome.eyebrowHue) style["--route-eyebrow-hue"] = chrome.eyebrowHue;
    if (type?.audacious) style["--q1-rung"] = type.audacious;
    if (type?.masthead) style["--type-masthead-headline"] = type.masthead;
    return style;
}

export function useSkin(): Readonly<SkinContract> | null {
    return inject(SKIN_KEY, null);
}
