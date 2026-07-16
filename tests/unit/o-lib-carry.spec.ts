// tests/unit/o-lib-carry.spec.ts — THE LIBRARY-CARRY CONSOLIDATION (O-LIB-CARRY, v1.0.28
// candidate). Live-source teeth for the 6 evidenced library gaps the O-arc's monorepo lane
// accumulated (EX-56/EX-58/EX-59/EX-63 findings). Follows the od3-vizplate-chrome /
// ex44-d21-rider live-source-scan idiom (no @vue/test-utils mount infra in this repo).
//
//   1. GalleryMasthead.vue — the `showEyebrow` suppression seam (O-D20 declutter).
//   2. GalleryMasthead.vue — the dead `footDelay` prop pruned (unused, unconsumed by its sole
//      consumer, GalleryView.vue in the monorepo).
//   3. recipes.css `title-compact` keyframe — re-wired to READ the `--title-rest-size`/
//      `--title-compact-size`/`--title-*-weight` indirection (page-title tokens as fallback);
//      type.css defines `--type-masthead-headline{,-compact}` (previously undefined anywhere).
//   4. VizPlate.vue / PlateSkeleton.vue — the loading/error/empty slot passthrough + the
//      PlateSkeleton caption slot (O-D24 find).
//   5. useScrollTimeline.ts — the D30-LIB standalone-scroll-host JS registration seam (the
//      scroll-driven.css enumerated-allowlist cure).
//   6. VizTextOverlay.vue / YearScrubber.vue — the D10-LIB `gutter` placement field + the
//      `dimYears` per-year notch-dim hook.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const GALLERY_MASTHEAD = read(
    "../../src/platform/chrome/masthead/GalleryMasthead.vue",
);
const RECIPES_CSS = read("../../src/design/recipes/recipes.css");
const TYPE_CSS = read("../../src/design/tokens/type.css");
const VIZ_PLATE = read("../../src/charts/frame/VizPlate.vue");
const PLATE_SKELETON = read("../../src/charts/frame/PlateSkeleton.vue");
const USE_SCROLL_TIMELINE = read("../../src/motion/useScrollTimeline.ts");
const VIZ_TEXT_OVERLAY = read("../../src/charts/legend/VizTextOverlay.vue");
const VIZ_CONTRACT = read("../../src/charts/contract/viz-contract.ts");
const YEAR_SCRUBBER = read(
    "../../src/filter/ui/components/YearScrubber.vue",
);

describe("O-LIB-CARRY 1 — GalleryMasthead.vue: the eyebrow-suppression seam (O-D20)", () => {
    it("declares an OPTIONAL `showEyebrow` prop, DEFAULT true (byte-identical to every existing mount)", () => {
        expect(GALLERY_MASTHEAD).toMatch(
            /withDefaults\(defineProps<\{\s*showEyebrow\?:\s*boolean\s*\}>\(\),\s*\{\s*showEyebrow:\s*true\s*\}\)/,
        );
    });

    it("gates the org kicker span on `showEyebrow` (the D20 4→3 text-row declutter)", () => {
        expect(GALLERY_MASTHEAD).toContain(
            '<span v-if="showEyebrow" class="eyebrow">{{ site.org }}</span>',
        );
    });

    it("keeps the surviving crest, wordmark, and tagline when the optional kicker is hidden", () => {
        const template = GALLERY_MASTHEAD.slice(
            GALLERY_MASTHEAD.indexOf("<template>"),
            GALLERY_MASTHEAD.indexOf("</template>"),
        );
        const wordmark = template.slice(template.indexOf("<h1"), template.indexOf("</h1>"));

        expect(template).toMatch(/<BrandMark\b/);
        expect(wordmark).toContain("Connectivity");
        expect(template).toMatch(/<p[^>]*>\{\{ site\.tagline \}\}<\/p>/);
    });
});

describe("O-LIB-CARRY 2 — GalleryMasthead.vue: the dead footDelay prop pruned", () => {
    it("no longer declares a `footDelay` prop (unused in its own template, never passed by its sole consumer)", () => {
        expect(GALLERY_MASTHEAD).not.toMatch(/footDelay/);
    });
});

