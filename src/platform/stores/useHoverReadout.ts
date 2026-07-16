// platform/stores/useHoverReadout.ts — the ONE platform-owned hover-readout payload
// store (D1.2 · the N-cards class made unrepresentable). The platform mounts a SINGLE
// HoverCard at the app chrome (DashboardView); the viz that OWNS the pointer PUBLISHES
// its readout payload here, and the one card renders it. Every OTHER viz reads only
// `useSelection.hoveredKey` for the linked RAISE — it never mounts a card and never
// publishes. `open := payload != null`, so two cards can NEVER be visible at once: there
// is one payload, one card. (D14/D22 — the N per-viz teleported shells, the global-`open`
// stacking, and the local-vs-store split all dissolve into this one seam.)
//
// THE ANCHORING LAW (D1 AUGMENT 5). A payload's `anchor` is the hovered DATUM's screen
// geometry (the mark's bbox centroid in viewport space), recomputed ONCE per ENTITY change
// by the publishing viz — NEVER chased per-mousemove off the cursor. The store carries the
// settled anchor; the card seats beside the datum. No publisher ships cursor-chase
// placement (the retired `@mousemove`→`hoverXY` pattern is gone from all five).
//
// THE OWNERSHIP LAW (E3 · e-hovers FIX-1). Each payload names its `origin` (a stable string
// per publisher). Pointer ownership lives in `useSelection.hoverOrigin` — the viz the pointer
// is physically inside. The two guards are now SYMMETRIC:
//   • publish(payload) — REJECTS a payload whose `origin` ≠ the live hover owner. So when two
//     publishers derive the SAME hovered key (the USF map pair both read `hoveredFips`) and
//     both fire in one tick, ONLY the one the pointer is actually inside lands — the later DOM
//     registrant can no longer clobber the rich payload. The N-publisher race is unrepresentable.
//   • clear(origin)   — blanks the card ONLY when `origin` still owns the live payload. A stale
//     clear from a viz the pointer already left is a no-op (the cross-plate transit stays stable).
// The one law: the owner publishes, the owner clears, everyone else only raises. The bespoke
// per-viz ownsPointer ref (SciScatter) is DELETED — ownership is a store invariant now.
//
// THE PIN TIER (F6.10 §2.3 · the interaction grammar). The store learns a SECOND tier beside the
// transient `readout`: `pinnedReadouts: Map<selectionKey, HoverReadout>`. On a PIN (a click /
// Enter) the owning producer ALSO deposits its already-built payload here keyed by the SELECTION
// key; the deposit is evicted the instant that key falls out of `useSelection.selectedKeys` (a
// reactive `watch`, the single source of truth). The card surface stops being "the hover" and
// becomes "the readout projection of {the transient hover} ∪ {the pinned set}" — the architectural
// transposition that makes "if you shift click, the hover should persist" true: a pinned datum's
// card survives the pointer leaving, because it is held by the SELECTION channel, not the pointer.
// The transient tier is byte-unchanged at rest (zero pins ⇒ the E3 behaviour exactly).

import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { Fact } from "../../interaction/HoverCard.vue";
import type { Anchor } from "../../charts/contract/selection-contract.js";
import { useSelection } from "./useSelection.js";

/**
 * THE UNMEASURED-FLOOR GUARD (H.W1.a · the Anchor|null contract enforcement). A producer whose
 * datum geometry has not yet resolved leaves its viewport projection at the `{0,0}` origin floor
 * (the `convertToPixel`/`getBoundingClientRect` pre-measure default) — an UN-anchored position the
 * card must never paint at (it clamps to the (16,16) sentinel over the hero <h1>, the live ghost).
 * The store treats such an anchor as "not yet measured" and stores `null` in its place, so a null
 * anchor forces the card hidden REGARDLESS of which producer shipped the payload (the contract is
 * enforced at the ONE platform seam, not relied upon at twelve producer call-sites). A real datum
 * at the literal viewport origin is vanishingly improbable (the marks live inside laid-out plates,
 * never the top-left corner), and even there the card simply waits one measure tick — never a ghost.
 */
function settledAnchor(anchor: Anchor | null): Anchor | null {
    if (anchor === null) return null;
    if (anchor.x === 0 && anchor.y === 0) return null;
    return anchor;
}

/** A single breakdown bar (the NetRetentionMap per-program lane) — structured, not markup. */
export interface ReadoutBar {
    /** The bar's label (the program / tier name). */
    label: string;
    /** The formatted value shown at the bar's right (e.g. a $ figure). */
    value: string;
    /** The bar fill fraction in [0, 1] (the share of the whole). */
    share: number;
    /** The bar's fill colour (a categorical hue — never the diverging ramp, FD3 §1.2). */
    color: string;
}

