// platform/data/routeUniverse.ts — THE ROUTE-UNIVERSE COLLISION GUARD (J-FRAME §3, C37/CH2).
//
// The defect (J-FEEDBACK-5 §7-C37, re-verified on disk): SCI and ECF BOTH mint the SAME composite
// `district:{lea}` key into the ONE global `useSelection` Set. `sci/store/selection.ts:55` mints a raw
// `leaNumber` to `district:{lea}` (the SCI map/scatter producer edge); `ecf/store.ts:203` mints the
// SAME composite key (the ECF choropleth producer edge). The selection store's `selectedIdsOf("district")`
// back-projects by KIND ALONE (selection-contract.ts:78 — the five-kind union has ONE `district` grain),
// so a `district:280400` minted on /sci is INDISTINGUISHABLE from a `district:280400` minted on /ecf. The
// SCI LEA universe ≠ the ECF district universe — a like-keyed district in one route is NOT the same entity
// as the same composite key in the other. Once J-FRAME's `filterDimensions` set-algebra spans like vizzes,
// an un-guarded shared namespace lets a SCI district silently CO-FILTER an ECF viz (and vice-versa).
//
// THE TRANSPOSITION (the route-universe tag; glass-INDEPENDENT, Phase A): namespace the composite key
// by its DATASET-UNIVERSE — the SCI-LEA universe vs the ECF-district universe (J-FRAME open-Q #3: a
// dataset-universe id, NOT the bare route name, so the guard survives a future route-merge and reads as
// the DATA truth — a SCI LEA is not an ECF district even if the composite key matches). The guard is a
// UNIVERSE-SCOPED MEMBERSHIP RELATION: a `district:{lea}` resolved in the SCI route-universe matches ONLY
// SCI-minted districts, never the same composite key minted in the ECF universe.
//
// THE SEAM (do NOT re-author the codec or the selection STATE layer — J-FRAME File-Bounds "Do NOT touch"):
// `selection-contract.ts`'s `{kind}:{id}` codec stays byte-unchanged (the `district` kind is NOT split into
// two kinds — the five-kind union is read-only here), and `useSelection.selectEntity`/`selectedIdsOf` stay
// byte-unchanged (the producer-edge mint + the native-grain back-projection KEEP). The route-universe rides
// ALONGSIDE the composite key in a module-level REGISTRY written at the producer-edge mint and read by the
// universe-scoped membership test — so the raw-leaNumber consumers (`filter.ts` `.has(rawLea)`,
// `selection.ts` `selectedLea`) keep reading RAW ids (the universe is stripped, never folded into the id).
//
// THE ADDITIVE DISCIPLINE: an UNTAGGED key (a canonical `?sel=` deep-link restored through `selectMany`) is universe-AGNOSTIC — it belongs to EVERY universe, so the guard NEVER makes a currently-
// visible district vanish. It ONLY excludes a key minted EXPLICITLY in the OTHER universe. The guard is a
// pure NARROWING of the cross-universe alias, never a regression of the in-universe read.

import type { useSelection } from "@/platform/stores/useSelection";
import {
    encodeSelKey,
    type SelectionKind,
} from "@/charts/contract/selection-contract";

/**
 * The DATASET-UNIVERSE a composite `{kind}:{id}` key lives in — the namespace that disambiguates the
 * SCI↔ECF `district:{lea}` collision (J-FRAME §3, open-Q #3). It is a DATA-universe id (the SCI LEA
 * universe vs the ECF district universe), NOT a route name: a SCI LEA is not an ECF district even where
 * the composite key matches, and the tag survives a future route-merge because it names the DATA truth.
 */
export type RouteUniverse = "sci-lea" | "ecf-district";

/** The SCI district universe — a raw `leaNumber` keyed as `district:{lea}` on /sci (the map/scatter grain). */
export const UNIVERSE_SCI_LEA: RouteUniverse = "sci-lea";
/** The ECF district universe — a raw `leaNumber` keyed as `district:{lea}` on /ecf (the choropleth grain). */
export const UNIVERSE_ECF_DISTRICT: RouteUniverse = "ecf-district";

