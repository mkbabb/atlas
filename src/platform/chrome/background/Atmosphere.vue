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
// THE GRAIN — consume the primitive AND the library's CALIBRATED floor (D2.d / M5).
// <PaperBackdrop> is glass-ui's feTurbulence multiply grain (flipping to soft-light on .dark).
// The PRIOR build pinned `:opacity="0.025"` — the measured-dead floor (fd-usf-gallery §F: grain
// at 0.025 reads as NOTHING, "felt as nothing"). glass-ui 3.10.0 CALIBRATED the felt floor —
// paper.css advertises `opacity: var(--glass-grain-opacity, 0.038)` (the midpoint between the
// dead 0.025 and the ~0.05 kitsch line) and tokens.css carries a felt DARK value (0.045, for
// the soft-light blend). BUT the library's canonical light token (`tokens.css:
// --glass-grain-opacity: 0.025`) was NOT lifted off 0.025 — so a no-prop mount STILL reads the
// dead 0.025 in light (the 0.038 paper.css value is only a FALLBACK the always-set token
// shadows). So the consumer dial is an EXPLICIT, theme-aware `:opacity` that lands the library's
// OWN calibrated numbers: 0.038 light (paper.css's felt floor; ≤ the 0.04 PRM/PRT test cap) /
// 0.045 dark (tokens.css's felt dark companion — soft-light absorbs more). This is consuming
// the library's stated calibration through its documented prop, NOT overriding a correct value
// (the gap is the un-lifted canonical light token — a recorded 3.10.0 caveat).
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

// The theme-aware grain floor — the library's OWN calibrated felt numbers (D2.d/M5): 0.038
// light (paper.css's lifted floor; ≤ the 0.04 PRM/PRT test cap), 0.045 dark (tokens.css's
// felt soft-light companion). Tracks .dark live via useThemeKey (the MutationObserver signal),
// so the floor flips with the theme. NOT the dead canonical-light 0.025 the no-prop mount reads.
const themeKey = useThemeKey();
const grainOpacity = computed(() => {
    void themeKey.value; // establish the dependency — re-derive on a theme flip
    const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
    return isDark ? 0.045 : 0.038;
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
