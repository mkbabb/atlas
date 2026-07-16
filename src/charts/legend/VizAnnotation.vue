<script setup lang="ts">
// platform/charts/VizAnnotation.vue — THE ANNOTATION CHIP (F6.9 · f6-viz-text-rich §2.2a).
// The DOM-over-canvas lockup that replaces the bare markLine/threshold/captioned-moment string
// ECharts paints as one flat raster run (the SCI util over-ceiling label, the scatter hinge,
// the break-even rules — surfaces #6/#10/#13/#16).
//
// THE ANATOMY: a Fira-caps EYEBROW run (`over ceiling`, `break-even`) + a Fira-tabular FIGURE run
// (`1.0×`, `$721.91`) + an optional directional GLYPH (`→`), on a chip in the VOICE the threshold
// MEANS:
//   · `record` / editorial crossing → the RED margin-ink chip (a ≤8% red wash + a hairline red
//     rule) — the over-subscription / record / verdict voice.
//   · `neutral` → the foreground-muted typeset-run-only (NO wash, the §5 R4 split — a wash on
//     every markLine would clutter a busy plate; the neutral break-even rule reads as bare
//     typeset, the editorial crossing earns the chip).
//
// THE VOICE binds to a DISCRETE semantic role (red verdict / neutral rule), NEVER a continuous
// ramp value (the ramp-ink ban, §3 G-VTR-4). The figure run is INK/Fira, set through the ONE
// format seam upstream (this is a typesetting transform of an already-formatted string).
//
// THE MECHANISM (mechanism #1, DOM-over-canvas). The host plate sets the markLine `label.show`
// off and seats this chip at the markLine's data coordinate (`chart.convertToPixel` + the host
// rect, re-anchored on the expand-settle tick — never per mousemove). This component is purely
// the typeset chip; the host owns the anchor + the absolute position. It is the in-plate,
// lower-key sibling of glass-ui's MetricBadge (the chip register's family ancestor, §4 R3 — an
// atlas composition, not a new library export).

withDefaults(
    defineProps<{
        /** The Fira-caps eyebrow run — the threshold's NAME (`over ceiling`, `break-even`). */
        eyebrow: string;
        /** The Fira-tabular figure run — the threshold's VALUE (`1.0×`, `$721.91`, `y = x`).
            Omit for an eyebrow-only caption (a pure label moment). */
        figure?: string;
        /** An optional directional glyph appended after the figure (`→` for a crossing). */
        glyph?: string;
        /** The VOICE (§5 R4): `record` = the RED editorial-crossing chip (≤8% wash + hairline
            rule); `neutral` = the foreground-muted typeset-run-only (no wash). Default neutral. */
        voice?: "record" | "neutral";
    }>(),
    {
        figure: undefined,
        glyph: undefined,
        voice: "neutral",
    },
);
</script>

<template>
    <!-- The typeset annotation chip — an eyebrow run + a figure run + an optional glyph.
         `data-viz-annotation` is the gate selector (G-VTR-3 asserts the chip exists with ≥2
         distinct style runs, NOT a bare single-run markLine string). -->
    <span
        class="viz-annotation"
        :class="`viz-annotation--${voice}`"
        data-viz-annotation
        aria-hidden="true"
    >
        <span class="viz-annotation__eyebrow">{{ eyebrow }}</span>
        <span v-if="figure" class="viz-annotation__figure">{{ figure }}</span>
        <span v-if="glyph" class="viz-annotation__glyph">{{ glyph }}</span>
    </span>
</template>

<style scoped>
/* THE CHIP — an inline-flex baseline lockup of the eyebrow + figure runs. The neutral voice is
   typeset-run-only (no wash); the record voice adds the ≤8% red wash + a hairline red rule (the
   §5 R4 density split — the editorial crossing earns the chip, the neutral rule does not). */
.viz-annotation {
    display: inline-flex;
    align-items: baseline;
    gap: 0.32em;
    padding: 0.08rem 0.34rem;
    border-radius: var(--radius-pill);
    line-height: 1.1;
    white-space: nowrap;
    pointer-events: none;
    /* the annotation recedes to the ③½ pull / ④ chrome rung — never out-weighing the data line
       it annotates (the inversion law). Declared via `--attn-pull` (the suffusion contract). */
    opacity: var(--attn-pull, 0.9);
}

/* THE EYEBROW — Fira-caps, the threshold's NAME register. */
.viz-annotation__eyebrow {
    font-family: var(--font-mono, "Fira Code"), monospace;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
}

/* THE FIGURE — Fira-tabular, the threshold's VALUE (tnum so figures sit on tabular metrics). */
.viz-annotation__figure {
    font-family: var(--font-mono, "Fira Code"), monospace;
    font-size: 0.72rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}

.viz-annotation__glyph {
    font-family: var(--font-mono, "Fira Code"), monospace;
    font-size: 0.72rem;
    font-weight: 500;
}

/* THE NEUTRAL VOICE — the break-even / non-editorial rule. Foreground-muted typeset-run-only,
   NO wash (§5 R4) — it must not out-weigh the data line it labels. */
.viz-annotation--neutral {
    background: transparent;
}
.viz-annotation--neutral .viz-annotation__eyebrow {
    color: var(--muted-foreground);
}
.viz-annotation--neutral .viz-annotation__figure,
.viz-annotation--neutral .viz-annotation__glyph {
    color: var(--foreground);
}

/* THE RECORD VOICE — the RED editorial crossing (over-ceiling, the record). A ≤8% red wash + a
   hairline red rule — the margin-ink voice. A DISCRETE editorial role (the red voice), never a
   continuous ramp value (the ramp-ink ban holds, §3 G-VTR-4). */
.viz-annotation--record {
    background: color-mix(in oklab, var(--ncsu-red, #cc0000) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--ncsu-red, #cc0000) 38%, transparent);
}
.viz-annotation--record .viz-annotation__eyebrow {
    color: var(--ncsu-red, #cc0000);
}
.viz-annotation--record .viz-annotation__figure,
.viz-annotation--record .viz-annotation__glyph {
    color: var(--ncsu-red-bright, var(--ncsu-red, #cc0000));
}
</style>
