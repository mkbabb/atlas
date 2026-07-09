<script setup lang="ts">
// platform/charts/ReadoutSheet.vue — THE PLATFORM MOBILE BOTTOM-SHEET readout (I-MOBILE §V ·
// the reach-idiom · J-MOBILE §5 the detent re-seat). The phone has NO hover: a TAP on a chart
// mark must summon a readout that does NOT seat under the thumb. On the desktop pointer register
// the readout rides the platform HoverCard (the cursor-chasing card); HoverCard's old mobile path
// was a RIGHT-MARGIN PEEK — the fork J-MOBILE forbids (§3, the placement fork removed). This sheet
// is its replacement: the ONE platform readout surface for the coarse-pointer phone register.
//
// J-MOBILE §5 — THE DETENT RE-SEAT (B6 defect 6). The shipped sheet WAS a hand-rolled Teleport +
// scrim + `role="dialog"` aria-modal with a STATIC `.readout-sheet__handle` (aria-hidden decoration
// only) — no snap-point detent ladder, so it read as a MODAL DIALOG, not a native bottom sheet.
// It now re-seats onto the glass `Drawer direction="bottom"` with `snapPoints:[0.12,0.5,1]`
// (peek/half/full) — draggable to a half-detent + fling-dismissible, the grab handle a REAL drag
// affordance. The glass `Drawer` (reka substrate) owns the portal, the focus management (trap +
// restore), the scrim, and the dismiss (Escape + backdrop); the house `useDrawerSnap` engine owns
// the detent math. So the hand-rolled scrim/ghost-click dedup + the hand-rolled focus contract +
// the hand-rolled keydown are DELETED — the primitive owns them. This is glass-INDEPENDENT
// (consume-now on the PINNED 4.0.1 — `Drawer.vue.d.ts` `snapPoints`/`direction`, no BC publish).
//
// THE TRANSPOSITION (D1.2 · mirroring HoverCard). Like HoverCard, this reads the ONE
// `useHoverReadout` platform store directly — NO props for the data. The pointer/tap-owning viz
// PUBLISHES its HoverReadout; HoverCard renders it on the desktop pointer path, this sheet renders
// it on the coarse-pointer phone register. The two surfaces are mutually exclusive by media: the
// sheet paints ONLY when the tap register is active AND a settled readout is live; HoverCard
// suppresses its transient card on that same register, so a tap raises exactly ONE sheet.
//
// THE FACTS are the SAME projection HoverCard reads (the live `store.readout`'s `facts` / `title` /
// `eyebrow` / `subhead` / `accent`), so the touch readout and the pointer readout can NEVER drift —
// one payload, two surfaces. The eyebrow accent + the per-fact accent dot render EXACTLY as
// SpeedtestReadoutSheet does (the shared sheet idiom, re-used not re-invented).
import { computed } from "vue";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
    DrawerDescription,
} from "@mkbabb/glass-ui/drawer";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { useHoverReadout } from "@/platform/stores/useHoverReadout";
import { useMobileRegister } from "@/platform/composables/useMobileRegister";

// The ONE platform readout store — the sheet renders its live transient `readout` (the SAME payload
// the desktop HoverCard reads). There are no payload props (D1.2 — the store IS the seam).
const store = useHoverReadout();
const reduced = useReducedMotion();

// ── THE COARSE-POINTER PHONE REGISTER (the tap register) — the DRY register (J-MOBILE arm-a's
// `useMobileRegister`, reading `MQ.phone` + `MQ.touch` off the single 767.98 home), so the sheet
// and the suppressed HoverCard peek toggle in lockstep: the sheet OWNS the mobile readout precisely
// where HoverCard stops painting its transient card. The desktop pointer path never sees this
// surface (the sheet is gated false off this media). NO bare breakpoint literal — the register is
// the single-sourced `MQ`/`useMobileRegister` seam (C8).
const { isPhone, isTouch } = useMobileRegister();
const tapRegister = computed(() => isPhone.value && isTouch.value);

