// ─────────────────────────────────────────────────────────────────────────────
// critical-css.mjs — THE CRITICAL-CSS SPLIT + INLINE (I-PERF-FOUNDATION.a · T-PERF-1b).
//
// THE LCP ROOT, ATTACKED AT THE <head>. The entry CSS (`index-*.css`, ~526 KB raw /
// ~90 KB gz) is render-blocking in <head> and carries the UNION of all five routes'
// Tailwind utilities + glass-ui's token+component sheet — so EVERY route (even the
// chart-free gallery) waits on ~90 KB gz transfer+parse before the masthead TEXT (the
// LCP element) can paint (fb-perf.md §1.3 Finding P-4, the LCP root on every route).
//
// This is the SOTA move, not "minify harder" (fb-perf.md §3 T-PERF-1b): a BOUNDED,
// BUILD-TIME-DERIVED above-the-fold critical slice is INLINED into <head> as a <style>,
// and the full entry stylesheet is swapped to a NON-BLOCKING load (`media="print"` +
// the `data-critical-defer` marker the entry module promotes to `media="all"` — a
// CSP-SAFE swap, NOT a markup `onload` handler the production `script-src` blocks — plus a
// <noscript> fallback). The hero paints as soon as the ~11 KB-gz critical set is in the
// head, not after the 90 KB gz monolith.
//
// ZERO new heavy dep — NO critters/fontaine extractor BINARY (I-PERF-FOUNDATION Hard
// Gate 5). The slice is HAND-BOUNDED by a layer/selector allowlist and DERIVED from the
// freshly-built entry CSS at `generateBundle` time, so it stays in lock-step with the
// real token+reset surface (a first-fold token edit cannot silently strand a rule below
// the inline — the next build re-derives the slice from source).
//
// THE CRITICAL SLICE (the allowlist, the hand bound):
//   • `@layer theme`  — the Tailwind v4 design-scale tokens (--color-*, --text-*,
//                       --spacing, the font-stack vars) the base-layer + masthead read.
//   • `@layer base`   — the Tailwind preflight resets (box-sizing, margin zero, the
//                       inherited type) the first paint structurally needs.
//   • the top-level `:root` / `:host` / `.dark` TOKEN blocks — the design token corpus
//                       (--background, --foreground, --font-display, --measure, --card,
//                       --border, --ring, the .dark register overrides). The masthead
//                       resolves its face + ink + ground from these; they are the
//                       irreducible first-paint foundation. EXCEPT the bare FALLBACK arm of
//                       a Lightning-emitted `@supports` progressive-enhancement token pair
//                       (see `isSplitFallback`) — inlining that arm ALONE (later in <head>
//                       than the deferred <link>) out-orders the linked `@supports` arm and
//                       collapses the token to its opaque fallback (the KEYSTONE glass bug).
//                       The whole pair stays on the linked sheet; none of those tokens is
//                       first-PAINT critical (the chrome paints after main.ts promotes the
//                       deferred sheet to media=all, before Vue mounts).
// DEFERRED (loads non-blocking with the full sheet): `@layer utilities` (the 1,731
// route-union utility rules), `@layer components` (the glass-ui component sheet), the
// `@supports (color-mix …)` guard blocks (BOTH the component guards AND the token
// progressive-enhancement arms) + the `@media` surface — none of which the masthead's
// first TEXT paint waits on.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walk a CSS string into its TOP-LEVEL rule blocks (`selector { … }`), brace-balanced.
 * Returns `{ sel, body }[]` where `body` is the whole `selector{…}` text (so a re-join
 * is byte-faithful). Nested at-rules (`@layer x{ … }`, `@media …{ … }`) come back as ONE
 * top-level block keyed by their prelude — we never descend into them.
 */
function topLevelBlocks(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
        let j = i;
        while (j < src.length && src[j] !== "{") j++;
        if (j >= src.length) break;
        const sel = src.slice(i, j).trim();
        let k = j;
        let depth = 0;
        for (; k < src.length; k++) {
            if (src[k] === "{") depth++;
            else if (src[k] === "}") {
                depth--;
                if (depth === 0) {
                    k++;
                    break;
                }
            }
        }
        out.push({ sel, body: src.slice(i, k) });
        i = k;
    }
    return out;
}

