import type { Component } from "vue";
import type { CompletionSealShape } from "@mkbabb/glass-ui/completion-seal";
import type {
    AtmosphereFacet,
    ChromeIdentity,
    DashboardCategory,
} from "@/contract";

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

/** Backward-compatible name for existing editorial consumers; `SKINS` is the public keystone. */
export const CATEGORY_SKINS = SKINS;

export function resolveCategorySkin(category: DashboardCategory): CategorySkin {
    return SKINS[category];
}
