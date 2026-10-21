// describeEntity — the one per-route entity contract the detail sheet reads (U/B7 O-13, PLAN §5.3).
//
// Each route supplies it once, beside its stat resolver, for every grain it plots. The detail reads
// the name from it (never a code), the measures with their period, source, medians and rank, and
// the entity's series. The store also carries whether the detail is open, so the hover card stays
// closed under it.
import { defineStore } from "pinia";
import { ref } from "vue";
import type { SelectionKey } from "../charts/contract/selection-contract.js";
import { formatKbpsPerStudent } from "../charts/lib/format.js";

/** One identifier of the entity ("LEA" 93N). `param` is the `/data` query key it filters by. */
export interface EntityId {
    label: string;
    value: string;
    param: string;
}

/** One measure row of the detail table. Values are numbers in `unit`; the row prints them. */
export interface EntityMeasure {
    id: string;
    /** The register label ("Contracted bandwidth"). */
    label: string;
    value: number | null;
    /** "Mbps", "kbps", "%", "$", "students", or "" for a bare count. */
    unit: string;
    /** The period the value belongs to ("2025–26"). */
    period: string;
    /** The dataset id the value comes from; the row links to `/data/<sourceId>`. */
    sourceId: string;
    /** The dataset's reader-facing name; defaults to `sourceId`. */
    sourceLabel?: string;
    stateMedian: number | null;
    /** The median of the entity's own class (charter vs LEA, or its size band). */
    peerMedian: number | null;
    /** 1-based rank among `n`; printed only when `n >= 5`. */
    rank: number | null;
    n: number;
}

/** One point of a series. `covered` is false for a period the measure has no source of its own. */
export interface EntitySeriesPoint {
    period: string;
    value: number | null;
    covered: boolean;
}

export interface EntitySeries {
    measureId: string;
    label: string;
    unit: string;
    points: EntitySeriesPoint[];
}

export interface EntityDescription {
    /** The entity's own name from the feed's entity record. Never a code. */
    name: string;
    /** The kind as a reader reads it ("Charter school", "District", "County", "State"). */
    kind: string;
    ids: EntityId[];
    /** The place line ("Harnett County"). */
    place: string;
    measures: EntityMeasure[];
    series: EntitySeries[];
}

export type DescribeEntity = (key: SelectionKey) => EntityDescription | null;

/** The smallest group a rank is printed for (DA-10). */
export const RANK_MIN_N = 5;

const COUNT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const DEC1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** A measure value as number and unit ("250 Mbps", "814 kbps", "41%", "$167", "3,742"). */
export function formatMeasure(value: number | null | undefined, unit: string): string {
    if (value == null || !Number.isFinite(value)) return "—";
    switch (unit) {
        case "%":
            return `${Math.abs(value) < 1 && value !== 0 ? DEC1.format(value) : COUNT.format(Math.round(value))}%`;
        case "$":
            return Math.abs(value) < 10 ? `$${value.toFixed(2)}` : `$${COUNT.format(Math.round(value))}`;
        case "kbps":
            return formatKbpsPerStudent(value);
        case "":
            return COUNT.format(Math.round(value));
        default:
            return `${Math.abs(value) < 10 ? DEC1.format(value) : COUNT.format(Math.round(value))} ${unit}`;
    }
}

/** "12 of 115", or null below the rank floor. */
export function rankText(m: Pick<EntityMeasure, "rank" | "n">): string | null {
    if (m.rank == null || m.n < RANK_MIN_N) return null;
    return `${COUNT.format(m.rank)} of ${COUNT.format(m.n)}`;
}

/** A plain fallback title for an entity the route cannot name: its kind, never its code. */
export function untitledName(kind: SelectionKey["kind"]): string {
    return KIND_NOUN[kind];
}

export const KIND_NOUN: Record<SelectionKey["kind"], string> = {
    state: "State",
    county: "County",
    district: "District",
    school: "School",
    cell: "Map cell",
    firm: "Firm",
};

export const useEntityDetail = defineStore("platform:entity-detail", () => {
    const describer = ref<DescribeEntity | null>(null);
    /** True while the detail sheet is open; the hover card stays closed under it. */
    const open = ref(false);

    /** A route registers its describer once; the disposer releases it. */
    function register(fn: DescribeEntity): () => void {
        describer.value = fn;
        return () => {
            if (describer.value === fn) describer.value = null;
        };
    }

    function describe(key: SelectionKey): EntityDescription | null {
        return describer.value?.(key) ?? null;
    }

    return { describer, open, register, describe };
});
