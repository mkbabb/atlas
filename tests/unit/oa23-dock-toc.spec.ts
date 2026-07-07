// tests/unit/oa23-dock-toc.spec.ts — O-A23 ACCEPTANCE teeth at the pure-mechanism + live-source
// layer (this library's DOM-less test idiom — the pure-composable proof + the gate corpus's "read LIVE
// source off disk" scan, mirroring oa22-redundant-channel):
//
//   · useDockViewMode — the stepper ⇄ TOC register: default stepper, toggle flips, setMode, initial.
//   · DockTOC.vue (live source) — the interim list renders the roster + emits the deep-link INTENT;
//     the OWNER-HELD glass-abstraction flag is a REAL marked seam (const + WG-E comment + it GATES the
//     list); scroll-jack-free (0 preventDefault, 0 wheel/touch capture, 0 new observer — a pure reader
//     of the shared active-beat store).
//   · Dock.vue (live source) — the stepper stays MOUNTED under the TOC (v-show, not v-if unmount); the
//     TOC is a TOGGLED second mode (<Transition> + v-if showTOC); the deep-link routes through the
//     shared O-A3 anchor machinery (scrollToSection); the foot toggle is wired.
//   · DockFoot.vue (live source) — the view-mode toggle control (aria-pressed + testid + emit).
//   · scroll-anchor.ts — the ONE shared anchor primitive both view-modes consume (the stepper delegates).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { useDockViewMode } from "@/platform/chrome/dock/composables/useDockViewMode";
import { scrollToSection } from "@/platform/chrome/dock/scroll-anchor";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const TOC = read("../../src/platform/chrome/dock/components/DockTOC.vue");
const DOCK = read("../../src/platform/chrome/dock/Dock.vue");
const FOOT = read("../../src/platform/chrome/dock/components/DockFoot.vue");
const STEPPER = read(
    "../../src/platform/chrome/dock/composables/useDockStepper.ts",
);

describe("O-A23 · useDockViewMode — the stepper ⇄ TOC register (a SECOND mode, toggled)", () => {
    it("defaults to the STEPPER (the TOC is the opt-in second view-mode, never the default)", () => {
        const { mode, isTOC } = useDockViewMode();
        expect(mode.value).toBe("stepper");
        expect(isTOC.value).toBe(false);
    });

    it("toggle FLIPS stepper ⇄ toc (not a one-way replacement)", () => {
        const { mode, isTOC, toggle } = useDockViewMode();
        toggle();
        expect(mode.value).toBe("toc");
        expect(isTOC.value).toBe(true);
        toggle();
        expect(mode.value).toBe("stepper");
        expect(isTOC.value).toBe(false);
    });

    it("setMode sets explicitly + the initial arg is honoured", () => {
        const { mode, setMode } = useDockViewMode("toc");
        expect(mode.value).toBe("toc");
        setMode("stepper");
        expect(mode.value).toBe("stepper");
    });
});