/** The one hover-readout payload — what the platform card renders. */
export interface HoverReadout {
    /** The publishing viz's stable id (the origin guard key). */
    origin: string;
    /** The entity title (state / school / district / applicant name). */
    title: string;
    /** An optional eyebrow above the title (the VERDICT word / the entity KIND — the lede). */
    eyebrow?: string;
    /**
     * The SECONDARY eyebrow line (the per-plate CONTEXT: the map's quantity, the strip's rank,
     * the scatter's question, the flip's normalization). The eyebrow becomes a TWO-tier head —
     * verdict word / context phrase — the house hierarchy (d-hover-usf M2). Optional + backward-
     * compatible: a payload that omits it renders the one-line eyebrow exactly as before.
     */
    subhead?: string;
    /**
     * The card-level SPINE ACCENT — the verdict/category pole the card tints the eyebrow glyph
     * + the title's leading hairline with (the USF net-direction pole; the ECF teal data-pole).
     * ONE place the card carries the data voice on its chrome, not threaded per-fact (M2).
     */
    accent?: string;
    /** The fact rows — the shared grammar across dashboards. */
    facts: Fact[];
    /**
     * The settled datum anchor in VIEWPORT space (the mark's bbox top-centre), or `null` when the
     * producer has not yet measured its datum geometry (the Anchor|null contract, H.W1.a). A null
     * anchor forces the card HIDDEN — the (16,16) sentinel ghost is unrepresentable. The store's
     * publish/pin seam nulls an anchor that resolves to the unmeasured `{0,0}` floor, so a card
     * paints ONLY beside a real, measured datum.
     */
    anchor: Anchor | null;
    /** `compact` = title + facts; `full` also reveals the breakdown bars. */
    density: "compact" | "full";
    /** The breakdown bars (revealed at `full` density) — optional, structured. */
    breakdown?: ReadoutBar[];
    /** The breakdown band's header label (USF "By program" / ECF "Where the money went" / SCI). */
    breakdownLabel?: string;
    // ── THE I5 SELECTION-PREVIEW ENRICHMENT (§3, OPTIONAL · backward-compatible) ─────────────────
    // The pin tier IS the per-entity payload, so the shape key + grain ride WITH it (the idiomatic
    // home — the SelectionPreview card needs WHICH silhouette to draw + which grain to pick its
    // `<Glyph grain>` + stat lane, and threading them as props would fork the one payload). Every
    // existing publisher OMITS both, so the transient HoverCard is byte-unchanged; the per-dashboard
    // producers STAMP these on their PIN payload (the geo plate edits are I5.c §10).
    /**
     * The shape JOIN key the card's `<Glyph>` resolves its silhouette geometry from — usually the
     * raw entity id (the fips / GEOID). Defaults to the selection key when omitted; a producer stamps
     * it when the shape key differs from the selection grain (e.g. a county-proxy district).
     */
    glyphKey?: string;
    /**
     * The entity grain the card dispatches the `<Glyph grain>` on (`stateGlyph` vs `districtGlyph`)
     * and the stat lane it reads. Omitted by every existing publisher (the transient card never
     * draws a glyph); the geo producers stamp it on their pin payload.
     */
    grain?: "state" | "county" | "district";
}

/** A pinned readout — the persistent card payload carrying its SELECTION key (so the card surface
    keys its `v-for` over the pinned set and the pin-pip release can target the datum). */
export interface PinnedReadout extends HoverReadout {
    /** The selection key the card is pinned under (the same grain `selectedKeys` holds). */
    key: string;
}

/** The COMPARE cap (F6.10 §2.4 / §5 R-4) — at most N pinned cards on the compare rail, so the
    multi-card ledger stays legible and the budget honest. A pin past the cap evicts the OLDEST. */
export const PIN_CAP = 3;

