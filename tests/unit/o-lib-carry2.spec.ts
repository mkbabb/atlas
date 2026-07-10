// tests/unit/o-lib-carry2.spec.ts — THE v1.0.29 LIBRARY MICRO-BATCH. Live-source teeth for the
// 3 evidenced EX-65 STOPs the monorepo O-LIB-CARRY consumer pack + O-B19/O-D24 impl packs named
// (arm-4's `dimYears` wire, the B19 colophon build-stamp, the D24/EX-65 retry suppressibility).
// Follows o-lib-carry.spec.ts's live-source-scan idiom (no @vue/test-utils mount infra here).
//
//   1. contract/types.ts / FilterPanel.vue — the DashboardContext `dimYears` getter, threaded
//      the rest of the way to YearScrubber (v1.0.28 shipped the scrubber's own prop, unreachable
//      from any consumer — this is the receiving end).
//   2. SiteColophon.vue — the `buildSha` prop, a subdued imprint line beside the til-mark row.
//   3. viz-contract.ts / useVizPlate.ts — `retryable: false` suppresses the error rung's action.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const CONTRACT_TYPES = read("../../src/contract/types.ts");
const FILTER_PANEL = read("../../src/filter/ui/FilterPanel.vue");
const SITE_COLOPHON = read("../../src/platform/chrome/masthead/SiteColophon.vue");
const VIZ_CONTRACT = read("../../src/charts/contract/viz-contract.ts");
const USE_VIZ_PLATE = read("../../src/charts/frame/useVizPlate.ts");

describe("O-LIB-CARRY2 1a — contract/types.ts: DashboardContext.dimYears", () => {
    it("declares an OPTIONAL dimYears GETTER (not a stored ref — the scrollYearGetter convention)", () => {
        expect(CONTRACT_TYPES).toMatch(
            /dimYears\?:\s*\(\)\s*=>\s*ReadonlySet<number>\s*\|\s*readonly number\[\];/,
        );
    });

    it("sits on DashboardContext beside crossLinks/hasMultiYear (the fields FilterPanel already reads off the injected context)", () => {
        const start = CONTRACT_TYPES.indexOf("export interface DashboardContext");
        const iface = CONTRACT_TYPES.slice(
            start,
            CONTRACT_TYPES.indexOf("atmosphere?: AtmosphereFacet;", start),
        );
        expect(iface).toMatch(/hasMultiYear:\s*boolean;/);
        expect(iface).toMatch(/crossLinks\?:/);
        expect(iface).toMatch(/dimYears\?:/);
    });
});

describe("O-LIB-CARRY2 1b — FilterPanel.vue: the dimYears passthrough to YearScrubber", () => {
    it("normalizes ctx.dimYears() into a computed, defaulting to empty (undeclared ⇒ no dimming)", () => {
        expect(FILTER_PANEL).toMatch(
            /const dimYears = computed<ReadonlySet<number> \| readonly number\[\]>\(\s*\(\) => ctx\?\.dimYears\?\.\(\) \?\? \[\],?\s*\);/,
        );
    });

    it("reads the context directly (inject), never requiring the mount site (DashboardView.vue) to prop-drill it — the props surface stays byte-identical", () => {
        expect(FILTER_PANEL).toMatch(/const ctx = inject\(DASHBOARD_KEY\);/);
        expect(FILTER_PANEL).toMatch(
            /const props = defineProps<\{ body\?: Component \}>\(\);/,
        );
    });

    it("binds :dim-years on the YearScrubber mount, alongside years/mode/active-year", () => {
        const mount = FILTER_PANEL.slice(
            FILTER_PANEL.indexOf("<YearScrubber"),
            FILTER_PANEL.indexOf("/>", FILTER_PANEL.indexOf("<YearScrubber")),
        );
        expect(mount).toContain(':years="scrubberYears"');
        expect(mount).toContain(':mode="yearMode"');
        expect(mount).toContain(':active-year="activeYear"');
        expect(mount).toContain(':dim-years="dimYears"');
    });
});

