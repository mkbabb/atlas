import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToSection } from "../../src/platform/chrome/dock/scroll-anchor";

interface AnchorFixture {
    deliver: () => void;
    disconnect: ReturnType<typeof vi.fn>;
    scrollIntoView: ReturnType<typeof vi.fn>;
    setScrollY: (scrollY: number) => void;
    setTop: (top: number) => void;
    document: EventTarget;
    window: EventTarget;
}

interface AnchorFixtureOptions {
    marginTop?: string;
    paddingTop?: string;
    targetPresent?: boolean;
}

function anchorFixture({
    marginTop = "32px",
    paddingTop = "0px",
    targetPresent = true,
}: AnchorFixtureOptions = {}): AnchorFixture {
    let top = 100;
    let resize: ResizeObserverCallback = () => undefined;
    const disconnect = vi.fn();
    const scrollIntoView = vi.fn();
    const target = {
        getBoundingClientRect: () => ({ top }),
        scrollIntoView,
    } as unknown as HTMLElement;
    const body = {} as HTMLElement;
    const scrollingElement = {
        scrollHeight: 10_000,
        clientHeight: 900,
        scrollTop: 0,
    };
    const documentTarget = Object.assign(new EventTarget(), {
        body,
        getElementById: () => (targetPresent ? target : null),
        onscrollend: null,
        scrollingElement,
    });
    const windowTarget = Object.assign(new EventTarget(), {
        scrollY: 0,
        getComputedStyle: (element: unknown) => ({
            scrollMarginTop: element === target ? marginTop : "0px",
            scrollPaddingTop:
                element === scrollingElement ? paddingTop : "0px",
        }),
        requestAnimationFrame: (callback: FrameRequestCallback) =>
            setTimeout(() => callback(0), 0),
        cancelAnimationFrame: (id: number) => clearTimeout(id),
    });

    vi.stubGlobal("document", documentTarget);
    vi.stubGlobal("window", windowTarget);
    vi.stubGlobal(
        "ResizeObserver",
        class {
            constructor(callback: ResizeObserverCallback) {
                resize = callback;
            }
            observe() {}
            disconnect() {
                disconnect();
            }
        },
    );

    return {
        deliver: () => resize([], {} as ResizeObserver),
        disconnect,
        scrollIntoView,
        setScrollY: (scrollY) => {
            windowTarget.scrollY = scrollY;
            scrollingElement.scrollTop = scrollY;
        },
        setTop: (next) => {
            top = next;
        },
        document: documentTarget,
        window: windowTarget,
    };
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("dock semantic section scroll", () => {
    it("re-anchors at scroll end when hydration moved the target during smooth scroll, and again for each later move", () => {
        vi.useFakeTimers();
        const fixture = anchorFixture();
        const remove = vi.spyOn(fixture.document, "removeEventListener");

        scrollToSection("scatter");
        fixture.setScrollY(68);
        fixture.setTop(2600);
        fixture.deliver();
        fixture.document.dispatchEvent(new Event("scrollend"));
        fixture.setTop(3200);
        fixture.deliver();

        // Every move after the settle is corrected until the layout is quiet (U/B7b M3 repair 1).
        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(3);
        expect(fixture.scrollIntoView.mock.calls).toEqual([
            [{ behavior: "smooth", block: "start" }],
            [{ behavior: "auto", block: "start" }],
            [{ behavior: "auto", block: "start" }],
        ]);
        expect(remove).toHaveBeenCalledOnce();
    });

    it("re-anchors each move when hydration moves the target after scroll end", () => {
        const fixture = anchorFixture();

        scrollToSection("scatter");
        fixture.setScrollY(68);
        fixture.setTop(32);
        fixture.document.dispatchEvent(new Event("scrollend"));
        fixture.setTop(2600);
        fixture.deliver();
        fixture.setTop(3200);
        fixture.deliver();

        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(3);
    });

    it("ignores stale scrollend until the requested anchor endpoint is reached", () => {
        const fixture = anchorFixture();

        scrollToSection("scatter");
        fixture.document.dispatchEvent(new Event("scrollend"));
        expect(fixture.scrollIntoView).toHaveBeenCalledOnce();

        fixture.setScrollY(68);
        fixture.setTop(2600);
        fixture.deliver();
        fixture.document.dispatchEvent(new Event("scrollend"));

        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it("resumes once when the page holds still short of the endpoint at scrollend", async () => {
        const fixture = anchorFixture();
        const frames = () => new Promise((done) => setTimeout(done, 20));

        scrollToSection("scatter");
        fixture.setScrollY(40);
        fixture.document.dispatchEvent(new Event("scrollend"));
        await frames();
        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(2);

        fixture.document.dispatchEvent(new Event("scrollend"));
        await frames();
        expect(fixture.scrollIntoView, "once only").toHaveBeenCalledTimes(2);
    });

    it("spends no resume on a stale scrollend while the page is moving", async () => {
        const fixture = anchorFixture();
        const frames = () => new Promise((done) => setTimeout(done, 20));

        scrollToSection("scatter");
        fixture.document.dispatchEvent(new Event("scrollend"));
        fixture.setScrollY(40);
        await frames();
        expect(fixture.scrollIntoView).toHaveBeenCalledOnce();

        fixture.document.dispatchEvent(new Event("scrollend"));
        await frames();
        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it("includes target margin and root padding in the requested endpoint", () => {
        const fixture = anchorFixture({ paddingTop: "16px" });

        scrollToSection("scatter");
        fixture.setScrollY(52);
        fixture.setTop(48);
        fixture.document.dispatchEvent(new Event("scrollend"));
        fixture.setTop(80);
        fixture.deliver();

        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it("settles an already-aligned no-op without waiting for scrollend", () => {
        const fixture = anchorFixture({ marginTop: "auto", paddingTop: "auto" });
        fixture.setTop(0);

        scrollToSection("scatter");
        fixture.setTop(100);
        fixture.deliver();

        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it("accepts a bottom-bound scroll endpoint", () => {
        const fixture = anchorFixture();
        fixture.setTop(9800);

        scrollToSection("bottom");
        fixture.setScrollY(9100);
        fixture.setTop(700);
        fixture.document.dispatchEvent(new Event("scrollend"));
        fixture.setTop(750);
        fixture.deliver();

        expect(fixture.scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it("does not re-anchor a stable reduced-motion target", () => {
        vi.useFakeTimers();
        const fixture = anchorFixture();

        scrollToSection("scatter", true);
        fixture.setScrollY(68);
        fixture.setTop(32);
        vi.runAllTimers();

        expect(fixture.scrollIntoView).toHaveBeenCalledOnce();
        expect(fixture.scrollIntoView).toHaveBeenCalledWith({
            behavior: "auto",
            block: "start",
        });
    });

    it("abandons a pending correction on fresh reader input", () => {
        vi.useFakeTimers();
        const fixture = anchorFixture();
        const remove = vi.spyOn(fixture.window, "removeEventListener");
        const removeScrollEnd = vi.spyOn(
            fixture.document,
            "removeEventListener",
        );

        scrollToSection("scatter");
        fixture.setTop(2600);
        fixture.deliver();
        fixture.window.dispatchEvent(new Event("wheel"));
        vi.runAllTimers();

        expect(fixture.scrollIntoView).toHaveBeenCalledOnce();
        expect(fixture.disconnect).toHaveBeenCalledOnce();
        expect(remove).toHaveBeenCalledTimes(3);
        expect(removeScrollEnd).toHaveBeenCalledOnce();
    });

    it("is a silent no-op when the semantic target is absent", () => {
        const fixture = anchorFixture({ targetPresent: false });

        const cancel = scrollToSection("missing");
        cancel();

        expect(fixture.scrollIntoView).not.toHaveBeenCalled();
    });
});
