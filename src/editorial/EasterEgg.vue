<script setup lang="ts">
// platform/editorial/EasterEgg.vue — ④ the earned MARGIN discovery (the in-flow easter egg). F3a
// / design-interstitial-system §3.4 + §7 · f6-hero-interstitials §2.B-④.
//
// THE ARCHITECTURE: a small marker glyph that, on the documented deterministic interaction (the
// F6.10 grammar — hover / focus + Enter/Space + shift-click pin), reveals a hover-triggered
// glass-ui `Popover` carrying the discovered detail. It is NEVER load-visible — the
// reward is the INTERACTION (DESIGN §7: the hand reaches words; this is a word-aside, lawful). It
// is the ONE in-flow easter-egg surface; the two app-level eggs (§7 below) are SEPARATE and
// signed in/out per the deft-not-garish law.
//
// THE THREE CONCRETE EGGS THE LANE DESIGNS (design-interstitial-system §7 — 2–3 concrete eggs):
//   1. THIS component, the in-flow HOVER-REVEAL annotation (the core, ships by default, ≤1/route).
//      Per route (f6-hero §2.D): USF — the single net-RECEIVER state (the inverse of the payer
//      thesis) on dwell; SCI — the one PSU still on the 100 Mbps floor; ECF — the consultant
//      "whale" (most brokered). Lawful, in the a11y tree, keyboard-reachable.
//   2. THE KONAMI-CLASS KEY (an app-level composable `useDelightKey`, NOT this component) — a
//      documented key chord that, once, lights the <FigureInitial> series in a one-pass spectral
//      wipe (the band-cake spectrum) — a colophon wink, not a data change; rides the existing
//      `CompletionSeal`-class one-pass-then-recede pattern. PRM: snaps. CANDIDATE — user signs
//      IN/OUT (R-EGGS-3). Lives in `platform/editorial/useDelightKey.ts` if signed in — NOT built
//      this lane (the in-flow egg is core; the app-level eggs are the assembly lane's, gated).
//   3. THE DATE-AWARE TELL (an app-level computed in SiteColophon, NOT this component) — on the
//      program's signature dates (the ECF "as of May 27, 2022" extract date; the SCI publish
//      anniversary) the colophon crest carries a one-line dateful aside. The most restrained egg.
//      CANDIDATE — user signs IN/OUT. (SiteColophon is outside this lane's write-bound — SPEC'd in
//      the lane's blockers, not built here.)
//
// THE RUNG — ④ chrome (the margin aside): EasterEgg binds --attn-chrome (0.46). The glyph is Fira
// (the figures/chips face); the revealed detail wears the hover-card register (the platform's ONE
// card). ≤1 per route (the §pop-budget fence — scarcity makes it a FIND, not a feature; the
// manifest gate enforces it). Mints no hue.
//
// GLASS / PAPER: the resting glyph is paper-bound (a margin mark); the REVEAL is the Popover
// glass (a popover IS floating chrome — lawful glass). PRM: the popover snaps open (no spring);
// the resting page stays calm regardless.
//
// a11y — the deterministic grammar (the F6.10 coupling): the marker is a `<button>` (focusable —
// the keyboard discovery path) with `label` as its accessible name; the `Popover` is
// aria-associated (the library's wiring). The marker is Tab-reachable; hover/focus opens the
// reveal; Enter/Space + shift-click PIN it open (the F6.10 shift-click-persists contract). The
// reveal is reachable by keyboard ALONE — the egg is not pointer-gated (an a11y win).
import { computed, ref } from "vue";
import { Popover, PopoverContent, PopoverTrigger } from "@mkbabb/glass-ui/popover";

const props = withDefaults(
    defineProps<{
        /** The resting marker glyph — "†" | a Roman numeral | a Lucide name. Default "†". */
        glyph?: string;
        /** The accessible name of the discovery affordance (the button's aria-label). */
        label: string;
        /** The discovered detail (the record-holder name, the wink) — rendered in the popover. */
        reveal: string;
        /** The interaction grammar (the F6.10 deterministic contract). `both` (default) — the
            reveal opens on hover (the Popover cadence) AND on keyboard focus (the
            non-pointer-gated discovery path). `hover` — pointer dwell only (the popover's native
            arm). `focus` — keyboard focus only (a pure-keyboard egg). */
        trigger?: "hover" | "focus" | "both";
    }>(),
    { glyph: "†", trigger: "both" },
);

