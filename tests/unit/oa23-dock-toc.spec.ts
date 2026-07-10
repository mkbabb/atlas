// tests/unit/oa23-dock-toc.spec.ts — O-A23 ACCEPTANCE teeth at the pure-mechanism + live-source
// layer (this library's DOM-less test idiom — the pure-composable proof + the gate corpus's "read LIVE
// source off disk" scan, mirroring oa22-redundant-channel).
//
// RETIRED FROM THE SERVED DOCK (O-DIR-4 ARM 3) — the owner's "entirely worthless" verdict on the A23
// TOC interim: the view-mode toggle + render path are REMOVED from Dock.vue/DockFoot.vue. `DockTOC.vue`
// + `useDockViewMode.ts` STAY on disk, UNCONSUMED, behind the existing `GLASS_TOC_ABSTRACTION_AVAILABLE`
// owner-held seam (the WG-E glass-abstraction arm's flip revives the wiring). This spec now asserts:
//
//   · useDockViewMode — the pure register still behaves (default stepper, toggle flips, setMode,
//     initial) — the file is UNCHANGED, just unconsumed; the composable itself must still work for the
//     WG-E revival.
//   · DockTOC.vue (live source) — the interim list renders the roster + emits the deep-link INTENT;
//     the OWNER-HELD glass-abstraction flag is a REAL marked seam (const + WG-E comment + it GATES the
//     list); scroll-jack-free (0 preventDefault, 0 wheel/touch capture, 0 new observer — a pure reader
//     of the shared active-beat store).
//   · Dock.vue (live source) — the TOC render path + the view-mode wiring are ABSENT (no DockTOC
//     import/mount, no useDockViewMode consume); the stepper renders unconditionally.
//   · DockFoot.vue (live source) — the view-mode toggle control is ABSENT (no testid, no viewMode prop,
//     no toggle-viewmode emit).
//   · scroll-anchor.ts — the ONE shared anchor primitive the stepper consumes (the TOC no longer does,
//     retired with the render path; the primitive itself is unchanged for the WG-E revival).
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

describe("O-A23 · Dock.vue — the TOC render path is RETIRED (O-DIR-4 ARM 3)", () => {
    it("mounts NO DockTOC (no import, no template mount)", () => {
        expect(DOCK).not.toMatch(/import DockTOC/);
        expect(DOCK).not.toContain("<DockTOC");
    });

    it("consumes NO useDockViewMode (the register stays unconsumed, file untouched)", () => {
        expect(DOCK).not.toMatch(/import\s*\{\s*useDockViewMode/);
        expect(DOCK).not.toContain("useDockViewMode(");
    });

    it("the stepper renders UNCONDITIONALLY (no showTOC branch)", () => {
        expect(DOCK).toContain("<DockStepperRender");
        expect(DOCK).not.toMatch(/v-show="!showTOC"/);
        expect(DOCK).not.toContain("showTOC");
    });

    it("the foot is wired with NO view-mode prop/emit", () => {
        expect(DOCK).toContain("<DockFoot");
        expect(DOCK).not.toContain(":view-mode=\"viewMode\"");
        expect(DOCK).not.toContain("@toggle-viewmode");
    });
});

describe("O-A23 · DockFoot.vue — the stepper ⇄ TOC toggle control is RETIRED (O-DIR-4 ARM 3)", () => {
    it("renders NO toggle (no testid, no viewMode prop, no toggle-viewmode emit)", () => {
        expect(FOOT).not.toContain("data-testid=\"dock-viewmode-toggle\"");
        // the PROP/EMIT wiring is gone (a comment mentioning the retired useDockViewMode composable
        // by name, e.g. "useDockViewMode stay on disk", is fine — only the live prop/emit signature
        // matters).
        expect(FOOT).not.toMatch(/\bviewMode\s*[,:]/);
        expect(FOOT).not.toContain("toggle-viewmode");
    });

    it("still renders the dark-mode toggle + the collapse toggle (untouched siblings)", () => {
        expect(FOOT).toContain("<DarkModeToggle");
        expect(FOOT).toContain("data-testid=\"dock-collapse-toggle\"");
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
