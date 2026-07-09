// platform/stores/useSelection.ts — the generic entity-selection store (a Pinia
// SETUP store). It generalizes the USF god-store's `hoveredFips`: a selection is
// over an opaque entity KEY (a fips, a leaNumber, a ben — whatever the active feed's
// `meta.keyField` is grained on), so every dashboard's linked-highlight (map ⇄
// scatter ⇄ ranked bar ⇄ table) reads one source of truth and no viz keeps its own
// hover state. The store is key-agnostic by construction: it never inspects the key,
// only equates and stores it.
//
// Two channels, the two interaction registers, now ASYMMETRIC by design (C.W4.2, S2):
//   • hoveredKey  : SCALAR — the transient pointer channel (one mark at a time;
//                            mouseover, cleared on mouseout). This is the de-storm seam
//                            (a debounced scalar; W5 owns the debounce) — left EXACTLY
//                            as-is, never transposed to a set.
//   • selectedKeys: SET    — the sticky channel (a click PINS; cmd-click pins MORE). The
//                            set is the C5 multi-select home AND the ONE co-filter input
//                            every dashboard store folds into `matchByKey` as one more
//                            AND-clause (the keystone — a click is just another filter).
//
// `primaryKey` is the scalar bridge — the first key of the set — keeping the `?fips=`
// cross-link and single-pin reads honest while the set serves multi-select. The raise
// (hover) and frame (selection) are now SEPARATE channels: a viz raises off `hoveredKey`
// and frames off `selectedKeys`, the conflation the prior scalar-fallback forced gone.

import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import {
    encodeSelKey,
    parseSelKey,
    type SelectionKey,
    type SelectionKind,
} from "@/charts/contract/selection-contract";
import { markColorFor } from "@/charts/scale/ColorScale";
import { useViewParams } from "@/platform/stores/useViewParams";

