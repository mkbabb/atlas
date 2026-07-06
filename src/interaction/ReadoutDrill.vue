<script setup lang="ts">
// ReadoutDrill.vue — THE HOVER DRILL RUNG (I-UX.b · UX-H1.3, the #actions doctrine).
//
// The quiet `[pin] · [compare] · [focus]` action rung the PINNED/dwelt HoverCard grows so the
// rich readout stops being a DEAD END. `fb-hovers.md` FB-H6 made the pinned card
// `pointer-events:auto` for the persistence bridge but never grew an ACTION rung — the readout
// (title + facts + breakdown, "rich and well-built") was a terminal display. This is the verb the
// readout was always missing, hosted on the dwelt card the persistence bridge already keeps alive.
//
// THE THREE VERBS (the verbs-of-MOVEMENT, the same key the card is pinned under):
//   • [pin]     — the EXPLICIT pin affordance (a pin is normally implicit via select; this is the
//                 named control). Routes through `selection.select(key)` — a plain (replace) select
//                 of the card's own key, which IS the pin (the auto-capture watch seats the payload).
//                 The card is already pinned when this rung shows, so the visible state is "pinned";
//                 the control reads `aria-pressed="true"` and TOGGLES the key out on a second press
//                 (the release twin of the pin pip), the symmetric pin/unpin verb.
//   • [compare] — `selection.select(key, {additive:true})` — ADD this datum to the compare set (the
//                 multi-pin ledger). The same additive toggle the Shift-click / Shift+Enter chord
//                 routes through (the ONE multi-select seam, byte-unchanged — I5's law).
//   • [focus]   — `selection.focus(key)` — RE-AIM the route to this entity (set `primaryKey` WITHOUT
//                 mutating the set; the route's STORYTELLING SUBJECT). The additive `focus(key)` verb
//                 the I-UX.a model froze; it ALSO carries the focus into the URL via `setFocus(key)`
//                 so the focused subject travels across routes (the `?focus` through-line, UX-S3).
//
// THE GLASS BUTTON, READ-ONLY (ZERO new glass-ui ask). The three controls are the SHIPPED glass
// `Button` (the filter drawer's register — `variant`/`size`/icon-slot), consumed read-only: the
// metal border + the liquid press are I1/BB-5's, never re-rolled here. A glass RED is a scope-reveal
// to I1, not an I-UX edit.
//
// THE FENCES (DESIGN §4.0). The rung is KEYBOARD-reachable (the buttons are real `<button>`s with a
// focus ring); TOUCH-sized (the glass `size="sm"` hit area + the bottom-sheet transposition folds to
// I-MOBILE); forced-colors safe (the buttons carry text labels + a non-color glyph); and PRM-neutral
// (it is a static rung — no entrance motion of its own beyond the card's). The labels are FACTUAL
// verbs, never editorial.
import { computed } from "vue";
import { Button } from "@mkbabb/glass-ui/button";
import { Pin, GitCompareArrows, Crosshair } from "@lucide/vue";
import { useSelection } from "@/platform/stores/useSelection";
import { useViewParams } from "@/platform/stores/useViewParams";

const props = defineProps<{
    /** The composite `{kind}:{id}` selection key this card is pinned under — the verbs all act on it
        (the SAME grain `selectedKeys` holds; the key is the producer-minted Set member). */
    selectionKey: string;
}>();

const selection = useSelection();
const view = useViewParams();

// The live treatment of this card's key — drives the pressed/lit state of the rung controls. We read
// the store directly (NOT a fourth registry): `isSelected` is the pin state, `primaryKey` the focus.
const isPinned = computed(() => selection.isSelected(props.selectionKey));
const isFocused = computed(() => selection.primaryKey === props.selectionKey);

/** [pin] — the explicit pin/unpin. A plain `select` of the card's own key REPLACES the set with it
    (the pin); a second press of the now-sole key CLEARS it (the click-to-deselect idiom the core
    already owns) — the symmetric pin/release verb. When the card is one of several pins, an explicit
    pin re-asserts it as the sole selection (the "isolate this one" read). */
function onPin(): void {
    selection.select(props.selectionKey);
}

/** [compare] — ADD this datum to the compare set (the additive multi-pin, the ONE multi-select seam,
    byte-unchanged). The same toggle Shift-click / Shift+Enter route through. */
function onCompare(): void {
    selection.select(props.selectionKey, { additive: true });
}

