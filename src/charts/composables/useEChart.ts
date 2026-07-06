// platform/composables/useEChart.ts — the ONE ECharts lifecycle composable (G6
// §2; INV-7 — one useEChart kills the 5× ECharts duplication). Every ECharts viz
// (StackedBar, and the carved scatter/ranked-bar) mounts through this: init on
// the host element, setOption from a reactive option factory, resize on host
// resize, dispose on unmount. No component re-implements the lifecycle.
//
// THE THEME FLIP (E9b, audit-e/e-theme-perf). The canvas can't read CSS vars, so a
// dark↔light flip must push fresh colours in. The OLD path re-ran the factory on the
// `useColorMode` signal and `setOption(…, {notMerge:true})` — a TOTAL palette REPLACE
// that re-lays-out the whole chart from scratch (no animation, full cost): ×6 on /sci
// it was a ~1.5s synchronous main-thread storm. The re-author splits it:
//   • A theme flip NO LONGER trips the data watch. It is owned by glass-ui 3.11's
//     `useGlobalDark().onFlipSettled` — ONE coalesced post-flip task (a single rAF that
//     batches every live chart) issues a MERGE `setOption(option, {notMerge:false})`
//     carrying the re-resolved palette. The re-tint is an ATOMIC HARD SWAP, NOT a colour
//     tween (F6.6 §2(b).4 / R1, the adjudicated truth): every data plate sets
//     `animation:false`, so the merge prints the new pigment in ONE frame on the next
//     `lazyUpdate` draw — no re-layout, no re-raster storm, and crucially no mid-tween
//     frame to sample (a 2,000-dot colour tween is the cost the perf arc killed). The
//     chrome already flipped instantly via CSS (`useThemeKey`). The re-resolved palette is
//     the SETTLE-clocked `useVizPalette` (F6.6 §2(b).1/.2 — one signal, the live `.dark`
//     class; one clock, this same `onFlipSettled` beat), so the canvas resolves from one
//     settled cascade snapshot the aurora shares — no two resolution moments straddle the flip.
//   • The data/filter watch (the `option`/`fingerprint` path below) stays `notMerge:true`
//     for a STRUCTURAL change, and is GUARDED off the flip: `isDark` is watched eagerly so
//     the synchronous flush that re-derives the palette-bearing option sets a `retinting`
//     flag — the data watch sees it and skips, leaving the retint to the settle merge. No
//     double-paint, no storm.
//
// The link helper folds in: `highlight(key)` / `downplay()` dispatch the
// emphasis actions, so a hover anywhere raises the same datum here — the
// bidirectional bridge with no separate echartsLink module.

import {
    inject,
    nextTick,
    onBeforeUnmount,
    onMounted,
    onScopeDispose,
    shallowRef,
    watch,
    type Ref,
    type ShallowRef,
} from "vue";
import { init, use, type EChartsType } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useResizeObserver, useIntersectionObserver } from "@vueuse/core";
import { useGlobalDark } from "@mkbabb/glass-ui/dark";
import { EXPAND_SETTLE_KEY } from "@/charts/scene/expand-settle";

// The canvas renderer is the shared base every viz needs; chart/component
// modules (BarChart, GridComponent…) register at the call site so the bundle
// only carries what a viz actually draws (modular registration, CH2 §B).
use([CanvasRenderer]);

import { RETINTING, scheduleRetint, enqueuePaint } from "./echart-pumps";

