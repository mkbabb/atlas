import {
    computed,
    getCurrentScope,
    onScopeDispose,
    type ComputedRef,
    type Ref,
} from "vue";
import { useStageDeck } from "./useStageDeck";

export type DeckDetent = "shut" | "peek" | "full";

const DETENTS = ["shut", "peek", "full"] as const satisfies readonly DeckDetent[];

export type DeckTransitionHook = (commit: () => void) => void;

export interface UseDeckDetentOptions {
    /** The snap axis. Stage decks are vertical unless a host declares otherwise. */
    axis?: "x" | "y";
    /** Optional same-document transition wrapper. Navigation does not belong in this seam. */
    transition?: DeckTransitionHook;
}

export interface DeckDetentController {
    activeIndex: Ref<number>;
    activeDetent: ComputedRef<DeckDetent>;
    request(index: number): void;
    setDetent(detent: DeckDetent): void;
    /** Bind one scroll-snap container. Rebinding disposes the previous observers and listeners. */
    bind(container: HTMLElement | null): () => void;
}

function detentAt(index: number): DeckDetent {
    return DETENTS[Math.max(0, Math.min(DETENTS.length - 1, index))] ?? "shut";
}

/**
 * Three discrete stage detents over Glass's deck core. The browser owns geometry;
 * this controller only commits settled snap indices and never publishes a continuous scalar.
 */
export function useDeckDetent(options: UseDeckDetentOptions = {}): DeckDetentController {
    const axis = options.axis ?? "y";
    let bound: HTMLElement | null = null;
    let releaseBinding: () => void = () => undefined;

    function panels(): HTMLElement[] {
        return bound ? (Array.from(bound.children) as HTMLElement[]).slice(0, DETENTS.length) : [];
    }

    function scrollToIndex(index: number): void {
        if (!bound) return;
        const target = panels()[index];
        if (!target) return;
        const commit = (): void => {
            const top = axis === "y" ? target.offsetTop : bound!.scrollTop;
            const left = axis === "x" ? target.offsetLeft : bound!.scrollLeft;
            if (typeof bound!.scrollTo === "function") {
                bound!.scrollTo({ top, left, behavior: "smooth" });
            } else {
                bound!.scrollTop = top;
                bound!.scrollLeft = left;
            }
        };
        if (options.transition) options.transition(commit);
        else commit();
    }

    const stage = useStageDeck(DETENTS.length, ({ to }) => scrollToIndex(to));
    const activeDetent = computed(() => detentAt(stage.activeIndex.value));

    function request(index: number): void {
        stage.request(index);
    }

    function setDetent(detent: DeckDetent): void {
        request(DETENTS.indexOf(detent));
    }

    function nearestIndex(): number {
        if (!bound) return stage.activeIndex.value;
        const position = axis === "y" ? bound.scrollTop : bound.scrollLeft;
        let nearest = 0;
        let distance = Number.POSITIVE_INFINITY;
        for (const [index, panel] of panels().entries()) {
            const offset = axis === "y" ? panel.offsetTop : panel.offsetLeft;
            const nextDistance = Math.abs(offset - position);
            if (nextDistance < distance) {
                distance = nextDistance;
                nearest = index;
            }
        }
        return nearest;
    }

    function commitSettled(index: number): void {
        const inFlight = stage.inFlight.value;
        if (inFlight?.to === index) {
            stage.settle();
            return;
        }
        if (!inFlight && stage.activeIndex.value !== index) stage.request(index);
    }

    function bind(container: HTMLElement | null): () => void {
        releaseBinding();
        bound = container;
        if (!container) {
            releaseBinding = () => undefined;
            return releaseBinding;
        }

        const snapStops = panels().map((panel) => panel.style.scrollSnapStop);
        for (const panel of panels()) panel.style.scrollSnapStop = "always";

        let observer: IntersectionObserver | null = null;
        let settleTimer: ReturnType<typeof setTimeout> | null = null;
        let stopped = false;
        const settleNearest = (): void => commitSettled(nearestIndex());
        const onSnapChange = (): void => settleNearest();
        const onScroll = (): void => {
            if (settleTimer != null) clearTimeout(settleTimer);
            settleTimer = setTimeout(settleNearest, 80);
        };

        if ("onscrollsnapchange" in container) {
            container.addEventListener("scrollsnapchange", onSnapChange);
        } else if (typeof IntersectionObserver !== "undefined") {
            observer = new IntersectionObserver(
                (entries) => {
                    const candidate = entries
                        .filter((entry) => entry.isIntersecting)
                        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                    if (!candidate) return;
                    const index = panels().indexOf(candidate.target as HTMLElement);
                    if (index >= 0) commitSettled(index);
                },
                { root: container, threshold: [0.5, 0.75, 1] },
            );
            for (const panel of panels()) observer.observe(panel);
        } else {
            container.addEventListener("scroll", onScroll, { passive: true });
        }

        releaseBinding = (): void => {
            if (stopped) return;
            stopped = true;
            container.removeEventListener("scrollsnapchange", onSnapChange);
            container.removeEventListener("scroll", onScroll);
            observer?.disconnect();
            if (settleTimer != null) clearTimeout(settleTimer);
            panels().forEach((panel, index) => {
                panel.style.scrollSnapStop = snapStops[index] ?? "";
            });
            if (bound === container) bound = null;
        };
        return releaseBinding;
    }

    if (getCurrentScope()) onScopeDispose(() => releaseBinding());

    return { activeIndex: stage.activeIndex, activeDetent, request, setDetent, bind };
}
