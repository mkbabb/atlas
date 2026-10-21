// platform/data/period.ts — THE ONE PERIOD CODEC AND RESTATEMENT OPERATOR (U · §L 6(f), X-5′, X-11′).
//
// A dashboard's period lives in ONE URL key whose value is a SET of period keys. The key and the
// spelling come from the feed's declared period axis (`meta.period`), and so does the one
// `PeriodNoun` every surface names a period with:
//
//   axis          key    single      a contiguous set        a gapped set              compare
//   school-year   `sy`   `2024-25`   `2014-15..2025-26`      `2014-15,2016-17..2018-19`  `range:2014-15..2016-17`
//   (undeclared)  `year` `2024`      `2014..2025`            `2014,2016..2018`           `range:2014..2016`
//
// GRAMMAR. `value := ["range:"] part ("," part)*`, `part := literal | literal ".." literal`. A set
// with no prefix is the POOLED (aggregate) scope; that is the spelling §L 6(f) rules
// (`sy=2014-15..2025-26`). `range:` is the side-by-side compare scope. A single literal with no
// `..` and no `,` is one period; a pool of one period is spelled `2014-15..2014-15`. The operator is
// element-wise on the set and keeps its gaps (never a hull); `format` packs runs of two or more
// consecutive keys as `a..b`. One spelling per meaning, so `parse(format(x))` is `x`.
//
// LEGACY. The integer keys `yearMode` and `years` (and, on a school-year axis, `year`) are read ONCE
// on load through `restatePeriod`, restated element-wise (on a school-year axis, calendar year N
// becomes school year N–(N+1), the year holding most of its days), and disclosed by a notice. They
// are never written: a reader write writes the axis key and deletes them in the same act.
//
// PURE — no Vue. `useYearScope` binds it to the URL.
import type { FeedMeta } from "./contract.js";
import { formatPeriod } from "../charts/lib/format.js";

/** The kinds of period axis a feed can declare. An undeclared axis is the plain `year` kind. */
export type PeriodAxisKind = "school-year" | "year";

/** The scoped period: one key, or a set of keys pooled (`aggregate`) or compared (`range`). */
export type PeriodScope =
    | { mode: "single"; year: number }
    | { mode: "range"; years: number[] }
    | { mode: "aggregate"; years: number[] };

/** The ONE period noun (X-11′): every surface names a period through it. */
export interface PeriodNoun {
    readonly kind: PeriodAxisKind;
    /** "school year" / "year". */
    readonly singular: string;
    /** "school years" / "years". */
    readonly plural: string;
    /** The reader-facing label of one key: "2024–25" / "2024". */
    label(key: number): string;
}

/** The codec for one axis: the URL key, its parse and its format. */
export interface PeriodCodec {
    readonly noun: PeriodNoun;
    /** The one URL key the period is written to (`sy` / `year`). */
    readonly param: string;
    /** The legacy integer keys this axis reads once on load and deletes on every write. */
    readonly legacyParams: readonly string[];
    /** Parse a value of `param`; `null` when it is not a period this codec can read. */
    parse(raw: string): PeriodScope | null;
    /** Spell a scope as the value of `param`. */
    format(scope: PeriodScope): string;
}

/** Why a load-time request was restated. */
export type NoticeCause = "legacy" | "not-carried" | "clipped" | "unreadable";

/** The disclosure of a restated load-time request. */
export interface PeriodNotice {
    readonly causes: readonly NoticeCause[];
    readonly sentence: string;
}

/** The operator's one output. */
export interface Restated {
    readonly scope: PeriodScope;
    readonly source: "param" | "legacy" | "default";
    readonly notice: PeriodNotice | null;
}

// ── The axis ──────────────────────────────────────────────────────────────────────────────

const LEGACY_SCOPE_KEYS = ["yearMode", "years"] as const;

/** The two-digit end of a school year: 2024 → "25". */
const tail = (k: number): string => String((k + 1) % 100).padStart(2, "0");

const SCHOOL_YEAR_NOUN: PeriodNoun = {
    kind: "school-year",
    singular: "school year",
    plural: "school years",
    label: (k) => formatPeriod(k, "school-year"),
};

const YEAR_NOUN: PeriodNoun = {
    kind: "year",
    singular: "year",
    plural: "years",
    label: (k) => String(k),
};

function schoolYearLiteral(raw: string): number | null {
    const m = /^(\d{4})-(\d{2})$/.exec(raw);
    if (!m) return null;
    const start = Number(m[1]);
    return tail(start) === m[2] ? start : null;
}

function yearLiteral(raw: string): number | null {
    return /^\d{4}$/.test(raw) ? Number(raw) : null;
}

