// charts/glyph/resolveEntityIcon.ts — @mkbabb/atlas · THE GENERALIZED ENTITY-ICON RESOLVER (O-A12).
//
// THE ASK (icon-facility §2.2, the owner's addendum): ONE resolver serves every grain's icon so the
// drill-down dropdowns ("state/county/etc as an icon") and the FilterView mini-map row consume the
// SAME facility. This GENERALIZES the shipped `resolveMinimapMark` discriminated union from 2 variants
// (`glyph`/`icon`) to 4 (`glyph`/`hex`/`point`/`hub`) — the aspatial `icon` floor splits into the three
// DESIGNED abstract-grain marks (a hex cell, a point-in-district school, a hub consultant), each whose
// FORM encodes what it is (never a Lucide pictogram, never a bare pin). `minimapMark.ts` COLLAPSES into
// this file — its `iconForKind` becomes the hex/hub/point branches; its glyph branch is unchanged.
//
// THE FENCE (root-repo law · the resolver only). This helper RESOLVES the descriptor; it does NOT mint
// geometry, re-author `entityGeometry`, or reach into a feed. The Class-A silhouettes resolve through the
// existing `entityGeometry` family (unchanged); the abstract marks carry the math anchor / de-identified
// pseudonym the render draws. The consumer injects the feed-side resolvers (`cellLabel` place name,
// `schoolPoint` interior coordinate, `pseudonym` letter) so this platform helper stays off every feed.
//
// NEVER-INCRIMINATE (dashboard-facing · a governance assert). The `hub` descriptor carries a LETTER
// PSEUDONYM only — no field can hold a real firm name. The pseudonym is the (already de-identified) key
// or the injected letter resolver, coerced to a short token; the descriptor is structurally pseudonymous.

import {
    stateGlyph,
    countyGlyph,
    districtGlyph,
    charterGlyph,
    type GlyphGeom,
    type GlyphSize,
} from "@/data/entityGeometry";
import type { GlyphGrain } from "@/charts/glyph/Glyph.vue";
import type { SelectionKey, SelectionKind } from "@/charts/contract/selection-contract";
import {
    pxToLod,
    viewBoxCenter,
    type IconPoint,
    type IconLod,
} from "@/charts/glyph/iconPrimitives";

// ── The grain taxonomy (icon-facility §1) ───────────────────────────────────────────────────────

/**
 * The seven entity grains `EntityIcon` renders — the owner's "state/county/etc as an icon" superset.
 * Class A (real silhouette): `state`/`county`/`district`/`charter`; Class B (real spatial bin):
 * `hex`; Class C (truly abstract, designed): `school`/`consultant`. The names are the ICON-facing
 * grains; the selection wire form (`SelectionKind`) uses `cell`/`firm`, mapped by `grainForKind`.
 */
export type EntityGrain =
    | "state"
    | "county"
    | "district"
    | "charter"
    | "school"
    | "hex"
    | "consultant";

/**
 * How the identity mark decouples from the data mark (icon-facility §2.3) — the missing knob a
 * dropdown icon (no datum) needs. `identity` is the outline-only default (a "state as an icon" IS an
 * outline, not a data-coloured region); `data`/`accent`/`tier` each carry a colour the consumer hands
 * in. Only `identity` changes the render structurally (fill:none + presence hairline); the other three
 * apply the passed fill, differing in INTENT (ramp verdict / route accent / a bound tier step).
 */
export type FillPolicy = "identity" | "data" | "accent" | "tier";

/** The presence-stroke knob (icon-facility §5). `presence` is the at-rest hairline (default); `none`
    suppresses it; `shimmer` opts into the gold-outline hover sweep (glass WG-E·SHIMMER, 4.4.0-line) —
    it renders the `presence` hairline as its at-rest floor until that glass cut lands (graceful). */
export type EntityStroke = "presence" | "shimmer" | "none";

// ── The discriminated descriptor union (icon-facility §2.2 · the minimapMark shape, generalized) ──

/**
 * A GLYPH mark — a Class-A spatial grain that resolved a real silhouette (`state`/`county`/`district`/
 * `charter`). The consumer paints `<Glyph :grain :id :geom>` (the byte-identical baked silhouette the
 * geo producers draw). `geom` is guaranteed non-null (an unresolved silhouette floors to `unknown`).
 */
