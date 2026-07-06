import { describe, it, expect } from "vitest";
import {
    runCreamLawGate,
    assertWarmthIsVisible,
    assertFigureToGround,
    assertRainbowInterTierSeparation,
    negativeTestChroma008Cream,
    negativeTestStaticDarkRainbow,
    negativeTestMuddyRainbow,
    W1_GROUNDS,
    W1_STOPS,
    DARK_SEP_FLOOR,
    INTER_TIER_MIN_ADJ,
    INTER_TIER_MIN_PATH,
    resolveToRgb,
    srgbToOklab,
    chroma,
    hueDeg,
    wcagContrast,
    deltaCab,
    deltaEOK,
} from "./cream-law.gate";

// ─────────────────────────────────────────────────────────────────────────────
// cream-law.spec.ts — the vitest harness that DRIVES the executable cream-law gate
// (src/platform/design/cream-law.gate.ts), the standing replacement for the absolute-L
// lint (render-matrix.spec.ts:218). It proves the gate implements the FROZEN contract
// (usf/docs/tranches/C/gates/contrast-gate.spec.md) and exhibits the two-negative-test
// asymmetry — GREEN on the warm W1 grounds, demonstrably RED on a synthetic chroma-0.008
// near-white cream (fails ①) and a synthetic static-dark-rainbow apex on the OLD cool
// ground (fails ②.b). The asymmetry IS the proof the gate gates.
//
// This is a PURE unit (happy-dom, no rendered surface) — it seeds the gate from the
// authored :root/.dark token text (fd-warm-ground-palette §1.4/§2.3/§3.4). The Playwright
// π-matrix (tests/visual/ground-matrix.spec.ts) re-runs ② against the LIVE resolved tokens.
// ─────────────────────────────────────────────────────────────────────────────

describe("cream-law gate — assertion ① (warmth-is-visible) is GREEN on the W1 warm grounds", () => {
    const clauses = assertWarmthIsVisible(W1_GROUNDS);

    it("every ① clause passes on the W1 grounds", () => {
        const failed = clauses.filter((c) => !c.pass);
        expect(failed, `① failures: ${failed.map((f) => `${f.clause} — ${f.detail}`).join("; ")}`).toHaveLength(0);
    });

    it("the light --background is the verified warm cream (C 0.0186, hue 52°, ctr 1.105 vs #fff)", () => {
        const ol = srgbToOklab(resolveToRgb(W1_GROUNDS.background.light));
        expect(chroma(ol)).toBeGreaterThanOrEqual(0.018);
        expect(chroma(ol)).toBeLessThanOrEqual(0.026); // C1-4 pink ceiling
        expect(hueDeg(ol)).toBeGreaterThanOrEqual(40);
        expect(hueDeg(ol)).toBeLessThanOrEqual(90);
        expect(wcagContrast(resolveToRgb(W1_GROUNDS.background.light), [255, 255, 255])).toBeGreaterThanOrEqual(1.08);
    });

    it("the light --card plate separates from --background (ctr ≥ 1.05)", () => {
        const ctr = wcagContrast(resolveToRgb(W1_GROUNDS.card.light), resolveToRgb(W1_GROUNDS.background.light));
        expect(ctr).toBeGreaterThanOrEqual(1.05);
    });

    it("the dark stock reads warm — R≥G≥B and hue in [40,90]", () => {
        const rgb = resolveToRgb(W1_GROUNDS.background.dark);
        expect(rgb[0]).toBeGreaterThanOrEqual(rgb[1]);
        expect(rgb[1]).toBeGreaterThanOrEqual(rgb[2]);
        const ol = srgbToOklab(rgb);
        expect(hueDeg(ol)).toBeGreaterThanOrEqual(40);
        expect(hueDeg(ol)).toBeLessThanOrEqual(90);
    });
});

