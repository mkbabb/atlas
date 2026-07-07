// scripts/probe-oa15.mjs — the O-A15-LIB scratch probe. Imports the FACILITY off the PUBLISHED entry
// point (`./dist/story.js`, the `@mkbabb/atlas/story` subpath) and exercises the three lane-named
// symbols (resolveBeatTemplate + expandStory + SuperlativeRegister) plus the E2 constraint check + the
// reseed determinism. Run: `node scripts/probe-oa15.mjs`. Pure — no DOM, no server.
import {
    resolveBeatTemplate,
    resolveBeatTemplates,
    checkBeatConstraints,
    expandStory,
    STORY_TEMPLATES,
    SuperlativeRegister,
    isWithinCeiling,
    VIZ_ALTERNATE_CATALOG,
} from "../dist/story.js";

const line = (s) => console.log(s);

// ── 1 · resolveBeatTemplate — the per-route authored policy → the resolved-tuple TABLE ──────────────
const policy = {
    id: "usf-integrity",
    seed: 20260707,
    beats: [
        { title: "left", rule: "rule" },
        { title: "center", numbers: "bottom", superlative: { label: "drew the most per student" } },
        { title: "left", signature: true },
        {}, // unauthored → cadence
    ],
};
line("── resolveBeatTemplate — the resolved per-beat tuples ────────────────────────────");
const resolved = resolveBeatTemplates(policy);
for (const r of resolved) {
    line(
        `  phase ${r.phase}: title=${r.title.padEnd(6)} numbers=${r.numbers.padEnd(6)} ` +
            `rule=${r.rule.padEnd(7)} scrollIn=${r.reveal.layout.scrollIn.padEnd(5)} ` +
            `sig=${r.signature} grain.delay=${r.grain.delayFrac.toFixed(4)}` +
            (r.superlative ? ` superlative="${r.superlative.label}"` : ""),
    );
}

// ── 2 · checkBeatConstraints — the E2 invariants MEASURED on the resolved tuples ────────────────────
line("\n── checkBeatConstraints (E2) ────────────────────────────────────────────────────");
line("  " + JSON.stringify(checkBeatConstraints(resolved)));

// ── 3 · the RESEED determinism — poles FIXED, micro-grain DRIFTS ────────────────────────────────────
const a = resolveBeatTemplates(policy, 1);
const b = resolveBeatTemplates(policy, 999999);
line("\n── reseed A/B (poles fixed, grain drifts) ───────────────────────────────────────");
line("  poles A: " + a.map((r) => r.title).join(","));
line("  poles B: " + b.map((r) => r.title).join(",") + "   (identical ⇒ authored, reseed-invariant)");
line(
    "  grain.delay A[0]=" +
        a[0].grain.delayFrac.toFixed(5) +
        "  B[0]=" +
        b[0].grain.delayFrac.toFixed(5) +
        "   (differ ⇒ micro-grain reseeds)",
);

// ── 4 · expandStory — the ResolvedBeatTemplate ZIP onto each masthead chapter ───────────────────────
const stub = { name: "Stub" };
const { chapters } = expandStory({
    template: STORY_TEMPLATES["reveal-compare-drill-conclude"],
    fills: {
        cover: { icon: stub, eyebrow: "e", title: "Cover", dek: "d", viz: "hero" },
        reveal: { icon: stub, eyebrow: "e", title: "Reveal", dek: "d", viz: stub },
        compare: { icon: stub, eyebrow: "e", title: "Compare", dek: "d", viz: stub },
        drill: { icon: stub, eyebrow: "e", title: "Drill", dek: "d", viz: stub },
        conclude: { icon: stub, eyebrow: "e", title: "Conclude", dek: "d", viz: stub },
    },
    variation: policy,
});
line("\n── expandStory — the template zip (sentinels carry NONE) ─────────────────────────");
for (const c of chapters) {
    line(`  ${c.id.padEnd(10)} viz=${c.viz === "hero" ? "hero" : "plate"}  template.title=${c.template?.title ?? "—"}`);
}

// ── 5 · SuperlativeRegister — the never-incriminate ceiling guard ───────────────────────────────────
line("\n── SuperlativeRegister (Q-48) — the ceiling guard ───────────────────────────────");
line("  frozen: " + Object.isFrozen(SuperlativeRegister));
line('  isWithinCeiling("drew the most per student"): ' + isWithinCeiling("drew the most per student"));
line('  isWithinCeiling("the district colluded"):       ' + isWithinCeiling("the district colluded"));

// ── 6 · the vizAlternates storybook catalog (Q-30) ──────────────────────────────────────────────────
line("\n── VIZ_ALTERNATE_CATALOG (Q-30) — the storybook facility ─────────────────────────");
for (const g of VIZ_ALTERNATE_CATALOG) {
    line(`  ${g.base.padEnd(18)} → ${g.options.filter((o) => !o.isBase).map((o) => o.id).join(", ")}`);
}
line("\nPROBE OK — the O-A15-LIB facility resolves off the published @mkbabb/atlas/story surface.");