export interface EntityGlyphMark {
    mark: "glyph";
    /** The `<Glyph>` grain the silhouette draws through (`state`|`county`|`district`). */
    grain: GlyphGrain;
    /** The resolved feature key (state FIPS / county FIPS5 / district GEOID / charter LEA). */
    id: string;
    /** The resolved silhouette — non-null by construction. */
    geom: GlyphGeom;
    /** The human label (the geometry's own name) — the accessible name + the caption. */
    label: string;
}

/**
 * A HEX mark (Class B) — a speedtest cell, a true H3 hexagon. The render draws the flat-top hexagon
 * `<polygon>` primitive (`iconPrimitives.hexPolygonPoints`), tier-fillable in the data channel exactly
 * as a county polygon. No geometry to resolve — a hexagon is math.
 */
export interface EntityHexMark {
    mark: "hex";
    /** The cell id (the H3 index / synthetic cell key). */
    id: string;
    /** The human label (the resolved place name, or the raw id). */
    label: string;
}

/**
 * A POINT mark (Class C · school) — a point-in-district composite. `geom` is the school's DISTRICT
 * silhouette (drawn as a faint context outline), `point` the school's interior coordinate in that
 * geom's normalized viewBox space (from `schoolPoint`, else the district box centre). `geom` may be
 * null (an unresolved district) — the render degrades to a bare seed-dot + abbr. `seed` records the
 * anchor provenance (`"school-point"` geocoded vs `"district-centroid"` fallback) — the honesty register.
 */
export interface EntityPointMark {
    mark: "point";
    /** The point-in-district always paints through the `district` `<Glyph>` grain. */
    grain: "district";
    /** The district context silhouette — null when the district did not resolve (seed-dot degrade). */
    geom: GlyphGeom | null;
    /** The school-dot anchor in the geom's normalized viewBox space. */
    point: IconPoint;
    /** HOW the point was seated — `"school-point"` (geocoded) or `"district-centroid"` (fallback). */
    seed: "school-point" | "district-centroid";
    /** The human label (the school name, or the raw id). */
    label: string;
}

/**
 * A HUB mark (Class C · consultant/firm) — a hub node + radiating stubs + a de-identified LETTER
 * pseudonym seated in the node (the visual sibling of the /usf-integrity Ch V radial hub). Structurally
 * pseudonymous: it carries NO real-firm field, only the `pseudonym` letter + a `label` (never
 * `building-2`, never a named business — the never-incriminate fence).
 */
export interface EntityHubMark {
    mark: "hub";
    /** The de-identified letter pseudonym seated inside the node (`"A"`, `"B"`, …) — never a firm name. */
    pseudonym: string;
    /** The human label (a pseudonymous caption, e.g. `"Consultant A"`, or the pseudonym). */
    label: string;
}

/**
 * An UNKNOWN mark — the NEG floor: a grain the resolver does not know (a junk grain, a Class-A grain
 * whose silhouette did not resolve). The render paints a DESIGNED neutral mark (a rounded-square
 * outline + abbr), never a crash, never a Lucide pin, never the void-ring.
 */
export interface EntityUnknownMark {
    mark: "unknown";
    /** The grain string as received (for diagnostics / the accessible kind read). */
    grain: string;
    /** The human label (the raw id) — the caption + a11y name. */
    label: string;
}

/** The resolved icon descriptor — a discriminated union the consumer switches on. EVERY entity
    resolves to ONE of these; never a blank, never the empty Glyph void-ring (the icon-facility law). */
export type EntityIconDescriptor =
    | EntityGlyphMark
    | EntityHexMark
    | EntityPointMark
    | EntityHubMark
    | EntityUnknownMark;

// ── The selection-kind ↔ icon-grain adapter (the mini-map consumer path) ─────────────────────────

/**
 * Map a selection wire `SelectionKind` to its icon `EntityGrain` — the ONE seam that reconciles the
 * two vocabularies: the speedtest `cell` IS a `hex`, the ECF `firm` IS a `consultant`; the geo kinds
 * (`state`/`county`/`district`/`school`) carry through by name. So the FilterView mini-map (which holds
 * `SelectionKey`s) and the drill-down dropdowns (which hold `EntityGrain`s) call ONE resolver.
 */
