// charts/geo/useGeoEntrance.ts — THE ENTRANCE PLAYER (U/B8 A1). Plays a choropleth's opt-in
// `entrance` once, on first view: `ripple` lands each shape in `originRank` order, `threads` draws a
// slack thread from the origin to every valued feature, lands the feature as its thread reaches it,
// then fades the thread. The motion is WAAPI on the shapes the SFC already draws, timed by the
// keyframes.js `stagger` and eased by the atlas spring registers. It plays under the atlas entrance
// law (`useFirstViewTarget`: 130 ms in view, after any deep link lands). Until it plays the marks are
// `pending` (held hidden by the CSS, so a map scrolled into view does not paint final, then snap back
// and pop in). Reduced motion never plays and never holds: the map paints final, and a switch to it
// mid-entrance cancels the flight to the final frame. A map without `entrance` observes nothing.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { useRafFn } from "@vueuse/core";
import { stagger } from "@mkbabb/keyframes.js";
import { buildMarkAnimation, type MarkAnimation } from "../../motion/buildMarkAnimation.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { useFirstViewTarget } from "../../motion/useFirstView.js";
import { EASE } from "../../motion/variant-registers.js";
import { entranceThreads, originRank, type EntranceThread } from "./geo-entrance.js";
import type { ChoroplethProps, Shape } from "./useChoroplethShapes.js";

/** The whole spread of the cadence, so a 3,000-county map lands as fast as a 50-state one. */
const RIPPLE_SPREAD_MS = 1100;
const THREAD_SPREAD_MS = 1400;
/** The per-step ceilings (a small map does not crawl). */
const RIPPLE_EACH_MS = 11;
const THREAD_EACH_MS = 42;
/** A thread flies 62% of its run drawing and the rest fading; its feature lands at 480 ms. */
const THREAD_MS = 1150;
const THREAD_DRAW = 0.62;
const THREAD_LAND_MS = 480;
const THREAD_LEAD_MS = 200;
const LAND_MS = 820;
const FADE_MS = 420;
/** The share of the visible map that counts as a first view. */
const FIRST_VIEW = 0.25;

/** The overlay groups (words, letters, rings) that wait until the map has mostly landed. */
const LATE_LAYERS = ".geo-value-labels, .geo-place-labels, .geo-magnitude-rings";
/** Every mark a key owns: the shape, its tier texture and its dim hatch land together. */
const KEY_MARKS = "[data-key], [data-texture-key], [data-hatch-key]";

export interface UseGeoEntrance {
    /** The threads to mount: non-empty only for an opted-in `threads` entrance that has not landed,
        and only once mounted (the server cannot know the client's motion preference). */
    threads: ComputedRef<EntranceThread[]>;
    /** True while an opted-in entrance waits for its first view: the CSS holds the marks hidden
        (never under reduced motion, whose media query the hold sits behind). The same on the
        server and at hydration; a reduced-motion client clears it on mount. */
    pending: ComputedRef<boolean>;
}