export const useHoverReadout = defineStore("platform:hover-readout", () => {
    /** The ONE live TRANSIENT readout, or null when no viz is publishing the hover (E3, unchanged). */
    const readout = ref<HoverReadout | null>(null);
    /**
     * THE PIN TIER (F6.10 §2.3) — the persistent readouts keyed by their SELECTION key. A producer
     * deposits here on a PIN; an entry is evicted when its key leaves `useSelection.selectedKeys`
     * (the watch below) so `selectedKeys` is the single source of truth — the pinned cards are a
     * pure projection of it. Insertion order is the pin order (the compare rail reads top-aligned).
     */
    const pinnedReadouts = ref<Map<string, HoverReadout>>(new Map());
    /**
     * The SELECTION key the live transient `readout` corresponds to — captured at publish time off
     * `useSelection.hoveredKey` (the live hovered key IS the payload's selection key). This is the
     * correlation seam that lets the store AUTO-CAPTURE a pin platform-wide: a pointer click both
     * SELECTS the hovered datum AND leaves this tag pointing at it, so when the key enters
     * `selectedKeys` the store snapshots the live transient payload into the pin tier — NO
     * per-producer wiring needed (every plate that already publishes + selects pin-persists for
     * free, including the USF/ECF/SCI geos this lane does not own). A producer MAY also call `pin`
     * explicitly (the keyboard path, where no transient hover preceded the Enter).
     */
    const lastTransientKey = ref<string | null>(null);
    /** The pointer-ownership source of truth + the selection set (the pin channel's truth). */
    const selection = useSelection();

    /** The card surface is open when EITHER a transient payload is live OR any datum is pinned —
        the projection of {transient} ∪ {pinned} (F6.10 §2.3). */
    const open = computed<boolean>(
        () => readout.value !== null || pinnedReadouts.value.size > 0,
    );
    /** The pinned cards the surface renders — the persistent set, in pin order (the compare rail).
        Each carries its SELECTION `key` so the card surface keys its `v-for` and the release path
        (the pin pip's "Esc to release") can target it. */
    const pinned = computed<PinnedReadout[]>(() =>
        [...pinnedReadouts.value.entries()].map(([key, payload]) => ({
            key,
            ...payload,
        })),
    );
    /** True when the transient hover is over a datum NOT already pinned — the only case the
        transient card renders ON TOP of the pinned set (a re-hover of a pinned datum is the
        persistent card, no duplicate). The card surface reads this to suppress the duplicate. */
    const transientIsRedundant = computed<boolean>(() => {
        const key = selection.hoveredKey;
        return key !== null && pinnedReadouts.value.has(key);
    });

    /**
     * Publish (or replace) the readout — but ONLY when `payload.origin` is the live pointer
     * owner (`useSelection.hoverOrigin`). This is the symmetric dual of `clear`'s origin guard:
     * a payload from a publisher the pointer is NOT inside is REJECTED, so the USF map-pair
     * collision (both publishers derive the same `hoveredFips` and fire in one tick) resolves
     * to the OWNER's payload, never the later DOM registrant's. The N-publisher race cannot
     * occur. (A null owner — the pointer is off every plate — rejects all publishes; the card
     * is driven closed by the owner's own `clear` on leave.)
     */
    function publish(payload: HoverReadout): void {
        if (selection.hoverOrigin !== payload.origin) return;
        // THE Anchor|null CONTRACT (H.W1.a) — an unmeasured `{0,0}` anchor becomes `null` so the
        // card stays HIDDEN until the producer's datum geometry settles. This is the structural
        // cure for the at-rest ghost: a seeded hover whose `convertToPixel` has not run publishes
        // at the origin floor, and that payload must NOT paint over the hero <h1>.
        readout.value = { ...payload, anchor: settledAnchor(payload.anchor) };
        // Tag the payload with the live hovered key (its selection key) so a subsequent select of
        // that key can auto-capture this payload into the pin tier (the universal pin-persist seam).
        lastTransientKey.value = selection.hoveredKey;
    }

    /**
     * Clear the readout — but only when `origin` still owns the live payload (the origin
     * guard). A stale clear from a viz the pointer already left is a no-op, so a cross-plate
     * transit never blanks the card the new plate just opened. The transient KEY tag is dropped
     * with the payload so a stale tag never auto-captures after the pointer has left.
     */
    function clear(origin: string): void {
        if (readout.value?.origin === origin) {
            readout.value = null;
            lastTransientKey.value = null;
        }
    }

    /**
     * THE LIFECYCLE DISMISS-EVERYTHING SEAM (H.W1.a · §3) — blank BOTH tiers + the transient tag,
     * unconditionally. This is the single facility behind Esc-kills-any-readout (including the
     * at-rest ghost, which has no selection to clear) and the route-change clear (the readout store
     * is an app-singleton, NOT route-scoped, so a navigation must explicitly drop a stale card/pin
     * before the next dashboard mounts). It is ORIGIN-AGNOSTIC (unlike `clear`, which is owner-gated)
     * because Esc / a route change are platform gestures, not a producer's leave. The pin tier is
     * also reset so a held compare card cannot survive the dismiss; `selectedKeys` is dropped by the
     * caller (PlatformShell's Esc clears the selection in lockstep) so the eviction watch stays
     * consistent — clearing the map here is the belt to that suspenders (no card outlives the dismiss).
     */
    function clearAll(): void {
        readout.value = null;
        lastTransientKey.value = null;
        if (pinnedReadouts.value.size > 0) pinnedReadouts.value = new Map();
    }

    /**
     * PIN a datum's readout (F6.10 §2.3 / §2.1 PIN+COMPARE) — the owning producer deposits the
     * SAME payload it already built for the transient card, keyed by the SELECTION `key`, so the
     * card persists once the pointer leaves. Owner-gated exactly like `publish`: only the plate
     * the pointer is physically inside may pin its own datum (a non-owner publish/pin is rejected),
     * so a linked plate that merely raises the key can never deposit a phantom card. A re-pin of an
     * already-pinned key REFRESHES its payload in place (no reorder). Past the COMPARE cap the
     * OLDEST pin is evicted from BOTH this map AND `selectedKeys` (the rail stays ≤ PIN_CAP and the
     * two channels never drift). The eviction-on-deselect watch keeps `selectedKeys` the truth.
     */
    function pin(key: string, payload: HoverReadout): void {
        if (selection.hoverOrigin !== payload.origin) return;
        const next = new Map(pinnedReadouts.value);
        // The same Anchor|null contract on the pin tier — a pin whose producer has not settled its
        // geometry seats `null` (the pinned-card placement guards null → hidden until re-measured).
        next.set(key, { ...payload, anchor: settledAnchor(payload.anchor) }); // a Map re-set keeps the key's original insertion slot (no reorder)
        // Enforce the COMPARE cap: drop the oldest pins (FIFO) until the rail is ≤ PIN_CAP, and
        // drop them from the selection set too so the pinned cards and the pinned set never drift.
        while (next.size > PIN_CAP) {
            const oldest = next.keys().next().value;
            if (oldest === undefined) break;
            next.delete(oldest);
            if (selection.isSelected(oldest))
                selection.select(oldest, { additive: true });
        }
        pinnedReadouts.value = next;
    }

    // THE SELECTION-DRIVEN PIN PROJECTION (F6.10 §2.3) — `selectedKeys` is the single source of
    // truth for what is pinned; the pin tier is its pure projection. ONE watch keeps the two in
    // lockstep, both directions:
    //   • AUTO-CAPTURE on key-ADD — when a key enters the set AND it is the live transient datum
    //     (`lastTransientKey`), snapshot the live transient `readout` into the pin tier (capped at
    //     PIN_CAP, FIFO). A pointer click both selects the hovered datum AND leaves this tag on it,
    //     so EVERY plate's click pin-persists for free — no per-producer wiring (the USF/SCI/ECF
    //     geos this lane does not own inherit persistence the same tick).
    //   • EVICT on key-DROP — a click-to-deselect, a second Shift-click, or Esc (`clearSelection`)
    //     drops keys; this evicts any pinned card whose key is no longer selected, so the persistent
    //     cards close in lockstep — G-CLEAR holds by construction (no card outlives its pin).
    watch(
        () => selection.selectedKeys,
        (keys) => {
            let next = new Map(pinnedReadouts.value);
            let mutated = false;
            // AUTO-CAPTURE: a newly-selected key that is the live transient datum, not yet pinned.
            const transientKey = lastTransientKey.value;
            if (
                transientKey !== null &&
                keys.has(transientKey) &&
                !next.has(transientKey) &&
                readout.value !== null
            ) {
                next.set(transientKey, readout.value);
                while (next.size > PIN_CAP) {
                    const oldest = next.keys().next().value;
                    if (oldest === undefined) break;
                    next.delete(oldest);
                }
                mutated = true;
            }
            // EVICT: any pinned key no longer in the selection set.
            for (const key of [...next.keys()]) {
                if (!keys.has(key)) {
                    next.delete(key);
                    mutated = true;
                }
            }
            // The cap can be exceeded by an out-of-band pin sequence; trim FIFO + drop from the set.
            while (next.size > PIN_CAP) {
                const oldest = next.keys().next().value;
                if (oldest === undefined) break;
                next.delete(oldest);
                if (keys.has(oldest)) selection.select(oldest, { additive: true });
                mutated = true;
            }
            if (mutated) {
                next = new Map(next); // a fresh ref so the computed projection re-derives
                pinnedReadouts.value = next;
            }
        },
        { deep: true },
    );

    return {
        readout,
        pinnedReadouts,
        // EXPOSED (H.W1.a) — the card-enter re-arm reads this to re-assert ownership of the live
        // transient payload's selection key (so the pointer-bridge cancels the close-lazy clear).
        lastTransientKey,
        pinned,
        open,
        transientIsRedundant,
        publish,
        clear,
        pin,
        // The dismiss-everything seam (Esc / route-change) — blanks the transient + the pin tier.
        clearAll,
    };
});