export interface UseEChartOptions {
    /** The host element the chart mounts into (a fixed-height box). */
    host: Ref<HTMLElement | null>;
    /**
     * The reactive option factory. Re-run on its own deps AND on a theme flip,
     * so palette-bearing options re-resolve when the CSS vars change.
     */
    option: () => EChartsOption;
    /** Fired when a datum is hovered — emit a key upward for the Vue HoverCard. */
    onHover?: (key: string | null) => void;
    /** Map a datum's ECharts params to its entity key (for onHover + linking). */
    keyOf?: (params: unknown) => string | null;
    /**
     * D6 (C.W5.3) — an OPTIONAL cheap re-paint fingerprint: a string that changes ONLY when a
     * real re-paint is owed (the data version + the filter signature + the theme). When given,
     * the lifecycle watches THIS instead of deep-walking the freshly-rebuilt option every tick
     * — so a hover-driven option re-evaluation (the emphasis path is adjacent) no longer trips a
     * `setOption(…,{notMerge:true})` full rebuild. Omit it and the watch keeps the legacy
     * `{deep:true}` semantics over the option (correct, just not hover-cheap) — backward-
     * compatible, no call-site is forced to change.
     */
    fingerprint?: () => string;
    /**
     * C8.2 / CUT 3 (the intra-dashboard echarts deferral; AUGMENT-2 `hydrateOnVisible`) —
     * an OPTIONAL lazy-mount gate. When `true`, the ECharts instance is NOT created at
     * `onMounted`; instead an IntersectionObserver watches the host, and `init()` + the
     * first `paint()` fire on the FIRST time the host enters the viewport (then the observer
     * disconnects — a one-shot). A below-the-fold chart on a tall dashboard (`/sci`, `/ecf`)
     * therefore costs ZERO echarts evaluation until the reader scrolls it into view, off the
     * route's hydration critical path (the TBT lever — the 2,418ms keyframes-class init storm
     * the measurement pass surfaced). Omit (the default) and a chart mounts eagerly on
     * `onMounted` exactly as before — backward-compatible; only a viz that opts in defers.
     * Charts ABOVE the fold (the hero plates) MUST stay eager (omit it) so first paint is
     * not gated on a scroll. Re-paints, resize, hover, and dispose all behave identically
     * once mounted.
     */
    lazyMount?: boolean;
}

export interface UseEChart {
    /** The live ECharts instance (null before mount / after dispose). */
    chart: ShallowRef<EChartsType | null>;
    /** Raise a datum by key — the linked-highlight in (bridge folded in here). */
    highlight: (
        key: string,
        keyToIndex: Record<string, number>,
        seriesIndex?: number,
    ) => void;
    /** Drop any emphasis on this chart. */
    downplay: (seriesIndex?: number) => void;
}

/**
 * Mount + drive an ECharts instance over `host`. Returns the instance plus the
 * highlight/downplay bridge. The instance is created on mount, re-`setOption`'d
 * (`notMerge:true`) whenever the factory's DATA/filter deps change, re-themed via a
 * settle-batched MERGE on a dark flip (E9b), resized on host resize, and disposed on
 * unmount.
 */
