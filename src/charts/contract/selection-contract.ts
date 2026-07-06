// platform/charts/selection-contract.ts — the ONE selection event, shared by every
// interactive chart primitive (S1, the producer contract). A `select` carries the entity
// KEY under the gesture and the MODIFIER STATE captured at the DOM edge — so the STORE,
// not the viz, decides additive-vs-replace. One event shape across the four primitives
// (GeoChoropleth polygon, GeoPointLayer dot, Treemap tile, StackedBar tier), consumed
// through ONE `useChartSelection` mixin so a click composes identically everywhere.
//
// The keystone this serves (map-as-filter-design S3): a click is just another filter
// input — the selected set folds into `matchByKey` as one more AND-clause. This file is
// the WIRE FORM only; the register lives in `useSelection`, the routing in
// `useChartSelection`, the keyboard persona in `SelectionRegion.vue`.

/**
 * A settled DATUM anchor in VIEWPORT space — the hovered mark's bbox top-centre, the one
 * geometry the platform card seats beside (D1-AUGMENT-5 · the anchoring law). It is the WIRE
 * FORM of "where the card lands", shared by every readout publisher + the readout store, so
 * "where a card paints" has ONE type across the platform.
 *
 * THE Anchor|null CONTRACT (H.W1.a). The card may paint ONLY beside a MEASURED datum. A payload
 * whose producer has not yet resolved its datum geometry carries `null` (NOT a `{0,0}` floor),
 * and a null anchor forces the card HIDDEN — so the (16,16) sentinel ghost (an un-anchored card
 * clamped to the origin floor) is UNREPRESENTABLE at the type level. A producer must never ship a
 * non-null payload at the unmeasured origin; the readout store enforces this at its publish seam
 * (it nulls an anchor that resolves to the unmeasured `{0,0}` floor), so the contract holds even
 * for a producer whose own geometry has not settled.
 */
export interface Anchor {
    x: number;
    y: number;
}

/**
 * One selection gesture — the entity key under the pointer (or the keyboard cursor) plus
 * the modifier register. `multi` is true when shift/cmd/ctrl was held (the additive, COMPARE
 * register that toggles-in-set); a plain select replaces the set (with click-to-deselect on
 * the sole key).
 */
export interface SelectEvent {
    /** The entity key under the gesture (a fips, a leaNumber, a tier — `meta.keyField` grain). */
    key: string;
    /** True when shift/cmd/ctrl was held — the additive (toggle-in-set) COMPARE register. */
    multi: boolean;
}

/**
 * The emits every interactive chart primitive declares — additive to the existing `hover`
 * channel. The two registers are deliberately asymmetric: `hover` is the transient scalar
 * (one mark, the de-storm seam), `select` is the sticky set channel.
 */
export type SelectionEmits = {
    hover: [key: string | null];
    select: [ev: SelectEvent];
};

// ── THE COMPOSITE SelectionKey CODEC (I5 §1 · the `{kind}:{id}` wire form) ──────────────────
//
// The selection set is grain-AGNOSTIC by construction (useSelection equates + stores opaque
// strings, never inspecting them). But a BARE `"37"` cannot tell a state FIPS from an LEA from
// a county FIPS — it cannot pick the right `<Glyph grain>`, and it COLLIDES across grains so a
// stale district carried into /usf would alias a state. The cure is a composite `{kind}:{id}`
// key MINTED at the producer edge: the kind rides INSIDE the plain string, so the Set identity,
// the `[...set]` list-codec, the reactive-replace, and the toggle/replace algebra are all
// BYTE-UNCHANGED — only the PROJECTIONS (the card glyph, the co-filter native-kind read, the
// veil hue) learn the kind by PARSING the string back. The Set member stays a plain string;
// `encodeSelKey`/`parseSelKey` are the only seam that knows the wire form.
//
// THE MIGRATION GUARD. `parseSelKey` returns `null` for a legacy BARE key (no `<kind>:` prefix,
// or an unknown kind) — so a consumer that re-parses a set holding pre-codec keys silently
// drops them rather than mis-grain a raw fips. A foreign-kind key (a /usf-encoded `"state:37"`
// surviving into /sci) parses to a well-formed `SelectionKey` whose `kind` the route's matcher
// simply does not match — inert by construction, never a mis-read (GAP-2 cured at the read).