describe("O-A23 · DockTOC.vue — the interim latex-paper list + the deep-link intent", () => {
    it("renders the route roster (ctx.nav) as a clickable list", () => {
        expect(TOC).toContain("v-for=\"(item, i) in ctx.nav\"");
        expect(TOC).toContain("class=\"usf-toc__list\"");
    });

    it("a beat row CLICK emits the deep-link INTENT (select), not a self-scroll (pure leaf)", () => {
        // the leaf emits `select(id)`; the orchestrator owns the scroll (mirrors DockNavItem).
        expect(TOC).toContain("select: [id: string]");
        expect(TOC).toContain("@click=\"emit('select', item.id)\"");
        // it never scrolls the document itself — no scrollIntoView CALL in the leaf (the `.call(`
        // pattern, so the prose naming the shared machinery in a comment is not a false positive).
        expect(TOC).not.toMatch(/\.scrollIntoView\s*\(/);
    });

    it("a view row self-routes (RouterLink) — the two nav registers under one roof", () => {
        expect(TOC).toContain("<RouterLink");
        expect(TOC).toContain(":to=\"item.to\"");
    });
});

describe("O-A23 · DockTOC.vue — the OWNER-HELD glass-abstraction seam (DEFERRAL CONTRACT R4)", () => {
    it("the owner-held flag is a REAL marked const (not prose) naming the WG-E arm", () => {
        expect(TOC).toMatch(/GLASS_TOC_ABSTRACTION_AVAILABLE\s*=\s*false/);
        // the seam names the deferred successor arm explicitly (never a silent fork).
        expect(TOC).toMatch(/WG-E/);
        expect(TOC).toMatch(/OWNER-HELD/);
    });

    it("the flag GATES the interim list + surfaces on data-toc-source (interim ⇄ glass)", () => {
        expect(TOC).toContain("v-if=\"!GLASS_TOC_ABSTRACTION_AVAILABLE\"");
        expect(TOC).toMatch(
            /data-toc-source="GLASS_TOC_ABSTRACTION_AVAILABLE \? 'glass' : 'interim'"/,
        );
    });
});

describe("O-A23 · DockTOC.vue — scroll-jack-free (AG8) + the single-observer discipline", () => {
    it("0 preventDefault — the AG8 no-scroll-jack clause (sticky/CSS only)", () => {
        // the CALL pattern `.preventDefault(` — a comment naming the clause is not a false positive.
        expect(TOC).not.toMatch(/\.preventDefault\s*\(/);
    });

    it("mints NO wheel/touchmove listener (native scroll untouched)", () => {
        expect(TOC).not.toMatch(/@wheel|@touchmove|["']wheel["']|["']touchmove["']/);
    });

    it("mints NO second observer — it READS the shared active-beat store instead", () => {
        expect(TOC).not.toMatch(/new IntersectionObserver/);
        // never IMPORTS or CALLS the stepper's observer composable (a backtick mention in a comment
        // is fine — the point is DockTOC does not re-mount a second beat-observer).
        expect(TOC).not.toMatch(/import[^\n]*useDockStepper|useDockStepper\s*\(/);
        expect(TOC).toContain("useActiveBeat");
    });
});

describe("O-A23 · Dock.vue — the TOC is a TOGGLED second mode, never a replacement", () => {
    it("the STEPPER stays MOUNTED under the TOC (v-show, not a v-if unmount)", () => {
        // v-show keeps DockStepperRender mounted so its ONE beat-observer keeps writing activeBeat.
        expect(DOCK).toContain("v-show=\"!showTOC\"");
        expect(DOCK).toContain("<DockStepperRender");
    });

    it("the TOC animates in/out as a toggled overlay (<Transition> + v-if showTOC)", () => {
        expect(DOCK).toContain("<Transition name=\"dock-toc\">");
        expect(DOCK).toContain("<DockTOC");
        expect(DOCK).toContain("v-if=\"showTOC\"");
    });

    it("the deep-link routes through the SHARED O-A3 anchor machinery (scrollToSection)", () => {
        expect(DOCK).toContain("scrollToSection");
        expect(DOCK).toContain("function onTocSelect");
        expect(DOCK).toContain("@select=\"onTocSelect\"");
    });

    it("the view-mode toggle is wired down to the foot", () => {
        expect(DOCK).toContain(":view-mode=\"viewMode\"");
        expect(DOCK).toContain("@toggle-viewmode=\"viewModeToggle\"");
    });
});

describe("O-A23 · DockFoot.vue — the stepper ⇄ TOC toggle control", () => {
    it("renders the toggle (aria-pressed off the mode) + emits toggle-viewmode", () => {
        expect(FOOT).toContain("data-testid=\"dock-viewmode-toggle\"");
        expect(FOOT).toContain(":aria-pressed=\"viewMode === 'toc'\"");
        expect(FOOT).toContain("emit('toggle-viewmode')");
    });
});

describe("O-A23 · scroll-anchor.ts — the ONE shared anchor primitive both view-modes consume", () => {
    it("scrollToSection is a real callable (a no-op off-DOM, never throws)", () => {
        expect(typeof scrollToSection).toBe("function");
        // node env: no `document` element resolves — the guarded optional-chain is a silent no-op.
        expect(() => scrollToSection("nonexistent-beat")).not.toThrow();
    });

    it("the stepper DELEGATES its rung-click scroll to the shared primitive (DRY — one machinery)", () => {
        expect(STEPPER).toContain("scrollToSection");
    });
});
