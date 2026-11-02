import { computed, effectScope, nextTick, reactive, ref, shallowRef } from "vue";
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
    const vue = await import("vue");
    return {
        ...real,
        usePreferredReducedMotion: () => motion.pref!,
        useIntersectionObserver: (target: { value: unknown }, cb: typeof io.fire) => {
            io.target = target;
            io.fire = cb;
            return { isSupported: vue.ref(io.supported), stop: () => {} };
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
}
function fakeEl(attrs: Record<string, string>, log: FakeAnimation[]) {
    return {
        getAttribute: (k: string) => attrs[k] ?? null,
        classList: { contains: () => false },
        animate: () => {
            const a: FakeAnimation = {
                cancelled: false,
                cancel: () => void (a.cancelled = true),
                finished: new Promise(() => {}),
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
    const els = [fakeEl({ "data-key": "01" }, flights), fakeEl({ "data-key": "02" }, flights)];
    const root = {
        animate: () => undefined,
        querySelectorAll: (sel: string) => (sel.includes("data-key") ? els : []),
    };
    motion.pref = ref(reduce ? "reduce" : "no-preference");
    const props = reactive({ entrance }) as unknown as ChoroplethProps;
    const field = shallowRef(root as unknown as SVGSVGElement);
    const scope = effectScope();
    const api = scope.run(() => useGeoEntrance(field, shapes, props))!;
    hooks.mounted.forEach((fn) => fn());
    return { api, props, flights, root };
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

    it("plays at mount when there is no observer, so the hold never strands the map", () => {
        io.supported = false;
        const { api, flights } = setup({ origin: "01", kind: "ripple" });
        expect(flights.length).toBeGreaterThan(0);
        expect(api.pending.value).toBe(false);
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

describe("GeoChoropleth.css — the hold sits behind the motion query", () => {
    const css = readFileSync(join(__dirname, "../../src/charts/geo/GeoChoropleth.css"), "utf8");

    it("hides the shapes, textures and late layers under [data-entrance-pending], only for no-preference", () => {
        const block = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/);
        expect(block).not.toBeNull();
        for (const cls of ["geo-shape", "geo-texture", "geo-value-labels", "geo-place-labels", "geo-magnitude-rings"])
            expect(block![1]).toContain(`[data-entrance-pending] .${cls}`);
        expect(block![1]).toMatch(/opacity:\s*0/);
    });
});
