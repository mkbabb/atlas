// src/vite/seal-compositor.ts — the glass-ui completion-seal compositor fix (L5-CORE-BOUNDARY §4.F).
//
// J-CLOSE re-gate surface-fix (motion-matrix (d), Scope 12(e)/HG-6) — the consuming surface's
// compositor compliance for the glass-ui completion-seal draw. This is glass-ui-COUPLED (it rewrites
// glass-ui's `completion-seal.css` on the emitted bundle), so it rides into `@atlas/core/vite` as a
// core-owned plugin (every instance that consumes glass-ui needs it).
//
// glass-ui ships `completion-seal.css` (pulled in by the `@mkbabb/glass-ui/styles` monolith @import)
// whose stroke-reveal keyframe `@keyframes completion-seal-draw` animates the REGISTERED custom
// property `--seal-draw` (a <percentage> @property), which then DRIVES `stroke-dashoffset` through a
// `calc()`. The platform compositor whitelist (tests/visual/render-matrix.spec.ts (d)) reads the
// LITERAL animated property NAME off every `*-draw` @keyframes and allows only {transform, opacity,
// fill-opacity, stroke-dashoffset, clip-path, filter} — so the `--seal-draw` keyframe lands as
// off-compositor. A same-name @keyframes override does NOT cure it (CSSOM keeps BOTH same-named rules
// in document.styleSheets, so the gate still finds the off-compositor one — verified against the
// built bundle).
//
// THE FIX (consuming surface, glass-ui consumed verbatim — never edited, never the monolith forked):
// glass-ui's seal CSS rides into the bundle through Tailwind's `@import` inliner (it never surfaces as
// a standalone Vite module — the `transform` hook can't see it), so we re-author it on the FINAL
// emitted CSS asset at `generateBundle` (the visual gate runs `vite preview` against the BUILD —
// playwright.config.ts webServer). We rewrite ONLY the seal rules, swapping the off-compositor
// `--seal-draw` keyframe for the WHITELISTED `stroke-dashoffset`:
//   • the keyframe `@keyframes completion-seal-draw{0%{--seal-draw:0%}to{--seal-draw:100%}}`
//     → `{0%{stroke-dashoffset:100}to{stroke-dashoffset:0}}` (the SAME 100→0 wipe the resting
//     `stroke-dashoffset:calc(100 - var(--seal-draw,100%)/1%)` derives, now on the compositor-threaded
//     property directly), and
//   • the mark's resting `stroke-dashoffset:calc(100 - var(--seal-draw,…)/1%)` → `stroke-dashoffset:0`
//     (the static = fully-drawn seal, glass-ui's documented PRM / @property-initial terminal state —
//     the wipe runs only under `[data-play]`).
// The settle (`--seal-scale`→transform) and glint (`--seal-glint`→filter) keyframes already animate
// whitelisted props and are untouched; `--seal-draw` no longer animates anywhere. Idempotent + no-op
// if glass-ui ever ships the seal already compositor-safe (the regexes simply do not match).
// `apply:"build"` — the preview/gate path is the build bundle.
export function sealCompositorTransform() {
    return {
        name: "seal-compositor-transform",
        apply: "build" as const,
        generateBundle(_options: unknown, bundle: Record<string, unknown>) {
            for (const file of Object.values(bundle)) {
                const asset = file as { type?: string; fileName?: string; source?: unknown };
                if (asset.type !== "asset" || !asset.fileName?.endsWith(".css")) continue;
                if (typeof asset.source !== "string") continue;
                if (!asset.source.includes("completion-seal-draw")) continue;
                asset.source = asset.source
                    .replace(
                        /@keyframes\s+completion-seal-draw\s*\{[^@]*?--seal-draw[^@]*?\}\s*\}/,
                        "@keyframes completion-seal-draw{0%{stroke-dashoffset:100}to{stroke-dashoffset:0}}",
                    )
                    .replace(
                        /stroke-dashoffset:\s*calc\(\s*100\s*-\s*var\(\s*--seal-draw[^)]*\)\s*\/\s*1%\s*\)/g,
                        "stroke-dashoffset:0",
                    );
            }
        },
    };
}