export function grainForKind(kind: SelectionKind): EntityGrain {
    switch (kind) {
        case "cell":
            return "hex";
        case "firm":
            return "consultant";
        default:
            return kind; // state | county | district | school — identical names.
    }
}

// ── The resolver options ─────────────────────────────────────────────────────────────────────────

export interface ResolveEntityIconOptions {
    /** The mark size — a named `GlyphSize` rung, or an arbitrary px box (routed via `pxToLod`). The
        Class-A silhouette resolves at the tier this size selects; default `md`. */
    size?: GlyphSize | number;
    /** A friendly label override (the entity's human name) — else the resolved geom name / raw id. */
    label?: string;
    /** A cell's place-name resolver (the speedtest `cellPlace`) — keeps this helper off the feed.
        Returns the human place name, or null/undefined for an unresolved cell. */
    cellLabel?: (id: string) => string | null | undefined;
    /** A school's interior-coordinate resolver (the O-A14 `school-points.json` supply) — returns the
        dot anchor in the district geom's normalized viewBox space, or null to fall to the box centre. */
    schoolPoint?: (id: string) => IconPoint | null | undefined;
    /** A school→district crosswalk (SCI `schoolCode→leaNumber`) — maps a school id to the LEA whose
        silhouette is the context outline. Omitted ⇒ the id is tried as a district/charter key directly. */
    districtOf?: (id: string) => string | null | undefined;
    /** A consultant's letter-pseudonym resolver (the de-identify supply) — returns the de-identified
        letter for a firm id. Omitted ⇒ the id itself is used (it is already the de-identified key). */
    pseudonym?: (id: string) => string | null | undefined;
}

// ── The Class-A geometry resolution (the size → tier → rung mapping) ─────────────────────────────

/**
 * Map a mark size to the tier the Class-A resolvers consume. A named `GlyphSize` rung passes through
 * (the resolver maps it via `SIZE_LOD`); a px number routes through `pxToLod` (icon-facility §2.4) to
 * a DIRECT `Lod` — `≤18 → icon`, `≤32 → coarse`, `≤64 → med`, else `fine` — which the grain resolvers
 * accept alongside `GlyphSize` (`entityGeometry.lodOf` discriminates the disjoint token sets).
 *
 * O-A14 REWIRE (the A12 degrade flip): the `icon` tier is now BAKED (`{grain}.icon.json`), so an
 * icon-scale (≤18px) mark reads the true `icon` geometry — a clean pebble — instead of the former
 * `coarse` floor (the jagged mush the A12 comment flagged as "rewires this when the tier lands"). The
 * `coarse`/`med`/`fine` bands are unchanged; only the `≤18px` band moved coarse → icon.
 */
export function tierForSize(size: GlyphSize | number): GlyphSize | IconLod {
    return typeof size === "number" ? pxToLod(size) : size;
}

/** Resolve a Class-A silhouette (state/county/district/charter). The `district`/`charter` grains both
    try the district registry first (the true LEA silhouette) then the charter catchment — SCI mints a
    single LEA keyspace, so a charter LEA that misses the district registry falls through to its
    catchment. Returns null when no geometry resolves (the caller floors to `unknown`). */
function resolveClassA(
    grain: EntityGrain,
    id: string,
    size: GlyphSize | IconLod,
): { grain: GlyphGrain; geom: GlyphGeom } | null {
    switch (grain) {
        case "state": {
            const geom = stateGlyph(id, size);
            return geom ? { grain: "state", geom } : null;
        }
        case "county": {
            const geom = countyGlyph(id, size);
            return geom ? { grain: "county", geom } : null;
        }
        case "district":
        case "charter": {
            const district = districtGlyph(id, size);
            if (district) return { grain: "district", geom: district };
            const charter = charterGlyph(id, size);
            return charter ? { grain: "district", geom: charter } : null;
        }
        default:
            return null;
    }
}

// ── The resolver ─────────────────────────────────────────────────────────────────────────────────