function makeCodec(
    noun: PeriodNoun,
    param: string,
    legacyParams: readonly string[],
    literal: (raw: string) => number | null,
    spell: (key: number) => string,
): PeriodCodec {
    function parse(raw: string): PeriodScope | null {
        let body = raw.trim();
        const compare = body.startsWith("range:");
        if (compare) body = body.slice("range:".length);
        if (body === "") return null;
        const keys = new Set<number>();
        let isSet = compare;
        for (const part of body.split(",")) {
            const ends = part.split("..");
            if (ends.length > 2) return null;
            const lo = literal(ends[0]!);
            const hi = ends.length === 2 ? literal(ends[1]!) : lo;
            if (lo == null || hi == null || lo > hi) return null;
            if (ends.length === 2) isSet = true;
            for (let k = lo; k <= hi; k++) keys.add(k);
        }
        const years = [...keys].sort((a, b) => a - b);
        if (years.length > 1) isSet = true;
        if (!isSet) return { mode: "single", year: years[0]! };
        return { mode: compare ? "range" : "aggregate", years };
    }

    function format(scope: PeriodScope): string {
        if (scope.mode === "single") return spell(scope.year);
        const years = [...new Set(scope.years)].sort((a, b) => a - b);
        if (years.length === 0) throw new Error("period: a set scope needs at least one key");
        const parts: string[] = [];
        for (let i = 0; i < years.length; ) {
            let j = i;
            while (j + 1 < years.length && years[j + 1] === years[j]! + 1) j++;
            parts.push(i === j ? spell(years[i]!) : `${spell(years[i]!)}..${spell(years[j]!)}`);
            i = j + 1;
        }
        // A pool of one key keeps its `..` so it never reads as a single period.
        if (scope.mode === "aggregate" && years.length === 1) parts[0] = `${parts[0]}..${parts[0]}`;
        return scope.mode === "range" ? `range:${parts.join(",")}` : parts.join(",");
    }

    return { noun, param, legacyParams, parse, format };
}

/** The declared axis of a feed (`meta.period.axis`), or the plain `year` kind when none is declared. */
export function periodAxisKind(meta: FeedMeta): PeriodAxisKind {
    const declared = meta.period?.axis;
    if (declared == null) return "year";
    if (declared === "school-year") return declared;
    throw new Error(`period: feed ${meta.dataset} declares an unknown period axis "${String(declared)}"`);
}

/** The ONE codec for a feed's axis. A school-year axis writes `meta.period.param` (`sy`). */
export function periodCodecFor(meta: FeedMeta): PeriodCodec {
    if (periodAxisKind(meta) === "school-year") {
        const param = meta.period!.param;
        return makeCodec(
            SCHOOL_YEAR_NOUN,
            param,
            ["year", ...LEGACY_SCOPE_KEYS],
            schoolYearLiteral,
            (k) => `${k}-${tail(k)}`,
        );
    }
    return makeCodec(YEAR_NOUN, "year", LEGACY_SCOPE_KEYS, yearLiteral, String);
}

/** Every URL key a period can be read from on this axis (its param plus its legacy keys). */
export function periodKeys(codec: PeriodCodec): string[] {
    return [codec.param, ...codec.legacyParams];
}

// ── The restatement operator ─────────────────────────────────────────────────────────────

/** §E R-3/N-1 clause 2: calendar year N maps to the school year holding most of its days. */
export function calendarYearToSchoolYear(cy: number): number {
    const day = 86_400_000;
    const early = Math.round((Date.UTC(cy, 6, 1) - Date.UTC(cy, 0, 1)) / day);
    const late = Math.round((Date.UTC(cy + 1, 0, 1) - Date.UTC(cy, 6, 1)) / day);
    return late >= early ? cy : cy - 1;
}

/** "A to B" for a contiguous run, else a comma list (never a hull over a gap). */
export function periodText(keys: readonly number[], noun: PeriodNoun): string {
    const sorted = [...new Set(keys)].sort((a, b) => a - b);
    if (sorted.length === 1) return noun.label(sorted[0]!);
    const run = sorted.every((k, i) => i === 0 || k === sorted[i - 1]! + 1);
    return run
        ? `${noun.label(sorted[0]!)} to ${noun.label(sorted[sorted.length - 1]!)}`
        : sorted.map(noun.label).join(", ");
}

/** The reader-facing text of a scope: one label, a run, or a gapped list. */
export function scopeText(scope: PeriodScope, noun: PeriodNoun): string {
    return periodText(scope.mode === "single" ? [scope.year] : scope.years, noun);
}

/** Nearest carried key to [lo, hi]; a tie goes to the later key (the newer vintage). */
function nearest(carried: readonly number[], lo: number, hi: number): number {
    let best = carried[0]!;
    let bestD = Infinity;
    for (const c of carried) {
        const d = c >= lo && c <= hi ? 0 : Math.min(Math.abs(c - lo), Math.abs(c - hi));
        if (d < bestD || (d === bestD && c > best)) {
            best = c;
            bestD = d;
        }
    }
    return best;
}

/** The atlas 7 integer grammar of `?years=` (comma parts, each `N` or `A-B`), read once. */
function parseLegacyYears(raw: string): number[] | null {
    const out = new Set<number>();
    for (const part of raw.split(",")) {
        const m = /^(\d{4})(?:-(\d{4}))?$/.exec(part.trim());
        if (!m) return null;
        const a = Number(m[1]);
        const b = m[2] ? Number(m[2]) : a;
        for (let y = Math.min(a, b); y <= Math.max(a, b); y++) out.add(y);
    }
    return out.size > 0 ? [...out].sort((x, y) => x - y) : null;
}

