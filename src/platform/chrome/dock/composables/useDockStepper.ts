// useDockStepper — the dock's beat-observer + Roman/active-step state (J-ARCH §3,
// the Dock 988-L decomposition). EXTRACTED from Dock.vue:103-322 as a content-MOVE:
// the figure-number stepper's wayfinding logic — the active-beat IntersectionObserver,
// the Roman figure-number mapping, the "step N of M" projection, the single-writer
// mirror into `useActiveBeat`, the document-end correction, and the spine's year cross-fade trigger
// — lifted to a named home so `Dock.vue` composes it as a thin shell.
//
// CRITICAL — the single-scroll-scalar discipline (Dock.vue:193-197). This composable
// IS the dock's ONE existing observer, relocated; it mints ZERO new IntersectionObserver
// (the dock stays the sole beat writer). `grep "new IntersectionObserver"` over the
// platform chrome stays at ONE — this one. The `useActiveBeat` mirror READS that one
// scalar and publishes its human label into the shared store (the SelectionPreview card
// reads the store, never a second observer).
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    toValue,
    watch,
    type ComputedRef,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";
import { useReducedMotion } from "../../../../motion/useReducedMotion.js";
import {
    beginNarrativeRestore,
    markNarrativeRestoreAbsent,
    onNarrativeRestoreSettled,
    settleNarrativeRestore,
    watchNarrativeAnchorLayout,
    type NarrativeLayoutHeal,
} from "../../../../motion/narrative-restore.js";
import { useActiveBeat } from "../../../stores/useActiveBeat.js";
import { useViewParams } from "../../../stores/useViewParams.js";
import type { NarrativeAnchor } from "../../../stores/useViewParams.js";
import { toRoman } from "../../../composables/useRomanNumeral.js";
import { scrollToSection, sectionScrollEndpoint } from "../scroll-anchor.js";
import type { DashboardContext } from "../../../../contract/index.js";

/** The stepper's reactive surface — the dock composes this into its template. */
export interface UseDockStepper {
    /** The id of the beat the viewport is currently centred on — drives `aria-current`,
        the raised-pill state, AND the spine's `currentKey` rivet. "" before the first hit. */
    activeBeatId: Ref<string>;
    /** The dashboard's "beat" nav items (the figure-number rungs; "view" items route). */
    beatItems: ComputedRef<DashboardContext["nav"]>;
    /** The active beat's index among the beats (1-based) — for the "step N of M" region. */
    activeStep: ComputedRef<number>;
    /** The active section's label, trimmed; "" when no section is active. */
    activeLabel: ComputedRef<string>;
    /** 1..N → I..V (and beyond) — the Roman figure-number for a 1-based rung index. */
    roman: (n: number) => string;
    /** The active year off the platform year-scope (the spine's year-fade trigger source). */
    activeYear: ComputedRef<number | null>;
    /** Cross-fade gate — true for one cycle after a year change drives the spine fade. */
    yearFading: Ref<boolean>;
    /** Smooth-scroll the document to a beat section by id. Writes nothing to the URL. */
    scrollTo: (id: string) => void;
    /** A section control's jump (a rung, the Sections select, ‹ ›, PageUp/PageDown): scroll to the
        section and write `?at=` once (§2.2, R-INTERACT S-6). The only `?at=` writer. */
    goToSection: (id: string) => void;
    /** Jump one section back (-1) or forward (+1) from the active one. False at either end. */
    stepSection: (delta: -1 | 1) => boolean;
    /** True when this mount began from a semantic narrative anchor. */
    deepLink: () => boolean;
    /** Subscribe to the dock's existing restore-settled edge. */
    onRestoreSettled: (callback: () => void) => () => void;
}

/**
 * Bind the dock's figure-number stepper to the active dashboard context. Owns the ONE
 * beat-observer (the sole scroll-scalar writer), the active-step projection, the Roman
 * mapping, the single-writer mirror into `useActiveBeat`, the document-end correction, and the
 * spine's year cross-fade trigger. The document scalar is injected from Dock.vue, its one owner.
 */