// ── THE UNIVERSE REGISTRY (the tag that rides ALONGSIDE the composite key) ────────────────────────────
//
// A composite key → the set of universes it was minted in. The store's Set still holds the plain
// `district:{lea}` string (byte-unchanged); this registry records WHICH universe minted it, so the
// membership test can scope the global Set without the key itself carrying the universe (which would
// corrupt the native-grain back-projection every raw-leaNumber consumer reads). A key may be minted in
// MORE than one universe (the rare cross-route deep-link case) — then it legitimately belongs to both.
const universeOf = new Map<string, Set<RouteUniverse>>();

/**
 * Record that `key` was minted in `universe` — the producer-edge tag. Called by `selectInUniverse` at the
 * SCI/ECF store mint, so the composite key carries its universe in the registry without the Set member
 * changing. Idempotent + additive (a re-mint in the same universe is a no-op; a mint in a SECOND universe
 * widens membership).
 */
export function tagUniverse(key: string, universe: RouteUniverse): void {
    let set = universeOf.get(key);
    if (!set) {
        set = new Set<RouteUniverse>();
        universeOf.set(key, set);
    }
    set.add(universe);
}

/**
 * THE UNIVERSE-SCOPED MEMBERSHIP RELATION (the collision guard's core predicate — the gate asserts THIS).
 * Does `key` belong to `universe`? TRUE when the key was minted in `universe`, OR when the key is
 * UNTAGGED (no recorded universe — a canonical `?sel=` deep-link): an untagged key is universe-
 * AGNOSTIC, so the guard never hides a currently-visible district. FALSE exactly when the key was minted
 * in a DIFFERENT universe (and never this one) — the precise cross-universe alias the guard catches: a
 * SCI-minted `district:{lea}` is NOT a member of the ECF universe, so it cannot co-filter an ECF viz.
 */
export function keyInUniverse(key: string, universe: RouteUniverse): boolean {
    const set = universeOf.get(key);
    if (!set || set.size === 0) return true; // untagged → universe-agnostic (additive, never narrows the in-universe read)
    return set.has(universe);
}

/**
 * THE PRODUCER-EDGE MINT, universe-scoped. Tags the composite `{kind}:{id}` key with its route-universe
 * in the registry, THEN routes through the byte-unchanged `selection.selectEntity` (which inherits the
 * toggle-replace algebra + the pin auto-capture verbatim). The SCI/ECF store `setSelected` call-sites
 * swap `selection.selectEntity("district", lea, opts)` for this, naming their universe — so the global Set
 * still holds the plain `district:{lea}` string while the registry records which universe minted it.
 */
export function selectInUniverse(
    selection: ReturnType<typeof useSelection>,
    kind: SelectionKind,
    id: string,
    universe: RouteUniverse,
    opts: { additive?: boolean } = {},
): void {
    tagUniverse(encodeSelKey(kind, id), universe);
    selection.selectEntity(kind, id, opts);
}

/**
 * THE UNIVERSE-SCOPED BACK-PROJECTION — the native-grain read, narrowed to ONE universe. Reads the
 * store's `selectedIdsOf(kind)` (the raw ids of that kind, byte-unchanged), then DROPS any id whose
 * composite key belongs to a DIFFERENT universe. The SCI/ECF store `selectedLea`/`matchByLea` reads swap
 * `selection.selectedIdsOf("district")` for this, naming their universe — so a SCI-minted `district:{lea}`
 * is invisible to the ECF co-filter (and vice-versa), while an untagged deep-link key stays visible to
 * both (the additive discipline). The returned ids are still the RAW grain (the universe is stripped,
 * never folded in), so every downstream `.has(rawLea)` consumer reads UNCHANGED.
 */
export function universeScopedIds(
    selection: ReturnType<typeof useSelection>,
    kind: SelectionKind,
    universe: RouteUniverse,
): Set<string> {
    const out = new Set<string>();
    for (const id of selection.selectedIdsOf(kind)) {
        if (keyInUniverse(encodeSelKey(kind, id), universe)) out.add(id);
    }
    return out;
}

/**
 * Test-only: drop every recorded universe tag. The registry is a module-level singleton (the producer
 * edge writes it once per mint); a gate/unit harness resets it between cases so a prior case's tag cannot
 * leak. Never called in product code.
 */
export function __resetUniverseRegistry(): void {
    universeOf.clear();
}
