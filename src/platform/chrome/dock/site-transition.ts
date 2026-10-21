// site-transition.ts — the one route hand-off the dock runs (U/B7 §2.2): a roster row or the
// dashboard Select changes the page inside one view transition. The dock is mounted once above the
// router and holds still (its own `site-dock` group, Dock.css and SiteShell); the arriving page's
// content slides in over 240 ms on the dock spring. Reduced motion, or an engine without view
// transitions, gets a cut: the navigation runs directly.

/** Run a navigation inside the site's view transition, or directly when motion is reduced. */
export function siteTransition(navigate: () => Promise<unknown> | unknown): void {
    const doc = typeof document === "undefined" ? null : document;
    const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = (doc as (Document & { startViewTransition?: (cb: () => Promise<unknown>) => unknown }) | null)
        ?.startViewTransition;
    if (!doc || reduced || typeof start !== "function") {
        void navigate();
        return;
    }
    doc.documentElement.dataset.siteTransition = "";
    const transition = start.call(doc, async () => {
        await navigate();
    }) as { finished?: Promise<unknown> };
    void transition.finished?.finally(() => {
        delete doc.documentElement.dataset.siteTransition;
    });
}
