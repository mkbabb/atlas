// platform/data/minimapMark.ts — THE GRAIN-AWARE MINI-MAP RESOLVER (J-FILTER §4 · arm c).
//
// THE PROBLEM (j0-filter-minimap, J-FEEDBACK-4 §5 / J-FEEDBACK-5 Decision 1). The FilterView card's
// mini-map row paints ONE mark per selected entity, and the mark must be GRAIN-AWARE: a SPATIAL grain
// (state · territory · county · district · charter) wants its REAL silhouette (the `<Glyph>` the geo
// producers already draw), but a truly-ASPATIAL grain (a speedtest `cell` — a hex bin, no polygon; an
// ECF `firm` — a broker, no administrative boundary) has NO silhouette, so a `<Glyph>` would paint the
// VOID-RING — the empty dashed placeholder that reads as "missing geometry," a lie. The mini-map must
// resolve SOME honest mark for EVERY selected entity: a Glyph where a geom resolves, a kind-icon where
// it cannot. NEVER the void-ring, NEVER blank.
//
// THE SEAM (the resolver the FilterView mini-map CONSUMES — J-FILTER renders the row, this resolves the
// mark; J-GLYPH owns the silhouette FACILITY underneath). `resolveMinimapMark(item, size)` switches on
// the parsed `SelectionKind` and returns a DISCRIMINATED descriptor:
//   • a `"glyph"` mark — the spatial grain resolved a `GlyphGeom` through `entityGeometry`'s family
//     (`stateGlyph`/`countyGlyph`/`districtGlyph`/`charterGlyph`); the FilterView paints a `<Glyph>`.
//     The `district` kind is tried through BOTH `districtGlyph` (the true LEA silhouette) AND
//     `charterGlyph` (the charter heuristic polygon) — SCI mints `district:{lea}` for both grains, so a
//     charter LEA that misses the district registry falls through to its charter catchment rather than
//     the void-ring (J-GLYPH Decision 1 — the charter grain resolves a REAL polygon, never a proxy).
//   • an `"icon"` mark — the aspatial grain (`cell`/`firm`), or a spatial grain whose geometry has not
//     yet resolved-to-non-null (a junk id, a registry tier still loading); the FilterView paints a
//     `StatusDot`/Lucide kind-icon. The `cell` carries its `cellPlace` name (resolved by the consumer —
//     this resolver names the icon + the fallback label only, never reaches into the speedtest feed).
//
// THE ASPATIAL FLOOR (the open-Q-3 recommendation). `cell` → a hex-outline kind-icon (`hexagon`) — it
// IS a hex bin, so a hex glyph reads honestly; `firm` → a generic `building-2` kind-icon (a broker has
// no geom silhouette, so a neutral kind-icon is the honest mark, NOT a faked map shape). Both are
// `"icon"` descriptors so the FilterView mini-map paints a kind-icon, not a Glyph void-ring.
//
// THE FENCE (root-repo law / arm-c bounds). This helper RESOLVES the mark; it does NOT mint a glyph,
// re-author the `entityGeometry` resolver, or carry a per-grain proxy (J-GLYPH owns the silhouette
// facility — the territory/charter polygons are its bake). The `school` kind routes through the
// district resolver (the SCI school-grain is a district LEA under the hood — `schoolCode→leaNumber`).

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

/**
 * The kind-icon token for an aspatial (or unresolved) grain — a Lucide icon NAME the FilterView
 * mini-map renders as the fallback mark. NOT a magic string per call: the ONE place the per-kind
 * fallback icon is named, so the kind-icon reads consistently wherever the mini-map paints.
 */
export type MinimapIconKind = "hexagon" | "building-2" | "map-pin";

/**
 * A GLYPH mini-map mark — a spatial grain that resolved a real silhouette. The FilterView paints a
 * `<Glyph :grain :id :geom>` (the SAME silhouette the geo producers draw). `fallback` is UNSET by
 * construction (the void-ring path is never a glyph mark — an unresolved geom becomes an `"icon"`
 * mark instead, so the FilterView never hands `<Glyph>` a null geom).
 */
export interface MinimapGlyphMark {
    mark: "glyph";
    /** The `<Glyph>` grain the silhouette draws through (state | county | district). */
    grain: GlyphGrain;
    /** The feature key the glyph resolved (the state FIPS / county FIPS5 / district GEOID / charter LEA). */
    id: string;
    /** The resolved silhouette — guaranteed non-null (an unresolved geom routes to an `"icon"` mark). */
    geom: GlyphGeom;
    /** The human label (the geometry's own name) — the accessible name + the mini-map caption. */
    label: string;
}

/**
 * A KIND-ICON mini-map mark — an aspatial grain (`cell`/`firm`), or a spatial grain whose geometry has
 * not resolved (a junk id / a registry tier still loading). The FilterView paints a Lucide kind-icon /
 * `StatusDot`, NEVER the Glyph void-ring. The `label` names the entity (a `cellPlace` name for a cell,
 * the firm name for a firm, the raw id as a last resort).
 */
