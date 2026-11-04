import { afterEach, describe, expect, it } from "vitest";
import { effectScope, ref, watch } from "vue";
import { useVirtualWindow } from "../../src/filter/composables/useVirtualWindow";

/** A capturable ResizeObserver stub — jsdom/node ship none, and the convergence seam lives in the
    observer callback, so we drive it by hand. */
function makeFakeRO() {
    const instances: { fire: (entries: unknown[]) => void; observed: Set<unknown> }[] = [];
    class RO {
        private observed = new Set<unknown>();
        constructor(private cb: (entries: unknown[]) => void) {
            instances.push({ fire: (entries) => this.cb(entries), observed: this.observed });
        }
        observe(el: unknown): void {
            this.observed.add(el);
        }
        unobserve(el: unknown): void {
            this.observed.delete(el);
        }
        disconnect(): void {}
    }
    return {
        ctor: RO as unknown as typeof ResizeObserver,
        reset: (): void => {
            instances.length = 0;
        },
        last: () => instances[instances.length - 1]!,
        count: () => instances.length,
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
    it("commits the border box from the observer, so a stable row settles at its fixed point", () => {
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
        const rowEl = makeRowEl(50);
        virtual.observe("r1", rowEl);
        // U/B8r DV-3: observe reads no layout. The row's size waits for the observer's first
        // delivery, which the browser makes after its own layout.
        expect(virtual.totalSize.value).toBe(42);

        // The observer fires with a border box of 50 and a one-border-shorter content box of 49.
        // The border box wins; a second identical delivery is a no-op, so the layout holds.
        fakeRO.last().fire([
            { borderBoxSize: [{ blockSize: 50 }], contentRect: { height: 49 }, target: rowEl },
        ]);
        expect(virtual.totalSize.value).toBe(50);
        fakeRO.last().fire([
            { borderBoxSize: [{ blockSize: 50 }], contentRect: { height: 49 }, target: rowEl },
        ]);
        expect(virtual.totalSize.value).toBe(50); // the fixed point — no flip to the content box

        scope.stop();
    });

    // U/B8r DV-3: the DataTable calls row-ref while it is still inserting rows, so a layout read in
    // observe forced one layout per row (2-5 ms each at 4x CPU on the /bead open).
    it("reads no layout when a row is observed", () => {
        const fakeRO = makeFakeRO();
        (globalThis as { ResizeObserver?: unknown }).ResizeObserver = fakeRO.ctor;
        const scope = effectScope();
        const virtual = scope.run(() =>
            useVirtualWindow<{ id: string }, string>({
                items: ref([{ id: "r1" }]),
                viewport: ref(makeViewport()),
                key: (item) => item.id,
            }),
        )!;
        let reads = 0;
        const rowEl = {
            getBoundingClientRect: () => {
                reads++;
                return { height: 50 };
            },
        } as unknown as Element;
        virtual.observe("r1", rowEl);
        expect(reads).toBe(0);
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

    // U/B8r DV-3: one observer per row was one callback per row, and each callback's commit
    // re-rendered the window on its own inside one frame (the /bead provider table's 96-203 ms phone
    // open). One observer for the window, and one `sizes` update per delivered batch.
    it("measures every row with one observer and commits a batch once", () => {
        const fakeRO = makeFakeRO();
        (globalThis as { ResizeObserver?: unknown }).ResizeObserver = fakeRO.ctor;

        const items = ref([{ id: "r1" }, { id: "r2" }, { id: "r3" }]);
        const viewport = ref(makeViewport());
        const scope = effectScope();
        let virtual!: ReturnType<typeof useVirtualWindow<{ id: string }, string>>;
        let relayouts = 0;
        scope.run(() => {
            virtual = useVirtualWindow<{ id: string }, string>({
                items,
                viewport,
                key: (item) => item.id,
                estimateSize: 40,
            });
            watch(virtual.totalSize, () => relayouts++, { flush: "sync" });
        });

        fakeRO.reset();
        const els = [makeRowEl(40), makeRowEl(40), makeRowEl(40)];
        const stops = els.map((el, i) => virtual.observe(`r${i + 1}`, el));
        expect(fakeRO.count(), "one observer for the window").toBe(1);
        expect(fakeRO.last().observed.size).toBe(3);

        relayouts = 0;
        fakeRO.last().fire(
            els.map((target, i) => ({ borderBoxSize: [{ blockSize: 50 + i }], contentRect: { height: 0 }, target })),
        );
        expect(virtual.totalSize.value).toBe(50 + 51 + 52);
        expect(relayouts, "a batch re-lays the window once").toBe(1);

        // A stopped row leaves the observer; the others stay.
        stops[0]!();
        expect(fakeRO.last().observed.size).toBe(2);
        scope.stop();
    });
});
