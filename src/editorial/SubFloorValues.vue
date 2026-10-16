<script setup lang="ts">
// editorial/SubFloorValues.vue — THE SUB-FLOOR FORM of a peer-relative figure (U-F25, §H M-5).
//
// Below the evidence floor a robust-z, a peer band or a median has no field to stand on: one entity
// is always its own median and always sits at 0σ. So the plate drops the construct and prints each
// entity's own values, with its n, the reason, and nothing that ranks.
//
// THE DESIGN, in the editorial register:
//   · The COUNT LINE leads ("n = 1 filer"). It is the figure's first read, so a value is never met
//     before its sample size. It is a sentence in the text face, not a small caps label: the line
//     names what n counts (§E: "each figure names what n counts").
//   · The REASON follows in the muted serif: what is withheld, why, and what is drawn instead.
//   · One ROW per entity: the label in the serif, then number-and-unit pairs. Numerals are the
//     register's tabular mono, in the body ink. They never wear a ramp pole or a warrant colour:
//     below the floor nothing is flagged (the floor never licenses a flag), so a hue would claim
//     what the ruling withholds.
//   · Rows keep the order they arrive in (the feed order) and are never sorted by value, so position
//     ranks nothing. A single hairline above each row is the only furniture.
//   · THE LABEL COLUMN (U RULINGS §J J-6). The rows share one grid (subgrid): the label column is as
//     wide as the longest label up to 16rem, and the values start one gutter after it, so a value
//     always sits beside its label and the values of every row line up into one ledger column. The
//     list takes a reading measure (40rem), never the plate's full width: at 1440 the old flex row
//     stretched the label to 934px and put a value ~700px from its name.
//   · Below a 30rem container the values drop under the label (a container query: the plate's width,
//     not the viewport's, decides).
//   · Value cells are keyed by the value's own stable `id`, never its unit: two values may share one.
//
// a11y: a `<figure>`; the count line and reason are its `<figcaption>` (placed first, read first);
// the rows are a description list (`<dt>` entity, one `<dd>` with its values). No interactive roles.
import { computed } from "vue";
import { EVIDENCE_FLOOR, nCount, subFloorReason, type CountNoun } from "./evidence-floor.js";

/** One value of an entity. `id` is stable across renders and unique within its row (two values may
    share a `unit`); `unit` names what the number counts ("requests", "applicants"). */
export interface SubFloorValue {
    id: string;
    value: string;
    unit: string;
}

/** One entity's own values. */
export interface SubFloorRow {
    key: string;
    label: string;
    values: SubFloorValue[];
}

const props = withDefaults(
    defineProps<{
        /** One row per entity, in feed order. */
        rows: SubFloorRow[];
        /** The sample size the floor was tested against (usually `rows.length`, but a figure whose
            n counts something else, such as tests under a hex, passes that count). */
        n: number;
        /** What n counts. */
        noun: CountNoun;
        /** The withheld construct, as a sentence subject ("A peer band"). */
        withheld: string;
        /** What the rows show instead, as a plural noun ("values", "counts"). */
        shown?: string;
        floor?: number;
        /** The accessible name of the row list. */
        listLabel: string;
    }>(),
    { shown: "values", floor: EVIDENCE_FLOOR },
);

const countLine = computed(() => nCount(props.n, props.noun));
const reason = computed(() =>
    subFloorReason({
        noun: props.noun,
        withheld: props.withheld,
        shown: props.shown,
        floor: props.floor,
    }),
);
</script>

<template>
    <figure class="subfloor" data-testid="subfloor-values" :data-n="n">
        <figcaption class="subfloor__caption" data-testid="subfloor-values-note">
            <span class="subfloor__count">{{ countLine }}</span>
            <span class="subfloor__reason">{{ reason }}</span>
        </figcaption>
        <dl class="subfloor__list" :aria-label="listLabel">
            <div v-for="r in rows" :key="r.key" class="subfloor__row">
                <dt class="subfloor__label">{{ r.label }}</dt>
                <dd class="subfloor__values">
                    <span
                        v-for="v in r.values"
                        :key="v.id"
                        class="subfloor__value"
                        :data-value-id="v.id"
                    >
                        <span class="subfloor__num">{{ v.value }}</span>
                        <span class="subfloor__unit">{{ v.unit }}</span>
                    </span>
                </dd>
            </div>
        </dl>
    </figure>
</template>

<style scoped>
.subfloor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    inline-size: 100%;
    container-type: inline-size;
}
.subfloor__caption {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-inline-size: 60ch;
}
/* The count line: the text face at the label's size, with tabular figures so "n = 1" and "n = 4"
   hold the same width across plates. */
.subfloor__count {
    font-family: var(--font-serif);
    font-size: 1rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--foreground);
}
.subfloor__reason {
    font-family: var(--font-serif);
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--muted-foreground);
    text-wrap: pretty;
}
/* One grid for every row: the label column fits the longest label up to 16rem, the values column
   starts one gutter after it. The rows are subgrids, so the hairline still spans each row and the
   values of all rows share one left edge. */
.subfloor__list {
    display: grid;
    grid-template-columns: fit-content(16rem) minmax(0, 1fr);
    column-gap: 1.5rem;
    max-inline-size: 40rem;
    margin: 0;
}
.subfloor__row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: baseline;
    row-gap: 0.25rem;
    padding-block: 0.625rem;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent);
}
.subfloor__label {
    min-inline-size: 0;
    font-family: var(--font-serif);
    font-size: 0.9375rem;
    color: var(--foreground);
    overflow-wrap: anywhere;
}
.subfloor__values {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 1.25rem;
    row-gap: 0.25rem;
    margin: 0;
}
.subfloor__value {
    display: inline-flex;
    align-items: baseline;
    gap: 0.375rem;
}
.subfloor__num {
    font-family: var(--font-mono);
    font-size: 1.125rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--foreground);
}
.subfloor__unit {
    font-family: var(--font-serif);
    font-size: 0.8125rem;
    color: var(--muted-foreground);
}
/* A narrow plate: the values drop under the label. */
@container (max-width: 30rem) {
    .subfloor__list {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
