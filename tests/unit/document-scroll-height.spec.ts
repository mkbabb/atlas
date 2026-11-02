import { effectScope, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

/* U/B8 PF (P-1, P-2). RED before: the whole-document progress computed read
   `document.documentElement.scrollHeight` on every evaluation, and its watchers (the dock spine,
   the scroll chrome) re-evaluate it on each scroll tick inside Vue's flush, where chart mounts
   leave layout dirty: a forced layout per tick (atlas useScrollProgress, 28-49 ms self time on
   the /sci and /demand phone scroll walks, out/b8-pf/prof). Mutation: read scrollHeight in the
   computed again and the read count below reds. */
describe("useDocumentScrollProgress reads the page height off the root's resize delivery", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("a scroll tick reads no scrollHeight; a resize delivery does", async () => {
        let reads = 0;
        let pageHeight = 4000;
        const root = {} as HTMLElement;
        Object.defineProperty(root, "scrollHeight", { get: () => (reads++, pageHeight) });
        const listeners: Record<string, () => void> = {};
        let deliver: () => void = () => {};
        vi.stubGlobal("document", { documentElement: root });
        vi.stubGlobal("window", {
            scrollY: 0,
            innerHeight: 1000,
            addEventListener: (t: string, f: () => void) => (listeners[t] = f),
            removeEventListener: () => {},
        });
        vi.stubGlobal(
            "ResizeObserver",
            class {
                constructor(cb: () => void) {
                    deliver = cb;
                }
                observe() {}
                disconnect() {}
            },
        );
        const { useDocumentScrollProgress } = await import("../../src/motion/useScrollProgress");
        const scope = effectScope();
        const p = scope.run(() => useDocumentScrollProgress())!;
        expect(p.value).toBe(0);
        const before = reads;
        for (const y of [300, 900, 1500]) {
            (window as unknown as { scrollY: number }).scrollY = y;
            listeners.scroll();
            await nextTick();
            void p.value;
        }
        expect(reads - before).toBe(0);
        expect(p.value).toBeCloseTo(1500 / 3000);
        pageHeight = 6000;
        deliver();
        expect(p.value).toBeCloseTo(1500 / 5000);
        scope.stop();
    });
});