// ── THE PIN-FIRST READOUT (I-MOBILE reach-idiom · the cross-talk-immune channel) ──────────────
// A coarse TAP publishes a TRANSIENT readout that the linked-plate hover cascade STEALS one tick
// later (the scatters mirror `hoveredLea` and flip hover-ownership, clearing the owner-gated
// transient — the sheet would flicker shut). The PIN tier survives that cascade: the store's
// selection-driven auto-capture snapshots the tapped datum's transient into `pinnedReadouts` the
// same tick the key enters `selectedKeys`, and a pinned readout is held by the SELECTION channel,
// not the pointer — the cascade cannot steal it. So the sheet reads the LATEST PINNED readout
// (`pinned.at(-1)`) when present, FALLING BACK to the transient (the fallback-first H-ROOT-1
// posture: the desktop-published transient still seats the sheet where no pin exists). Either way
// the Anchor|null contract holds — a payload with a null (unmeasured) anchor never seats the sheet.
const readout = computed(() => {
    const latestPin = store.pinned.at(-1) ?? null;
    if (latestPin && latestPin.anchor !== null) return latestPin;
    const r = store.readout;
    if (!r || r.anchor === null) return null;
    return r;
});

// ── THE OPEN MODEL — the Drawer's `v-model:open`. The sheet is OPEN when the tap register is
// active AND a settled readout (a persistent PIN or a live transient) is present; the pin keeps it
// open through the cascade that steals the transient. The SETTER routes a close request (a fling
// dismiss, a backdrop tap, Escape — all delivered by the glass Drawer / reka) through the store's
// origin-agnostic `clearAll()` (the platform dismiss seam — it blanks the transient readout the
// same way a route change does), so the open state stays DERIVED from the store, never a second
// source of truth. A spurious `open=true` (no live readout) is ignored — the readout drives it.
const open = computed<boolean>({
    get: () => tapRegister.value && readout.value !== null,
    set: (v) => {
        if (!v) store.clearAll();
    },
});

// THE DETENT LADDER (J-MOBILE §5) — peek / half / full, the house `useDrawerSnap` default for a
// bottom drawer, passed explicitly so the readout opens at the comfortable arm's-length peek and
// can be dragged up to half/full or flung away.
const snapPoints: number[] = [0.12, 0.5, 1];
</script>

<template>
    <!-- THE GLASS BOTTOM-SHEET (J-MOBILE §5) — the platform readout re-seated onto the glass
         `Drawer direction="bottom"` with the peek/half/full detent ladder. reka owns the portal +
         the focus trap/restore + the dismiss (Escape + backdrop); the house snap engine owns the
         detent drag + fling. The default `modal` mode keeps the iOS scale-down + scrim (the readout
         IS a deliberate detail surface). PRM → the Drawer's own reduced-motion handling; the
         `--still` class on the body retires any residual content transition. -->
    <Drawer
        v-model:open="open"
        direction="bottom"
        :snap-points="snapPoints"
    >
        <DrawerContent
            class="readout-sheet"
            :class="{ 'readout-sheet--still': reduced }"
            aria-labelledby="readout-sheet-title"
            data-testid="readout-sheet"
        >
            <!-- O-D3/CH-E-2 SEAM (glass-fenced, carried to WG-E·O-E8): reka's DialogPortal drops
                 this `aria-labelledby` on teleport, so the sheet is at risk of reaching the SR
                 unnamed — the fix is the O-E8 reka dialog-name wrapper (queued behind the 5.0.0
                 cut); this file adopts it once O-E8 lands, unchanged until then. -->
            <template v-if="readout">
                <DrawerTitle
                    id="readout-sheet-title"
                    class="text-panel-title readout-sheet__title"
                >
                    {{ readout.title }}
                </DrawerTitle>
                <DrawerDescription class="sr-only">
                    Tapped-datum readout detail.
                </DrawerDescription>

                <!-- THE TWO-TIER HEAD — the eyebrow (the verdict / kind lede, tinted by the card-
                     level accent), the title (above, the DrawerTitle), the subhead (the plate's
                     context). The SAME head grammar as the desktop HoverCard. -->
                <p
                    v-if="readout.eyebrow"
                    class="eyebrow readout-sheet__eyebrow"
                    :class="{ 'readout-sheet__eyebrow--ink': readout.accent }"
                    :style="readout.accent ? { '--readout-accent': readout.accent } : undefined"
                >
                    {{ readout.eyebrow }}
                </p>
                <p v-if="readout.subhead" class="readout-sheet__subhead">
                    {{ readout.subhead }}
                </p>

                <!-- THE FACTS GRID — the SAME rows the hover card reads, the per-fact accent dot on
                     the accented row. One payload, two surfaces (the touch + the pointer detail). -->
                <dl class="readout-sheet__facts">
                    <template v-for="f in readout.facts" :key="f.label">
                        <dt class="text-caption">{{ f.label }}</dt>
                        <dd class="readout-sheet__value">
                            <span
                                v-if="f.accent"
                                class="readout-sheet__dot"
                                :style="{ background: f.accent }"
                                aria-hidden="true"
                            />
                            <span>{{ f.value }}</span>
                        </dd>
                    </template>
                </dl>
            </template>
        </DrawerContent>
    </Drawer>
