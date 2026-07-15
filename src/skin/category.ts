import type { CompletionSealShape } from "@mkbabb/glass-ui/completion-seal";
import type { DashboardCategory } from "@/contract";

export type SkinBackground = "liquid-grid" | "watercolor-dot" | "blob";

export interface CategorySkin {
    label: string;
    accent: string;
    background: SkinBackground;
    shape: CompletionSealShape;
}

export const CATEGORY_SKINS = {
    funds: {
        label: "The funds",
        accent: "var(--viz-diverging-high)",
        background: "liquid-grid",
        shape: "wordmark",
    },
    connectivity: {
        label: "Connectivity",
        accent: "var(--rainbow-signature-1)",
        background: "watercolor-dot",
        shape: "check",
    },
    outcomes: {
        label: "Outcomes",
        accent: "var(--viz-speedtest-bright)",
        background: "blob",
        shape: "ring",
    },
} as const satisfies Record<DashboardCategory, CategorySkin>;

export function resolveCategorySkin(category: DashboardCategory): CategorySkin {
    return CATEGORY_SKINS[category];
}
