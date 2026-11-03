// holdAnchor — keep the figure a reader acted on where it was on screen, through the layout change
// the act sets off (U/B8 N-5, N-W2).
//
// A selection can reflow the page above the figure: on /usf a plain map tap also
// filters every figure to the tapped state, so the page grew 724 px and the reader's place moved
// 289 px at 390. Chromium's scroll anchoring hid part of that and undid it on close; WebKit left the
// page 290 px from where the reader tapped after Escape. Neither engine's anchoring is the law, so the
// selection store (useSelection) holds the figure itself: it reads the figure's top before the
// change and, frame by frame until the layout stops moving, scrolls by whatever the figure drifted. The page then ends where it
// began on open, and again on close, in every engine.
//
// It never moves the page against the reader or the app: any wheel, touch, key or pointer input ends
// the hold at once, so does a scroll it did not make that moves the figure (an engine's anchoring
// scrolls too, but keeps the figure still), and the hold ends by itself once the document height and the figure have been still for
// `STILL_FRAMES` frames, or after `MAX_MS`.

/** Frames of a still layout that end the hold. */
export const STILL_FRAMES = 8;
/** The longest a hold lasts. */
export const MAX_MS = 1500;

const INPUTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/** The figure (`[data-viz-plate]`) an element sits in, or null outside every figure. */
export function figureOf(target: Element | null): Element | null {
    return target?.closest("[data-viz-plate]") ?? null;
}

/**
 * Hold `el` at its current screen position until the layout settles. Returns a release that ends the
 * hold early (a second act replaces the first). A no-op without an element or a window.
 */
export function holdAnchor(el: Element | null): () => void {
    if (!el || typeof window === "undefined") return () => {};
    const top0 = el.getBoundingClientRect().top;
    const t0 = performance.now();
    let lastHeight = document.documentElement.scrollHeight;
    let lastY = window.scrollY;
    let still = 0;
    let frame = 0;
    let done = false;
    const release = (): void => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        for (const type of INPUTS) window.removeEventListener(type, release, true);
    };
    for (const type of INPUTS) window.addEventListener(type, release, { capture: true, passive: true });
    const step = (): void => {
        if (done) return;
        if (!el.isConnected) return release();
        const drift = el.getBoundingClientRect().top - top0;
        // Someone else scrolled and the figure went with it: the page is theirs.
        if (Math.abs(window.scrollY - lastY) >= 0.5 && Math.abs(drift) >= 0.5) return release();
        if (Math.abs(drift) >= 0.5) window.scrollBy({ top: drift, behavior: "instant" });
        lastY = window.scrollY;
        const height = document.documentElement.scrollHeight;
        still = height === lastHeight && Math.abs(drift) < 0.5 ? still + 1 : 0;
        lastHeight = height;
        if (still >= STILL_FRAMES || performance.now() - t0 > MAX_MS) return release();
        frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return release;
}