</template>

<style scoped>
/* THE BOTTOM-SHEET BODY — the glass `DrawerContent` provides the surface + the real drag handle +
   the detent ladder; this rules ONLY the readout content lockup + the consumer-owned safe-area
   floor. The two-tier head grammar + the facts grid mirror SpeedtestReadoutSheet (one sheet idiom).
   J-MOBILE §approach-5 — the CONSUMER owns the iOS home-indicator inset: `--safe-foot`
   (arm-a's single safe-area `max()` token, retiring the per-surface env() re-derivations) is
   applied here, NOT pushed up as a glass-ui Drawer prop. It degrades to a bare env() floor until
   the token lands (J-FEEDBACK-4 §8 — zero net-new abstract-up). */
.readout-sheet {
    padding-block-end: var(--safe-foot, env(safe-area-inset-bottom, 0px));
}
.readout-sheet--still {
    /* PRM — the body content arrives without a residual transition (information parity). */
    transition: none;
}

.readout-sheet__title {
    margin: 0;
}
.readout-sheet__eyebrow {
    margin: 0 0 0.15rem;
}
/* O-C7 D5 — the readout eyebrow tints to the hovered datum's fill as a READABLE INK (hue kept, L
   clamped per theme); the raw fill rides --readout-accent as a non-text carrier. Same cure as the
   desktop HoverCard. */
.readout-sheet__eyebrow--ink {
    color: light-dark(
        oklch(from var(--readout-accent) min(l, 0.52) min(c, 0.17) h),
        oklch(from var(--readout-accent) max(l, 0.75) min(c, 0.15) h)
    );
}
.readout-sheet__subhead {
    margin: 0.05rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.01em;
    line-height: 1.25;
    color: var(--muted-foreground);
}

/* THE FACTS GRID — label / value rows, the value right-aligned, the per-fact accent dot. */
.readout-sheet__facts {
    margin: 1rem 0 0;
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 1rem;
    row-gap: 0.4rem;
    align-items: baseline;
}
.readout-sheet__value {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.4rem;
    font-variant-numeric: tabular-nums;
    text-align: end;
}
.readout-sheet__dot {
    inline-size: 0.5rem;
    block-size: 0.5rem;
    border-radius: var(--radius-pill, 9999px);
    flex: none;
}

/* ── THE NARROW LEGIBILITY FLOOR — the readout stays legible at arm's length on the phone: the
   title floors at 15px, the values at 14px, the labels at 12px. The `--narrow` register is the
   arm-a `@custom-media` seam (the single 430 home; no bare literal). */
@media (--narrow) {
    .readout-sheet__title {
        font-size: max(15px, var(--type-panel-title, 1rem));
    }
    .readout-sheet__value {
        font-size: max(14px, 0.9375rem);
    }
    .readout-sheet__eyebrow,
    .readout-sheet__subhead,
    .readout-sheet__facts .text-caption {
        font-size: max(12px, 0.75rem);
    }
}
</style>