/**
 * A TOKEN selector is a pure comma-list of `:root` / `:host` / `.dark` / `:where(.dark)`
 * (and the structural `html`/`body`) — the design-token homes. It explicitly EXCLUDES
 * any escaped-class utility (`.dark\:bg-…`, the `\` form) and any SFC-scoped rule
 * (`[data-v-…]`) so a utility that merely lives under a `.dark` ancestor does NOT leak
 * into the critical inline.
 */
function isTokenSelector(sel) {
    if (sel.includes("\\") || sel.includes("[data-")) return false;
    return sel
        .split(",")
        .map((p) => p.trim())
        .every((p) => /^(:root|:host|\.dark|:where\(\.dark\)|html|body)$/.test(p));
}

/** The `@layer` names whose WHOLE block is critical (the design-scale + the preflight). */
const CRITICAL_LAYERS = /^@layer\s+(theme|base)\b/;

/**
 * The first custom-property NAME a token block declares (`--foo` from `:root{--foo:…}`),
 * looked up through the optional `@supports`/`:root` nesting. NULL when the block declares
 * no custom property. Used to pair a bare token fallback with its `@supports` enhancement.
 */
function firstCustomProp(body) {
    const m = body.match(/\{\s*(--[\w-]+)\s*:/);
    return m ? m[1] : null;
}

/**
 * THE PROGRESSIVE-ENHANCEMENT PAIR GUARD (the KEYSTONE chrome-glassiness fix).
 *
 * Lightning CSS (Tailwind v4's transformer) DOWNLEVELS any nested `color-mix(in oklab/lab,…)`
 * token into an adjacent PAIR of top-level blocks — an opaque/degenerate FALLBACK then its
 * translucent enhancement behind a feature query:
 *     :root{ --glass-bg-dock: var(--card) }                                   ← fallback
 *     @supports (color:color-mix(in lab,red,red)){ :root{ --glass-bg-dock: color-mix(…) } }  ← real value
 * Both arms ride the linked entry sheet at EQUAL `:root` specificity, so source order alone
 * decides — and in the sheet the `@supports` arm is LATER, so on a modern engine it wins (the
 * intended progressive enhancement). But the critical-CSS inliner emits the bare FALLBACK arm
 * (a top-level token block) into a <style> that sits LATER in the <head> than the deferred
 * <link> — so the inline fallback out-orders the linked `@supports` arm and every such token
 * collapses to its opaque fallback (the "cartoon" opaque-cream dock + 73 other tokens:
 * shadows, surface-tints, scrims, …). The inline must therefore NOT carry a split fallback
 * ALONE: a token block is a SPLIT fallback iff the IMMEDIATELY-FOLLOWING top-level block is a
 * token-selector `@supports` that redefines the SAME custom property. We drop that fallback
 * from the inline and let the linked sheet own the WHOLE pair (both arms, correctly ordered) —
 * none of these tokens is first-PAINT critical (the deferred sheet is promoted to `media=all`
 * in main.ts BEFORE Vue mounts the chrome, so the glass surfaces never paint un-tokened). This
 * is general (every downleveled token, not a per-recipe patch) and LEANER (it removes bytes).
 */
function isSplitFallback(block, next) {
    if (!next || !next.sel.startsWith("@supports")) return false;
    // The @supports arm must itself redefine a TOKEN (its inner selector is :root/.dark/…),
    // not a component rule (`@supports …{.glass-dock{…}}`) — those are not the token pair.
    const innerSel = next.body.slice(next.body.indexOf("{") + 1);
    const innerHead = innerSel.slice(0, innerSel.indexOf("{")).trim();
    if (!isTokenSelector(innerHead)) return false;
    const prop = firstCustomProp(block.body);
    return prop !== null && prop === firstCustomProp(next.body);
}

/**
 * Derive the critical above-the-fold slice from a built entry-CSS string: the critical
 * `@layer` blocks (theme + base) + every top-level design-token block, in source order —
 * EXCEPT a token block that is the bare FALLBACK arm of a Lightning-emitted `@supports`
 * progressive-enhancement pair (see `isSplitFallback`), which is left to the linked sheet so
 * the inline cannot out-order the translucent `@supports` arm.
 */
export function deriveCriticalCss(entryCss) {
    let crit = "";
    const blocks = topLevelBlocks(entryCss);
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const { sel, body } = block;
        if (CRITICAL_LAYERS.test(sel)) {
            crit += body;
            continue;
        }
        if (!sel.startsWith("@") && isTokenSelector(sel)) {
            if (isSplitFallback(block, blocks[i + 1])) continue;
            crit += body;
        }
    }
    return crit;
}

