// scroll-anchor.ts — the dock's ONE section-scroll anchor machinery (O-A3).
//
// The ≤4px-accurate deep-link scroll routes stepper rung clicks through this ONE primitive. A plain,
// pure helper — `getElementById(id).scrollIntoView` at the top-aligned reading
// line (the O-A3 anchor accuracy). No listener, no `preventDefault`, no observer: it is the native
// smooth scroll, nothing more (AG8-safe by construction).
//
// (The stepper's `?at`-restore path keeps its OWN PRM-aware `scrollIntoView` — it must pass
// `behavior:"auto"` under reduced-motion, which this shared caller intentionally does not; a rung/row
// CLICK is an explicit user act, so the smooth scroll is the right register.)

/**
 * Smooth-scroll the document to a beat section by id, top-aligned (the O-A3 ≤4px anchor). A no-op when
 * the id resolves to no element (a stale/wrong-route link stays put, never throws), and DOM-guarded so
 * an SSR/off-DOM call is a silent no-op (the `typeof document` idiom Dock.vue already uses).
 */
export function scrollToSection(id: string): void {
    if (typeof document === "undefined") return;
    document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