/** [focus] — RE-AIM the route to this entity: set `primaryKey` (the additive `focus` verb, the set
    untouched) AND carry it into the URL (`?focus`) so the focused subject travels across routes. */
function onFocus(): void {
    selection.focus(props.selectionKey);
    view.setFocus(props.selectionKey);
}
</script>

<template>
    <!-- THE #actions DOCTRINE (ChartFrame's rung idiom) — a horizontal row of the three quiet glass
         verbs, mounted ONLY on the pinned card (the HoverCard gate; the transient cursor-chase card
         omits it — an action rung on a moving card is unhittable). The whole rung is the readout's
         drill: pin (isolate) · compare (add) · focus (re-aim). -->
    <div class="readout-drill" data-testid="readout-drill" role="group" aria-label="Drill actions">
        <Button
            variant="glass-wash"
            size="sm"
            type="button"
            class="readout-drill__verb"
            :class="{ 'readout-drill__verb--on': isPinned }"
            :aria-pressed="isPinned"
            data-testid="readout-drill-pin"
            title="Pin this entity (isolate the selection)"
            @click="onPin"
        >
            <Pin class="readout-drill__glyph" aria-hidden="true" />
            <span class="readout-drill__label">Pin</span>
        </Button>
        <Button
            variant="glass-wash"
            size="sm"
            type="button"
            class="readout-drill__verb"
            data-testid="readout-drill-compare"
            title="Compare — add this entity to the selection"
            @click="onCompare"
        >
            <GitCompareArrows class="readout-drill__glyph" aria-hidden="true" />
            <span class="readout-drill__label">Compare</span>
        </Button>
        <Button
            variant="glass-wash"
            size="sm"
            type="button"
            class="readout-drill__verb"
            :class="{ 'readout-drill__verb--on': isFocused }"
            :aria-pressed="isFocused"
            data-testid="readout-drill-focus"
            title="Focus — re-aim the route to this entity"
            @click="onFocus"
        >
            <Crosshair class="readout-drill__glyph" aria-hidden="true" />
            <span class="readout-drill__label">Focus</span>
        </Button>
    </div>
</template>

<style scoped>
/* THE DRILL RUNG — a quiet horizontal row of the three verbs at the foot of the pinned card. It
   reads as the readout's #actions doctrine (ChartFrame's control rung), separated from the facts
   above by a hairline, so the verbs are clearly the card's ACTIONS, not more data. The glass
   `Button` owns each control's surface; this only sequences + sizes the row. */
.readout-drill {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-block-start: 0.55rem;
    padding-block-start: 0.5rem;
    border-block-start: 1px solid
        color-mix(in oklab, var(--foreground), transparent 88%);
}

/* the per-verb glass button — compact, glyph + label, the recessive-at-rest register that lifts on
   hover/focus (the glass Button carries the lift; this tunes the gap + the on-state tint). */
.readout-drill__verb {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.02em;
}
.readout-drill__glyph {
    inline-size: 0.85rem;
    block-size: 0.85rem;
}
.readout-drill__label {
    line-height: 1;
}

/* THE ON-STATE — a verb whose state is currently TRUE (pinned / focused) wears a quiet accent wash
   + the focus pole, so the rung reflects the live selection back (the pin reads "pinned", the focus
   reads "aimed here"). The focus verb's on-state pulls the GILT pole (the one-gilt focus tier). */
.readout-drill__verb--on {
    color: var(--foreground);
    background: color-mix(in oklab, var(--accent, var(--ring)) 16%, transparent);
}
.readout-drill__verb[data-testid="readout-drill-focus"].readout-drill__verb--on {
    background: color-mix(
        in oklab,
        var(--sel-primary-ring, #b8860b) 16%,
        transparent
    );
    box-shadow: inset 0 0 0 1px
        color-mix(in oklab, var(--sel-primary-ring, #b8860b) 46%, transparent);
}

/* ── FORCED-COLORS (DESIGN §4.0 TENET-5) — the on-state carries a NON-COLOR channel: under a forced
   palette `color-mix` washes flatten, so the pressed verb falls back to a system border so "which
   verb is active" survives the high-contrast remap (the glyph + label already carry the verb). ── */
@media (forced-colors: active) {
    .readout-drill__verb--on {
        outline: 2px solid SelectedItem;
        outline-offset: -2px;
    }
}
</style>
