<script setup lang="ts">
// Atmosphere — the ONE chrome arbiter (C.W6.a Scope 1; fd-atmosphere-suffusion §2 AS-5,
// atmosphere-aesthetic P1·4 AA-7, FD1 §8.4 — REVISED on data surfaces by Decision 2,
// I-PATH §8.3 / I8). It reads the active surface KIND and composites an ADDITIVE atmosphere
// stack beneath the content: the aurora is the universal data-surface field, the printed-
// paper grain composites OVER it, and the constellation is a BRAND-surface field only.
//
// THE DOCTRINE — REVISED (FD1 §8.4 superseded on data, Decision 2 / I-PATH §8.3; I8 ·
// fb-backgrounds §1.4/§3 P1·FOLD-A). The H-arc law was "never both" — Aurora behind DATA
// XOR Constellation behind BRAND, a one-of-two field switch. I1 overturned it: the user
// asked for the background to be a COMBINATION of aurora + paper grain, in both themes, on
// every data route. So the field is no longer one-of-two. The revised law:
//   · the AURORA is the UNIVERSAL data-surface field (always present on `kind="data"`),
//   · the GRAIN composites OVER it (the multiply/soft-light bites the aurora's colour),
//   · the CONSTELLATION is a BRAND-surface field ONLY (the gallery `kind="brand"` masthead,
//     veiled by I6) — it RETIRES on data surfaces entirely (Decision 2; the constellation
//     does NOT stay as a brand anomaly over the combined data field).
// The doctrine is NOT retired wholesale — it still governs the brand surface (constellation
// behind brand). Only the data-surface "aurora XOR constellation / never both" clause is
// superseded, and only on data. This is recorded, not silently reverted — the supersession
// is signed in the wave commit body naming Decision 2.
//
// THE Z-LADDER — RE-ORDERED (the load-bearing fix; fb-backgrounds §1.4 / R2). The field
// (aurora) seats at z:-2, the grain at z:-1, the content at z:0+. The grain is ALWAYS on,
// on EVERY surface (it is the printed-paper tooth) — but it now sits ABOVE the field, so
// its multiply (light) / soft-light (dark) blend has the aurora's pigment BEHIND it to bite
// into ("grain over a felt aurora", the premium tooth I1 reaches for). The prior order
// (grain z:-2 BELOW field z:-1) made the two layers mutually invisible — the grain
// multiplied against flat paper, never the field. The optional E8 plate-grid (z:-3) is
// SCOPED to ChartFrame (C6b/C6c), never page-wide — it is not mounted here.
//
// THE GRAIN — consume the primitive via an EXPLICIT, theme-aware `:opacity` (D2.d / M5, REVISED
// O-DIR-4 ARM 2). <PaperBackdrop> is glass-ui's feTurbulence multiply grain (flipping to
// soft-light on .dark). Two prior floors were tried and both proved wrong at THIS mount (a
// page-wide, full-bleed field): 0.025 measured DEAD ("felt as nothing", fd-usf-gallery §F);
// 0.038 light / 0.045 dark (glass-ui 3.10.0's "calibrated felt floor", a per-plate-overlay
// number) measured the OPPOSITE fault live-pixel-tested against the owner's O-DIR-4 complaint —
// it carried ~100% of a "far too strong… TV-static" page-wide texture (see the grainOpacity
// computed below for the current, live-tested values + the full before/after account). Consuming
// a library-advertised number is not a substitute for testing the actual composited result at
// the mount's own scale — the same primitive reads very differently full-bleed vs. per-plate.
//
// THE FIELDS. <Aurora> is the platform's thin glass-ui consumer (it keeps the oklab
// pole-derivation + the f(p) Tide) — the UNIVERSAL data-surface field (always on data).
// <Constellation> is glass-ui's recessive brand lattice; the gallery's ONE pinned NCSU-red
// anomaly (the drawOverlay skin) + the reproducible seed are C.W6.b's Constellation.host —
// the arbiter lands it ONLY on the brand surface (`kind="brand"`). Decision 2 retires it on
// data surfaces: a data surface is aurora+grain alone (cleaner, fewer layers; the arbiter
// doing LESS, arch T5). I6 (NOT this wave) wraps the surviving brand mount in the glass veil.
//
// THE FIELD, LEVERAGED (D2.d / ds2-motion-field M10). The constellation ran arbitrary
// (count 64) and INERT (wander off) — measured sub-perceptual (visibleFrac ≈0.007 at rest,
// 0 under PRM; fd-usf-gallery §F). Two shipped-but-unconsumed registers are opted in HERE,
// at the brand mount: (1) the count is seeded to a CIVIC SCALAR — 100, the NC counties (the
// canonical platform geography, geometry.ts) — so the field's DENSITY is the dataset's
// density (a resonance, never a chart: aria-hidden, no live value); a denser lattice also
// lifts the visible-particle floor off ≈0. (2) `wander` IGNITES — the shipped 8–16s auto-
// re-point cadence (the slides rhythm) so the lattice slowly breathes at rest (the "felt
// depth" a premium paper has, M10), PRM-gated UPSTREAM (the cadence lives inside the
// substrate's `!reducedMotion` step block — under reduce it never advances). The recessive
// `--constellation-alpha` master stays the library default (D6's ROOT job, ≤0.9 test cap) —
// NOT consumer-overridden here.
import { computed } from "vue";
import { PaperBackdrop } from "@mkbabb/glass-ui/paper-backdrop";
import Aurora from "@/platform/chrome/background/Aurora.vue";
import { useThemeKey } from "@/platform/composables/useThemeKey";
// The brand field IS C.W6.b's seeded Constellation.host (the reproducible seed + the ONE
// NCSU-red anomaly node — the emergent-tricolor red leg), NOT a bare glass-ui <Constellation>.
// The arbiter owns the SINGLE brand field so "one field per surface" holds (the gallery mounts
// only <Atmosphere kind="brand">, never a second constellation canvas).
import ConstellationHost from "@/platform/chrome/background/Constellation.host.vue";

