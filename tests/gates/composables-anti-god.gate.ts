// tests/gates/composables-anti-god.gate.ts — THE ANTI-GOD FENCE (src-rearchitecture §A.7; O-B9).
//
// The 40-file flat `platform/composables/` bag (structure-census §B.7 — the canonical
// mis-colocation offender, ~85% mis-owned) dissolved across O-B4…O-B8: every component/feature-owned
// composable dispersed to its owning module (`charts/composables/`, `motion/`, `interaction/`,
// `filter/composables/`, `chrome/*`). What SURVIVES `platform/composables/` is the ~6 genuinely-global
// helpers — cross-cutting utilities that name NO component and NO feature.
//
// THIS GATE is the standing fence that keeps the dir from re-godding: it REJECTS any composable in the
// surviving dir whose name carries a component/feature token (a `useDock*`, `useViz*`, `useFilter*`,
// `useChart*`, `useScroll*`, `useAurora*` reappearing here is a topology-gate FAILURE, §A.7), and it
// asserts the dir holds ≤ 6 files. Reads the LIVE dir off disk — no fixtures. Self-testing
// (describe/it), with a NEGATIVE control proving the fence actually gates (fail-then-green discipline).
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const COMPOSABLES_DIR = resolve(ROOT, "src/platform/composables");

/** The ceiling: the surviving dir is genuinely-global residue only (§A.7 "40 → ~6"). */
export const SURVIVOR_CEILING = 6;

/** The sanctioned genuinely-global helpers — the positive space of the fence (§A.7 STAYS list). */
export const SANCTIONED_GLOBALS = [
    "useUrlState",
    "useSavedViews",
    "useThemeKey",
    "useCountUp",
    "useRomanNumeral",
    "useMobileRegister",
] as const;

/** The component/feature tokens a genuinely-global composable NEVER names. A survivor carrying any of
    these has re-godded the bag — it belongs WITH its component/feature, not in the global residue.
    (`Theme`/`Url`/`SavedViews`/`Count`/`Roman`/`Mobile` are the global cross-cuts — deliberately absent.) */
export const FEATURE_TOKENS = [
    "Dock",
    "Viz",
    "Chart",
    "EChart",
    "Filter",
    "Aurora",
    "Atmosphere",
    "Scroll",
    "Lettering",
    "Timeline",
    "Cover",
    "Affordance",
    "SelectionTreatment",
    "Trendline",
    "Mark",
    "HandMark",
    "Rank",
    "Gold",
    "LoadSequence",
    "Beat",
    "Palette",
    "Overlay",
    "Registry",
    "Reduced",
    "Reveal",
    "Story",
    "Hero",
    "Plate",
    "Readout",
    "Hover",
] as const;

export interface FenceViolation {
    file: string;
    kind: "feature-named" | "over-ceiling" | "unsanctioned";
    detail: string;
}

/** The pure fence: audit a list of composable filenames (basename, no path). Returns every violation —
    a feature-named survivor, an unsanctioned survivor, or an over-ceiling count. */
export function auditComposables(files: string[]): FenceViolation[] {
    const modules = files.filter((f) => f.endsWith(".ts") && f !== "index.ts");
    const violations: FenceViolation[] = [];

    for (const file of modules) {
        const stem = file.replace(/\.ts$/, "");
        const named = FEATURE_TOKENS.find((tok) => stem.includes(tok));
        if (named) {
            violations.push({
                file,
                kind: "feature-named",
                detail: `names the feature/component token "${named}" — it belongs WITH its module, not the global residue (§A.7)`,
            });
            continue;
        }
        if (!(SANCTIONED_GLOBALS as readonly string[]).includes(stem)) {
            violations.push({
                file,
                kind: "unsanctioned",
                detail: `not in the sanctioned genuinely-global set {${SANCTIONED_GLOBALS.join(", ")}}`,
            });
        }
    }

    if (modules.length > SURVIVOR_CEILING) {
        violations.push({
            file: `<dir: ${modules.length} modules>`,
            kind: "over-ceiling",
            detail: `${modules.length} > ${SURVIVOR_CEILING} — the dir has re-godded (§A.7 "40 → ~6")`,
        });
    }

    return violations;
}

function liveComposables(): string[] {
    return readdirSync(COMPOSABLES_DIR);
}

describe("O-B9 anti-god fence — the surviving composables/ is genuinely-global residue only", () => {
    it("holds ≤ 6 source modules (the §A.7 '40 → ~6' de-godding, measured live)", () => {
        const modules = liveComposables().filter((f) => f.endsWith(".ts") && f !== "index.ts");
        expect(
            modules.length,
            `composables/ carries ${modules.length} modules: ${modules.join(", ")}`,
        ).toBeLessThanOrEqual(SURVIVOR_CEILING);
    });

    it("names NO component/feature composable (a useDock*/useViz*/useFilter* here is a topology failure)", () => {
        const violations = auditComposables(liveComposables());
        expect(
            violations,
            `anti-god fence RED — ${violations.map((v) => `${v.file}: ${v.detail}`).join("; ")}`,
        ).toHaveLength(0);
    });

    it("every survivor is in the sanctioned genuinely-global set", () => {
        const modules = liveComposables()
            .filter((f) => f.endsWith(".ts") && f !== "index.ts")
            .map((f) => f.replace(/\.ts$/, ""));
        for (const m of modules) {
            expect(
                (SANCTIONED_GLOBALS as readonly string[]).includes(m),
                `${m} is not a sanctioned global`,
            ).toBe(true);
        }
    });
});

describe("O-B9 anti-god fence — NEGATIVE control (the fence actually gates)", () => {
    it("a re-godded dir with a useDockCollapse + a useVizPalette is caught RED", () => {
        const regodded = [
            ...SANCTIONED_GLOBALS.map((g) => `${g}.ts`),
            "useDockCollapse.ts",
            "useVizPalette.ts",
            "index.ts",
        ];
        const violations = auditComposables(regodded);
        // Both feature-named intruders must be flagged.
        expect(violations.some((v) => v.file === "useDockCollapse.ts" && v.kind === "feature-named")).toBe(true);
        expect(violations.some((v) => v.file === "useVizPalette.ts" && v.kind === "feature-named")).toBe(true);
        // AND the count breach (8 > 6) is caught.
        expect(violations.some((v) => v.kind === "over-ceiling")).toBe(true);
        // The green half of the proof: the sanctioned-only dir passes clean.
        expect(auditComposables([...SANCTIONED_GLOBALS.map((g) => `${g}.ts`), "index.ts"])).toHaveLength(0);
    });
});
