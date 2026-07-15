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
import { useDebounceFn } from "@vueuse/core";
import { useReducedMotion } from "@/motion/useReducedMotion";
import {
    onNarrativeRestoreSettled,
    settleNarrativeRestore,
} from "@/motion/narrative-restore";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import { useViewParams } from "@/platform/stores/useViewParams";
import type { NarrativeAnchor } from "@/platform/stores/useViewParams";
import { toRoman } from "@/platform/composables/useRomanNumeral";
import { scrollToSection } from "@/platform/chrome/dock/scroll-anchor";
import type { DashboardContext } from "@/contract";

/** The stepper's reactive surface — the dock composes this into its template. */
export interface UseDockStepper {
    /** The id of the beat the viewport is currently centred on — drives `aria-current`,
        the raised-pill state, AND the spine's `currentKey` rivet. "" before the first hit. */
    activeBeatId: Ref<string>;
    /** The dashboard's "beat" nav items (the figure-number rungs; "view" items route). */
    beatItems: ComputedRef<DashboardContext["nav"]>;
    /** The active beat's index among the beats (1-based) — for the "step N of M" region. */
    activeStep: ComputedRef<number>;
    /** 1..N → I..V (and beyond) — the Roman figure-number for a 1-based rung index. */
    roman: (n: number) => string;
    /** The active year off the platform year-scope (the spine's year-fade trigger source). */
    activeYear: ComputedRef<number | null>;
    /** Cross-fade gate — true for one cycle after a year change drives the spine fade. */
    yearFading: Ref<boolean>;
    /** Smooth-scroll the document to a beat section by id. */
    scrollTo: (id: string) => void;
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
    ctx: DashboardContext | undefined,
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
        (ctx?.nav ?? []).filter((i) => i.kind === "beat"),
    );
    const activeStep = computed(() => {
        const idx = beatItems.value.findIndex(
            (i) => i.kind === "beat" && i.id === activeBeatId.value,
        );
        return idx >= 0 ? idx + 1 : 0;
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

    // The rung-click scroll — the shared O-A3 anchor machinery (`scrollToSection`), the SAME primitive
    // `DockTOC`'s row click routes through, so a beat lands identically from either view-mode (O-A23).
    function scrollTo(id: string) {
        scrollToSection(id);
    }

    // ── THE `?at` NARRATIVE ANCHOR — the ONE debounced writer + the restore (K-ANIM A1·§3.B) ──────
    // The writer + the restore BOTH ride the dock's EXISTING observer (the single-scroll-scalar law —
    // ZERO new IntersectionObserver). `view`/`reduced` are already in scope. The declared-vs-derived
    // law: `?at` backs the COARSE beat the reader is at (passively, via replaceState — no Back-swamp);
    // the rim/`activeVizId`/scene-step RE-DERIVE from where the reader lands (never URL-backed).
    const RESTORE_SETTLE_MS = 700;
    /** True while a restore `scrollIntoView` is settling — suppresses the writer so the restore OWNS
        the initial `?at` (it must not immediately re-write the beat it just seeded). */
    let restoring = false;
    let restoreAborted = false;
    let stopRestoreAbort: (() => void) | null = null;
    /** The restore fires exactly ONCE, when the section nodes first resolve (the async-body trap). */
    let restored = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    /** Track the reader's place into `?at` (debounced) — a replaceState write, no history swamp. NOT
        `immediate` (the dock SEEDS `activeBeatId` on setup + the restore seeds it; neither should
        WRITE — the restore owns the initial `?at`). Suppressed while restoring + on an empty id. */
    const writeAnchor = useDebounceFn((id: string) => {
        if (restoring || !id) return;
        view.setNarrativeAt(id);
    }, 300);
    watch(activeBeatId, (id) => writeAnchor(id));

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

    /** Drive and settle the one semantic restore on the dock's existing timer. */
    function scrollToAnchor(el: HTMLElement, anchor: NarrativeAnchor): void {
        restoring = true;
        activeBeatId.value = anchor.beatId;
        bindRestoreAbort();
        el.scrollIntoView({
            behavior: reduced.value ? "auto" : "smooth",
            block: anchor.stepId ? "center" : "start",
        });
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(
            () => {
                stopRestoreAbort?.();
                stopRestoreAbort = null;
                const aborted = restoreAborted;
                const sceneRestore =
                    anchor.stepId != null && view.sceneId === anchor.stepId;
                const stepConsumed = settleNarrativeRestore(anchor, { aborted });
                if (!aborted) {
                    if (!stepConsumed) {
                        document.getElementById(anchor.beatId)?.scrollIntoView({
                            behavior: "auto",
                            block: "start",
                        });
                    }
                    view.setNarrativeAt(
                        anchor.beatId,
                        stepConsumed ? anchor.stepId : undefined,
                    );
                    if (sceneRestore)
                        view.setSceneId(stepConsumed ? anchor.stepId : undefined);
                }
                restoring = false;
                if (aborted) {
                    if (sceneRestore) view.setSceneId(undefined);
                    writeAnchor(activeBeatId.value);
                }
            },
            reduced.value ? 0 : RESTORE_SETTLE_MS,
        );
    }

    /** Restore the narrative position from `?at` on the section-nodes-resolved edge. Early-returns on
        a null anchor or an absent section (a stale/wrong-route link → stay at top, never crash). When
        a co-deep-linked `?fig` is open it LOCKS body scroll, so the `scrollIntoView` is DEFERRED to
        the fig-close edge via a one-shot `watch(figId)`. `view.narrativeAt`/`view.figId` are read as
        the Pinia-UNWRAPPED values (NO `.value` — a setup store auto-unwraps the returned computeds). */
    function restoreNarrativeAnchor(): void {
        const anchor = view.narrativeAt;
        if (!anchor) return;
        const el = anchorElement(anchor);
        if (!el) return;
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

    function setupBeatObserver(): void {
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
            requestAnimationFrame(setupBeatObserver);
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
        observer?.disconnect();
        observer = null;
        if (yearFadeTimer) clearTimeout(yearFadeTimer);
        if (settleTimer) clearTimeout(settleTimer);
        stopRestoreAbort?.();
    });

    return {
        activeBeatId,
        beatItems,
        activeStep,
        roman,
        activeYear,
        yearFading,
        scrollTo,
        deepLink: () => view.narrativeAt != null,
        onRestoreSettled: (callback) =>
            onNarrativeRestoreSettled(() => {
                callback();
            }),
    };
}