/** The civic scalar the brand constellation seeds its density to — NC's 100 counties (the
    canonical platform geography, geometry.ts). The lattice's node count ECHOES the dataset's
    density (a resonance, NOT a chart — aria-hidden, no live value); it also lifts the
    visible-particle floor off the arbitrary-64 sub-perceptual rest (D2.d / M10). */
const NC_COUNTIES = 100;

// THE GRAIN — REBALANCED (O-DIR-4 ARM 2). The library's own "felt floor" numbers (0.038 light /
// 0.045 dark, D2.d/M5) were live-pixel-tested against the owner's exact complaint ("the paper
// effect is far too strong on every page") and measured FAR from subtle: hiding the grain layer
// alone (`.atmosphere__grain { display: none }`) erased the entire visible mottled texture on
// /ecf both themes — the grain was carrying ~100% of the "TV-static paper" the owner flagged, at
// its documented "calibrated" value. `--paper-grain-tooth`'s per-channel contrast-stretch
// (glass-ui paper.css: slope 1.8 / intercept -0.4, "the letterpress bite") makes this SVG texture
// read far louder per unit of CSS opacity than a soft blurred noise would — the felt floor for a
// full-bleed page-wide mount sits well below the felt floor for a small per-plate overlay. Dialed
// DOWN to a live-pixel-confirmed subtle register: 0.025 light (was 0.038) / 0.03 dark (was 0.045)
// — captured before/after in exec/evidence/O-DIR-4/impl/EVIDENCE.md. This deliberately reads
// BELOW the directive's own stated "≥0.08 floor" language: that number is not reachable at this
// opacity without reintroducing the exact defect being killed (0.045 already dominates); the
// owner's live eye — not the pre-stated number — is the bar (per the wave's own verifier note).
// Tracks .dark live via useThemeKey (the MutationObserver signal), so the floor flips with theme.
const themeKey = useThemeKey();
const grainOpacity = computed(() => {
    void themeKey.value; // establish the dependency — re-derive on a theme flip
    const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
    return isDark ? 0.03 : 0.025;
});

/** The surface kind — read off the route context by the mounting view, NOT hand-wired per
    field. `data` → the three dashboards (USF/SCI/ECF) · `brand` → the gallery/about. */
type SurfaceKind = "data" | "brand";

withDefaults(
    defineProps<{
        kind?: SurfaceKind;
    }>(),
    { kind: "data" },
);
</script>

<template>
    <!-- The arbiter wrapper — fixed to the viewport behind the content, inert to pointers.
         It seats the ADDITIVE atmosphere stack (field z:-2, grain z:-1 ABOVE it); the
         content track (--z-content) floats above. -->
    <div class="atmosphere" aria-hidden="true" data-testid="atmosphere">
        <!-- z:-2 — the FIELD, beneath the grain. On data it is the UNIVERSAL aurora
             (always present, no longer one-of-two); on brand it is the constellation
             (the gallery masthead, veiled by I6). Decision 2: the data branch mounts NO
             constellation. -->
        <Aurora v-if="kind === 'data'" class="atmosphere__field" />
        <ConstellationHost
            v-else-if="kind === 'brand'"
            seed="usf-atlas-cover"
            :count="NC_COUNTIES"
            class="atmosphere__field"
        />

        <!-- z:-1 — the printed-paper tooth, ALWAYS present, on EVERY surface, ABOVE the
             field (the re-order, fb-backgrounds §1.4 / R2): the multiply (light) /
             soft-light (dark) blend now composites against the aurora's colour, not flat
             paper. The :opacity is the library's CALIBRATED felt floor (0.038 light /
             0.045 dark; D2.d/M5) — the un-lifted canonical light token would otherwise pin
             it to the dead, "felt-as-nothing" 0.025 (fd-usf-gallery §F). -->
        <PaperBackdrop :opacity="grainOpacity" class="atmosphere__grain" />
    </div>
</template>

<style scoped>
/* The arbiter — fixed to the viewport, inert. The grain + field are positioned children
   on the two deepest rungs; everything sits below the content track. */
.atmosphere {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

/* z:-2 — the field, BENEATH the grain (Aurora is itself fixed/full-bleed; Constellation
   fills the box). The grain re-orders ABOVE it (fb-backgrounds §1.4 / R2) so the grain's
   multiply/soft-light bites the field's colour. The Aurora wrapper carries its own fixed
   z (--z-content − 1) from its scoped style; this class pins both fields to the field rung
   within the .atmosphere stacking context — !important wins the scoped-style tie so the
   field sits below the grain, not at --z-content−1 (which would float above z:-1). */
.atmosphere__field {
    position: absolute;
    inset: 0;
    z-index: -2 !important;
    pointer-events: none;
}

/* z:-1 — the grain ABOVE the field, at the rung where its blend has the aurora's pigment
   to multiply against. */
.atmosphere__grain {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
}
</style>
