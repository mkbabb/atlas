// vite/postcss-custom-media.mjs — THE ZERO-DEP @custom-media RESOLVER (J-MOBILE ARM-a · C8).
//
// The build-config decision made ONCE (breakpoints.css header): the project ships
// `@tailwindcss/vite` (Tailwind v4) with NO postcss-custom-media dep, and Tailwind does NOT
// resolve bare `@custom-media`, while Vue SFC `<style>` blocks are processed in isolation (no
// `theme()`/`@theme` context). So this LOCAL zero-dep PostCSS plugin — mirroring the
// `vite/critical-css.mjs` + inline `apiSnapshotPreview` "ZERO new dep" precedent — resolves the
// `@custom-media` at-rules DECLARED IN breakpoints.css by textual substitution across EVERY CSS
// module (scoped styles included). It preserves each breakpoint VALUE EXACTLY (no 767.98→768
// drift) and keeps the `@media (--phone)` / `@container … (--compact)` author-surface readable.
//
// Mechanism: read the `@custom-media --name (cond);` declarations from breakpoints.css ONCE at
// plugin construction, then for every `@media` / `@container` at-rule replace any `(--name)`
// reference with the recorded condition. Stray `@custom-media` at-rules (the ones inlined into
// the Tailwind entry bundle) are removed so they never reach the browser unresolved.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BREAKPOINTS_CSS = new URL(
    "../src/platform/design/breakpoints.css",
    import.meta.url,
);

/** Parse `@custom-media --name (cond);` declarations from breakpoints.css → Map<name, cond>. */
function loadCustomMedia() {
    const src = readFileSync(fileURLToPath(BREAKPOINTS_CSS), "utf8");
    const defs = new Map();
    const re = /@custom-media\s+(--[\w-]+)\s+([^;]+);/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        defs.set(m[1].trim(), m[2].trim());
    }
    return defs;
}

export default function postcssCustomMediaLocal() {
    const defs = loadCustomMedia();
    const substitute = (params) =>
        params.replace(/\(\s*(--[\w-]+)\s*\)/g, (full, name) =>
            defs.has(name) ? defs.get(name) : full,
        );
    return {
        postcssPlugin: "custom-media-local",
        AtRule: {
            "custom-media": (rule) => rule.remove(),
            media: (rule) => {
                rule.params = substitute(rule.params);
            },
            container: (rule) => {
                rule.params = substitute(rule.params);
            },
        },
    };
}

postcssCustomMediaLocal.postcss = true;