describe("O-LIB-CARRY 3 — the title-compact keyframe reads the --title-* indirection (O-D20 EX-63 cure)", () => {
    const kf = RECIPES_CSS.slice(
        RECIPES_CSS.indexOf("@keyframes title-compact"),
        RECIPES_CSS.indexOf("@keyframes title-compact") + 600,
    );

    it("the `from` frame reads `--title-rest-size`/`--title-rest-weight`, falling back to the page-title tokens", () => {
        expect(kf).toMatch(
            /font-size:\s*var\(--title-rest-size,\s*var\(--type-page-title\)\)/,
        );
        expect(kf).toMatch(/font-weight:\s*var\(--title-rest-weight,\s*560\)/);
    });

    it("the `to` frame reads `--title-compact-size`/`--title-compact-weight`, falling back to the page-title-compact tokens", () => {
        expect(kf).toMatch(
            /font-size:\s*var\(--title-compact-size,\s*var\(--type-page-title-compact\)\)/,
        );
        expect(kf).toMatch(/font-weight:\s*var\(--title-compact-weight,\s*600\)/);
    });

    it("`.text-page-title` sets NONE of the four indirection vars (so it stays on the fallback path, byte-identical)", () => {
        const pageTitleRule = RECIPES_CSS.slice(
            RECIPES_CSS.indexOf(".text-page-title {"),
            RECIPES_CSS.indexOf("}", RECIPES_CSS.indexOf(".text-page-title {")),
        );
        expect(pageTitleRule).not.toMatch(/--title-rest-size/);
        expect(pageTitleRule).not.toMatch(/--title-compact-size/);
        expect(pageTitleRule).not.toMatch(/--title-rest-weight/);
        expect(pageTitleRule).not.toMatch(/--title-compact-weight/);
    });

    it("GalleryMasthead's `.masthead__wordmark` sets all four vars, re-pointing to the cover register", () => {
        expect(GALLERY_MASTHEAD).toMatch(
            /--title-rest-size:\s*var\(--type-masthead-headline\);/,
        );
        expect(GALLERY_MASTHEAD).toMatch(
            /--title-compact-size:\s*var\(--type-masthead-headline-compact\);/,
        );
        expect(GALLERY_MASTHEAD).toMatch(/--title-rest-weight:\s*560;/);
        expect(GALLERY_MASTHEAD).toMatch(/--title-compact-weight:\s*560;/);
    });

    it("`--type-masthead-headline` is now DEFINED (type.css) with an 88px @1440 cap (5.5rem) — was undefined anywhere pre-cure", () => {
        expect(TYPE_CSS).toMatch(
            /--type-masthead-headline:\s*clamp\(2\.75rem,\s*8vw,\s*5\.5rem\);/,
        );
    });

    it("`--type-masthead-headline-compact` is now DEFINED with a floor at the 44px page-title-REST floor (2.75rem — the covers-never-below-~44px law)", () => {
        expect(TYPE_CSS).toMatch(
            /--type-masthead-headline-compact:\s*clamp\(2\.75rem,/,
        );
    });

    it("the `masthead-headline` @utility (recipes.css) now reads the SAME token (single source, no drift)", () => {
        const utility = RECIPES_CSS.slice(
            RECIPES_CSS.indexOf("@utility masthead-headline {"),
            RECIPES_CSS.indexOf("}", RECIPES_CSS.indexOf("@utility masthead-headline {")),
        );
        expect(utility).toMatch(/font-size:\s*var\(--type-masthead-headline\);/);
    });
});

describe("O-LIB-CARRY 4a — VizPlate.vue: the loading/error/empty slot passthrough", () => {
    it("forwards a #loading scoped slot into PlateSkeleton's #caption slot, gated on slots.loading", () => {
        const skeleton = VIZ_PLATE.slice(
            VIZ_PLATE.indexOf("<PlateSkeleton v-if"),
            VIZ_PLATE.indexOf("</PlateSkeleton>") + "</PlateSkeleton>".length,
        );
        expect(skeleton).toMatch(/<template v-if="slots\.loading" #caption>/);
        expect(skeleton).toContain(
            '<slot name="loading" :contract-id="contract.id" />',
        );
    });

    it("forwards a #error default slot into the error PlateVoid, gated on slots.error", () => {
        const errorVoid = VIZ_PLATE.slice(
            VIZ_PLATE.indexOf("platePhase === 'error'") - 40,
            VIZ_PLATE.indexOf("platePhase === 'error'") + 400,
        );
        expect(errorVoid).toContain(
            '<slot v-if="slots.error" name="error" :contract-id="contract.id" />',
        );
    });

    it("forwards a #empty default slot into the empty PlateVoid, gated on slots.empty", () => {
        const emptyVoid = VIZ_PLATE.slice(
            VIZ_PLATE.indexOf("platePhase === 'empty'") - 40,
            VIZ_PLATE.indexOf("platePhase === 'empty'") + 400,
        );
        expect(emptyVoid).toContain(
            '<slot v-if="slots.empty" name="empty" :contract-id="contract.id" />',
        );
    });
});

describe("O-LIB-CARRY 4b — PlateSkeleton.vue: the caption slot", () => {
    it("declares an OPTIONAL #caption slot, gated on $slots.caption (absent by default)", () => {
        expect(PLATE_SKELETON).toContain(
            '<p v-if="$slots.caption" class="plate-skeleton__caption text-prose-muted">',
        );
        expect(PLATE_SKELETON).toContain('<slot name="caption" />');
    });

    it("the caption sits BELOW the plot silhouette, inside the reserved footprint (not a second box)", () => {
        const plotIdx = PLATE_SKELETON.indexOf('class="plate-skeleton__plot"');
        const captionIdx = PLATE_SKELETON.indexOf("$slots.caption");
        expect(plotIdx).toBeGreaterThan(-1);
        expect(captionIdx).toBeGreaterThan(plotIdx);
    });
});

describe("O-LIB-CARRY 5 — useScrollTimeline.ts: the D30-LIB standalone-host registration seam", () => {
    it("defines bindStandaloneScrollHost, applying the SAME declarations as scroll-driven.css's enumerated rule", () => {
        expect(USE_SCROLL_TIMELINE).toMatch(
            /function bindStandaloneScrollHost\(el: HTMLElement\): void \{/,
        );
        expect(USE_SCROLL_TIMELINE).toContain(
            'el.style.setProperty("animation", "scroll-tl-pos auto linear both");',
        );
        expect(USE_SCROLL_TIMELINE).toContain(
            'el.style.setProperty("animation-timeline", "view()");',
        );
        expect(USE_SCROLL_TIMELINE).toContain(
            'el.style.setProperty("animation-range", "cover 0% cover 100%");',
        );
    });

    it("skips a host that ALSO carries data-reveal-beat (the combined CSS rule owns that host)", () => {
        const fn = USE_SCROLL_TIMELINE.slice(
            USE_SCROLL_TIMELINE.indexOf("function bindStandaloneScrollHost"),
            USE_SCROLL_TIMELINE.indexOf("function unbindStandaloneScrollHost"),
        );
        expect(fn).toMatch(
            /if \(el\.hasAttribute\("data-reveal-beat"\)\) return;/,
        );
    });

    it("provides a symmetric unbind, removing exactly the three properties it set", () => {
        const fn = USE_SCROLL_TIMELINE.slice(
            USE_SCROLL_TIMELINE.indexOf("function unbindStandaloneScrollHost"),
            USE_SCROLL_TIMELINE.indexOf("/**", USE_SCROLL_TIMELINE.indexOf("function unbindStandaloneScrollHost")),
        );
        expect(fn).toContain('el.style.removeProperty("animation");');
        expect(fn).toContain('el.style.removeProperty("animation-timeline");');
        expect(fn).toContain('el.style.removeProperty("animation-range");');
    });

    it("is invoked from onMounted (native path only) and onBeforeUnmount, registering by mere composable use", () => {
        const mountBlock = USE_SCROLL_TIMELINE.slice(
            USE_SCROLL_TIMELINE.indexOf("onMounted(() => {"),
            USE_SCROLL_TIMELINE.indexOf("onBeforeUnmount(() => {"),
        );
        expect(mountBlock).toMatch(
            /if \(native && target\.value\) bindStandaloneScrollHost\(target\.value\);/,
        );
        const unmountBlock = USE_SCROLL_TIMELINE.slice(
            USE_SCROLL_TIMELINE.indexOf("onBeforeUnmount(() => {"),
        );
        expect(unmountBlock).toMatch(
            /unbindStandaloneScrollHost\(target\.value\);/,
        );
    });
});

describe("O-LIB-CARRY 6a — VizTextOverlay.vue: the `gutter` placement field (D10-LIB)", () => {
    it("exposes `gutter` on the canonical placement contract consumed by the overlay", () => {
        const placement = VIZ_CONTRACT.slice(
            VIZ_CONTRACT.indexOf("export interface VizAnnotationPlacement"),
            VIZ_CONTRACT.indexOf("export interface VizView"),
        );

        expect(VIZ_TEXT_OVERLAY).toContain("placements: VizAnnotationPlacement[];");
        expect(VIZ_TEXT_OVERLAY).not.toContain("VizPlacement");
        expect(placement).toMatch(/gutter\?:\s*number;/);
    });

    it("an axis-only Y placement anchors px at `gutter` (default 0, byte-identical when unset)", () => {
        const branch = VIZ_TEXT_OVERLAY.slice(
            VIZ_TEXT_OVERLAY.indexOf("} else if (p.y != null) {"),
            VIZ_TEXT_OVERLAY.indexOf("} else if (p.x != null) {"),
        );
        expect(branch).toMatch(/px = p\.gutter \?\? 0;/);
    });

    it("an axis-only X placement anchors py at `gutter` (the SAME lever, symmetric)", () => {
        const branch = VIZ_TEXT_OVERLAY.slice(
            VIZ_TEXT_OVERLAY.indexOf("} else if (p.x != null) {"),
            VIZ_TEXT_OVERLAY.indexOf("}\n            if (px == null"),
        );
        expect(branch).toMatch(/py = p\.gutter \?\? 0;/);
    });
});

describe("O-LIB-CARRY 6b — YearScrubber.vue: the dimYears per-year notch-dim hook (D10-LIB)", () => {
    it("declares an OPTIONAL `dimYears` prop, default empty (byte-identical to every existing consumer)", () => {
        expect(YEAR_SCRUBBER).toMatch(
            /dimYears\?:\s*ReadonlySet<number>\s*\|\s*readonly number\[\];/,
        );
        expect(YEAR_SCRUBBER).toMatch(/\{\s*dimYears:\s*\(\) => \[\]\s*\}/);
    });

    it("normalizes dimYears (Set OR array) into a lookup Set", () => {
        expect(YEAR_SCRUBBER).toMatch(
            /const dimYearSet = computed<ReadonlySet<number>>\(/,
        );
        expect(YEAR_SCRUBBER).toMatch(
            /props\.dimYears instanceof Set \? props\.dimYears : new Set\(props\.dimYears\)/,
        );
    });

    it("a dimmed pip stays CLICKABLE — the SAME @click handler, never a `disabled` attribute", () => {
        const track = YEAR_SCRUBBER.slice(
            YEAR_SCRUBBER.indexOf('class="year-scrubber__track"'),
            YEAR_SCRUBBER.indexOf("</button>"),
        );
        expect(track).toContain("@click=\"emit('pick', y)\"");
        expect(track).not.toMatch(/:disabled="dimYearSet/);
        expect(track).toMatch(/'year-scrubber__pip--dim':\s*dimYearSet\.has\(y\)/);
        expect(track).toMatch(/:aria-disabled="dimYearSet\.has\(y\) \? 'true' : undefined"/);
    });

    it("carries a stable data-year-absent test hook (present-when-true, the codebase's empty-string-attribute idiom)", () => {
        expect(YEAR_SCRUBBER).toMatch(
            /:data-year-absent="dimYearSet\.has\(y\) \? '' : undefined"/,
        );
    });

    it("the dim opacity rides the §elevation --attn-chrome tier (the receded-but-present control register)", () => {
        const rule = YEAR_SCRUBBER.slice(
            YEAR_SCRUBBER.indexOf(".year-scrubber__pip--dim {"),
            YEAR_SCRUBBER.indexOf("}", YEAR_SCRUBBER.indexOf(".year-scrubber__pip--dim {")),
        );
        expect(rule).toMatch(/opacity:\s*var\(--attn-chrome,\s*0\.46\);/);
    });
});
