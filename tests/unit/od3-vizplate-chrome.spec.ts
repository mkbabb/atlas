// tests/unit/od3-vizplate-chrome.spec.ts — O-D3 ACCEPTANCE teeth at the live-source layer (this
// library's DOM-less test idiom — no @vue/test-utils mount infra exists here, so structural/CSS
// contract checks read LIVE source off disk, matching the ex44-d21-rider / oa22-redundant-channel
// precedent). Covers:
//
//   (1) G14 — the 44px toolbar hit-floor: the compact dock-icon-button + dock-trigger override
//       hooks on `.viz-dock` (Filters/Enlarge/Download), the ExpandableContainer `[data-part=
//       trigger]` pad (Expand), and the YearScrubber pip block-axis pad (the scrub handle).
//   (2) the floating FILTERS pill kill — `.cp-filter-trigger` is gone from FilterPanel.vue, and
//       the two lawful doors (dock pull-out + per-plate icon) are untouched.
//   (3) the plate-foot ledger band — ONE `.viz-plate__foot` row hosting the `#provenance` slot
//       when filled, the `VizKeyStats` stat-band fallback when not, never both.
//   (4) the shell landmarks — `<header role=banner>` in PlatformShell, `tabindex="-1"` on
//       `#main-content`, `<footer role=contentinfo>` on SiteColophon.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const VIZ_PLATE = read("../../src/charts/frame/VizPlate.vue");
const VIZ_PLATE_CSS = read("../../src/charts/frame/VizPlate.css");
const CHART_FRAME_CSS = read("../../src/charts/frame/ChartFrame.css");
const YEAR_SCRUBBER = read("../../src/filter/ui/components/YearScrubber.vue");
const FILTER_PANEL = read("../../src/filter/ui/FilterPanel.vue");
const DOCK_FOOT = read("../../src/platform/chrome/dock/components/DockFoot.vue");
const PLATFORM_SHELL = read("../../src/platform/chrome/shell/PlatformShell.vue");
const SITE_COLOPHON = read("../../src/platform/chrome/masthead/SiteColophon.vue");

// The `.viz-dock {…}` RULE BODY (not the doc-comment above it, which also mentions the class
// name in prose) — sliced from the rule's own opening brace to its OWN closing brace.
const vizDockRuleStart = VIZ_PLATE_CSS.indexOf(".viz-dock {");
const vizDockRule = VIZ_PLATE_CSS.slice(
    vizDockRuleStart,
    VIZ_PLATE_CSS.indexOf("}", vizDockRuleStart),
);