export function useEChart(opts: UseEChartOptions): UseEChart {
    const chart = shallowRef<EChartsType | null>(null);
    const dark = useGlobalDark(); // the flip arbiter — drives the settle-batched retint (E9b)

    // E9b — the retint guard, a REACTIVE ref (it gates the data watch's SOURCE, so it must be a
    // tracked dep). `isDark` is watched synchronously (below) so the flip sets this BEFORE any
    // palette-driven re-derive: while it holds, the data watch's source returns a STABLE sentinel
    // instead of evaluating `opts.option()`, so a palette-only re-derive can NOT trip the
    // `notMerge:true` re-layout-from-scratch storm (the perf tank) — the colour swap is owned
    // solely by the settle-batched merge. Gating the SOURCE (not just the callback) also spares
    // the per-flip option re-evaluation + reactive re-track the watch would otherwise pay twice.
    // The settle drains the flag, and because it is reactive the watch re-arms `opts.option()`.
    const retinting = shallowRef(false);
    // A one-shot skip for the data watch's re-establish fire after the guard clears (see the
    // settle subscription below) — the re-sync re-reads the now-dark option to re-arm tracking,
    // not a genuine data change, so it must not paint.
    let resyncPending = false;

    // N.WF2 · G-N5a — the per-chart coalesced entry into the frame-budgeted paint pump. A filter
    // change that fires the data watch enqueues ONE paint job (not a synchronous `setOption`); if a
    // paint is already queued it is left alone (the queued job re-reads `opts.option()` when it runs,
    // so it carries the LATEST data — rapid ticks collapse to one re-parse). This moves the heavy
    // `notMerge:true` re-parse OUT of the interaction's synchronous window (the INP lever).
    let paintPending = false;
    function schedulePaint(): void {
        if (paintPending) return;
        paintPending = true;
        enqueuePaint(() => {
            paintPending = false;
            paint();
        });
    }

    function paint(): void {
        if (!chart.value) return;
        // A STRUCTURAL change (data / filter): `notMerge:true` fully replaces the prior option
        // so removed series/categories don't linger merged under the new ones. NEVER the theme
        // path — a flip takes the merge tween in `retintPalette` (E9b). `lazyUpdate:true` DEFERS
        // the actual raster to the next frame (F-filters §F-4 — the data path prefers lazyUpdate
        // over a SYNCHRONOUS full re-raster): a filter change that fires `paint()` on N plates
        // coalesces into one render pass instead of N back-to-back blocking re-rasters. The
        // structural `notMerge:true` is KEPT (removed series must not linger); only the draw is
        // deferred. Paired with the `fingerprint` fast-path below, a data/filter tick re-paints
        // ONLY when the fingerprint actually moves — no hover-driven option re-eval trips it.
        chart.value.setOption(opts.option(), { notMerge: true, lazyUpdate: true });
    }

    // E9b — the theme retint, SPLIT into derive + apply for the I-PERF-DATA.d first-derive slice.
    // `deriveRetintOption` re-resolves the dark-palette option (the heavy ~178ms re-derive on a
    // chart-dense plate — the born-RED head task), `applyRetintOption` merges it into the live
    // instance. The pump (`scheduleRetint`) runs the two in SEPARATE frame slices so the heavy
    // derive never shares a head task with the merge (nor with a sibling chart's phase).
    function deriveRetintOption(): EChartsOption {
        return opts.option();
    }
    function applyRetintOption(option: EChartsOption): void {
        if (!chart.value) return;
        // E9b — the theme retint. A MERGE `setOption` (`notMerge:false`) over the freshly
        // re-resolved (dark-palette) option: structure is identical (same series count/axes/data
        // shape), so ECharts MERGES the new colours in place instead of re-laying-out from scratch
        // — including the per-DATUM colours the scatters carry in `series[].data[].itemStyle`
        // (a colour delta a data-stripped merge would strand). No `notMerge:true` rebuild storm.
        // ATOMIC, not a tween: every data plate sets `animation:false`, so the merge prints the new
        // palette in ONE `lazyUpdate` draw (F6.6 §2(b).4 — the hard swap is the landed truth; there
        // is no mid-tween frame). The option reads the SETTLE-clocked `useVizPalette` (one signal,
        // one clock), so this print resolves from the SAME settled cascade the aurora derives from.
        // `lazyUpdate` defers the actual draw to the next frame, so the N charts' merges — all
        // draining in the ONE `onFlipSettled` rAF — coalesce into a single render pass rather than
        // N synchronous re-rasters back-to-back. The option is the one `deriveRetintOption`
        // produced in the prior pump slice (re-derived ONCE per flip, threaded through the queue).
        //
        // FIX-3 — FORCE the merge ATOMIC. A data plate may now ship `animation:true` in its base
        // option (the TimeSeries update-tween — the hard-cut fix), so the merged option carries it.
        // The retint MUST stay a hard swap (the E9b no-colour-tween law — a 2,000-dot palette tween
        // is the cost the perf arc killed), so we overlay `animation:false` ONLY on this retint
        // merge: ECharts merges the root flag, the new pigment prints in one frame, and the base
        // `animation:true` is restored on the next data paint. A plate that never set base animation
        // is byte-unchanged (it was already `false`).
        chart.value.setOption(
            { ...option, animation: false },
            { notMerge: false, lazyUpdate: true },
        );
    }

    // The actual mount — `init` the instance, first `paint`, wire the hover bridge. Shared
    // by the eager path (onMounted) and the lazy path (first-viewport intersection), so the
    // two entry points produce an identical live instance.
    function mount(): void {
        if (chart.value || !opts.host.value) return;
        chart.value = init(opts.host.value);
        paint();

        if (opts.onHover && opts.keyOf) {
            chart.value.on("mouseover", (params) => {
                opts.onHover?.(opts.keyOf?.(params) ?? null);
            });
            chart.value.on("mouseout", () => opts.onHover?.(null));
        }
    }

    // C8.2 / CUT 3 — when `lazyMount`, defer init+paint to first viewport (a one-shot
    // observer); otherwise mount eagerly exactly as before. A below-fold chart pays no
    // echarts evaluation until scrolled into view (the TBT lever, off the hydration path).
    function arm(): void {
        if (opts.lazyMount) {
            const { stop } = useIntersectionObserver(
                opts.host,
                (entries) => {
                    if (entries.some((e) => e.isIntersecting)) {
                        mount();
                        stop(); // one-shot: the chart lives once mounted; never re-observe
                    }
                },
                // A small positive margin so the chart is live just BEFORE it scrolls in
                // (no blank flash), but still nowhere near hydration time.
                { rootMargin: "200px" },
            );
        } else {
            mount();
        }
    }

    onMounted(() => {
        // THE LATE-HOST BIND (N.WD1 readiness-ladder integration · N5 consult fix): under the 4-rung
        // ladder the figure slot — and with it this host div — is `v-else`'d out while the plate is
        // `loading`, so `host.value` is NULL at the consumer's mount tick. The old one-shot
        // `if (!host.value) return` silently orphaned EVERY lazyMount chart on a route that starts
        // loading (the readiness flip re-rendered the slot, but nothing re-tried the mount — a blank
        // figure forever, live-proven on /usf-integrity). Arm on the FIRST host bind instead: now if
        // the host exists arm immediately (the pre-ladder behaviour, byte-identical), else watch the
        // ref once and arm when the ladder swaps the figure in. `mount()` stays idempotent.
        if (opts.host.value) {
            arm();
            return;
        }
        const unwatch = watch(opts.host, (el) => {
            if (!el) return;
            unwatch();
            arm();
        });
    });

    // E9b — the retint guard, armed BEFORE the data watch can react. `isDark` flips on the same
    // synchronous reactive flush that re-derives the palette-bearing option; watching it eagerly
    // (no `deep`, the source is a bool) sets `retinting` so the data watch — which fires on that
    // SAME flush because the option's resolved colours changed — skips its `notMerge:true` rebuild
    // (the storm). The colour swap is then owned solely by the settle merge below. The flag is a
    // belt against a stray data-shaped re-derive landing inside the flip window; the settle clears
    // it. (No View Transition anywhere on this path — PRM-safe by construction.)
    watch(
        () => dark.isDark.value,
        () => {
            retinting.value = true;
        },
        // `flush:'sync'` — `isDark` is the toggle's OWN ref and mutates FIRST (it drives the
        // class the palette's `useColorMode` then observes). Setting the guard synchronously at
        // that mutation, before any default `flush:'pre'` data watcher runs, guarantees the
        // palette-driven re-derive below is suppressed no matter which colour-mode ref settles next.
        { flush: "sync" },
    );

    // Re-paint on a DATA / FILTER change — never on a theme flip. D6 — when the caller supplies a
    // `fingerprint`, watch THAT cheap string (no spurious `notMerge` rebuild under a hover);
    // otherwise watch the option factory by REFERENCE. The factory is always a `computed`, which
    // yields a NEW object reference on every data/filter dep change — so a shallow reference watch
    // fires on exactly those changes with NO deep traversal of the (large) option tree. (The old
    // `{deep:true}` walk paid a full traversal of every series/point on EACH trigger — and, worse,
    // on the post-flip re-establish below — which was the second long task on the flip; a shallow
    // identity watch is both correct and cheap.) EITHER source is GATED on `retinting`: while a
    // flip is in flight the source returns a stable sentinel and `opts.option()`/`fingerprint()` is
    // NOT evaluated, so the heavy per-chart option rebuild (scales + `getComputedStyle`) never runs
    // as a long task on the flip — the retint is owned solely by the settle merge. `retinting` is a
    // reactive dep, so when the settle clears it the source re-evaluates and re-arms tracking.
    const dataSource: () => unknown = opts.fingerprint
        ? () => (retinting.value ? RETINTING : opts.fingerprint!())
        : () => (retinting.value ? RETINTING : opts.option());
    watch(dataSource, (v) => {
        if (v === RETINTING) return;
        if (resyncPending) {
            resyncPending = false; // the post-flip re-establish — already themed, no paint
            return;
        }
        // N.WF2 · G-N5a — schedule the paint through the frame-budgeted pump instead of a synchronous
        // `setOption(notMerge:true)` storm. The interaction's own task only enqueues; each plate's
        // re-parse rasters in its own frame slice, so no single main-thread task exceeds one plate's
        // cost and worstINP on the throttled `/sci` filter cascade drops under the 200ms budget.
        schedulePaint();
    });

    // E9b — the cross-chart batch. Subscribe this chart's retint to glass-ui 3.11's settle hook:
    // `onFlipSettled` coalesces EVERY live chart's callback into ONE post-flip task (a single rAF
    // after the instant chrome class-flip), so the N canvases re-theme together as one beat instead
    // of N sequential storms. The callback issues the MERGE `setOption` carrying the dark palette,
    // then DROPS the guard. Clearing `retinting` makes the gated data watch re-evaluate its source
    // (sentinel → the freshly-themed `opts.option()`) to re-establish tracking; that re-sync fire
    // is NOT a data change (the merge already applied this exact option), so `resyncPending` makes
    // it a one-shot no-op — without it the guard-clear would trip a spurious `notMerge:true` storm.
    // Unsubscribed with the consuming scope (idempotent in the library; safe under dispose).
    const unsubscribeSettle = dark.onFlipSettled(() => {
        // The settle task only ENQUEUES — the frame-budgeted pump owns the actual derive+merge
        // (one task per ~32ms slice, never 9 charts in one task — the /sci G-E9b.1 residual).
        // I-PERF-DATA.d — the retint is SLICED into a derive phase and an apply phase that the
        // pump runs in separate frames, so the heavy ~178ms re-derive (the born-RED head task)
        // never shares a head task with the merge. The guard-drop (`resyncPending` + clearing
        // `retinting`) rides the APPLY phase — the LAST slice — so the data watch only re-arms
        // AFTER the merge has landed (the same ordering the un-sliced path had).
        scheduleRetint(deriveRetintOption, (option) => {
            applyRetintOption(option);
            resyncPending = true;
            retinting.value = false;
        });
    });
    onScopeDispose(unsubscribeSettle);

    useResizeObserver(opts.host, () => chart.value?.resize());

    // E3 §1.3 / e-hovers FIX-3 — THE EXPAND RE-HOVER (the single-surface re-parent consume).
    // glass-ui 3.11's <ExpandableContainer> renders its slot ONCE and Teleports that one surface
    // in/out of <body>, so THIS chart instance physically MOVES into the fullscreen plate (no
    // duplicate canvas — the E14 double-render is fixed at the library root). But a re-parented
    // imperative canvas keeps its OLD internal layout: zrender's pixel↔data grid + every
    // `convertToPixel` anchor were computed at the resting size, so the expanded plate paints but
    // its hit-test lands between marks — the "renders but hover is dead" tail. ChartFrame PROVIDES
    // a monotonic `settle.tick` bumped on each ExpandableContainer `@settle` (open AND close); we
    // `resize()` the ONE instance on each tick AFTER the DOM re-parent has flushed (`nextTick`),
    // so the grid re-lays-out to the new box and the readout pipeline publishes IDENTICALLY in
    // both states. The inject is OPTIONAL — a chart mounted outside a ChartFrame sees no provider
    // and is byte-identical to before (only the ResizeObserver above resizes it). This makes the
    // re-home DETERMINISTIC (never a ResizeObserver-timing accident — the e-hovers ROOT-3 the
    // treemap "worked" by luck on).
    const expandSettle = inject(EXPAND_SETTLE_KEY, undefined);
    if (expandSettle) {
        watch(expandSettle.tick, () => {
            void nextTick(() => chart.value?.resize());
        });
    }

    onBeforeUnmount(() => {
        chart.value?.dispose();
        chart.value = null;
    });

    // D5 (C.W5.3) — coalesce the emphasis dispatch. The map's hovered key strobes (now D1-
    // settled, but a sweep still re-fires `highlight` per settled key), and the old path
    // dispatched an UNCONDITIONAL `downplay`→`highlight` pair every call — a `dispatchAction`
    // storm into ECharts, each pair forcing an emphasis recompute on the linked RankedStrip
    // plate. `lastKey` guards same-key re-dispatch (a no-op) and skips the leading `downplay`
    // when nothing is currently raised, so a settled key costs AT MOST one `highlight`.
    let lastKey: string | null = null;
    function highlight(
        key: string,
        keyToIndex: Record<string, number>,
        seriesIndex = 0,
    ): void {
        if (key === lastKey) return; // same settled key — no re-dispatch
        const c = chart.value;
        if (!c) return;
        if (lastKey !== null) c.dispatchAction({ type: "downplay", seriesIndex });
        const idx = keyToIndex[key];
        lastKey = key;
        if (idx == null) return;
        c.dispatchAction({ type: "highlight", seriesIndex, dataIndex: idx });
    }

    function downplay(seriesIndex = 0): void {
        if (lastKey === null) return; // nothing raised — no redundant downplay
        lastKey = null;
        chart.value?.dispatchAction({ type: "downplay", seriesIndex });
    }

    return { chart, highlight, downplay };
}
