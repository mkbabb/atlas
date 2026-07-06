// platform/design/breakpoints.ts — THE JS MIRROR of breakpoints.css (J-MOBILE ARM-a · C8).
//
// The ONE home for the breakpoint LITERALS on the JS side — the value-bearing twin of the
// `@custom-media` seams in breakpoints.css. This file + breakpoints.css are the ONLY two
// allow-listed homes (i0-mobile.gate.ts BREAKPOINT_ALLOWLIST); every `useMediaQuery(...)` /
// `window.matchMedia(...)` call across src/ reads a STRING from here (via useMobileRegister
// for the reactive probes), so the `767.98` / `430` / `coarse` / `hover:none` literals never
// scatter. The values are byte-identical to breakpoints.css — change them in BOTH or not at all.

/** The §V mobile-register breakpoint values (px). Mirrors breakpoints.css :root --bp-* + @theme. */
export const BP = {
    /** the primary phone register — 767.98px (the `md - 0.02` floor, the ×18 product seam). */
    phone: 767.98,
    /** the dense-grid / fund-ledger @container seam — 640px. */
    compact: 640,
    /** the sub-phone narrow-sheet seam (ReadoutSheet) — 430px. */
    narrow: 430,
    /** the route-body content cap (the `max-w-5xl` re-point; J-STORY re-bases the value) — 1024px. */
    read: 1024,
    /** the gallery 3-up seam (J-STORY re-cuts) — 700px. */
    deck: 700,
    /** the gallery max-width (J-STORY widens →~1320) — 1080px. */
    gallery: 1080,
} as const;

/** The media-query STRINGS the JS probes read — the exact twin of the breakpoints.css
    `@custom-media` conditions. `useMobileRegister()` wraps the reactive `useMediaQuery`
    subscriptions over these; the few non-reactive `window.matchMedia(...)` sites
    (HoverCard / ReadoutSheet peek-register listeners) read these strings directly. */
export const MQ = {
    /** `(max-width: 767.98px)` — the --phone register. */
    phone: `(max-width: ${BP.phone}px)`,
    /** `(max-width: 640px)` — the --compact register. */
    compact: `(max-width: ${BP.compact}px)`,
    /** `(max-width: 430px)` — the --narrow register. */
    narrow: `(max-width: ${BP.narrow}px)`,
    /** `(pointer: coarse)` — the --touch register. */
    touch: "(pointer: coarse)",
    /** `(hover: none)` — the --no-hover register. */
    noHover: "(hover: none)",
    /** `(max-width: 767.98px) and (pointer: coarse)` — the phone-AND-coarse peek register
        (the HoverCard `peekMql` / ReadoutSheet `registerMql` seam). */
    phoneTouch: `(max-width: ${BP.phone}px) and (pointer: coarse)`,
} as const;