export function useGeoEntrance(
    field: Ref<SVGSVGElement | null>,
    shapes: ComputedRef<Shape[]>,
    props: ChoroplethProps,
): UseGeoEntrance {
    const reduced = useReducedMotion();
    const mounted = ref(false);
    /** The entrance has started (once per mount); `landed` once its threads have flown. */
    const played = ref(false);
    const landed = ref(false);
    let running: Animation[] = [];
    /** The thread draws: the atlas `draw` mechanism, scrubbed off each thread's own WAAPI clock. */
    let draws: { mark: MarkAnimation; clock: Animation; delay: number }[] = [];
    const drawLoop = useRafFn(
        () => {
            let drawing = false;
            for (const d of draws) {
                const t = (Number(d.clock.currentTime ?? 0) - d.delay) / (THREAD_MS * THREAD_DRAW);
                d.mark.at(t);
                if (t < 1) drawing = true;
            }
            if (!drawing) drawLoop.pause();
        },
        { immediate: false },
    );

    const pending = computed(() => !!props.entrance && !played.value);
    const threads = computed<EntranceThread[]>(() => {
        const e = props.entrance;
        if (e?.kind !== "threads" || !mounted.value || landed.value || reduced.value) return [];
        return entranceThreads(e.origin, shapes.value);
    });

    /** Each key's marks: the shape, its tier texture and its dim hatch land together. */
    function marksByKey(root: SVGSVGElement): Map<string, Element[]> {
        const out = new Map<string, Element[]>();
        for (const el of root.querySelectorAll(KEY_MARKS)) {
            const key =
                el.getAttribute("data-key") ??
                el.getAttribute("data-texture-key") ??
                el.getAttribute("data-hatch-key")!;
            out.set(key, [...(out.get(key) ?? []), el]);
        }
        return out;
    }

    /** A mark lands: it springs up from `from` scale. A clamped cell field (the A-04 floor owns the
        transform) lands on opacity alone. Only the first frame is authored: the flight ends on the
        mark's own resting value (a dimmed shape rests at its dim opacity), so nothing snaps at the end. */
    function land(els: Element[] | undefined, delay: number, from: number) {
        for (const el of els ?? []) {
            const scaled = !el.classList.contains("geo-shape--cell-floor");
            const frames = scaled
                ? [{ transform: `scale(${from})`, opacity: 0, offset: 0 }]
                : [{ opacity: 0, offset: 0 }];
            running.push(
                el.animate(frames, { duration: LAND_MS, delay, easing: EASE.soft.css, fill: "backwards" }),
            );
        }
    }

    /** An empty mark settles without a landing, so the eye follows the counted ones. */
    function fade(els: Iterable<Element> | undefined, delay: number, duration = FADE_MS) {
        for (const el of els ?? []) {
            running.push(
                el.animate([{ opacity: 0, offset: 0 }], {
                    duration,
                    delay,
                    easing: EASE.crisp.css,
                    fill: "backwards",
                }),
            );
        }
    }

    function ripple(root: SVGSVGElement, origin: string) {
        const rankOf = originRank(origin, shapes.value, props.rank);
        if (!rankOf) return;
        const marks = marksByKey(root);
        const ordered = shapes.value
            .map((s, i) => ({ s, r: rankOf(s.key) ?? shapes.value.length + i }))
            .sort((a, b) => a.r - b.r);
        const n = ordered.length;
        const delay = stagger(n, { each: Math.min(RIPPLE_EACH_MS, RIPPLE_SPREAD_MS / n) });
        ordered.forEach(({ s }, i) => {
            if (!s.hasValue) fade(marks.get(s.key), delay(i));
            else land(marks.get(s.key), delay(i), s.key === origin ? 0.05 : 0.3);
        });
        fade(root.querySelectorAll(LATE_LAYERS), delay(n - 1) * 0.55);
    }

    function thread(root: SVGSVGElement, origin: string) {
        const list = threads.value;
        if (!list.length) return void (landed.value = true);
        const marks = marksByKey(root);
        land(marks.get(origin), 0, 0.05);
        const delay = stagger(list.length, {
            each: Math.min(THREAD_EACH_MS, THREAD_SPREAD_MS / list.length),
        });
        // Each thread shows, draws through the first 62% of its run (the `draw` mechanism, scrubbed
        // off this flight's clock), then fades.
        const flights = [...root.querySelectorAll<SVGPathElement>(".geo-entrance-thread")].map(
            (el, i) => {
                const start = THREAD_LEAD_MS + delay(i);
                const clock = el.animate(
                    [
                        { opacity: 0.85 },
                        { opacity: 0.85, offset: THREAD_DRAW, easing: EASE.crisp.css },
                        { opacity: 0 },
                    ],
                    { duration: THREAD_MS, delay: start, fill: "both" },
                );
                const mark = buildMarkAnimation(el, "draw", { ease: EASE.crisp.fn });
                mark.at(0);
                draws.push({ mark, clock, delay: start });
                running.push(clock);
                return clock.finished.catch(() => undefined);
            },
        );
        if (draws.length) drawLoop.resume();
        void Promise.all(flights).then(() => (landed.value = true));
        list.forEach((t, i) => land(marks.get(t.key), THREAD_LEAD_MS + delay(i) + THREAD_LAND_MS, 0.3));
        for (const s of shapes.value) if (!s.hasValue) fade(marks.get(s.key), 150, 600);
        fade(root.querySelectorAll(LATE_LAYERS), 800);
    }

    /** Every flight cut to its final frame (a cancelled WAAPI effect leaves the mark at rest). */
    function settle() {
        drawLoop.pause();
        draws = [];
        running.forEach((a) => a.cancel());
        running = [];
    }

    /** Start the flights first, then release the hold: `fill: "backwards"` already owns each mark's
        first frame, so the marks never show at rest between the two. */
    function play() {
        const root = field.value;
        const e = props.entrance;
        if (root && e && !reduced.value && typeof root.animate === "function") {
            if (e.kind === "threads") thread(root, e.origin);
            else ripple(root, e.origin);
        }
        if (e?.kind !== "threads" || !running.length) landed.value = true;
        played.value = true;
    }

    // The first view is the atlas entrance law (U/B8 A9, motion/useFirstView.ts): 130 ms in view,
    // after any deep link has landed, so a jump past the map does not spend its entrance. The target
    // clears once played, and arms when `entrance` turns on after mount, so a live opt-in still plays
    // once on its first view.
    const { isSupported } = useFirstViewTarget(
        computed(() => (props.entrance && !played.value && !reduced.value ? field.value : null)),
        () => {
            if (!played.value) play();
        },
        { threshold: FIRST_VIEW },
    );
    // Reduced motion, at mount or switched on mid-entrance: every mark at rest, nothing replays.
    function rest() {
        settle();
        played.value = landed.value = true;
    }
    watch(reduced, (r) => r && rest());
    // No observer to wait on: play once the mount has rendered (the thread layer mounts with it), so
    // the hold never strands the map hidden and the threads are there to draw.
    onMounted(() => {
        mounted.value = true;
        if (reduced.value) rest();
        else if (props.entrance && !isSupported.value)
            void nextTick(() => {
                if (!played.value && !reduced.value) play();
            });
    });
    onBeforeUnmount(settle);

    return { threads, pending };
}
