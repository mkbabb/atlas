import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";
import { useDeckDetent } from "@/stage/useDeckDetent";

interface FakePanel {
    offsetTop: number;
    offsetLeft: number;
}

type Listener = (event: Event) => void;

const entry = (target: FakePanel, intersectionRatio: number): IntersectionObserverEntry =>
    ({ target, isIntersecting: intersectionRatio > 0, intersectionRatio }) as unknown as
        IntersectionObserverEntry;

function fakeContainer(
    options: { native?: boolean; transition?: (update: () => void) => unknown } = {},
) {
    const listeners = new Map<string, Listener>();
    const children: FakePanel[] = [0, 100, 200, 300, 400].map((offset) => ({
        offsetTop: offset,
        offsetLeft: offset * 2,
    }));
    const ownerDocument = {
        startViewTransition: options.transition,
    };
    const container = {
        children,
        ownerDocument,
        scrollTop: 0,
        scrollLeft: 0,
        scrollTo: vi.fn((scroll: ScrollToOptions) => {
            container.scrollTop = scroll.top ?? container.scrollTop;
            container.scrollLeft = scroll.left ?? container.scrollLeft;
        }),
        addEventListener: vi.fn((type: string, callback: Listener) => listeners.set(type, callback)),
        removeEventListener: vi.fn((type: string, callback: Listener) => {
            if (listeners.get(type) === callback) listeners.delete(type);
        }),
        ...(options.native === false ? {} : { onscrollsnapchange: null }),
    };
    return { container: container as unknown as HTMLElement, children, listeners, ownerDocument };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("useDeckDetent", () => {
    it("drives every slide, clamps navigation, and settles native snap targets", () => {
        const { container, children, listeners } = fakeContainer();
        const scope = effectScope();
        const deck = scope.run(() => useDeckDetent(container))!;

        expect(deck.isSupported.value).toBe(true);
        expect(deck.containerAttrs.value).toEqual({
            "data-deck": "snap",
            "data-deck-axis": "y",
            style: "scroll-snap-type: y mandatory;",
        });
        expect(deck.slideAttrs(0)).toEqual({
            "data-slide": "0",
            "data-state": "active",
            style: "scroll-snap-align: start; scroll-snap-stop: always;",
        });

        deck.goTo(99);
        expect(deck.activeIndex.value).toBe(4);
        expect(container.scrollTo).toHaveBeenLastCalledWith({
            top: 400,
            left: 0,
            behavior: "auto",
        });

        listeners.get("scrollsnapchange")?.({
            snapTargetBlock: children[2],
        } as unknown as Event);
        expect(deck.activeIndex.value).toBe(2);
        expect(deck.slideAttrs(2)["data-state"]).toBe("active");

        deck.goTo(-10);
        expect(deck.activeIndex.value).toBe(0);
        scope.stop();
        expect(listeners.has("scrollsnapchange")).toBe(false);
        expect(container.removeEventListener).toHaveBeenCalledOnce();
    });

    it("reuses one complete-ratio observer across fallback decks", () => {
        let callback: IntersectionObserverCallback | undefined;
        const observe = vi.fn();
        const unobserve = vi.fn();
        const disconnect = vi.fn();
        const IntersectionObserver = vi.fn(function (
            this: IntersectionObserver,
            next: IntersectionObserverCallback,
        ) {
            callback = next;
            return { observe, unobserve, disconnect };
        });
        vi.stubGlobal("IntersectionObserver", IntersectionObserver);
        const first = fakeContainer({ native: false });
        const second = fakeContainer({ native: false });
        const firstSource = shallowRef<HTMLElement | null>(first.container);
        const scope = effectScope();
        const [firstDeck, secondDeck] = scope.run(() => [
            useDeckDetent(firstSource, { axis: "x", stop: "normal" }),
            useDeckDetent(second.container),
        ])!;

        expect(firstDeck!.isSupported.value).toBe(false);
        expect(firstDeck!.containerAttrs.value.style).toBe("scroll-snap-type: x mandatory;");
        expect(firstDeck!.slideAttrs(4).style).toBe(
            "scroll-snap-align: start; scroll-snap-stop: normal;",
        );
        expect(observe).toHaveBeenCalledTimes(10);
        expect(IntersectionObserver).toHaveBeenCalledOnce();
        expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
            threshold: [0, 0.5, 0.75, 1],
        });

        callback?.([entry(first.children[1]!, 0.6)], {} as IntersectionObserver);
        expect(firstDeck!.activeIndex.value).toBe(1);
        callback?.([entry(first.children[3]!, 0.9)], {} as IntersectionObserver);
        expect(firstDeck!.activeIndex.value).toBe(3);
        callback?.([entry(first.children[3]!, 0.2)], {} as IntersectionObserver);
        expect(firstDeck!.activeIndex.value).toBe(1);
        callback?.([entry(second.children[2]!, 0.8)], {} as IntersectionObserver);
        expect(secondDeck!.activeIndex.value).toBe(2);

        firstDeck!.goTo(2);
        expect(first.container.scrollTo).toHaveBeenLastCalledWith({
            top: 0,
            left: 400,
            behavior: "auto",
        });

        firstSource.value = null;
        expect(unobserve).toHaveBeenCalledTimes(5);
        expect(disconnect).not.toHaveBeenCalled();
        expect(firstDeck!.isSupported.value).toBe(false);
        scope.stop();
        expect(unobserve).toHaveBeenCalledTimes(10);
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it("uses the bound document view transition by default", () => {
        const startViewTransition = vi.fn((update: () => void) => update());
        const { container } = fakeContainer({ transition: startViewTransition });
        const scope = effectScope();
        const deck = scope.run(() => useDeckDetent(container))!;

        deck.goTo(3);
        expect(startViewTransition).toHaveBeenCalledOnce();
        expect(container.scrollTo).toHaveBeenCalledOnce();
        scope.stop();
    });

    it("captures the current host before an asynchronous transition callback", () => {
        let commit: (() => void) | undefined;
        const startViewTransition = vi.fn((update: () => void) => {
            commit = update;
        });
        const first = fakeContainer({ transition: startViewTransition });
        const second = fakeContainer();
        const source = shallowRef<HTMLElement | null>(first.container);
        const scope = effectScope();
        const deck = scope.run(() => useDeckDetent(source))!;

        deck.goTo(3);
        source.value = second.container;
        commit?.();

        expect(first.container.scrollTo).toHaveBeenCalledWith({
            top: 300,
            left: 0,
            behavior: "auto",
        });
        expect(second.container.scrollTo).not.toHaveBeenCalled();
        scope.stop();
    });

    it("commits directly when transitions are disabled or unavailable", () => {
        const startViewTransition = vi.fn((update: () => void) => update());
        const enabled = fakeContainer({ transition: startViewTransition });
        const unavailable = fakeContainer({ transition: undefined });
        const scope = effectScope();
        const decks = scope.run(() => [
            useDeckDetent(enabled.container, { transition: false }),
            useDeckDetent(unavailable.container, { transition: true }),
        ])!;

        decks[0]!.goTo(1);
        decks[1]!.goTo(1);
        expect(startViewTransition).not.toHaveBeenCalled();
        expect(enabled.container.scrollTo).toHaveBeenCalledOnce();
        expect(unavailable.container.scrollTo).toHaveBeenCalledOnce();
        scope.stop();
    });
});