describe("cream-law gate — assertion ② (figure-to-ground) is GREEN for every COMMITTED stop", () => {
    const { clauses, reprobeFindings } = assertFigureToGround(W1_STOPS, W1_GROUNDS);

    it("every committed ② clause passes (the 14 rainbow tiers, both arms)", () => {
        const failed = clauses.filter((c) => !c.pass);
        expect(failed, `② failures: ${failed.map((f) => `${f.clause} — ${f.detail}`).join("; ")}`).toHaveLength(0);
    });

    it("all 14 rainbow DARK tiers clear ②.b ΔC_ab ≥ 0.110 on the warm-espresso ground (RR-1.b re-confirm)", () => {
        const warmOl = srgbToOklab(resolveToRgb(W1_GROUNDS.background.dark));
        for (let i = 1; i <= 14; i++) {
            const stop = W1_STOPS.find((s) => s.name === `rainbow-tier-${i}`)!;
            const d = deltaCab(srgbToOklab(resolveToRgb(stop.value.dark)), warmOl);
            expect(d, `rainbow-tier-${i} dark ΔC_ab=${d.toFixed(4)} < ${DARK_SEP_FLOOR}`).toBeGreaterThanOrEqual(DARK_SEP_FLOOR);
        }
    });

    // ── RR-C1-arms PROBE — the diverging/sequential/program arms on the NEW warm ground.
    // These are RECORDED findings, NOT silent passes and NOT blocking. The known under-
    // clears are surfaced so the wave records them (C1.md RR-C1-arms; contrast-gate §4 RR-1).
    it("RR-C1-arms — the re-probe findings ledger is surfaced (recorded, non-blocking)", () => {
        // The probe MUST find the known under-clears, or the gate is reporting nothing:
        //  - rainbow-null (#7495bb, ΔC_ab 0.0859) — recessive no-data stop (§4 RR-1.c);
        //  - diverging-mid (the break-even hinge) + sequential-low (the ramp pale floor) —
        //    recessive-by-design near-neutrals;
        //  - program-high-cost (amber, hue 78°) — the genuine RR-C1-arms re-probe finding:
        //    it shares the warm ground's hue, so ΔC_ab 0.0923 < 0.110 (tuned vs the OLD cool ground).
        const names = reprobeFindings.map((f) => f.stop);
        expect(names, `re-probe findings: ${names.join(", ")}`).toContain("rainbow-null");
        expect(names).toContain("program-high-cost");
        // None of these block the gate (they are `reprobe`-sep stops).
        const gate = runCreamLawGate();
        expect(gate.pass, "the gate stays GREEN despite the recorded re-probe under-clears").toBe(true);
        // The amber finding is the RR-C1-arms residual, not a silent pass.
        const amber = reprobeFindings.find((f) => f.stop === "program-high-cost");
        expect(amber, "the amber RR-C1-arms under-clear must be RECORDED").toBeDefined();
        expect(amber!.note).toMatch(/RR-C1-arms|OLD cool/i);
    });

    it("the null tier #4e79a7/#7495bb under-clears ②.b on BOTH grounds — asserted-and-reported, never blocking (C0 RR-1 residual)", () => {
        const nullFinding = reprobeFindings.find((f) => f.stop === "rainbow-null");
        expect(nullFinding, "the null stop under-clear must be RECORDED").toBeDefined();
        expect(nullFinding!.deltaCab).toBeLessThan(DARK_SEP_FLOOR);
        expect(nullFinding!.note).toMatch(/recessive|no-data|null-floor/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSERTION ②.c — INTER-TIER SEPARATION (the SCI stacked band-cake quantity, both arms).
//
// THE RECONCILIATION: the rainbow is a STACKED band-cake (RainbowStack.vue → StackedBar,
// deliberately BORDERLESS clean bands — audit §3.2). A middle tier is SANDWICHED between its
// neighbours, NEVER adjacent to the cream ground — so the §3.2 ctr(lt)/cream column documents
// tier-3=2.35, tier-4=1.77, tier-5=1.62, tier-6=1.91 as INTENTIONALLY LOW. The RIGHT quantity
// (INV-C4) is therefore INTER-TIER separation — each band distinct from the one above/below —
// NOT every-tier-vs-the-cream-ground (②.a on light), which is the WRONG quantity for a
// band-cake. This is the SAME quantity the π-matrix (ground-matrix.spec.ts) reconciles its
// rainbow assertion to: the unit gate and the π-matrix measure ONE band-cake quantity, so the
// cream-law vitest and the π-matrix CANNOT drift (the discrepancy this fix closes — the unit
// gate previously left the light-arm rainbow ②.a a recorded finding while the π-matrix
// asserted every-tier-vs-ground on light, FAILing tier-3 ②.a on cream).
// ─────────────────────────────────────────────────────────────────────────────

describe("cream-law gate — assertion ②.c (inter-tier band-cake separation) is GREEN on the W1 rainbow", () => {
    const clauses = assertRainbowInterTierSeparation(W1_STOPS);

    it("every ②.c clause passes — both arms clear min-adjacent AND spectral-path floors", () => {
        const failed = clauses.filter((c) => !c.pass);
        expect(failed, `②.c failures: ${failed.map((f) => `${f.clause} — ${f.detail}`).join("; ")}`).toHaveLength(0);
        // 4 clauses: {light,dark} × {min-adj, path}
        expect(clauses).toHaveLength(4);
    });

    it("the tightest real adjacent pair (the two by-design orange near-twins tier-7/tier-8) clears the floor WITH margin, both arms", () => {
        for (const theme of ["light", "dark"] as const) {
            const tiers = W1_STOPS.filter((s) => s.kind === "rainbow").sort(
                (a, b) => Number(a.name.replace(/\D/g, "")) - Number(b.name.replace(/\D/g, "")),
            );
            const ol = tiers.map((s) => srgbToOklab(resolveToRgb(s.value[theme])));
            const adj: number[] = [];
            for (let i = 0; i < ol.length - 1; i++) adj.push(deltaEOK(ol[i], ol[i + 1]));
            const minAdj = Math.min(...adj);
            // the tightest legitimate pair is tier-7 (750Mb) → tier-8 (2Gb), both orange
            expect(adj.indexOf(minAdj), `${theme}: tightest pair is not the orange near-twins`).toBe(6);
            // clears the floor with comfortable margin (≥1.7×) — not a brittle hairline pass
            expect(minAdj, `${theme} min adjacent ΔEOK=${minAdj.toFixed(4)} too close to floor`).toBeGreaterThanOrEqual(
                INTER_TIER_MIN_ADJ * 1.7,
            );
        }
    });

    it("the spectral fan spans real chromatic ground (Σ ΔEOK well above the path floor), both arms", () => {
        for (const theme of ["light", "dark"] as const) {
            const tiers = W1_STOPS.filter((s) => s.kind === "rainbow").sort(
                (a, b) => Number(a.name.replace(/\D/g, "")) - Number(b.name.replace(/\D/g, "")),
            );
            const ol = tiers.map((s) => srgbToOklab(resolveToRgb(s.value[theme])));
            let path = 0;
            for (let i = 0; i < ol.length - 1; i++) path += deltaEOK(ol[i], ol[i + 1]);
            expect(path, `${theme} Σ ΔEOK=${path.toFixed(4)} below the path floor`).toBeGreaterThanOrEqual(
                INTER_TIER_MIN_PATH * 1.7,
            );
        }
    });
});

describe("cream-law gate — the gate is GREEN end-to-end on the W1 grounds", () => {
    it("runCreamLawGate().pass === true on the warm grounds", () => {
        const report = runCreamLawGate();
        const failed = [...report.assertion1, ...report.assertion2, ...report.assertion2c].filter((c) => !c.pass);
        expect(
            report.pass,
            `gate RED — committed failures: ${failed.map((f) => `${f.clause} — ${f.detail}`).join("; ")}`,
        ).toBe(true);
        // the ②.c band-cake clauses are part of the committed gate (not a side ledger)
        expect(report.assertion2c.length, "②.c clauses must be in the committed report").toBeGreaterThan(0);
        expect(report.assertion2c.every((c) => c.pass), "every ②.c clause must be GREEN").toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE THREE NEGATIVE TESTS — the gate must actually GATE (fail-then-green discipline).
// ① a chroma-0.008 near-white cream fails ①; ② a static-dark-rainbow apex fails ②.b on the
// OLD cool ground; ③ a muddy/monochrome rainbow fails ②.c inter-tier separation. Each pairs
// a RED-on-defect with a GREEN-on-the-real-W1 — the asymmetry is the gate's falsifiability.
// ─────────────────────────────────────────────────────────────────────────────

describe("NEGATIVE TEST ① — the synthetic chroma-0.008 near-white cream FAILS assertion ①", () => {
    it("the deployed oklch(0.985 0.008 85) cream breaks ①.a (chroma) AND ①.c (not-white)", () => {
        const clauses = negativeTestChroma008Cream();
        const failed = clauses.filter((c) => !c.pass);
        // The defect MUST be caught — at least the chroma floor and the not-white floor.
        expect(failed.length, "the gate FAILED to catch the chroma-0.008 white-reading cream — it gates nothing").toBeGreaterThan(0);
        expect(failed.some((c) => /chroma/.test(c.clause)), `chroma clause: ${JSON.stringify(failed)}`).toBe(true);
        expect(failed.some((c) => /#fff/.test(c.clause))).toBe(true);

        // And it PASSES once the warm W1 ground is restored — the fail-then-green asymmetry.
        const greened = assertWarmthIsVisible(W1_GROUNDS).filter((c) => !c.pass);
        expect(greened, "the W1 warm ground must PASS ① (the green half of the proof)").toHaveLength(0);
    });
});

describe("NEGATIVE TEST ② — the synthetic static-dark-rainbow apex FAILS ②.b on the OLD cool ground", () => {
    it("apex #7c72c1 is RED on cool #161b20 (ΔC_ab 0.1092 < 0.110) and GREENS on warm #1e150f", () => {
        const { onCool, onWarm } = negativeTestStaticDarkRainbow();
        // RED on the OLD cool ground — the captured-RED stop (contrast-gate §3.1).
        expect(onCool.pass, `static apex on cool ΔC_ab=${onCool.deltaCab.toFixed(4)} should be < ${DARK_SEP_FLOOR} (RED)`).toBe(false);
        expect(onCool.deltaCab).toBeLessThan(DARK_SEP_FLOOR);
        // GREEN on the NEW warm ground — the ground-only effect (the fail-then-green proof).
        expect(onWarm.pass, `static apex on warm ΔC_ab=${onWarm.deltaCab.toFixed(4)} should be ≥ ${DARK_SEP_FLOOR} (GREEN)`).toBe(true);
        expect(onWarm.deltaCab).toBeGreaterThanOrEqual(DARK_SEP_FLOOR);
        // The asymmetry is the proof: red-on-cool / green-on-warm with the SAME stop.
        expect(onCool.deltaCab).toBeLessThan(onWarm.deltaCab);
    });
});

describe("NEGATIVE TEST ③ — a synthetic muddy/monochrome rainbow FAILS the ②.c inter-tier separation", () => {
    it("a one-hue near-monochrome amber ramp is RED on ②.c (bands collapse) and the real W1 rainbow GREENS", () => {
        const { muddy, real } = negativeTestMuddyRainbow();

        // RED — the muddy ramp must trip at least one ②.c clause (the band-cake quantity gates).
        const muddyFailed = muddy.filter((c) => !c.pass);
        expect(
            muddyFailed.length,
            `the gate FAILED to catch the muddy monochrome rainbow — ②.c gates nothing: ${muddy.map((c) => `${c.clause} (${c.detail})`).join("; ")}`,
        ).toBeGreaterThan(0);
        // it must collapse on BOTH the adjacency (collapsed bands) AND the path (no chromatic span).
        expect(muddyFailed.some((c) => /min adjacent/.test(c.clause)), "the muddy ramp's adjacent bands must collapse below the floor").toBe(true);
        expect(muddyFailed.some((c) => /spectral path/.test(c.clause)), "the muddy ramp must span almost no chromatic ground").toBe(true);

        // GREEN — the real W1 14-tier fan clears every ②.c clause (the green half of the proof).
        const realFailed = real.filter((c) => !c.pass);
        expect(realFailed, `the real W1 rainbow must PASS ②.c: ${realFailed.map((c) => `${c.clause} — ${c.detail}`).join("; ")}`).toHaveLength(0);
    });
});