export const useSelection = defineStore("platform:selection", () => {
    /** The transiently-hovered entity key, or null when the pointer is off the marks. */
    const hoveredKey = ref<string | null>(null);
    /**
     * The viz that physically OWNS the live pointer — the origin string of the plate the
     * pointer is inside (set by its own `@hover` non-null, cleared on its `@hover` null).
     * This is the store-side half of the E3 ownership law (e-hovers FIX-1): the OWNER is
     * recorded HERE beside the raised key, so the readout seam can reject any publish whose
     * origin is not the live owner — the symmetric dual of the readout's clear-guard. The
     * RAISE (every linked viz lights off `hoveredKey`) never needed an owner; only the
     * PUBLISH does. `null` when the pointer is off every plate's marks.
     */
    const hoverOrigin = ref<string | null>(null);
    /** The pinned entity SET (a click pins; cmd-click pins more) — empty when nothing is selected. */
    const selectedKeys = ref<Set<string>>(new Set());

    /**
     * The MANUALLY-FOCUSED key (I-UX UX-S2 · the `[focus]` re-aim), or null when no explicit
     * focus is set. `focus(key)` writes it WITHOUT touching the set — focus is a re-aim WITHIN
     * the selection, the route's STORYTELLING SUBJECT, not a third selection channel. It is
     * validated against the live set on read (a stale override whose key has since left the set
     * silently falls back to the first-pin) — so it self-cleans BY CONSTRUCTION: a `select`/
     * `selectMany`/`clearSelection` that drops the focused key makes the override inert on the next
     * read, never out-living the selection that justified it. There is NO reset call inside the core
     * mutators — the membership gate IS the reset, so the select/selectMany/toggle algebra stays
     * byte-identical. Focus is MANUAL (sel-preview-card OQ-6): nothing auto-tracks it; only the
     * explicit `focus(key)` verb sets it.
     */
    const focusOverride = ref<string | null>(null);

    /** True when any pointer hover is live (drives the dim-the-rest treatment). */
    const isHovering = computed(() => hoveredKey.value !== null);
    /** True when any entity is pinned (drives the framed-selection + co-filter treatment). */
    const hasSelection = computed(() => selectedKeys.value.size > 0);
    /**
     * The PRIMARY (focused) key — the scalar bridge for the `?fips=` cross-link + single-pin
     * reads AND the I-UX focused-subject. Resolution (the re-aim law): a `focusOverride` that is
     * STILL a member of the live set WINS (the manual `[focus]` re-aim within the selection);
     * otherwise the FIRST selected key (insertion order — a plain click leaves the sole key; a
     * cmd-click sequence keeps first-pinned first). Null when the set is empty. The override is
     * gated on set-membership so a stale focus (its entity deselected) can never point at a
     * key the selection no longer holds — the override is a re-aim, never an escape from the set.
     */
    const primaryKey = computed<string | null>(() => {
        if (!selectedKeys.value.size) return null;
        const override = focusOverride.value;
        if (override !== null && selectedKeys.value.has(override)) return override;
        return selectedKeys.value.values().next().value ?? null;
    });

    // ── D1 (C.W5.3 keystone) — the hover de-storm at the ONE seam ──────────────────────
    // The flicker is six DOM/dispatch storms detonating off this single shared key strobing
    // null↔key tens of times a second as a pointer sweep crosses the inter-mark border gaps
    // (the 0.5px stroke seam between states, the transparent gutter between 2374 dots). The
    // cure is HYSTERESIS, asymmetric by interaction physics: open EAGERLY (a real hover must
    // feel instant — S3 §7 "touch is springy, sub-100ms") but close LAZILY (a <~120ms gap-
    // transit null must NOT clear the settled key). `hoverRaw` is the un-debounced pointer
    // truth; `hoveredKey` is the SETTLED public key every consumer reads UNCHANGED — so every
    // linked plate (the map card, the SCI card, the RankedStrip highlight, every future plate)
    // de-storms with zero call-site change. This is C5 §6.2 / hover-destorm-design D1, the
    // chronic specced-in-B-never-built keystone, finally built. Consumed `useDebounceFn`
    // (@vueuse, shipped) — not a hand-rolled timer (H5).
    const hoverRaw = ref<string | null>(null);
    /** ≈ the gap-transit window (reka-ui's `HoverPopover` ships 150ms; 120 is its near-floor). */
    const CLOSE_MS = 120;
    // The deferred close: fires only when no new key has arrived inside CLOSE_MS, and only when
    // the raw channel is STILL null (a re-enter during the window cancels the clear implicitly).
    // The OWNER rides the SAME hysteresis as the key — a settled (held) card keeps its owner
    // through a border-gap null, so the owning publisher can re-publish the held key without
    // being rejected by its own ownership guard (e-hovers FIX-1).
    const clearSoon = useDebounceFn(() => {
        if (hoverRaw.value === null) {
            hoveredKey.value = null;
            hoverOrigin.value = null;
        }
    }, CLOSE_MS);

    /**
     * Set (or clear, with null) the hovered key — the mouseover/mouseout channel. `origin`
     * names the viz the pointer is physically inside (the OWNER, e-hovers FIX-1): it is
     * recorded on a real enter and follows the SAME open-eager / close-lazy hysteresis as the
     * key, so it is non-null exactly while a real plate owns the live pointer. A raise-only
     * plate passes its own origin too — it owns the pointer (clearing any prior card) though it
     * publishes nothing. A linked raise (a viz lighting off another plate's `hoveredKey`) never
     * calls this, so it never becomes the owner.
     */
    function hover(key: string | null, origin: string | null = null): void {
        hoverRaw.value = key;
        // OPEN EAGERLY — a real hover lands the settled key + its owner with zero latency.
        if (key !== null) {
            hoveredKey.value = key;
            hoverOrigin.value = origin;
        }
        // CLOSE LAZILY — swallow the border-gap null; only a settled <120ms-quiet null clears
        // (the key AND its owner together — one hysteresis seam).
        else clearSoon();
    }

    /**
     * Pin a key. `additive` (cmd/ctrl-click) TOGGLES the key in the set (multi-select); a
     * plain click REPLACES the set with the one key — UNLESS it is already the sole
     * selection, in which case it CLEARS (the click-to-deselect idiom is preserved). The
     * set is copied before mutation so the ref re-assigns (reactive replace, no in-place).
     */
    function select(key: string, opts: { additive?: boolean } = {}): void {
        const next = new Set(selectedKeys.value);
        if (opts.additive) {
            if (next.has(key)) next.delete(key);
            else next.add(key);
        } else {
            const soleSame = next.size === 1 && next.has(key);
            next.clear();
            if (!soleSame) next.add(key);
        }
        selectedKeys.value = next;
    }

    /**
     * Replace the selected set wholesale — the named MARQUEE seam (S2). The rect-brush
     * writes N keys at once; `select` is single-key, and a raw `selectedKeys.value = next`
     * reach-around is the store-bypass the one-idiomatic-seam posture forbids, so the
     * marquee routes through here. An empty iterable clears the set.
     */
    function selectMany(keys: Iterable<string>): void {
        selectedKeys.value = new Set(keys);
    }

    /**
     * True when `el` is an EDITABLE field — an `<input>` / `<textarea>` / `<select>` /
     * `[contenteditable]` (the save-view name box, any drawer text field). Such an element OWNS
     * its own Escape (clear/blur); the global Esc-clears-selection must DEFER to it.
     */
    function isEditableField(el: Element | null): boolean {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
        return (el as HTMLElement).isContentEditable;
    }

    /**
     * The FIELD-SCOPE gate (interaction-walk · esc-field-scope neg-control). An Esc swallowed by a
     * focused text field must NEVER zero the page selection — the field's Esc is the field's, not
     * the page's. The naive `document.activeElement` read at clear-time is NOT enough: the filter
     * drawer's dismissable-layer consumes the SAME Escape in the CAPTURE/target phase and re-aims
     * focus to its opening trigger BEFORE the BUBBLE-phase `keydown` seams (`SelectionPreview`,
     * `PlatformShell`) run their clear — so by clear-time `activeElement` is already a BUTTON, not
     * the input (measured pre-O-D3, when the summon door was `BUTTON#mobile-filter-trigger`; the
     * O-D3 pill-kill retired that door in favor of the dock pull-out / per-plate icon, but the same
     * capture-vs-bubble focus race holds for whichever button opened the drawer). So the gate is
     * stamped in a CAPTURE-phase listener that runs FIRST, recording whether THIS Escape ORIGINATED in
     * an editable field; the flag is read by `clearSelection` during the same synchronous dispatch and
     * cleared on the next macrotask, so it never leaks into a later programmatic clear. The live
     * `activeElement` read is kept as a belt-and-suspenders fallback for a clear that fires while a
     * field is genuinely still focused.
     */
    let escFromField = false;
    if (typeof window !== "undefined") {
        window.addEventListener(
            "keydown",
            (e: KeyboardEvent) => {
                if (e.key !== "Escape") return;
                // Stamp the TRUE origin while focus is still on the field (capture runs before the
                // drawer's dismissable-layer re-aims focus to its trigger). One macrotask later the
                // bubble-phase clear seams have all run, so we drop the flag — it is scoped to exactly
                // this Escape dispatch and can never gate a later programmatic clear.
                escFromField = isEditableField(document.activeElement);
                if (escFromField) {
                    setTimeout(() => {
                        escFromField = false;
                    }, 0);
                }
            },
            true, // CAPTURE — fire before the drawer/overlay moves focus on the same Escape.
        );
    }

    /**
     * Drop the pinned selection (leaving any live hover untouched). FIELD-SCOPED: a clear that
     * arrives on an Escape that ORIGINATED in a text field (the capture-phase stamp above) — or
     * while a field is still genuinely focused — is the FIELD's Escape, not the page's, so it is a
     * NO-OP (the neg-control: Esc-in-a-drawer-input must preserve the page selection). Every
     * keyboard Esc seam (`SelectionPreview`, `PlatformShell`, `SelectionRegion`) routes the clear
     * through here, so the guard holds for all of them without a per-caller re-guard. The
     * programmatic NON-keyboard clears (a route change, a pointer map-deselect) never ride an
     * Escape and never fire while a text input is focused, so the gate is inert for them.
     */
    function clearSelection(): void {
        const liveActive =
            typeof document !== "undefined" ? document.activeElement : null;
        if (escFromField || isEditableField(liveActive)) return;
        selectedKeys.value = new Set();
    }

    /**
     * RE-AIM the focus WITHIN the live selection (I-UX UX-S2 · the `[focus]` verb). Sets the
     * manual `focusOverride` so `primaryKey` resolves to `key` — the route's STORYTELLING
     * SUBJECT — WITHOUT clearing or mutating `selectedKeys` (focus is a re-aim, not a replace:
     * the core select/selectMany/toggle algebra is byte-UNCHANGED, this is the one additive
     * verb, I5's law). The override is gated on set-membership at READ (`primaryKey`), so a
     * `focus(key)` on a key OUTSIDE the set is inert — focus re-aims among the pinned, never
     * points beyond them. Passing `null` clears the manual focus (primary falls to the first-pin).
     */
    function focus(key: string | null): void {
        focusOverride.value = key;
    }

    /** True when `key` is the hovered key OR in the selected set (the highlight test). */
    function isActive(key: string): boolean {
        return key === hoveredKey.value || selectedKeys.value.has(key);
    }
    /** True when `key` is in the selected SET (the frame test, distinct from hover-raise). */
    function isSelected(key: string): boolean {
        return selectedKeys.value.has(key);
    }

    // ── THE KIND-AWARE PROJECTIONS (I5 §2, ADDITIVE — the core stays key-agnostic) ──────────────
    //
    // The store's MECHANISM never learns the kind: `select`/`selectMany`/the toggle-replace algebra
    // above operate on opaque strings, byte-unchanged. Only these DERIVED reads parse the composite
    // `{kind}:{id}` key back, so the card/co-filter/veil consume the kind WITHOUT each re-parsing the
    // set. A legacy BARE key (a pre-codec fips) drops out of `selectedItems` via the parse guard, so
    // a stale deep-link can never mis-grain a mark.

    /**
     * The parsed selected set — every composite key resolved to `{kind, id, key}`, legacy BARE keys
     * dropped (the migration guard). The card reads this to render one stack member per item, each
     * dispatching its own `<Glyph grain>` by its own kind. Insertion order is the Set's own (pin order).
     */
    const selectedItems = computed<SelectionKey[]>(() =>
        [...selectedKeys.value]
            .map(parseSelKey)
            .filter((s): s is SelectionKey => s !== null),
    );
    /** The PARSED primary item (the first pin), or null when empty / a bare-key primary. The card's
        focused member + the veil's single-selection hue read this. */
    const primaryItem = computed<SelectionKey | null>(() =>
        primaryKey.value ? parseSelKey(primaryKey.value) : null,
    );

    /**
     * The native-kind ids one matcher reads (I5 §10 · GAP-2): a per-route co-filter folds ONLY its
     * OWN grain into `matchByKey`, so a foreign-kind key (a stale /usf `state:37` carried into /sci)
     * is INVISIBLE — it is never in `selectedIdsOf("school")`. The returned ids are the RAW grain ids
     * (the kind stripped), exactly what the route's `byKey`/membership test compares against.
     */
    function selectedIdsOf(kind: SelectionKind): Set<string> {
        const out = new Set<string>();
        for (const item of selectedItems.value) {
            if (item.kind === kind) out.add(item.id);
        }
        return out;
    }

    /**
     * The PRODUCER path — encode a `{kind}:{id}` composite key then route through the EXISTING
     * `select` (so the toggle-replace algebra + the pin auto-capture are inherited verbatim). The
     * producer edge stamps the kind here; the store still only stores + equates the resulting string.
     */
    function selectEntity(
        kind: SelectionKind,
        id: string,
        opts: { additive?: boolean } = {},
    ): void {
        select(encodeSelKey(kind, id), opts);
    }

    // ── THE NET-NEW veilHue GETTER (I5 §7c · the data-hue locus the Aurora-Veil reads) ──────────
    //
    // NET-NEW (it did NOT exist): the §I-VEIL "lit in its OWN data hue" gate resolves THROUGH here.
    //   • a single FOCUSED selection ⇒ `markColorFor(primaryKey)` — the staged datum's verdict fill
    //     off the active dashboard's live `Scale<V>` (the promoted `colorFor` registry, NOT a hex).
    //     When the registry cannot reach a live scale (a route mid-transition, a heterogeneous key)
    //     it returns null and we fall through to the route pole below.
    //   • a multi / heterogeneous selection ⇒ `var(--route-accent)` — the route's own pole (already
    //     the page aurora's pole), so a mixed-grain stack lights ONE coherent route hue, not a clash.
    //   • the EMPTY selection ⇒ `null` — UNLIT, the neutral floor (the veil `::before` is opacity:0,
    //     the rim collapses to exactly `--cp-glass-rim`; off === off).
    // The ONE getter both veil consumers read (the I5 card + the I6 drawer), so the two stages cannot
    // drift apart. The hue is a COMPLETE CSS colour string (an `rgb(...)` off the scale, or the
    // `var(--route-accent)` expression) — never a raw `--viz-*` token the consumer must re-resolve.
    const veilHue = computed<string | null>(() => {
        if (primaryKey.value) {
            const mark = markColorFor(primaryKey.value);
            if (mark !== null) return mark;
        }
        return selectedKeys.value.size ? "var(--route-accent)" : null;
    });

    // ── THE `?sel` URL BRIDGE (O-A11 · selection-drilldown §A.4) — the store OWNS `?sel` (single-writer).
    // SEED-ONCE: a deep-link `?sel=<k1>,<k2>,…` with NO live selection reconstructs the set (parse-guarded
    // — legacy-bare / foreign tokens already dropped by `useViewParams.selKeys`); a within-session select
    // is never clobbered (the seed runs only on the empty set). WRITE: every select/selectMany/clear flows
    // the set to `?sel` (flush:post so the set has settled), so the drill-down deep-link round-trips for
    // free (the panel is a pure projection of `?sel`). Browser-guarded (no `window` in the node specs).
    if (typeof window !== "undefined") {
        const view = useViewParams();
        const seed = view.selKeys.map((k) => k.key);
        if (seed.length && selectedKeys.value.size === 0) {
            selectedKeys.value = new Set(seed);
        }
        watch(selectedKeys, (set) => view.setSel(set), { flush: "post" });
    }

    return {
        hoveredKey,
        hoverOrigin,
        selectedKeys,
        isHovering,
        hasSelection,
        primaryKey,
        hover,
        select,
        selectMany,
        clearSelection,
        // I-UX UX-S2 — the additive `[focus]` re-aim (the core algebra above is byte-unchanged).
        focus,
        isActive,
        isSelected,
        // I5 §2 — the kind-aware projections (additive; the core above is byte-unchanged).
        selectedItems,
        primaryItem,
        selectedIdsOf,
        selectEntity,
        // I5 §7c — the NET-NEW data-hue locus the Aurora-Veil membrane reads.
        veilHue,
    };
});