/**
 * The Vite plugin. At `generateBundle` (post-build, the emitted assets in hand) it:
 *   1. finds the entry CSS asset (`assets/index-*.css`),
 *   2. derives the critical slice from it,
 *   3. rewrites `dist/index.html`: inlines the slice as a marked <style> and swaps the
 *      entry stylesheet <link> to the non-blocking print-media-onload pattern (+ a
 *      <noscript> render-blocking fallback for the no-JS path).
 *
 * The marker comment `<!-- I-PERF-FOUNDATION.a: critical-css -->` lets the
 * bundle-budget eager-CSS arm find + bound the inline.
 */
export function criticalCssPlugin() {
    return {
        name: "i-perf-foundation-critical-css",
        // Run AFTER vite's own html/css emission so the <link> + the hashed CSS exist.
        enforce: "post",
        apply: "build",
        generateBundle(_options, bundle) {
            // Locate the entry CSS asset (the render-blocking monolith) + the html asset.
            const entryCssKey = Object.keys(bundle).find((k) =>
                /^assets\/index-[\w-]+\.css$/.test(k),
            );
            const htmlKey = Object.keys(bundle).find((k) => k === "index.html");
            if (!entryCssKey || !htmlKey) return;

            const cssAsset = bundle[entryCssKey];
            const htmlAsset = bundle[htmlKey];
            const cssSource =
                typeof cssAsset.source === "string"
                    ? cssAsset.source
                    : Buffer.from(cssAsset.source).toString("utf8");

            const critical = deriveCriticalCss(cssSource);

            let html =
                typeof htmlAsset.source === "string"
                    ? htmlAsset.source
                    : Buffer.from(htmlAsset.source).toString("utf8");

            // The entry stylesheet <link> vite injected (it carries `crossorigin`). Match
            // the full tag so we can replace it with the non-blocking swap + <noscript>.
            const linkRe = new RegExp(
                `<link[^>]*rel="stylesheet"[^>]*href="/${entryCssKey}"[^>]*>`,
            );
            const m = html.match(linkRe);
            if (!m) return; // the link shape changed — bail rather than mangle the head.
            const href = `/${entryCssKey}`;

            // THE CSP-SAFE NON-BLOCKING SWAP. Load the full sheet as `media="print"` so it
            // does NOT block the first paint, then promote it to `media="all"` from the entry
            // MODULE (src/main.ts, which the strict `script-src 'self'` admits) once it runs —
            // NOT an inline `onload="…"` handler (that is an inline EVENT handler the
            // production CSP `script-src 'self' 'sha256-…'` BLOCKS, "hashes do not apply to
            // event handlers"; the swap would never fire and only the 11 KB critical slice
            // would ever apply — a broken site). The `data-critical-defer` marker is the
            // precise hook main.ts flips. The <noscript> keeps the no-JS path correct
            // (render-blocking, but only for the JS-off minority — they get the full sheet).
            const swapped =
                `<link rel="stylesheet" crossorigin href="${href}" media="print" data-critical-defer>` +
                `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`;
            html = html.replace(linkRe, swapped);

            // Inline the critical slice just before </head>, behind a findable marker.
            const inline =
                `\n        <!-- I-PERF-FOUNDATION.a: critical-css (build-derived above-fold slice; the full sheet defers non-blocking above) -->\n` +
                `        <style id="critical-css">${critical}</style>\n    `;
            html = html.replace("</head>", `${inline}</head>`);

            htmlAsset.source = html;
        },
    };
}
