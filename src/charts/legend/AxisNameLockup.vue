<script setup lang="ts">
// platform/charts/AxisNameLockup.vue — THE STYLED AXIS-NAME LOCKUP (F6.9 ·
// f6-viz-text-rich §2.2b). The DOM-over-canvas axis title that replaces the flat
// `name: "Contributions ($)"` raster string ECharts paints as one muted run at 12px.
//
// THE TYPESET TRANSFORM. The flat axis name carried the measure + its unit + (sometimes) a
// scale word as ONE undifferentiated run. The lockup splits it into a typeset two-part run:
//   · the MEASURE — Newsreader small-caps prose (`Net retention`, `Contributions`, the
//     content-name register, DESIGN §6's three-face law: a NAME is prose).
//   · the UNIT — recessive Fira-tabular parens (`(×)`, `($)`, `(kbps)`) — the FigureSlug
//     `.unit` recession (the unit suffix never out-weighs its measure; the inversion law).
//   · an optional POLE-DIRECTION tint on the "more/up" end (the TEAL data-pole word) where the
//     axis is SIGNED — meaning only where an axis has a good direction (§5 R5); a symmetric
//     scatter stays neutral.
//
// THE MECHANISM (mechanism #1, DOM-over-canvas). The plate sets the ECharts `name` to `""` and
// mounts this lockup as a positioned DOM node IN THE RESERVED AXIS GUTTER (the `grid.bottom` /
// `grid.left` inset the plate already reserves for the title). The lockup owns the title, so it
// is a first-class typeset object — and it inherits theme flips through the CSS cascade (no T-4
// canvas re-resolve, the win of going DOM here). The host plate positions it (a `.relative`
// chart frame + an absolutely-seated gutter slot); this component is purely the typeset content.
//
// PROPORTION-LAW FENCE (§3 G-VTR-4): the pole tint is a DISCRETE pole role (teal "more"), NEVER
// a continuous-ramp value — the ramp-ink ban holds. The measure/unit inks are chrome
// (foreground/muted), never a data hue.

withDefaults(
    defineProps<{
        /** The MEASURE name — the content-name run (Newsreader small-caps prose). */
        measure: string;
        /** The UNIT suffix — the recessive Fira-tabular parenthetical (`×`, `$`, `kbps`). Omit
            for a unitless axis (the measure stands alone). The parens are added by the lockup. */
        unit?: string;
        /** The axis orientation — `x` reads horizontally (bottom gutter), `y` rotates -90deg
            (left gutter), exactly as the ECharts `nameLocation:"middle"` it replaces. */
        axis?: "x" | "y";
        /** Tint the measure word with the TEAL data-pole — only for SIGNED/directional axes (a
            "good direction" exists). A symmetric axis (both $) stays neutral (§5 R5). */
        pole?: boolean;
    }>(),
    {
        unit: undefined,
        axis: "x",
        pole: false,
    },
);
</script>

<template>
    <!-- The typeset axis title — a measure run + a recessive unit run, in the reserved gutter.
         `data-axis-name-lockup` is the gate selector (G-VTR-2 asserts the DOM lockup exists +
         carries a measure run + a unit run in distinct families). -->
    <span
        class="axis-name-lockup"
        :class="{
            'axis-name-lockup--y': axis === 'y',
            'axis-name-lockup--pole': pole,
        }"
        data-axis-name-lockup
        aria-hidden="true"
    >
        <span class="axis-name-lockup__measure">{{ measure }}</span>
        <span v-if="unit" class="axis-name-lockup__unit">({{ unit }})</span>
    </span>
</template>

<style scoped>
/* THE MEASURE + UNIT lockup. The whole thing is a single inline-flex baseline lockup so the
   recessive unit sits beside its measure on one type line (the FigureSlug `.unit` law). It is
   `aria-hidden` because the canvas plate already carries the axis name in its `aria-label` / the
   a11y table — the lockup is the VISIBLE typeset object, never a second a11y announcement. */
.axis-name-lockup {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3em;
    /* THE TEXT-RECESSION LAW (N5 design consult · G-N9): the lockup is TEXT, and its recession
       is the MUTED INK + the small type — never a sub-AA alpha. The prior `--attn-chrome` (④,
       0.46) bind stacked opacity on the already-muted ink and landed the measure at 1.91:1 on
       the light paper (the W0 e2e defect) — the §HIERARCHY covenant ("recession … never crosses
       below AA for text", tokens.css) forbids exactly that. Muted text tolerates ≤ ~7% alpha
       recession before breaking 4.5:1, so the rung opacity is unavailable to text: full alpha,
       the mute IS the rung. (Live after-fix: measure 4.64:1 light (pole tint) / unit 5.82:1.) */
    line-height: 1.1;
    white-space: nowrap;
    pointer-events: none;
}

/* THE MEASURE — the content-NAME register (DESIGN §6): Newsreader small-caps prose, the family
   that signals "this is a name, not a figure." */
.axis-name-lockup__measure {
    font-family: var(--font-serif, "Newsreader"), serif;
    font-size: 0.78rem;
    font-weight: 500;
    font-variant: small-caps;
    letter-spacing: 0.02em;
    color: var(--muted-foreground);
}

/* THE POLE TINT — the TEAL data-pole, only on a SIGNED axis (the "good direction" word). A
   discrete pole role, never a continuous-ramp value (the ramp-ink ban holds, §3 G-VTR-4). */
.axis-name-lockup--pole .axis-name-lockup__measure {
    color: var(--ink-diverging-high, var(--muted-foreground)); /* O-C7 D5 — the signed "good-direction" word as a readable pole ink (hue kept, AA-clamped) */
}

/* THE UNIT — the recessive Fira-tabular parenthetical. One tier quieter than the measure by
   SIZE + FAMILY (the inversion law / FigureSlug `.unit` recession) — not by alpha: the prior
   0.72, nested under the lockup's old 0.46, landed the unit at 1.61:1 (sub-AA text). The mono
   face at 0.68rem beside small-caps at 0.78rem already reads one tier down at full ink. */
.axis-name-lockup__unit {
    font-family: var(--font-mono, "Fira Code"), monospace;
    font-size: 0.68rem;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
}

/* The y-axis orientation — the lockup rotates -90deg to read up the left gutter (replacing the
   ECharts `nameLocation:"middle"` vertical raster name). The host seats it in the left inset. */
.axis-name-lockup--y {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
}
.axis-name-lockup--y .axis-name-lockup__measure,
.axis-name-lockup--y .axis-name-lockup__unit {
    /* keep the glyphs upright within the rotated lockup */
    text-orientation: mixed;
}
</style>