export function useDockStepper(
    ctx: MaybeRefOrGetter<DashboardContext | undefined>,
    documentProgress: MaybeRefOrGetter<number>,
): UseDockStepper {
    function roman(n: number): string {
        return toRoman(n);
    }

    /** The id of the beat the viewport is currently centred on — drives `aria-current`, the
        raised-pill state, AND the spine's `currentKey` rivet. "" before the first hit. */
    const activeBeatId = ref<string>("");

    const readProgress = (): number => toValue(documentProgress);

    // ── The spine YEAR trigger (B4 §4, S2 §2.4, G10 §8.3) ────────────────────────
    // The spine cross-fades on a year change: `year` joins its trigger list. We read the
    // active year off the platform view-params' year-scope (lazily attached once the feed
    // lands) and fire a short cross-fade when it changes — the same patient settle the
    // accent re-tint uses. PRM → no fade.
    const view = useViewParams();
    const reduced = useReducedMotion();
    const activeYear = computed<number | null>(
        () => view.yearScope?.activeYear?.value ?? null,
    );
    /** Cross-fade gate — true for one cycle after a year change drives the spine fade. */
    const yearFading = ref(false);
    let yearFadeTimer: ReturnType<typeof setTimeout> | null = null;
    watch(activeYear, (now, was) => {
        if (was == null || now === was || reduced.value) return; // first attach / PRM → no fade
        yearFading.value = true;
        if (yearFadeTimer) clearTimeout(yearFadeTimer);
        yearFadeTimer = setTimeout(() => {
            yearFading.value = false;
        }, 600); // --duration matched to the spine Layer-A settle
    });

    /** The active beat's index among the nav beats (1-based) — for the "step N of M" region. */
    const beatItems = computed(() =>
        (toValue(ctx)?.nav ?? []).filter((i) => i.kind === "beat"),
    );
    const activeStep = computed(() => {
        const idx = beatItems.value.findIndex(
            (i) => i.kind === "beat" && i.id === activeBeatId.value,
        );
        return idx >= 0 ? idx + 1 : 0;
    });

    const activeLabel = computed(() => {
        const beat = beatItems.value.find((i) => i.kind === "beat" && i.id === activeBeatId.value);
        return beat?.kind === "beat" ? beat.label.trim() : "";
    });

    // ── THE SINGLE-WRITER MIRROR INTO useActiveBeat (I5 §4 · the ONE writer line, NO new observer) ──
    // The SelectionPreview card (+ its `useSelectionStat` registry) needs the active beat — but must
    // NOT mount a SECOND IntersectionObserver (the single-scroll-scalar discipline forbids a duplicate
    // writer). The dock's EXISTING observer (`setupBeatObserver` below) is the sole writer of
    // `activeBeatId`; this watch MIRRORS that one scalar (resolving its human label off `beatItems`)
    // into the shared platform store. So the card READS `useActiveBeat`, the dock stays the only writer,
    // and zero new observer is created — `grep` for `new IntersectionObserver` over the beats stays at
    // the dock's one. `immediate` flushes the seed (the dock seeds the first beat on setup) into the store.
    const activeBeat = useActiveBeat();
    watch(
        activeBeatId,
        (id) => {
            const beat = beatItems.value.find(
                (i) => i.kind === "beat" && i.id === id,
            );
            activeBeat.setActiveBeat(
                id,
                beat?.kind === "beat" ? beat.label : undefined,
            );
        },
        { immediate: true },
    );

    // The rung-click scroll — the shared O-A3 anchor machinery (`scrollToSection`).
    let cancelSectionScroll: (() => void) | null = null;
    function scrollTo(id: string) {
        cancelSectionScroll?.();
        cancelSectionScroll = scrollToSection(id, reduced.value);
    }

    // ── THE `?at` NARRATIVE ANCHOR (U/B7 §2.2 · R-INTERACT S-6) ─────────────────────────────────
    // Scrolling only scrolls: no scroll, observer delivery or restore writes the URL. `?at=` is written
    // by a section control alone (`goToSection`: a rung, the Sections select, ‹ ›, PageUp/PageDown),
    // so K-3 holds by construction. The restore reads a linked `?at` and leaves it as the link gave it.
    const RESTORE_SETTLE_MS = 700;
    /** True while a restore `scrollIntoView` is settling (the end-zone watch stands down). */
    let restoring = false;
    let restoreAborted = false;
    let stopRestoreAbort: (() => void) | null = null;
    /** The restore fires exactly ONCE, when the section nodes first resolve (the async-body trap). */
    let restored = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let layoutHeal: NarrativeLayoutHeal | null = null;
    let restoreSettled = false;
    let layoutStopped = false;

    /** The beat ids in nav order. */
    const beatIds = (): string[] =>
        beatItems.value.flatMap((i) => (i.kind === "beat" ? [i.id] : []));

    /** A scroll within this many px of a leg's start or end counts as at it (scroll-anchor's epsilon). */
    const ANCHOR_SLACK_PX = 4;
    /** The section control's leg in flight: where the page was, where it is going, and the last
        scroll position seen on the way. It lives only while the page travels toward `to`: it ends
        when the page rests at `to`, when a scroll runs against the leg, or when the reader wheels
        or drags. A leg left behind would answer PageDown long after it landed (U/B7b M1, repair 1). */
    let leg: { id: string; from: number; to: number; last: number } | null = null;
    const legListen: AddEventListenerOptions = { capture: true, passive: true };

    function endLeg(): void {
        if (!leg) return;
        leg = null;
        window.removeEventListener("scroll", onLegScroll, true);
        window.removeEventListener("wheel", endLeg, true);
        window.removeEventListener("touchmove", endLeg, true);
    }

    function onLegScroll(): void {
        if (!leg) return;
        const y = document.scrollingElement?.scrollTop ?? 0;
        const run = Math.sign(leg.to - leg.from);
        const step = y - leg.last;
        leg.last = y;
        if (Math.abs(y - leg.to) <= ANCHOR_SLACK_PX || (step !== 0 && Math.sign(step) !== run)) endLeg();
    }

    function goToSection(id: string): void {
        if (!beatIds().includes(id)) return;
        const target = document.getElementById(id);
        const from = document.scrollingElement?.scrollTop ?? 0;
        endLeg();
        const to = target ? sectionScrollEndpoint(target) : from;
        if (target && Math.abs(to - from) > ANCHOR_SLACK_PX) {
            leg = { id, from, to, last: from };
            window.addEventListener("scroll", onLegScroll, legListen);
            window.addEventListener("wheel", endLeg, legListen);
            window.addEventListener("touchmove", endLeg, legListen);
        }
        activeBeatId.value = id;
        scrollTo(id);
        if (view.narrativeAt?.beatId !== id || view.narrativeAt?.stepId) view.setNarrativeAt(id);
    }

    /** The section the reader is in, read once at the key press (U/B7b M1). While the page is on
        a section control's leg (between where it started and where it rests) that leg's section
        is the answer, so a second key press mid-flight moves on from it. Otherwise it is the last
        section whose top has crossed the reading line, -1 above the first section (a cover), and
        the last section in the end zone. The observer's rung is not read: it never moves when a
        jump lands where no section crosses the band (the top of a page that opens on a cover). */
    function sectionHere(ids: string[]): number {
        const y = document.scrollingElement?.scrollTop ?? 0;
        if (leg && ids.includes(leg.id)) {
            const run = leg.to - leg.from;
            const done = y - leg.from;
            if (Math.abs(done) > ANCHOR_SLACK_PX && Math.sign(done) === Math.sign(run) && Math.abs(done) <= Math.abs(run) + ANCHOR_SLACK_PX)
                return ids.indexOf(leg.id);
        }
        if (readProgress() >= END_EPSILON) return ids.length - 1;
        const line = window.innerHeight * 0.35;
        let here = -1;
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el && el.getBoundingClientRect().top <= line) here = i;
        });
        return here;
    }

    function stepSection(delta: -1 | 1): boolean {
        const ids = beatIds();
        const next = ids[sectionHere(ids) + delta];
        if (!next) return false;
        goToSection(next);
        return true;
    }

    function anchorElement(anchor: NarrativeAnchor): HTMLElement | null {
        const beat = document.getElementById(anchor.beatId);
        if (!beat || !anchor.stepId) return beat;
        return (
            [...beat.querySelectorAll<HTMLElement>("[data-scene-step-id]")].find(
                (element) => element.dataset.sceneStepId === anchor.stepId,
            ) ?? beat
        );
    }

    function bindRestoreAbort(): void {
        stopRestoreAbort?.();
        restoreAborted = false;
        const abort = (): void => {
            restoreAborted = true;
            layoutHeal?.abort();
        };
        const passive: AddEventListenerOptions = { capture: true, passive: true };
        window.addEventListener("wheel", abort, passive);
        window.addEventListener("touchmove", abort, passive);
        window.addEventListener("keydown", abort, true);
        stopRestoreAbort = () => {
            window.removeEventListener("wheel", abort, true);
            window.removeEventListener("touchmove", abort, true);
            window.removeEventListener("keydown", abort, true);
        };
    }

    function finishRestore(): void {
        if (!restoreSettled || !layoutStopped) return;
        stopRestoreAbort?.();
        stopRestoreAbort = null;
        restoring = false;
    }

    /** Drive and settle the one semantic restore on the dock's existing timer. */
    function scrollToAnchor(el: HTMLElement, anchor: NarrativeAnchor): void {
        restoring = true;
        restoreSettled = false;
        layoutStopped = false;
        activeBeatId.value = anchor.beatId;
        bindRestoreAbort();
        const block: ScrollLogicalPosition = anchor.stepId ? "center" : "start";
        // The restore reads the link and never writes it (§K K-3): the URL already names the
        // anchor, and a step the page cannot place is left in the URL as the link gave it.
        layoutHeal = watchNarrativeAnchorLayout({
            target: el,
            root: document.body,
            reanchor: () => {
                el.scrollIntoView({ behavior: "auto", block });
            },
            onStop: () => {
                layoutStopped = true;
                finishRestore();
            },
        });
        // The restore lands at once (U/B7 · PLAN §4.2: no motion on load). A smooth restore was
        // still in flight when the settle re-anchored, and Chromium finished 3–6 px past the beat
        // (U RULINGS §N N-1: the refuted 5 px residual of 2cc051e).
        el.scrollIntoView({ behavior: "auto", block });
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(
            () => {
                const aborted = restoreAborted;
                const stepConsumed = settleNarrativeRestore(anchor, { aborted });
                const placed = !aborted && !stepConsumed;
                if (placed) {
                    document.getElementById(anchor.beatId)?.scrollIntoView({
                        behavior: "auto",
                        block: "start",
                    });
                }
                restoreSettled = true;
                // The re-land above cured any movement before the settle; the heal corrects only
                // what moves after it (U/B7b M3 repair 1: Firefox 390 /demand#crossover, the first
                // figure beat shrinking after the re-land).
                layoutHeal?.settle({ placed });
                finishRestore();
            },
            reduced.value ? 0 : RESTORE_SETTLE_MS,
        );
    }

    /** Restore the narrative position from `?at` (or the `#fragment`) on the section-nodes-resolved
        edge. Early-returns on a null anchor. An anchor naming no element (a stale or wrong-route link,
        a fragment that is not on this page) stays at the top and still publishes its settle, aborted,
        so every consumer waiting on the restore edge goes live (no scene consumes it). When
        a co-deep-linked `?fig` is open it LOCKS body scroll, so the `scrollIntoView` is DEFERRED to
        the fig-close edge via a one-shot `watch(figId)`. `view.narrativeAt`/`view.figId` are read as
        the Pinia-UNWRAPPED values (NO `.value` — a setup store auto-unwraps the returned computeds). */
    function restoreNarrativeAnchor(): void {
        const anchor = view.narrativeAt;
        if (!anchor) {
            markNarrativeRestoreAbsent();
            return;
        }
        beginNarrativeRestore();
        const el = anchorElement(anchor);
        if (!el) {
            settleNarrativeRestore(anchor, { aborted: true });
            return;
        }
        if (view.figId) {
            const stop = watch(
                () => view.figId,
                (fig) => {
                    if (fig) return;
                    stop();
                    const target = anchorElement(anchor);
                    if (target) scrollToAnchor(target, anchor);
                },
            );
            return;
        }
        scrollToAnchor(el, anchor);
    }

    // ── Active-beat tracking ────────────────────────────────────────────────────
    // An IntersectionObserver over the beat section ids picks the beat nearest the
    // viewport's reading line (the upper third), so the raised pill + `aria-current` + the
    // spine's current rivet track the scroll without per-frame geometry. Beats only — "view"
    // items route, so their active state is the router's `aria-current`, not the observer's.
    //
    // ── H.W9 · THE FIRST-BEAT SEED + THE DEFERRED OBSERVE ───────────────────────────
    // The deck-rail (and the Roman rungs) must always show EXACTLY ONE active mark — never
    // zero. At the very TOP of the document NO section yet intersects the upper-third reading
    // band (the first beat sits below the hero), so a pure isIntersecting observer leaves the
    // rail UN-marked until the reader scrolls a beat into the band (the "no active dot at rest"
    // gap H9 §5.2 forbids). We SEED `activeBeatId` to the first beat — "Step 1 of N" reads
    // correct at the top (you are at the start of the deck) — and let the observer refine it as
    // the reader scrolls. We also observe on a microtask after mount AND retry until the section
    // nodes exist (the dashboard body resolves async, so a synchronous getElementById at mount
    // can miss every section — the silent "observer watches nothing" trap).
    let observer: IntersectionObserver | null = null;
    /** The pending deferred-observe frame, so a route change never leaves two retry loops. */
    let observeFrame = 0;

    function setupBeatObserver(): void {
        observeFrame = 0;
        const ids = beatItems.value.flatMap((i) =>
            i.kind === "beat" ? [i.id] : [],
        );
        if (!ids.length) return;
        // SEED the first beat so the rail/deck always carries exactly one active mark (Step 1
        // of N at the top), never zero.
        if (!activeBeatId.value) activeBeatId.value = ids[0];
        observer?.disconnect();
        observer = new IntersectionObserver(
            (entries) => {
                // THE END-ZONE OVERRIDE (the short-terminal-beat law — see the scroll watch
                // below). A late observer delivery (a plate hydrating/resizing near the bottom
                // re-fires intersections) must not un-name the LAST beat while the document
                // rests at its end — the end zone is authoritative over band intersections.
                if (readProgress() >= END_EPSILON) {
                    const last = beatItems.value.at(-1);
                    if (last?.kind === "beat") {
                        activeBeatId.value = last.id;
                        return;
                    }
                }
                for (const e of entries) {
                    if (e.isIntersecting) activeBeatId.value = e.target.id;
                }
            },
            // The reading line sits in the upper third: a section is "active" once its top
            // crosses into the top 35% of the viewport (rootMargin pulls the trigger band up).
            { rootMargin: "0px 0px -65% 0px", threshold: 0 },
        );
        let observed = 0;
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el) {
                observer.observe(el);
                observed++;
            }
        }
        // the dashboard body resolves async — if no section node existed yet, retry next frame
        // so the observer never silently watches nothing (the deferred-observe).
        if (observed === 0) {
            observeFrame = requestAnimationFrame(setupBeatObserver);
            return;
        }
        // The section nodes have resolved — restore the `?at` narrative position ONCE (A1·§3.B). It
        // fires HERE (not at mount) so `getElementById(beatId)` resolves the async-rendered body.
        if (!restored) {
            restored = true;
            restoreNarrativeAnchor();
        }
    }

    onMounted(setupBeatObserver);

    // THE ROUTE CHANGE (U/B7 §2.2). The dock is mounted once above the router, so the stepper
    // outlives a route: a new context re-seeds the rail and observes the new route's sections, and
    // its own `?at` link is restored once, as on a cold load.
    watch(
        () => toValue(ctx)?.id,
        (id, was) => {
            if (id === was) return;
            if (observeFrame) cancelAnimationFrame(observeFrame);
            observer?.disconnect();
            observer = null;
            activeBeatId.value = "";
            restored = false;
            if (id) observeFrame = requestAnimationFrame(setupBeatObserver);
        },
    );

    // ── PageUp / PageDown page one section (O-12 · §2.2) ─────────────────────────────────────────
    // The owner's "one page at a time" without scroll-jacking: the keys the reader already uses to
    // page move one section instead of one viewport. Only a bare key on the page itself: a field, a
    // listbox, a menu, a dialog or a scroll box of its own keeps its key. At either end the key
    // keeps its browser default.
    const OWN_KEYS = "input,textarea,select,[contenteditable='true'],[role='listbox'],[role='menu'],[role='dialog'],[role='slider'],[role='spinbutton']";
    function onPageKey(e: KeyboardEvent): void {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.key !== "PageDown" && e.key !== "PageUp") return;
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest(OWN_KEYS)) return;
        if (stepSection(e.key === "PageDown" ? 1 : -1)) e.preventDefault();
    }
    onMounted(() => window.addEventListener("keydown", onPageKey));

    // ── THE DOCUMENT-END SNAP (N5 design consult — the short-terminal-beat law) ─────────────
    // A SHORT terminal beat can never climb into the upper-third reading band: the document runs
    // out of scroll before its top crosses the 35% line, so the observer alone leaves the LAST
    // rung unreachable (live on /speedtest — the 2-rung deck read "I" at the very bottom, and
    // even clicking rung II could not light it). The EXISTING document scroll scalar (no new
    // observer — the single-scroll-scalar law holds) closes it at the edges: reaching the
    // document end names the LAST beat (the reader is at the end of the deck — always the honest
    // answer); leaving the end zone re-derives the beat under the reading line with ONE geometry
    // read (the observer fires no entry/exit for a beat that never intersects the band, so the
    // falling edge must re-derive, not wait).
    const END_EPSILON = 0.995;
    watch(readProgress, (now, was) => {
        if (was == null || now === was) return;
        const ids = beatItems.value.flatMap((i) =>
            i.kind === "beat" ? [i.id] : [],
        );
        if (!ids.length || restoring) return;
        if (now >= END_EPSILON) {
            // IN the end zone (zone-held, not edge-only — a racing observer delivery between
            // ticks cannot leave a stale rung): the last beat is the honest answer at the end.
            activeBeatId.value = ids[ids.length - 1];
        } else if (was >= END_EPSILON) {
            // LEAVING the end zone: the observer fires no entry/exit for a beat that never
            // intersects the band, so the falling edge re-derives the beat under the reading
            // line with ONE geometry read (never per-frame — edges only).
            const line = window.innerHeight * 0.35;
            let candidate = ids[0];
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= line) candidate = id;
            }
            activeBeatId.value = candidate;
        }
    });

    onBeforeUnmount(() => {
        window.removeEventListener("keydown", onPageKey);
        endLeg();
        cancelSectionScroll?.();
        if (observeFrame) cancelAnimationFrame(observeFrame);
        observer?.disconnect();
        observer = null;
        if (yearFadeTimer) clearTimeout(yearFadeTimer);
        if (settleTimer) clearTimeout(settleTimer);
        stopRestoreAbort?.();
        layoutHeal?.abort();
        layoutHeal = null;
    });

    return {
        activeBeatId,
        beatItems,
        activeStep,
        activeLabel,
        roman,
        activeYear,
        yearFading,
        scrollTo,
        goToSection,
        stepSection,
        deepLink: () => view.narrativeAt != null,
        onRestoreSettled: (callback) =>
            onNarrativeRestoreSettled(() => {
                callback();
            }),
    };
}