/**
 * The entity GRAIN a composite key identifies — the legal kinds the producers mint.
 * `state`/`county`/`district`/`school` are the geo (polygon-resolvable) grains; `cell` is the
 * speedtest hex bin (aspatial — no polygon); `firm` is the ECF consultant/broker grain (J-FILTER
 * §4 · the silent-omission contract fix — `ConsultantsRankedBar` pins a firm key the five-kind
 * union could not name, so `parseSelKey` dropped it as a foreign kind and the FilterView mini-map
 * had no grain to switch on). `firm` is aspatial (a broker has no administrative silhouette), so
 * it joins `cell` as a kind the grain-aware mini-map resolves to a kind-icon, never a Glyph. Frozen
 * here as the ONE union every projection switches on.
 */
export type SelectionKind =
    | "state"
    | "county"
    | "district"
    | "school"
    | "cell"
    | "firm";

/** The set of legal kinds, as a runtime guard (the `parseSelKey` validity check reads it). */
const SELECTION_KINDS: ReadonlySet<string> = new Set<SelectionKind>([
    "state",
    "county",
    "district",
    "school",
    "cell",
    "firm",
]);

/** The PARSED shape of a composite key — the kind + the raw entity id (the `meta.keyField`
    grain the producer minted). The `id` is the byte-identical id the mark/back-projection reads;
    the `key` round-trips back to the exact Set member it was parsed from. */
export interface SelectionKey {
    /** The entity grain (drives the glyph dispatch + the native-kind matcher). */
    kind: SelectionKind;
    /** The raw entity id under the gesture (the fips / leaNumber / cell id — no kind prefix). */
    id: string;
    /** The exact composite Set member (`encodeSelKey(kind, id)`) — the byte-identical string. */
    key: string;
}

/**
 * Encode a `{kind}:{id}` composite key — the producer-edge mint. The id is left VERBATIM (it
 * may itself contain `:` — a GEOID, a synthetic cell id); only the FIRST `:` is the kind
 * delimiter, so `parseSelKey` splits on the first colon and keeps the remainder intact. The
 * result is a plain string the Set holds with zero special-casing.
 */
export function encodeSelKey(kind: SelectionKind, id: string): string {
    return `${kind}:${id}`;
}

/**
 * Parse a composite key back to its `{kind, id, key}` shape, or `null` for a legacy BARE key
 * (the migration guard). Splits on the FIRST `:` so an id containing colons survives intact;
 * a key with no `:` (a pre-codec bare fips) or an unknown kind prefix returns `null` so the
 * caller drops it rather than mis-grain a raw id. The returned `key` is the input verbatim, so
 * `parseSelKey(encodeSelKey(k, id))` round-trips to the same Set member.
 */
export function parseSelKey(key: string): SelectionKey | null {
    const colon = key.indexOf(":");
    if (colon <= 0) return null; // no delimiter, or an empty kind ("":id) — a bare/legacy key
    const kind = key.slice(0, colon);
    if (!SELECTION_KINDS.has(kind)) return null; // an unknown prefix — not a composite key
    const id = key.slice(colon + 1);
    if (id.length === 0) return null; // a kind with no id ("state:") — malformed, drop it
    return { kind: kind as SelectionKind, id, key };
}

/**
 * Read the multi-select modifier off a native pointer/keyboard event at the DOM edge — the
 * COMPARE chord (f6-interaction-grammar §2.1 / G-SHIFT-PIN). The user reaches for SHIFT (the
 * universal "extend selection" idiom — file managers, every chart tool), so Shift is the
 * FIRST-CLASS multi-pin chord, ALIASED to Cmd (macOS) and Ctrl (Win/Linux). This is the ONE
 * place modifier state is read, so every producer + `SelectionRegion` inherits shift-pin the
 * same tick — the §5 R-2(a) adjudication (shift = add, not range-select). Shift-as-RANGE is
 * the richer reading folded as a per-plate enrichment, never the platform law.
 */
export function isMultiSelect(ev: {
    shiftKey?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
}): boolean {
    return Boolean(ev.shiftKey || ev.metaKey || ev.ctrlKey);
}
