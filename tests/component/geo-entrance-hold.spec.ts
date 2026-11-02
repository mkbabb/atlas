import { computed, effectScope, nextTick, reactive, ref, shallowRef, watch } from "vue";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChoroplethProps, Shape } from "../../src/charts/geo/useChoroplethShapes.js";

// U/B8 A1 (review) — the entrance HOLD. A map that opts into an entrance keeps its marks unpainted
// until the entrance plays, so a map scrolled into view does not paint final, then snap back to the
// first frame and pop in. Reduced motion never holds and never plays, a switch to it mid-entrance
// cuts every flight to rest, and an entrance turned on after mount still plays once on first view.
// The node suite has no DOM: the observer, the motion query and the lifecycle hooks are stood in.

const io = vi.hoisted(() => ({
    target: undefined as undefined | { value: unknown },
    fire: undefined as undefined | ((entries: { isIntersecting: boolean }[]) => void),
    supported: true,
}));
const motion = vi.hoisted(() => ({ pref: undefined as undefined | { value: string } }));
const hooks = vi.hoisted(() => ({ mounted: [] as (() => void)[], unmount: [] as (() => void)[] }));

vi.mock("@vueuse/core", async (actual) => {
    const real = await actual<typeof import("@vueuse/core")>();
    return { ...real, usePreferredReducedMotion: () => motion.pref! };
});
// The first view is the atlas entrance law's (`useFirstViewTarget`); its dwell and landing hold are
// pinned in tests/unit/b8-first-view.spec.ts. Here the stand-in fires the view on demand.
vi.mock("../../src/motion/useFirstView.js", async () => {
    const vue = await import("vue");
    return {
        useFirstViewTarget: (target: { value: unknown }, cb: () => void) => {
            io.target = target;
            io.fire = () => cb();
            return { isSupported: vue.ref(io.supported) };
        },
    };
});
vi.mock("vue", async (actual) => ({
    ...(await actual<typeof import("vue")>()),
    onMounted: (fn: () => void) => hooks.mounted.push(fn),
    onBeforeUnmount: (fn: () => void) => hooks.unmount.push(fn),
}));

const { useGeoEntrance } = await import("../../src/charts/geo/useGeoEntrance.js");

interface FakeAnimation {
    cancelled: boolean;
    cancel(): void;
    finished: Promise<void>;
    currentTime: number;
    el: Record<string, string>;
    frames: Record<string, unknown>[];
}
function fakeEl(attrs: Record<string, string>, log: FakeAnimation[]) {
    return {
        getAttribute: (k: string) => attrs[k] ?? null,
        classList: { contains: () => false },
        style: {} as Record<string, string>,
        animate: (frames: Record<string, unknown>[]) => {
            const a: FakeAnimation = {
                cancelled: false,
                cancel: () => void (a.cancelled = true),
                finished: new Promise(() => {}),
                currentTime: 0,
                el: attrs,
                frames,
            };
            log.push(a);
            return a;
        },
    };
}

const shapes = computed<Shape[]>(
    () =>
        [
            { key: "01", cx: 5, cy: 5, hasValue: true },
            { key: "02", cx: 25, cy: 5, hasValue: true },
        ] as unknown as Shape[],
);

function setup(entrance: ChoroplethProps["entrance"], reduce = false) {
    const flights: FakeAnimation[] = [];
    const els = [
        fakeEl({ "data-key": "01" }, flights),
        fakeEl({ "data-key": "02" }, flights),
        fakeEl({ "data-hatch-key": "02" }, flights),
    ];
    // The thread layer is in the DOM only once a render has flushed after the threads mount (a
    // pre-flush watcher stands in for the SFC's render).
    const threadEls: ReturnType<typeof fakeEl>[] = [];
    const root = {
        animate: () => undefined,
        querySelectorAll: (sel: string) =>
            sel.includes("data-key") ? els : sel === ".geo-entrance-thread" ? threadEls : [],
    };
    motion.pref = ref(reduce ? "reduce" : "no-preference");
    const props = reactive({ entrance }) as unknown as ChoroplethProps;
    const field = shallowRef(root as unknown as SVGSVGElement);
    const scope = effectScope();
    const api = scope.run(() => {
        const api = useGeoEntrance(field, shapes, props);
        watch(api.threads, (list) => {
            threadEls.length = 0;
            for (const t of list) threadEls.push(fakeEl({ "data-thread-key": t.key, pathLength: "1" }, flights));
        });
        return api;
    })!;
    hooks.mounted.forEach((fn) => fn());
    return { api, props, flights, root, threadEls };
}

beforeEach(() => {
    hooks.mounted.length = hooks.unmount.length = 0;
    io.supported = true;
});

