// charts/geo/useGeoEntrance.ts — THE ENTRANCE PLAYER (U/B8 A1). Plays a choropleth's opt-in
// `entrance` once, on first view: `ripple` lands each shape in `originRank` order, `threads` draws a
// slack thread from the origin to every valued feature, lands the feature as its thread reaches it,
// then fades the thread. The motion is WAAPI on the shapes the SFC already draws, timed by the
// keyframes.js `stagger` and eased by the atlas spring registers. Until it plays the marks are
// `pending` (held hidden by the CSS, so a map scrolled into view does not paint final, then snap back
// and pop in). Reduced motion never plays and never holds: the map paints final, and a switch to it
// mid-entrance cancels the flight to the final frame. A map without `entrance` observes nothing.
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { useIntersectionObserver } from "@vueuse/core";
import { stagger } from "@mkbabb/keyframes.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
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
const THREAD_LAND_MS = 480;
const THREAD_LEAD_MS = 200;
const LAND_MS = 820;
const FADE_MS = 420;
/** The share of the visible map that counts as a first view. */
const FIRST_VIEW = 0.25;

/** The overlay groups (words, letters, rings) that wait until the map has mostly landed. */
const LATE_LAYERS = ".geo-value-labels, .geo-place-labels, .geo-magnitude-rings";

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

    const pending = computed(() => !!props.entrance && !played.value);
    const threads = computed<EntranceThread[]>(() => {
        const e = props.entrance;
        if (e?.kind !== "threads" || !mounted.value || landed.value || reduced.value) return [];
        return entranceThreads(e.origin, shapes.value);
    });

    /** Each key's marks: the shape and its tier texture land together. */
    function marksByKey(root: SVGSVGElement): Map<string, Element[]> {
        const out = new Map<string, Element[]>();
        for (const el of root.querySelectorAll("[data-key], [data-texture-key]")) {
            const key = el.getAttribute("data-key") ?? el.getAttribute("data-texture-key")!;
            out.set(key, [...(out.get(key) ?? []), el]);
        }
        return out;
    }

    /** A mark lands: it springs up from `from` scale. A clamped cell field (the A-04 floor owns the
        transform) lands on opacity alone. */
    function land(els: Element[] | undefined, delay: number, from: number) {
        for (const el of els ?? []) {
            const scaled = !el.classList.contains("geo-shape--cell-floor");
            const frames = scaled
                ? [
                      { transform: `scale(${from})`, opacity: 0 },
                      { transform: "scale(1)", opacity: 1 },
                  ]
                : [{ opacity: 0 }, { opacity: 1 }];
            running.push(
                el.animate(frames, { duration: LAND_MS, delay, easing: EASE.soft.css, fill: "backwards" }),
            );
        }
    }

    /** An empty mark settles without a landing, so the eye follows the counted ones. */
    function fade(els: Iterable<Element> | undefined, delay: number, duration = FADE_MS) {
        for (const el of els ?? []) {
            running.push(
                el.animate([{ opacity: 0 }, { opacity: 1 }], {
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
        const flights = [...root.querySelectorAll<SVGPathElement>(".geo-entrance-thread")].map(
            (el, i) => {
                const a = el.animate(
                    [
                        { strokeDashoffset: 1, opacity: 0.85 },
                        { strokeDashoffset: 0, opacity: 0.85, offset: 0.62 },
                        { strokeDashoffset: 0, opacity: 0 },
                    ],
                    { duration: THREAD_MS, delay: THREAD_LEAD_MS + delay(i), easing: EASE.crisp.css, fill: "both" },
                );
                running.push(a);
                return a.finished.catch(() => undefined);
            },
        );
        void Promise.all(flights).then(() => (landed.value = true));
        list.forEach((t, i) => land(marks.get(t.key), THREAD_LEAD_MS + delay(i) + THREAD_LAND_MS, 0.3));
        for (const s of shapes.value) if (!s.hasValue) fade(marks.get(s.key), 150, 600);
        fade(root.querySelectorAll(LATE_LAYERS), 800);
    }

    /** Every flight cut to its final frame (a cancelled WAAPI effect leaves the mark at rest). */
    function settle() {
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

    // The target clears once played (the observer disconnects), and arms when `entrance` turns on
    // after mount, so a live opt-in still plays once on its first view.
    const { isSupported } = useIntersectionObserver(
        computed(() => (props.entrance && !played.value && !reduced.value ? field.value : null)),
        ([entry]) => {
            if (entry?.isIntersecting && !played.value) play();
        },
        { threshold: FIRST_VIEW },
    );
    // Reduced motion, at mount or switched on mid-entrance: every mark at rest, nothing replays.
    function rest() {
        settle();
        played.value = landed.value = true;
    }
    watch(reduced, (r) => r && rest());
    // No observer to wait on: play at mount, so the hold never strands the map hidden.
    onMounted(() => {
        mounted.value = true;
        if (reduced.value) rest();
        else if (props.entrance && !isSupported.value) play();
    });
    onBeforeUnmount(settle);

    return { threads, pending };
}
