// THE FIRST-FIGURE FLOOR's release (CLS-02, U RULINGS §M M-2).
//
// The first figure beat sits on screen at first paint, so Beat.vue's `content-visibility` skip never
// reserves its box. DashboardEssay floors it at the route's measured beat height (`--beat-cis`)
// while its plate resolves, so the plate mounts into reserved space instead of pushing the column
// down. The route value is a MEDIAN over the route's beats, not this beat's height: kept after the
// plate settles, it painted a blank band under every first figure shorter than the median (B5: 195,
// 93 and 180 px at 390 on /usf-integrity, /demand and /speedtest; 374/242 px on /usf; 319/210 px on
// /ecf). The floor is a reservation, never a measure: it holds only until the figure has settled,
// and then the beat is its own height.
//
// "Settled" is read off the figure's own boxes, with no second clock: the figure seat has rendered
// content, and no box in it has changed size for `quietMs`. A figure that never renders keeps the
// floor (the reservation it had before). One ResizeObserver per essay, disconnected on release.

/** How long the figure's boxes must hold still before the floor is released. */
export const FIGURE_SETTLE_QUIET_MS = 800;

/** Beat furniture that is not the figure: the masthead, the versal, a decorative ornament. */
const NOT_FIGURE = ".beat__header, .beat__initial, .essay-ornament";

/** The figure's seat: a StoryCard's figure sector, else the beat itself (Beat.vue renders the
    `#figure` slot as its own direct children). */
function figureSeat(beat: HTMLElement): HTMLElement {
    return beat.querySelector<HTMLElement>(".story-card__figure") ?? beat;
}

function figureBoxes(beat: HTMLElement): HTMLElement[] {
    return [...figureSeat(beat).children].filter(
        (el): el is HTMLElement => el instanceof HTMLElement && !el.matches(NOT_FIGURE),
    );
}

/**
 * Call `release` once the beat's figure has rendered and held its size for `quietMs`. Returns a
 * stop function. Without a ResizeObserver there is nothing to measure against, so the floor is
 * released at once rather than painted unmeasured.
 */
export function watchFigureSettle(
    beat: HTMLElement,
    release: () => void,
    quietMs: number = FIGURE_SETTLE_QUIET_MS,
): () => void {
    if (typeof ResizeObserver === "undefined" || typeof MutationObserver === "undefined") {
        release();
        return () => undefined;
    }
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observed = new Set<Element>();

    const stop = (): void => {
        done = true;
        if (timer) clearTimeout(timer);
        resize.disconnect();
        mutation.disconnect();
    };
    const rendered = (): boolean => figureBoxes(beat).some((el) => el.getBoundingClientRect().height > 0);
    const arm = (): void => {
        if (done) return;
        if (timer) clearTimeout(timer);
        timer = null;
        if (!rendered()) return;
        timer = setTimeout(() => {
            stop();
            release();
        }, quietMs);
    };
    const observeBoxes = (): void => {
        for (const el of figureBoxes(beat)) {
            if (observed.has(el)) continue;
            observed.add(el);
            resize.observe(el);
        }
    };

    const resize = new ResizeObserver(arm);
    // The figure mounts late (a lazy component point fills the seat after first paint), and a
    // StoryCard's sector appears with its card: watch the beat's subtree for new figure boxes. A
    // mutation only adds observations; the clock restarts on a size change (each new observation
    // delivers its first size to `arm`), so a figure that repaints in place does not hold the floor.
    const mutation = new MutationObserver(observeBoxes);
    mutation.observe(beat, { childList: true, subtree: true });
    observeBoxes();
    return stop;
}
