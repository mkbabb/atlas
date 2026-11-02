// useDockRect — where the platform dock sits on screen (U/B8 A5). The dock is `position: fixed` (the
// rail at the top-left at ≥ 768 px, the bar on the bottom edge below it), so a floating surface that
// seats itself in the viewport (the hover card) must keep clear of it. The dock binds its own root
// element here; a reader asks for the rect at the moment it seats, so nobody queries the DOM by class.
//
// `SiteShell` provides one source per app root, beside the dock-portal registry, so the dock (above the
// router) and a route's surfaces (inside it) share it. With no provider (an out-of-shell unit mount)
// the reader gets a fresh source that the dock never binds, and so reads null: no dock to avoid.
import { inject, provide, type InjectionKey } from "vue";

export interface DockRectSource {
    /** The dock binds the element it renders (the rail or the bar), or null when it unmounts. */
    bind: (el: HTMLElement | null) => void;
    /** The dock's viewport rect now, or null when no dock is bound or it has no box. */
    rect: () => DOMRect | null;
}

export function createDockRect(): DockRectSource {
    let bound: HTMLElement | null = null;
    return {
        bind: (el) => {
            bound = el;
        },
        rect: () => {
            if (!bound?.isConnected) return null;
            const r = bound.getBoundingClientRect();
            return r.width > 0 && r.height > 0 ? r : null;
        },
    };
}

const DOCK_RECT_KEY: InjectionKey<DockRectSource> = Symbol("atlas-dock-rect");

/** Provide one dock-rect source for an app root (SiteShell). */
export function provideDockRect(): DockRectSource {
    const source = createDockRect();
    provide(DOCK_RECT_KEY, source);
    return source;
}

/** Reach the current app root's dock-rect source; an isolated, never-bound one without a provider. */
export function useDockRect(): DockRectSource {
    return inject(DOCK_RECT_KEY, null) ?? createDockRect();
}