describe("useGeoEntrance — the marks are held until the entrance plays", () => {
    it("holds an opted-in map unpainted before its first view, then plays and releases", async () => {
        const { api, flights, root } = setup({ origin: "01", kind: "ripple" });
        expect(api.pending.value).toBe(true);
        expect(io.target!.value).toBe(root);
        expect(flights).toHaveLength(0);
        io.fire!([{ isIntersecting: true }]);
        expect(flights.length).toBeGreaterThan(0);
        expect(api.pending.value).toBe(false);
        await nextTick();
        expect(io.target!.value).toBeNull(); // played once; the observer lets go
    });

    it("never holds and never plays under reduced motion", () => {
        const { api, flights } = setup({ origin: "01", kind: "ripple" }, true);
        expect(api.pending.value).toBe(false);
        expect(io.target!.value).toBeNull();
        expect(flights).toHaveLength(0);
    });

    it("cuts every flight to rest when reduced motion turns on mid-entrance", async () => {
        const { api, flights } = setup({ origin: "01", kind: "threads" });
        io.fire!([{ isIntersecting: true }]);
        expect(flights.length).toBeGreaterThan(0);
        motion.pref!.value = "reduce";
        await nextTick();
        expect(flights.every((a) => a.cancelled)).toBe(true);
        expect(api.pending.value).toBe(false);
        expect(api.threads.value).toEqual([]);
    });

    it("holds and plays an entrance turned on after mount", async () => {
        const { api, props, flights, root } = setup(undefined);
        expect(api.pending.value).toBe(false);
        expect(io.target!.value).toBeNull();
        props.entrance = { origin: "01", kind: "ripple" };
        await nextTick();
        expect(api.pending.value).toBe(true);
        expect(io.target!.value).toBe(root);
        io.fire!([{ isIntersecting: true }]);
        expect(flights.length).toBeGreaterThan(0);
        expect(api.pending.value).toBe(false);
    });

    it("plays at mount when there is no observer, so the hold never strands the map", async () => {
        io.supported = false;
        const { api, flights } = setup({ origin: "01", kind: "ripple" });
        await nextTick();
        expect(flights.length).toBeGreaterThan(0);
        expect(api.pending.value).toBe(false);
    });

    it("with no observer, plays the threads once their layer has rendered", async () => {
        io.supported = false;
        const { api, flights, threadEls } = setup({ origin: "01", kind: "threads" });
        await nextTick();
        expect(threadEls).toHaveLength(1);
        expect(flights.filter((a) => a.el["data-thread-key"])).toHaveLength(1);
        expect(api.threads.value).toHaveLength(1); // still flying, not landed without its threads
    });

    it("mounts the threads only after mount (the server cannot know the motion preference)", () => {
        hooks.mounted.length = 0;
        motion.pref = ref("no-preference");
        const props = reactive({ entrance: { origin: "01", kind: "threads" } }) as unknown as ChoroplethProps;
        const api = effectScope().run(() => useGeoEntrance(ref(null), shapes, props))!;
        expect(api.threads.value).toEqual([]);
        hooks.mounted.forEach((fn) => fn());
        expect(api.threads.value.map((t) => t.key)).toEqual(["02"]);
    });
});

describe("useGeoEntrance — the flights", () => {
    it("authors only each mark's first frame, so it lands on its own resting value", () => {
        const { flights } = setup({ origin: "01", kind: "ripple" });
        io.fire!([{ isIntersecting: true }]);
        expect(flights.length).toBeGreaterThan(0);
        for (const a of flights) {
            expect(a.frames).toHaveLength(1);
            expect(a.frames[0]).toMatchObject({ opacity: 0, offset: 0 });
        }
    });

    it("lands the dim hatch with its shape", () => {
        const { flights } = setup({ origin: "01", kind: "ripple" });
        io.fire!([{ isIntersecting: true }]);
        const shape = flights.find((a) => a.el["data-key"] === "02")!;
        const hatch = flights.find((a) => a.el["data-hatch-key"] === "02")!;
        expect(hatch).toBeDefined();
        expect(hatch.frames).toEqual(shape.frames);
    });

    it("draws each thread with the atlas draw mechanism, its flight clocking only the fade", async () => {
        const { flights, threadEls } = setup({ origin: "01", kind: "threads" });
        await nextTick();
        io.fire!([{ isIntersecting: true }]);
        const thread = flights.find((a) => a.el["data-thread-key"])!;
        expect(thread.frames.some((f) => "strokeDashoffset" in f)).toBe(false);
        // buildMarkAnimation('draw') parked it undrawn over its unit dash (pathLength="1").
        expect(threadEls[0]!.style).toMatchObject({ strokeDasharray: "1", strokeDashoffset: "1" });
    });
});

describe("GeoChoropleth.css — the hold sits behind the motion query", () => {
    const css = readFileSync(join(__dirname, "../../src/charts/geo/GeoChoropleth.css"), "utf8");

    it("hides the marks and late layers under [data-entrance-pending], only for no-preference with script", () => {
        const block = css.match(
            /@media \(prefers-reduced-motion: no-preference\) and \(scripting: enabled\) \{([\s\S]*?)\n\}/,
        );
        expect(block).not.toBeNull();
        for (const cls of [
            "geo-shape",
            "geo-texture",
            "geo-dim-hatch",
            "geo-value-labels",
            "geo-place-labels",
            "geo-magnitude-rings",
        ])
            expect(block![1]).toContain(`[data-entrance-pending] .${cls}`);
        expect(block![1]).toMatch(/opacity:\s*0/);
    });
});
