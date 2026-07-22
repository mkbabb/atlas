import type { CompletionSealShape } from "@mkbabb/glass-ui/completion-seal";
import type { DashboardCategory } from "../contract/index.js";

// The CATEGORY SKIN — the gallery's per-family PRESENTATION identity, and nothing more. Route
// theming left this module with the theme facility (P-05): a route's colour identity is its
// `Theme`, bound once by the platform shell, so the skin registry no longer carries chrome legs,
// an atmosphere, or a ramp, and no longer writes `--route-*` (the T-1 double-writer is dead — one
// token, one author). What remains is what the contents page and the category home actually
// render: the family's label, its chip accent, its field family, and its completion-seal shape.

export type BackgroundFamily = "aurora" | "constellation";
export type SkinBackground = "liquid-grid" | "watercolor-dot" | "blob";

/** THE CARD-FINGERPRINT CONTRACT (A-27 · home H6) — the miniature of a route's OWN instrument the
    contents-page card wears, so seven cards read as seven instruments and not seven identical
    rectangles. A CLOSED display-form vocabulary (the shared contract atlas owns); the consumer maps
    each route to its form and renders the per-route mark. Each name is the SHAPE of the route's
    signature figure — a decorative echo, never its data:
      · `flow-trunk`      — a diverging two-strand flow (the USF fund trunk).
      · `ribbon-fan`      — stacked ridge lines fanning open (the demand ridge).
      · `window-arc`      — an arc rising over a baseline (the ECF filing-window arc).
      · `rainbow-stack`   — an ascending spectral stack (the SCI band-cake).
      · `hex-field`       — a honeycomb of cells (the speedtest hex map).
      · `diverging-fleck` — a scatter with one outlying fleck (the integrity anomaly).
      · `trap`            — a sigmoid germination curve (the flytrap seed story).
    A small CLOSED union — a new route's form joins as a member, never a per-card fork. This is the
    seam the two dead skin husks vacated (T-2, zero declarers — struck on sight): the fingerprint is
    the gallery's real per-route presentation identity those husks never carried, never a revival. */
export type CardFingerprint =
    | "flow-trunk"
    | "ribbon-fan"
    | "window-arc"
    | "rainbow-stack"
    | "hex-field"
    | "diverging-fleck"
    | "trap";

/** One narrative family's rendered identity (the gallery card + the category-home hero). */
export interface CategorySkin {
    id: string;
    category: DashboardCategory;
    /** The field family the category home mounts behind its hero. */
    backgroundFamily: BackgroundFamily;
    label: string;
    accent: string;
    background: SkinBackground;
    shape: CompletionSealShape;
}

export function defineSkin<const Skin extends CategorySkin>(skin: Skin): Readonly<Skin> {
    return Object.freeze(skin);
}

export const SKINS = {
    funds: defineSkin({
        id: "funds",
        category: "funds",
        backgroundFamily: "constellation",
        label: "The funds",
        accent: "var(--viz-diverging-high)",
        background: "liquid-grid",
        shape: "wordmark",
    }),
    connectivity: defineSkin({
        id: "connectivity",
        category: "connectivity",
        backgroundFamily: "aurora",
        label: "Connectivity",
        accent: "var(--rainbow-signature-1)",
        background: "watercolor-dot",
        shape: "check",
    }),
    outcomes: defineSkin({
        id: "outcomes",
        category: "outcomes",
        backgroundFamily: "aurora",
        label: "Outcomes",
        accent: "var(--viz-speedtest-bright)",
        background: "blob",
        shape: "ring",
    }),
} as const satisfies Record<DashboardCategory, CategorySkin>;

export type SkinId = keyof typeof SKINS;

export function resolveSkin(id: SkinId): CategorySkin {
    return SKINS[id];
}
