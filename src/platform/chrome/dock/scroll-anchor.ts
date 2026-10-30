import { watchNarrativeAnchorLayout } from "../../../motion/narrative-restore.js";

const ANCHOR_EPSILON_PX = 4;

type CancelSectionScroll = () => void;

function cssPixels(value: string): number {
    const pixels = Number.parseFloat(value);
    return Number.isFinite(pixels) ? pixels : 0;
}

/** The scroll position at which `target` rests under the shell head (its scroll margin). */
export function sectionScrollEndpoint(target: HTMLElement): number {
    const scroller = document.scrollingElement!;
    const marginTop = cssPixels(
        window.getComputedStyle(target).scrollMarginTop,
    );
    const paddingTop = cssPixels(
        window.getComputedStyle(scroller).scrollPaddingTop,
    );
    const maxScrollY = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const targetY =
        target.getBoundingClientRect().top +
        scroller.scrollTop -
        marginTop -
        paddingTop;
    return Math.min(maxScrollY, Math.max(0, targetY));
}

/**
 * Scroll to one semantic section and correct its position once if lazy hydration moves it. Reader
 * input cancels the correction; reduced motion uses the same resting endpoints without a smooth leg.
 */
export function scrollToSection(
    id: string,
    reducedMotion = false,
): CancelSectionScroll {
    if (typeof document === "undefined" || typeof window === "undefined")
        return () => undefined;
    const target = document.getElementById(id);
    if (!target) return () => undefined;
    const scroller = document.scrollingElement!;
    const requestedScrollY = sectionScrollEndpoint(target);
    const alreadyAligned =
        Math.abs(scroller.scrollTop - requestedScrollY) <= ANCHOR_EPSILON_PX;

    let active = true;
    let settleFrame = 0;
    let settled = false;
    let scrollEndListening = false;
    const passive: AddEventListenerOptions = { capture: true, passive: true };
    const removeScrollEnd = (): void => {
        if (!scrollEndListening) return;
        scrollEndListening = false;
        document.removeEventListener("scrollend", settle);
    };
    const cleanup = (): void => {
        if (!active) return;
        active = false;
        if (settleFrame) window.cancelAnimationFrame(settleFrame);
        removeScrollEnd();
        window.removeEventListener("wheel", abort, true);
        window.removeEventListener("touchmove", abort, true);
        window.removeEventListener("keydown", abort, true);
    };
    const heal = watchNarrativeAnchorLayout({
        target,
        root: document.body,
        reanchor: () => target.scrollIntoView({ behavior: "auto", block: "start" }),
        onStop: cleanup,
    });
    const abort = (): void => {
        if (!active) return;
        heal.abort();
    };
    const isShort = (): boolean =>
        Math.abs(scroller.scrollTop - requestedScrollY) > ANCHOR_EPSILON_PX;
    // Reader input ends the leg (`abort`), so a page that rests short at a `scrollend` was stopped by
    // something else: WebKit stops a smooth scroll when focus moves as a list closes. It resumes once.
    // A stale `scrollend` from an earlier scroll arrives while this leg is moving, so the page must
    // hold still for two frames first; a stale one spends nothing. `win`: this outlives the caller.
    const win = window;
    let resumed = false;
    const resumeIfStopped = (): void => {
        const at = scroller.scrollTop;
        settleFrame = win.requestAnimationFrame(() => {
            settleFrame = win.requestAnimationFrame(() => {
                settleFrame = 0;
                if (!active || settled || resumed || scroller.scrollTop !== at || !isShort()) return;
                resumed = true;
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    };
    const settle = (): void => {
        if (!active || settled) return;
        if (isShort()) {
            if (!resumed && !settleFrame) resumeIfStopped();
            return;
        }
        settled = true;
        removeScrollEnd();
        heal.settle();
    };

    window.addEventListener("wheel", abort, passive);
    window.addEventListener("touchmove", abort, passive);
    window.addEventListener("keydown", abort, true);
    if (!reducedMotion) {
        scrollEndListening = true;
        document.addEventListener("scrollend", settle);
    }
    target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
    });
    if (alreadyAligned) {
        settle();
    } else if (reducedMotion) {
        settleFrame = window.requestAnimationFrame(() => {
            settleFrame = window.requestAnimationFrame(() => {
                settleFrame = 0;
                settle();
            });
        });
    }

    return abort;
}