describe("O-LIB-CARRY2 2 — SiteColophon.vue: the buildSha imprint", () => {
    it("declares an OPTIONAL buildSha?: string prop, default undefined (byte-identical when omitted)", () => {
        expect(SITE_COLOPHON).toMatch(/buildSha\?:\s*string;/);
        expect(SITE_COLOPHON).toMatch(/buildSha:\s*undefined,/);
    });

    it("renders the stamp beside the til-mark row (crest / asOf / brand link), gated on buildSha", () => {
        const tilMark = SITE_COLOPHON.slice(
            SITE_COLOPHON.indexOf('class="til-mark'),
            SITE_COLOPHON.indexOf("</div>", SITE_COLOPHON.indexOf('class="til-mark')),
        );
        expect(tilMark).toContain('data-testid="colophon-crest"');
        expect(tilMark).toContain("colophon.asOf");
        expect(tilMark).toContain('class="colophon__brand"');
        expect(tilMark).toMatch(/<span v-if="buildSha" class="text-caption colophon__build"/);
        expect(tilMark).toContain("Build {{ buildSha }}");
    });

    it("the imprint rides the SAME --type-caption scale + muted ink as asOf/provenance (text-caption), set in mono + one notch fainter", () => {
        const rule = SITE_COLOPHON.slice(
            SITE_COLOPHON.indexOf(".colophon__build {"),
            SITE_COLOPHON.indexOf("}", SITE_COLOPHON.indexOf(".colophon__build {")),
        );
        expect(rule).toMatch(/font-family:\s*var\(--font-mono\);/);
        expect(rule).toMatch(/opacity:\s*0\.75;/);
        // no font-size/color override — those ride the reused `text-caption` utility class.
        expect(rule).not.toMatch(/font-size:/);
        expect(rule).not.toMatch(/color:/);
    });
});

describe("O-LIB-CARRY2 3a — viz-contract.ts: VizContract.retryable", () => {
    it("declares an OPTIONAL retryable?: boolean, beside retryLabel", () => {
        const idx = VIZ_CONTRACT.indexOf("retryLabel?: string;");
        expect(idx).toBeGreaterThan(-1);
        const after = VIZ_CONTRACT.slice(idx, idx + 1200);
        expect(after).toMatch(/retryable\?:\s*boolean;/);
    });
});

describe("O-LIB-CARRY2 3b — useVizPlate.ts: retryable:false suppresses the error action", () => {
    it("errorAction resolves to undefined when contract.retryable === false, else the {label,onClick} action", () => {
        const block = USE_VIZ_PLATE.slice(
            USE_VIZ_PLATE.indexOf("const errorAction = computed"),
            USE_VIZ_PLATE.indexOf(");", USE_VIZ_PLATE.indexOf("const errorAction = computed")) + 2,
        );
        expect(block).toMatch(/props\.contract\.retryable === false/);
        expect(block).toMatch(/\?\s*undefined\s*:/);
        expect(block).toMatch(/label:\s*props\.contract\.retryLabel\s*\?\?\s*"Try again"/);
        expect(block).toMatch(/onClick:\s*onRetry/);
    });

    it("VizPlate.vue's error PlateVoid still binds :action to this SAME computed (no change needed there — undefined ⇒ PlateVoid's own v-if=\"action\" renders no button)", () => {
        const VIZ_PLATE = read("../../src/charts/frame/VizPlate.vue");
        const errorVoid = VIZ_PLATE.slice(
            VIZ_PLATE.indexOf("platePhase === 'error'") - 40,
            VIZ_PLATE.indexOf("platePhase === 'error'") + 300,
        );
        expect(errorVoid).toMatch(/:action="errorAction"/);
    });

    it("PlateVoid.vue's action button stays gated on v-if=\"action\" (the absent-not-disabled contract this lever relies on)", () => {
        const PLATE_VOID = read("../../src/charts/frame/PlateVoid.vue");
        expect(PLATE_VOID).toMatch(/<button\s*\n?\s*v-if="action"/);
    });
});
