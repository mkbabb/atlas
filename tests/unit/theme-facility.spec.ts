import { describe, expect, it } from "vitest";
import {
    AMERICA,
    defineTheme,
    themeCssVars,
    themeSheetViolations,
    THEME_REPOINT_ROSTER,
} from "../../src/contract/theme";

// The restraint theme's sheet, verbatim (dashboards/usf-integrity/styles/usfi-tokens.css — the
// light arm :21-37, the dark arm :41-46, the forced-colors arm :49-54, comments stripped). It is
// the α-K-3 ground: `--usfi-*` mints carry the pigment, and every roster member resolves to a
// `var(--usfi-*)` reference. An un-amended roster test would have REJECTED the fleet's cleanest
// sheet.
const RESTRAINT_SHEET = `
html[data-dashboard="usf-integrity"] {
  --usfi-oxblood: oklch(0.48 0.11 28);
  --usfi-slate:   oklch(0.52 0.06 250);
  --viz-diverging-low:  var(--usfi-oxblood);
  --viz-diverging-high: var(--usfi-slate);
  --cp-accent:     var(--usfi-slate);
  --cp-accent-ink: oklch(0.99 0.01 250);
}
html.dark[data-dashboard="usf-integrity"] {
  --usfi-oxblood: oklch(0.62 0.12 28);
  --usfi-slate:   oklch(0.66 0.08 250);
}
@media (forced-colors: active) {
  html[data-dashboard="usf-integrity"] {
    --cp-accent: LinkText;
    --cp-accent-ink: Canvas;
  }
}
html[data-dashboard="usf-integrity"] .dashboard-hero__eyebrow::before {
  background: var(--usfi-slate);
}
`;

// The earthtone sheet's INK block (dashboards/vft-germination/styles/vft-tokens.css:87-95) — the
// T-4 finding: `--ink-*` is DERIVED, so a root-marker re-point re-derives it through the cascade
// and a hand copy only drifts (this one pins the retired 0.52 light clamp). The law must reject it,
// or W-VFT's deletion is unfalsifiable.
const EARTHTONE_INK_BLOCK = `
html[data-dashboard="vft-germination"] {
  --viz-diverging-high: var(--vft-viz-low);
  --ink-diverging-high: light-dark(
    oklch(from var(--viz-diverging-high) min(l, 0.52) min(c, 0.17) h),
    oklch(from var(--viz-diverging-high) max(l, 0.75) min(c, 0.15) h));
  --ink-primary: light-dark(
    oklch(from var(--primary) min(l, 0.52) min(c, 0.17) h),
    oklch(from var(--primary) max(l, 0.75) min(c, 0.15) h));
}
`;

describe("the theme facility", () => {
    it("binds the SAME --route-* map the retired route-identity writer bound", () => {
        // Output-identical to the shell's previous `routeIdentityStyle` fold over usf's
        // chromeIdentity (dashboards/usf/context.ts:16-22, now AMERICA's chrome legs).
        expect(themeCssVars(AMERICA)).toEqual({
            "--route-accent": "var(--viz-diverging-low)",
            "--route-accent-warm":
                "color-mix(in oklab, var(--viz-diverging-low), var(--viz-diverging-high))",
            "--route-accent-cool": "var(--viz-diverging-high)",
            "--route-eyebrow-hue": "var(--viz-diverging-low)",
        });
        // An omitted leg falls through to the tokens.css `:root` default — it is never bound blank.
        expect(themeCssVars(defineTheme({ name: "bare", chrome: { accent: "teal" } }))).toEqual({
            "--route-accent": "teal",
        });
    });

    it("carries the ruled pole grammar and no deposition channel", () => {
        // Dial 16: receivers wear warm, payers go cool. The subjects are DATA — prose cites them.
        expect(AMERICA.poles).toEqual({
            warm: { token: "--viz-diverging-low", subject: "net receivers" },
            cool: { token: "--viz-diverging-high", subject: "net payers" },
        });
        expect(Object.keys(AMERICA.atmosphere ?? {})).toEqual(["warm", "cool", "biasCap"]);
        expect(Object.isFrozen(AMERICA)).toBe(true);
    });
});

describe("Law C-2 · the closed re-point roster", () => {
    it("passes both shipped theme sheets under the namespace-intermediate clause", () => {
        expect(themeSheetViolations(RESTRAINT_SHEET, "usfi")).toEqual([]);
    });

    it("rejects a derived --ink-* re-point (the T-4 shape) and the never-re-pointable families", () => {
        expect(themeSheetViolations(EARTHTONE_INK_BLOCK, "vft")).toEqual([
            "--ink-diverging-high",
            "--ink-primary",
        ]);
        const unlawful = `html[data-dashboard="sci"] {
            --rainbow-tier-4: #123456;
            --route-accent: var(--sci-green);
        }`;
        expect(themeSheetViolations(unlawful, "sci")).toEqual([
            "--rainbow-tier-4",
            "--route-accent",
        ]);
    });

    it("audits the marker only — a namespace mint and a route FIX rule pass through", () => {
        const fixes = `html[data-dashboard="sci"] .plate { aspect-ratio: 16 / 9; }
        :root { --anything-at-all: 1; }
        html[data-dashboard="sci"] { --sci-green: oklch(0.5 0.1 140); --viz-grid: var(--sci-green); }`;
        expect(themeSheetViolations(fixes, "sci")).toEqual([]);
        expect(THEME_REPOINT_ROSTER).toContain("--viz-grid");
        expect(THEME_REPOINT_ROSTER).not.toContain("--ink-primary");
    });
});