export interface MinimapIconMark {
    mark: "icon";
    /** The kind the icon stands for (drives the icon glyph + the accessible kind read). */
    kind: SelectionKind;
    /** The Lucide icon token the mini-map paints (hexagon for a cell, building-2 for a firm). */
    icon: MinimapIconKind;
    /** The human label (the cellPlace name / firm name / raw id) — the mini-map caption + a11y name. */
    label: string;
}

/** The resolved mini-map mark — a discriminated union the FilterView switches on (`mark === "glyph"`
    paints a `<Glyph>`; `mark === "icon"` paints a kind-icon). EVERY selected entity resolves to ONE of
    these — never a void-ring, never blank (the j0-filter-minimap law). */
export type MinimapMark = MinimapGlyphMark | MinimapIconMark;

/**
 * The kind-icon token for an aspatial / unresolved grain — the ONE per-kind fallback icon map. `cell`
 * is a hex bin (a `hexagon` reads honestly), `firm` is a broker (a neutral `building-2`); any other
 * unresolved grain falls to a `map-pin` (a generic place mark). The FilterView renders this token.
 */
function iconForKind(kind: SelectionKind): MinimapIconKind {
    switch (kind) {
        case "cell":
            return "hexagon";
        case "firm":
            return "building-2";
        default:
            return "map-pin";
    }
}

/**
 * Resolve a SPATIAL grain's silhouette through the `entityGeometry` family — or `null` when no geometry
 * resolves (an out-of-registry id, a registry tier still loading). The `district` grain is tried through
 * BOTH `districtGlyph` (the true LEA silhouette) AND `charterGlyph` (the charter heuristic polygon),
 * since SCI mints `district:{lea}` for both grains — a charter LEA that misses the district registry
 * falls through to its charter catchment rather than the void-ring. The `school` kind is a district LEA
 * under the hood (the SCI `schoolCode→leaNumber` grain), so it routes through the district path too.
 * Returns `null` for an aspatial grain (`cell`/`firm`) — the caller floors to a kind-icon.
 */
function resolveGlyphGeom(
    kind: SelectionKind,
    id: string,
    size: GlyphSize,
): { grain: GlyphGrain; geom: GlyphGeom } | null {
    switch (kind) {
        case "state": {
            const geom = stateGlyph(id, size);
            return geom ? { grain: "state", geom } : null;
        }
        case "county": {
            const geom = countyGlyph(id, size);
            return geom ? { grain: "county", geom } : null;
        }
        case "district":
        case "school": {
            // A district LEA first — the true administrative silhouette. A charter LEA misses the
            // district registry, so fall through to its heuristic catchment (J-GLYPH Decision 1 — the
            // charter grain resolves a REAL polygon, never the retired county-proxy). Both paint
            // through the `district` `<Glyph>` grain (the charter polygon is a district-grain mark).
            const district = districtGlyph(id, size);
            if (district) return { grain: "district", geom: district };
            const charter = charterGlyph(id, size);
            return charter ? { grain: "district", geom: charter } : null;
        }
        default:
            // `cell` / `firm` — aspatial, no silhouette. The caller floors to a kind-icon.
            return null;
    }
}

/**
 * THE GRAIN-AWARE MINI-MAP RESOLVER (the j0-filter-minimap predicate's core — the FilterView mini-map
 * consumes this for EVERY selected entity). Resolves the parsed selection item to ONE honest mini-map
 * mark:
 *   • a `"glyph"` mark when the spatial grain resolved a real silhouette (the `<Glyph>` the geo
 *     producers draw — `fallback` UNSET, never the void-ring);
 *   • an `"icon"` mark otherwise — the aspatial `cell`/`firm` grains (a hex outline / a generic mark),
 *     OR a spatial grain whose geometry has not yet resolved (a junk id, a registry tier still loading)
 *     — so the mini-map ALWAYS paints SOME mark, never a blank, never the empty Glyph void-ring.
 *
 * `cellLabel` is the consumer's place-name resolver for a `cell` (the speedtest `cellPlace(h3)` —
 * passed in so this platform helper never reaches into the speedtest feed); when omitted (or it returns
 * null) the cell falls to its raw id. `size` is the `<Glyph>` LOD rung (default `hero` — the FilterView
 * card stage; an `md` for the compact +N overflow chip).
 */
export function resolveMinimapMark(
    item: SelectionKey,
    opts: {
        size?: GlyphSize;
        /** A `cell`'s place-name resolver (the speedtest `cellPlace`) — keeps this platform helper off
            the speedtest feed. Returns the human place name, or null/undefined for an unresolved cell. */
        cellLabel?: (id: string) => string | null | undefined;
    } = {},
): MinimapMark {
    const size = opts.size ?? "hero";
    const resolved = resolveGlyphGeom(item.kind, item.id, size);
    if (resolved) {
        return {
            mark: "glyph",
            grain: resolved.grain,
            id: resolved.geom.id,
            geom: resolved.geom,
            label: resolved.geom.name,
        };
    }
    // The kind-icon floor — an aspatial grain, or a spatial grain whose geometry has not resolved. The
    // `cell` carries its place name (the consumer's `cellPlace`); the `firm`/the rest carry the raw id.
    const label =
        item.kind === "cell" ? (opts.cellLabel?.(item.id) ?? item.id) : item.id;
    return {
        mark: "icon",
        kind: item.kind,
        icon: iconForKind(item.kind),
        label,
    };
}