describe("O-D3 G14 — the 44px toolbar hit-floor", () => {
    it("`.viz-dock` re-points the compact dock-icon-button padding hook to the 44px floor (16px glyph + 2×14px)", () => {
        expect(vizDockRule).toMatch(/--dock-compact-control-padding:\s*0\.875rem/);
    });

    it("`.viz-dock` re-points the dock-trigger padding hooks (the Download control) to the SAME floor", () => {
        expect(vizDockRule).toMatch(/--dock-trigger-padding-block:\s*0\.875rem/);
        expect(vizDockRule).toMatch(/--dock-trigger-padding-inline:\s*0\.875rem/);
    });

    it("the glyph itself is untouched (still the 1rem/16px rung the padding hooks size around)", () => {
        expect(VIZ_PLATE_CSS).toMatch(/\.viz-dock__glyph\s*{\s*width:\s*1rem;\s*height:\s*1rem;/);
    });

    it("ChartFrame pads the ExpandableContainer's `[data-part=trigger]` (the Expand control) to 44×44", () => {
        const start = CHART_FRAME_CSS.indexOf('.frame-expand :deep([data-part="trigger"]) {');
        const rule = CHART_FRAME_CSS.slice(start, CHART_FRAME_CSS.indexOf("\n}", start));
        expect(rule).toMatch(/min-width:\s*44px/);
        expect(rule).toMatch(/min-height:\s*44px/);
    });

    it("the YearScrubber pip pads its block axis to the 44px floor (the flagged axis; inline stays a flex share)", () => {
        const pip = YEAR_SCRUBBER.slice(
            YEAR_SCRUBBER.indexOf(".year-scrubber__pip {"),
            YEAR_SCRUBBER.indexOf(".year-scrubber__pip-dot"),
        );
        expect(pip).toMatch(/min-block-size:\s*44px/);
    });
});

describe("O-D3 — the floating FILTERS pill kill (render-A cross-route; L33 X9)", () => {
    it("FilterPanel.vue no longer mounts `.cp-filter-trigger` (the floating top-right summon door)", () => {
        // The class/testid survive only as PROSE in the retirement comment (documenting what
        // used to live here) — never as a live `class="…"`/`data-testid="…"` attribute or a CSS
        // rule selector.
        expect(FILTER_PANEL).not.toContain('class="cp-filter-trigger"');
        expect(FILTER_PANEL).not.toContain('data-testid="mobile-filter-trigger"');
        expect(FILTER_PANEL).not.toMatch(/^\.cp-filter-trigger\b/m);
    });

    it("the drawer itself + its shared `open` model survive untouched (the pill kill is door-only, not feature-loss)", () => {
        expect(FILTER_PANEL).toContain('data-testid="filter-panel"');
        expect(FILTER_PANEL).toContain("useFilterPane");
    });

    it("the dock pull-out door (desktop row) still drives the SAME shared open flag", () => {
        expect(DOCK_FOOT).toContain('data-testid="dock-filter-pullout"');
        expect(DOCK_FOOT).toContain("useFilterPane");
    });

    it("the per-plate filter icon (VizPlate's own door) is untouched", () => {
        expect(VIZ_PLATE).toContain("viz-dock-filter-toggle");
    });
});

describe("O-D3 — the plate-foot ledger band ([ANSWERS Q-53]; L34 §1.2.13, R-020 CD-10)", () => {
    const foot = VIZ_PLATE.slice(
        VIZ_PLATE.indexOf('class="viz-plate__foot"') - 200,
        VIZ_PLATE.indexOf('class="viz-plate__foot"') + 700,
    );

    it("hosts a single always-on-but-quiet band gated on provenance OR the figure phase OR a filled foot slot", () => {
        expect(foot).toMatch(
            /v-if="provenance \|\| platePhase === 'figure' \|\| slots\.foot"/,
        );
        expect(foot).toContain('data-testid="viz-plate-foot"');
    });

    it("the provenance slot wins when declared", () => {
        expect(foot).toMatch(/<slot\s+v-if="provenance"\s+name="provenance"/);
    });

    it("the stat band (VizKeyStats) is the v-else-if fallback — never co-rendered with provenance", () => {
        expect(foot).toMatch(/<VizKeyStats\s+v-else-if="platePhase === 'figure'"/);
    });

    it("EX-51 · O-D12 residue 2 — the ADDITIVE #foot slot seats a consumer fragment in the SAME ruled row (empty for every plate that does not fill it)", () => {
        expect(VIZ_PLATE).toContain('<slot name="foot" :contract-id="contract.id" />');
    });

    it("the band draws its own hairline rule (matching ProvenanceBar's own recipe) so either branch reads as ONE ruled row", () => {
        expect(VIZ_PLATE_CSS).toMatch(
            /\.viz-plate__keystats\s*{\s*padding-block-start:\s*0\.6rem;\s*border-block-start:\s*1px solid/,
        );
    });
});

describe("O-D3 — the shell landmarks (a11y PLAT-6/PLAT-8)", () => {
    it("PlatformShell exposes a top-level `<header role=banner>` around the dock (no route exposed one before)", () => {
        expect(PLATFORM_SHELL).toMatch(/<header\s+role="banner"\s+class="platform-shell__dock-slot">/);
    });

    it("the skip target `#main-content` is programmatically focusable (`tabindex=\"-1\"`)", () => {
        const main = PLATFORM_SHELL.slice(
            PLATFORM_SHELL.indexOf('id="main-content"') - 40,
            PLATFORM_SHELL.indexOf('id="main-content"') + 200,
        );
        expect(main).toMatch(/tabindex="-1"/);
    });

    it("SiteColophon exposes `<footer role=contentinfo>` (the a11y.md worked example: a nested `<footer>` that used to register as nothing)", () => {
        expect(SITE_COLOPHON).toMatch(/<footer\s*\n\s*role="contentinfo"/);
        expect(SITE_COLOPHON).toContain("</footer>");
        expect(SITE_COLOPHON).not.toContain("</aside>");
    });
});