// THE PIN (the F6.10 shift-click-persists contract). Enter/Space or shift-click latches the reveal
// OPEN (the deterministic "discovery" rung); a second press un-pins. Hover opens it transiently
// (the Popover's own cadence); FOCUS opens it transiently too when `trigger` admits the focus
// path (the egg is reachable by keyboard ALONE — never pointer-gated). The pin makes the find STICK
// so the reader can read it.
const pinned = ref(false);
const focused = ref(false);

/** Whether the keyboard-focus path opens the reveal (the non-pointer-gated discovery arm). */
const focusOpens = computed(() => props.trigger === "focus" || props.trigger === "both");

/** The popover's open state: pinned (latched) OR transiently focus-open. `undefined` hands control
    back to the Popover's own hover cadence (the `hover`/`both` pointer arm) — never forced
    closed, so the native hover open is unaffected. */
const open = computed<boolean | undefined>(() =>
    pinned.value || (focusOpens.value && focused.value) ? true : undefined,
);

function togglePin(e: MouseEvent | KeyboardEvent): void {
    // shift-click pins (the F6.10 grammar); a plain Enter/Space also pins (keyboard discovery).
    if (e instanceof MouseEvent && !e.shiftKey) return; // a plain click does not pin (hover does)
    pinned.value = !pinned.value;
}
function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pinned.value = !pinned.value;
    }
}
</script>

<template>
    <!-- The earned discovery — a focusable <button> marker, NEVER load-visible content. It binds
         --attn-chrome (the margin rung). On hover/focus the Popover opens; Enter/Space +
         shift-click PIN it (the F6.10 grammar). The reveal detail lives ONLY in the popover — the
         resting flow carries the glyph alone (the reward is the interaction). -->
    <span class="easter-egg" data-attn="chrome" data-testid="easter-egg">
        <Popover
            trigger="hover"
            :open="open"
        >
            <PopoverTrigger as-child>
                <button
                    type="button"
                    class="easter-egg__marker"
                    :aria-label="label"
                    :aria-pressed="pinned"
                    :data-pinned="pinned ? '' : undefined"
                    @click="togglePin"
                    @keydown="onKeydown"
                    @focus="focused = true"
                    @blur="focused = false"
                >
                    <span class="easter-egg__glyph" aria-hidden="true">{{ glyph }}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="center"
                role="card"
                :aria-label="label"
            >
                {{ reveal }}
            </PopoverContent>
        </Popover>
    </span>
</template>

<style scoped>
/* THE MARGIN MARK — a quiet Fira glyph the reader DISCOVERS (never load-loud). The rung ④ chrome
   recession rides the host (the SUFFUSION contract). The resting glyph is paper-bound; the reveal
   is the Popover glass (lawful floating chrome). */
.easter-egg {
    display: inline-flex;
    /* the rung ④ chrome recession — the margin aside recedes (the inversion law). */
    opacity: var(--attn-chrome);
}
.easter-egg__marker {
    /* a ≥44px touch target from a compact glyph (WCAG 2.5.5 — the 2.75rem box IS the
       hit area; the F5 mobile-legibility G2 probe measured the old 1.5rem+0.2rem at
       24×28px, under the floor its own comment claimed). The visual glyph stays small;
       the box, not the ink, carries the target. */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.2rem;
    color: var(--muted-foreground);
    background: transparent;
    border: 0;
    border-radius: var(--radius, 6px);
    cursor: pointer;
    font-family: var(--font-mono);
    line-height: 1;
}
.easter-egg__marker:hover,
.easter-egg__marker:focus-visible {
    color: var(--foreground);
}
.easter-egg__marker:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}
/* The pinned state — a quiet tell the find is latched open (the F6.10 persist). */
.easter-egg__marker[data-pinned] {
    color: var(--foreground);
}
.easter-egg__glyph {
    font-size: 0.85em;
}
</style>