type Query = Readonly<Record<string, string | undefined>>;
type Request =
    | { kind: "scope"; scope: PeriodScope; legacy: string | null }
    | { kind: "unreadable"; raw: string }
    | null;

function present(q: Query, key: string): string | null {
    const v = q[key];
    return v == null || v.trim() === "" ? null : v;
}

/** Read the legacy integer keys into a request in the axis's own keys (element-wise). */
function legacyRequest(q: Query, codec: PeriodCodec): Request {
    const toAxis =
        codec.noun.kind === "school-year" ? calendarYearToSchoolYear : (y: number) => y;
    const mode = present(q, "yearMode");
    const years = present(q, "years");
    if ((mode === "range" || mode === "aggregate") && years != null) {
        const cys = parseLegacyYears(years);
        if (!cys) return { kind: "unreadable", raw: years };
        const keys = [...new Set(cys.map(toAxis))].sort((a, b) => a - b);
        const named = cys.length === 1 ? `${cys[0]}` : periodText(cys, YEAR_NOUN);
        return { kind: "scope", scope: { mode, years: keys }, legacy: named };
    }
    const year = codec.noun.kind === "school-year" ? present(q, "year") : null;
    if (year != null) {
        if (!/^\d{4}$/.test(year.trim())) return { kind: "unreadable", raw: year };
        const cy = Number(year);
        return { kind: "scope", scope: { mode: "single", year: toAxis(cy) }, legacy: `${cy}` };
    }
    // A bare `yearMode` (or `years` under `yearMode=single`) named no period in atlas 7 either.
    return null;
}

/**
 * THE OPERATOR. Restate the load-time query against the feed's carried keys (`meta.years`):
 *  · the axis key decides when present; the legacy keys are read only when it is absent, and an
 *    unreadable value never falls through to another key;
 *  · a set is restated element-wise and keeps its gaps; keys the feed does not carry are dropped
 *    (`clipped`); a request with no carried key shows the nearest one (`not-carried`, ties later);
 *  · every restatement carries a notice sentence; an exact request carries none.
 * A feed that carries no keys is refused (it throws): no period is invented.
 */
export function restatePeriod(
    query: Query,
    carried: readonly number[],
    codec: PeriodCodec,
): Restated {
    const years = [...new Set(carried)].sort((a, b) => a - b);
    if (years.length === 0) throw new Error("period: the feed declares no years");
    const { noun } = codec;
    const latest = years[years.length - 1]!;

    const raw = present(query, codec.param);
    let request: Request;
    if (raw != null) {
        const scope = codec.parse(raw);
        request = scope ? { kind: "scope", scope, legacy: null } : { kind: "unreadable", raw };
    } else {
        request = legacyRequest(query, codec);
    }

    if (request == null) return { scope: { mode: "single", year: latest }, source: "default", notice: null };
    if (request.kind === "unreadable") {
        return {
            scope: { mode: "single", year: latest },
            source: "default",
            notice: {
                causes: ["unreadable"],
                sentence: `This link names its ${noun.plural} as “${request.raw}”, which this page cannot read, so it shows ${noun.label(latest)}, the latest ${noun.singular} it has.`,
            },
        };
    }

    const { scope, legacy } = request;
    const source = legacy == null ? "param" : "legacy";
    const causes: NoticeCause[] = legacy == null ? [] : ["legacy"];
    const asked = scope.mode === "single" ? [scope.year] : scope.years;
    const plural = asked.length > 1;
    const askedText = periodText(asked, noun);
    const lead =
        legacy == null
            ? `This link asked for ${askedText}.`
            : noun.kind === "school-year"
              ? `This link asked for calendar ${plural ? "years" : "year"} ${legacy}, which the atlas reads as ${noun.singular}${plural ? "s" : ""} ${askedText}.`
              : `This link asked for ${askedText} in a retired spelling.`;

    const kept = asked.filter((k) => years.includes(k));
    if (kept.length === 0) {
        const shown = nearest(years, asked[0]!, asked[asked.length - 1]!);
        causes.push("not-carried");
        const none = plural ? "none of those" : `no figures for ${askedText}`;
        return {
            scope: { mode: "single", year: shown },
            source,
            notice: {
                causes,
                sentence: `${lead} This page has ${none}, so it shows ${noun.label(shown)}, the nearest ${noun.singular} it has.`,
            },
        };
    }
    let restated: PeriodScope = scope;
    let rest = "";
    if (scope.mode !== "single" && kept.length !== asked.length) {
        causes.push("clipped");
        restated = { mode: scope.mode, years: kept };
        rest = ` This page has ${kept.length} of those ${asked.length} ${noun.plural}, so it shows ${periodText(kept, noun)}.`;
    } else if (scope.mode !== "single") {
        restated = { mode: scope.mode, years: kept };
    }
    return {
        scope: restated,
        source,
        notice: causes.length > 0 ? { causes, sentence: lead + rest } : null,
    };
}
