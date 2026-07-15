import { useDeck, type DeckCore } from "@mkbabb/glass-ui/deck";
import {
    computed,
    readonly,
    ref,
    toValue,
    watch,
    type ComputedRef,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";

export interface DeckDetentOptions {
    axis?: "x" | "y";
    stop?: "always" | "normal";
    transition?: boolean;
}

export interface DeckDetentReturn {
    activeIndex: Readonly<Ref<number>>;
    isSupported: Readonly<Ref<boolean>>;
    containerAttrs: ComputedRef<Record<string, string>>;
    slideAttrs(index: number): Record<string, string>;
    goTo(index: number): void;
}

interface SnapChangeEvent extends Event {
    snapTargetBlock?: Element | null;
    snapTargetInline?: Element | null;
}

type TransitionDocument = Document & {
    startViewTransition?: (update: () => void) => unknown;
};

interface ObservedDeck {
    slides: readonly HTMLElement[];
    ratios: Map<HTMLElement, number>;
    settle(index: number): void;
}

const observedDecks = new Set<ObservedDeck>();
const deckBySlide = new Map<HTMLElement, ObservedDeck>();
let intersectionObserver: IntersectionObserver | null = null;

function bindIntersectionDeck(
    slides: readonly HTMLElement[],
    settle: (index: number) => void,
): () => void {
    const deck: ObservedDeck = {
        slides,
        ratios: new Map(slides.map((slide) => [slide, 0])),
        settle,
    };
    observedDecks.add(deck);
    intersectionObserver ??= new IntersectionObserver(
        (entries) => {
            const changed = new Set<ObservedDeck>();
            for (const entry of entries) {
                const owner = deckBySlide.get(entry.target as HTMLElement);
                if (!owner) continue;
                owner.ratios.set(
                    entry.target as HTMLElement,
                    entry.isIntersecting ? entry.intersectionRatio : 0,
                );
                changed.add(owner);
            }
            for (const owner of changed) {
                let best = -1;
                let ratio = 0;
                owner.slides.forEach((slide, index) => {
                    const next = owner.ratios.get(slide) ?? 0;
                    if (next > ratio) {
                        best = index;
                        ratio = next;
                    }
                });
                if (best >= 0) owner.settle(best);
            }
        },
        { threshold: [0, 0.5, 0.75, 1] },
    );
    for (const slide of slides) {
        deckBySlide.set(slide, deck);
        intersectionObserver.observe(slide);
    }
    return () => {
        for (const slide of slides) {
            intersectionObserver?.unobserve(slide);
            deckBySlide.delete(slide);
        }
        observedDecks.delete(deck);
        if (observedDecks.size === 0) {
            intersectionObserver?.disconnect();
            intersectionObserver = null;
        }
    };
}

/**
 * Discrete N-slide scroll-snap driver. CSS owns geometry; Glass owns the settled
 * index, and no continuous scroll scalar crosses this seam.
 */
export function useDeckDetent(
    element: MaybeRefOrGetter<HTMLElement | null>,
    options: DeckDetentOptions = {},
): DeckDetentReturn {
    const axis = options.axis ?? "y";
    const stop = options.stop ?? "always";
    const transition = options.transition ?? true;
    const activeIndex = ref(0);
    const isSupported = ref(false);
    let container: HTMLElement | null = null;
    let deck: DeckCore | null = null;

    const slides = (): HTMLElement[] =>
        container ? (Array.from(container.children) as HTMLElement[]) : [];

    function ensureDeck(): DeckCore | null {
        const total = slides().length;
        if (total === 0) {
            deck = null;
            activeIndex.value = 0;
            return null;
        }
        if (deck?.total === total) return deck;
        deck = useDeck(total, {
            initial: activeIndex.value,
            onChange: (index) => {
                activeIndex.value = index;
            },
        });
        activeIndex.value = deck.index.value;
        return deck;
    }

    function nearestIndex(): number {
        const position = axis === "y" ? container?.scrollTop : container?.scrollLeft;
        let nearest = 0;
        let distance = Number.POSITIVE_INFINITY;
        for (const [index, slide] of slides().entries()) {
            const offset = axis === "y" ? slide.offsetTop : slide.offsetLeft;
            const nextDistance = Math.abs(offset - (position ?? 0));
            if (nextDistance < distance) {
                nearest = index;
                distance = nextDistance;
            }
        }
        return nearest;
    }

    function settle(index: number): void {
        const core = ensureDeck();
        if (!core) return;
        core.go(index);
        activeIndex.value = core.index.value;
    }

    function goTo(index: number): void {
        const core = ensureDeck();
        const host = container;
        if (!host || !core) return;
        core.go(index);
        activeIndex.value = core.index.value;
        const target = Array.from(host.children)[core.index.value] as HTMLElement | undefined;
        if (!target) return;

        const commit = (): void => {
            const top = axis === "y" ? target.offsetTop : host.scrollTop;
            const left = axis === "x" ? target.offsetLeft : host.scrollLeft;
            if (typeof host.scrollTo === "function") {
                host.scrollTo({ top, left, behavior: "auto" });
            } else {
                host.scrollTop = top;
                host.scrollLeft = left;
            }
        };
        const document = host.ownerDocument as TransitionDocument;
        if (transition && typeof document.startViewTransition === "function") {
            document.startViewTransition(commit);
        } else {
            commit();
        }
    }

    watch(
        () => toValue(element),
        (next, _previous, onCleanup) => {
            container = next;
            deck = null;
            isSupported.value = Boolean(next && "onscrollsnapchange" in next);
            ensureDeck();
            if (!next) return;

            const boundSlides = slides();
            let releaseObserver: (() => void) | null = null;
            const onSnapChange = (event: Event): void => {
                const snap = event as SnapChangeEvent;
                const target = axis === "y" ? snap.snapTargetBlock : snap.snapTargetInline;
                const index = target ? boundSlides.indexOf(target as HTMLElement) : -1;
                settle(index >= 0 ? index : nearestIndex());
            };

            if (isSupported.value) {
                next.addEventListener("scrollsnapchange", onSnapChange);
            } else if (typeof IntersectionObserver !== "undefined") {
                releaseObserver = bindIntersectionDeck(boundSlides, settle);
            }

            onCleanup(() => {
                next.removeEventListener("scrollsnapchange", onSnapChange);
                releaseObserver?.();
                if (container === next) {
                    container = null;
                    deck = null;
                    isSupported.value = false;
                }
            });
        },
        { immediate: true, flush: "sync" },
    );

    const containerAttrs = computed<Record<string, string>>(() => ({
        "data-deck": "snap",
        "data-deck-axis": axis,
        style: `scroll-snap-type: ${axis} mandatory;`,
    }));

    function slideAttrs(index: number): Record<string, string> {
        return {
            "data-slide": String(index),
            "data-state": index === activeIndex.value ? "active" : "parked",
            style: `scroll-snap-align: start; scroll-snap-stop: ${stop};`,
        };
    }

    return {
        activeIndex: readonly(activeIndex),
        isSupported: readonly(isSupported),
        containerAttrs,
        slideAttrs,
        goTo,
    };
}
