import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeckDetent, type DeckDetent } from "@/stage";

interface FakePanel {
    offsetTop: number;
    offsetLeft: number;
    style: { scrollSnapStop: string };
}

function fakeContainer(native = true) {
    const listeners = new Map<string, () => void>();
    const children: FakePanel[] = [0, 100, 200].map((offsetTop) => ({
        offsetTop,
        offsetLeft: offsetTop,
        style: { scrollSnapStop: "" },
    }));
    const container = {
        children,
        scrollTop: 0,
        scrollLeft: 0,
        scrollTo: vi.fn((options: ScrollToOptions) => {
            container.scrollTop = options.top ?? container.scrollTop;
            container.scrollLeft = options.left ?? container.scrollLeft;
        }),
        addEventListener: vi.fn((type: string, callback: () => void) => listeners.set(type, callback)),
        removeEventListener: vi.fn((type: string) => listeners.delete(type)),
        ...(native ? { onscrollsnapchange: null } : {}),
    };
    return { container: container as unknown as HTMLElement, children, listeners };
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("useDeckDetent", () => {
    it("maps exact detents onto adjacent Glass deck steps and settles native snap changes", () => {
        const transitions: DeckDetent[] = [];
        const deck = useDeckDetent({ transition: (commit) => commit() });
        const { container, children, listeners } = fakeContainer();
        const release = deck.bind(container);

        deck.setDetent("full");
        transitions.push(deck.activeDetent.value);
        expect(deck.activeIndex.value).toBe(1);
        expect(container.scrollTo).toHaveBeenLastCalledWith({ top: 100, left: 0, behavior: "smooth" });
        expect(children.every((panel) => panel.style.scrollSnapStop === "always")).toBe(true);

        listeners.get("scrollsnapchange")?.();
        transitions.push(deck.activeDetent.value);
        expect(deck.activeIndex.value).toBe(2);
        expect(container.scrollTo).toHaveBeenLastCalledWith({ top: 200, left: 0, behavior: "smooth" });

        release();
        expect(transitions).toEqual(["peek", "full"]);
        expect(children.every((panel) => panel.style.scrollSnapStop === "")).toBe(true);
    });

    it("uses the debounced nearest offset when snap and intersection observers are unavailable", () => {
        vi.useFakeTimers();
        vi.stubGlobal("IntersectionObserver", undefined);
        const deck = useDeckDetent();
        const { container, listeners } = fakeContainer(false);
        deck.bind(container);

        container.scrollTop = 190;
        listeners.get("scroll")?.();
        vi.advanceTimersByTime(80);

        expect(deck.activeIndex.value).toBe(1);
        expect(container.scrollTo).toHaveBeenLastCalledWith({ top: 100, left: 0, behavior: "smooth" });
    });
});
