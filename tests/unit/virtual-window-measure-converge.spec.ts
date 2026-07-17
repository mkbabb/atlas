import { afterEach, describe, expect, it } from "vitest";
import { effectScope, ref } from "vue";
import { useVirtualWindow } from "../../src/filter/composables/useVirtualWindow";

/** A capturable ResizeObserver stub — jsdom/node ship none, and the convergence seam lives in the
    observer callback, so we drive it by hand. */
function makeFakeRO() {
    const instances: { fire: (entries: unknown[]) => void }[] = [];
    class RO {
        constructor(private cb: (entries: unknown[]) => void) {
            instances.push({ fire: (entries) => this.cb(entries) });
        }
        observe(): void {}
        disconnect(): void {}
    }
    return {
        ctor: RO as unknown as typeof ResizeObserver,
        reset: (): void => {
            instances.length = 0;
        },
        last: () => instances[instances.length - 1]!,
    };
}

function makeViewport() {
    return {
        clientWidth: 300,
        clientHeight: 400,
        scrollTop: 0,
        addEventListener(): void {},
        removeEventListener(): void {},
    } as unknown as HTMLElement;
}

function makeRowEl(borderBoxHeight: number): Element {
    return {
        getBoundingClientRect: () => ({ height: borderBoxHeight }),
    } as unknown as Element;
}

afterEach(() => {
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
});

describe("useVirtualWindow — measurement convergence", () => {
    it("commits the border box (matching the seed), so a stable row settles at its fixed point", () => {
        const fakeRO = makeFakeRO();
        (globalThis as { ResizeObserver?: unknown }).ResizeObserver = fakeRO.ctor;

        const items = ref([{ id: "r1" }]);
        const viewport = ref(makeViewport());
        const scope = effectScope();
        let virtual!: ReturnType<typeof useVirtualWindow<{ id: string }, string>>;
        scope.run(() => {
            virtual = useVirtualWindow<{ id: string }, string>({
                items,
                viewport,
                key: (item) => item.id,
                estimateSize: 42,
            });
        });
        expect(virtual.totalSize.value).toBe(42); // the estimate, before any measurement

        fakeRO.reset();
        const rowEl = makeRowEl(50); // getBoundingClientRect().height = 50 (border box)
        virtual.observe("r1", rowEl);
        expect(virtual.totalSize.value).toBe(50); // the seed committed the border box

        // The observer fires with a border box of 50 and a one-border-shorter content box of 49.
        // The cure reads the BORDER box, which equals the seed — so this is a no-op and the layout
        // holds. Before the cure it read `contentRect` (49), flipped `sizes`, and (re-observed each
        // render) never settled.
        fakeRO.last().fire([
            { borderBoxSize: [{ blockSize: 50 }], contentRect: { height: 49 }, target: rowEl },
        ]);
        expect(virtual.totalSize.value).toBe(50); // the fixed point — no flip to the content box

        scope.stop();
    });

    it("reads borderBoxSize when present and falls back to contentRect when it is not", () => {
        const fakeRO = makeFakeRO();
        (globalThis as { ResizeObserver?: unknown }).ResizeObserver = fakeRO.ctor;

        const items = ref([{ id: "r1" }]);
        const viewport = ref(makeViewport());
        const scope = effectScope();
        let virtual!: ReturnType<typeof useVirtualWindow<{ id: string }, string>>;
        scope.run(() => {
            virtual = useVirtualWindow<{ id: string }, string>({
                items,
                viewport,
                key: (item) => item.id,
                estimateSize: 42,
            });
        });

        fakeRO.reset();
        const rowEl = makeRowEl(50);
        virtual.observe("r1", rowEl);

        // borderBoxSize present → its blockSize wins (proves the observer no longer reads contentRect).
        fakeRO.last().fire([
            { borderBoxSize: [{ blockSize: 60 }], contentRect: { height: 49 }, target: rowEl },
        ]);
        expect(virtual.totalSize.value).toBe(60);

        // borderBoxSize empty → the contentRect fallback carries the measure.
        fakeRO.last().fire([
            { borderBoxSize: [], contentRect: { height: 70 }, target: rowEl },
        ]);
        expect(virtual.totalSize.value).toBe(70);

        scope.stop();
    });
});
