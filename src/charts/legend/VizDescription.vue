<script setup lang="ts">
// VizDescription.vue — E1, THE AXIS-COLOURED DESCRIPTION BAND (I2.a · DESIGN §2.2.2 / §3.7).
//
// The short SENTENCE under the plate title with its x/y measure words TINTED to their DATA hues —
// the reader sees "contributions" inked the diverging-low pole and "disbursements" inked graphite,
// matching the ribbon. The colour source is the SAME `colorKind`/`ColorScale` registry the
// axis/series and the colored hover read (ONE colour locus) — every word's tint is a CSS custom-
// property NAME from the contract's `AxisDescription`, resolved late by the cascade (theme-aware),
// NEVER a hardcoded hex (i0-colorkind-law).
//
// It mounts INSIDE VizPlate (under the title), so it travels WITH the plate into the expand layer
// AND the export — it is contract DATA, not free body prose (the AxisNameLockup→E1 gap closed on
// every viz, including the choropleth/treemap/band-cake/hex-map that carry no axis lockup).
//
// THE MECHANISM: the `prose` template carries `{token}` placeholders; we split it on the tokens and
// render each token as a `<span data-axis-key>` tinted via `color: var(<colorVar>)`. The `data-axis-key`
// marker is the i0-perviz-keystat gate's axis-keyed-description selector — present on every plate.
import { computed } from "vue";
import type { AxisDescription } from "@/charts/contract/viz-contract";
import { inkFromAccent } from "@/design/tokens/ink";

const props = defineProps<{
    /** The contract's axis-keyed description (the prose template + the tinted axis words). */
    description: AxisDescription;
}>();

/** Case a substituted axis label for its POSITION in the prose (E1 contract-root casing fix, J-VOICE §3).
    An axis `label` is authored at its natural (axis-title) case — often a leading cap ("Per-student avg
    util"). Dropped mid-sentence after "How {y} sets…", that leading cap reads as a stutter cap. The fix:
    when the token does NOT begin the sentence, lower-case its FIRST letter — UNLESS the lead word is an
    ACRONYM (an all-caps run ≥2, "ECF funding"), where lowering would break the named entity. The
    de-cap is presentation-only; the tinted-word identity + colorVar are untouched. */
function casedForPosition(label: string, atSentenceStart: boolean): string {
    if (atSentenceStart) return label;
    // an acronym lead — the first word is ≥2 leading uppercase letters (ECF, USAC, NSLP). Keep its case.
    if (/^[A-Z]{2,}/.test(label)) return label;
    return label.charAt(0).toLowerCase() + label.slice(1);
}

/** Split the prose template into runs: plain text + tinted axis-word tokens. A `{token}` whose name
    matches an `axes` entry becomes a tinted span; an unmatched `{token}` renders its bare name. The
    label is cased for its position (E1 — lower-lead mid-sentence, acronyms preserved). */
const runs = computed<{ text: string; word?: { label: string; colorVar: string } }[]>(
    () => {
        const byToken = new Map(props.description.axes.map((a) => [a.token, a]));
        const out: { text: string; word?: { label: string; colorVar: string } }[] = [];
        // split on {token} placeholders, keeping the delimiters.
        const parts = props.description.prose.split(/(\{[^}]+\})/g);
        // a token is at the sentence START iff no preceding text has appeared yet, OR the prior text
        // ended a sentence (`.`/`?`/`!` + whitespace). The atlas prose is a single short sentence, so
        // the common case is: the first run leads → cap; every later token → lower-lead.
        let priorText = "";
        for (const part of parts) {
            const m = /^\{([^}]+)\}$/.exec(part);
            if (m) {
                const a = byToken.get(m[1]);
                const atStart =
                    priorText.trim() === "" || /[.?!]\s*$/.test(priorText);
                if (a) {
                    const text = casedForPosition(a.label, atStart);
                    out.push({ text, word: { label: text, colorVar: a.colorVar } });
                    priorText = text;
                    continue;
                }
                out.push({ text: m[1] }); // unmatched token → its bare name
                priorText = m[1];
                continue;
            }
            if (part) {
                out.push({ text: part });
                priorText = part;
            }
        }
        return out;
    },
);
</script>

<template>
    <!-- The dek seats at --attn-legend (present, recessive, beneath the title) — a key, never a
         paragraph. The whole band carries `viz-axis-description` (the i0-perviz-keystat selector);
         each tinted measure word carries `data-axis-key` (the axis-keyed marker). -->
    <p class="viz-axis-description" data-testid="viz-description">
        <template v-for="(run, i) in runs" :key="i">
            <span
                v-if="run.word"
                class="axis-keyed"
                data-axis-key
                :style="{ color: inkFromAccent(`var(${run.word.colorVar})`) }"
                >{{ run.text }}</span
            ><span v-else>{{ run.text }}</span>
        </template>
    </p>
</template>

<style scoped>
/* The dek is the recessive prose key beneath the title — Newsreader (the NAME-is-prose law),
   never out-weighing the title. The tinted axis words inherit their data hue from the
   cascade-resolved CSS var (never a hex), bold enough to read the encoding.
   THE TEXT-RECESSION LAW (N5 design consult · G-N9): the dek is TEXT, so its recession is the
   MUTED INK + the 0.9375rem scale — the prior `--attn-legend` (③, 0.64) alpha stacked on the
   mute read 3.2:1 on dark stock / ~2.6:1 on light paper (sub-AA both arms; the same class as
   the W0 1.94/2.41 defects). Full alpha: the mute + size ARE the rung (the tokens.css ④/③
   non-text covenant). The axis-keyed lift inverts to 1 with the base, so nothing over-shoots. */
.viz-axis-description {
    margin: 0.35rem 0 0;
    font-family: var(--font-serif);
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--muted-foreground);
    max-inline-size: 60ch;
}
.viz-axis-description .axis-keyed {
    font-weight: 600;
}
</style>