/**
 * THE GENERALIZED ENTITY-ICON RESOLVER (icon-facility §2.2). Resolve an entity to ONE honest icon
 * descriptor for BOTH the drill-down dropdowns and the FilterView mini-map:
 *   • `state`/`county`/`district`/`charter` → a `glyph` mark (the baked silhouette), or `unknown` when
 *     the silhouette has not resolved (a junk id, a registry tier still loading);
 *   • `hex` → a `hex` mark (the H3 hexagon primitive);
 *   • `school` → a `point` mark (the district context outline + the school-dot);
 *   • `consultant` → a `hub` mark (the de-identified letter-pseudonym hub);
 *   • any unknown grain → an `unknown` mark (a designed neutral outline — never a crash, never a pin).
 *
 * The consumer injects the feed-side resolvers (`cellLabel`, `schoolPoint`, `districtOf`, `pseudonym`)
 * so this platform helper never reaches into a feed. To resolve from a `SelectionKey` (the mini-map),
 * map the kind first: `resolveEntityIcon(key.id, grainForKind(key.kind), opts)`.
 */
export function resolveEntityIcon(
    entityKey: string,
    grain: EntityGrain,
    opts: ResolveEntityIconOptions = {},
): EntityIconDescriptor {
    const size = opts.size ?? "md";

    // Class B — the hex cell (a true H3 hexagon). Math, no geometry to resolve.
    if (grain === "hex") {
        const label = opts.label ?? opts.cellLabel?.(entityKey) ?? entityKey;
        return { mark: "hex", id: entityKey, label };
    }

    // Class C · consultant — the de-identified hub. The pseudonym is the (already de-identified) key or
    // the injected letter; coerced to a short token so the node never seats a long/real-firm string.
    if (grain === "consultant") {
        const raw = opts.pseudonym?.(entityKey) ?? entityKey;
        const pseudonym = toPseudonym(raw);
        return { mark: "hub", pseudonym, label: opts.label ?? raw };
    }

    // Class C · school — the point-in-district composite. Resolve the DISTRICT silhouette (the context
    // outline) from the crosswalked LEA (or the id directly), seat the dot from `schoolPoint`, else fall
    // to the district box centre (the `"district-centroid"` seed).
    if (grain === "school") {
        const leaKey = opts.districtOf?.(entityKey) ?? entityKey;
        const resolved = resolveClassA("district", leaKey, tierForSize(size));
        const geom = resolved?.geom ?? null;
        const supplied = opts.schoolPoint?.(entityKey);
        const point = supplied ?? viewBoxCenter(geom?.viewBox);
        return {
            mark: "point",
            grain: "district",
            geom,
            point,
            seed: supplied ? "school-point" : "district-centroid",
            label: opts.label ?? geom?.name ?? entityKey,
        };
    }

    // Class A — the baked silhouettes (state/county/district/charter).
    const resolved = resolveClassA(grain, entityKey, tierForSize(size));
    if (resolved) {
        return {
            mark: "glyph",
            grain: resolved.grain,
            id: resolved.geom.id,
            geom: resolved.geom,
            label: opts.label ?? resolved.geom.name,
        };
    }

    // The NEG floor — a Class-A silhouette that did not resolve, or a grain outside the taxonomy. A
    // designed neutral mark, never a crash, never a Lucide pin.
    return { mark: "unknown", grain, label: opts.label ?? entityKey };
}

/**
 * Coerce a raw key to a short LETTER pseudonym for the hub node (the never-incriminate fence). The
 * de-identify supply mints ordinal letters (`"A"`, `"B"`, … `"AA"`); a bare letter passes through, a
 * `"Consultant A"`-style label yields its trailing letter run, and any other string is clamped to its
 * first two UPPERCASE characters — so the node NEVER seats a legible firm name.
 */
function toPseudonym(raw: string): string {
    const s = String(raw).trim();
    const letters = s.match(/[A-Za-z]+$/)?.[0] ?? s;
    if (/^[A-Za-z]{1,3}$/.test(letters)) return letters.toUpperCase();
    return letters.slice(0, 2).toUpperCase() || "?";
}

/**
 * Resolve directly from a `SelectionKey` (the FilterView mini-map path) — the thin adapter that maps
 * the wire `SelectionKind` to its icon `EntityGrain` then resolves. So the mini-map row and the
 * dropdowns share ONE resolver (the folded `resolveMinimapMark`).
 */
export function resolveEntityIconForSelection(
    item: SelectionKey,
    opts: ResolveEntityIconOptions = {},
): EntityIconDescriptor {
    return resolveEntityIcon(item.id, grainForKind(item.kind), opts);
}
