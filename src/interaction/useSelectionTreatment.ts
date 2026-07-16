// platform/composables/useSelectionTreatment.ts — THE CROSS-VIZ TREATMENT MODEL
// (I-UX.a · UX-S1, the keystone). The ONE composable every interactive primitive reads to
// learn how to paint a mark under the live selection — so a selection made on viz A lights
// the SAME entity on vizzes B/C/D, the atlas's reason to be a COORDINATED atlas rather than
// four separate charts (DESIGN §4.3 "Cross-viz coherence").
//
// THE GAP IT CLOSES. The selection SET (`useSelection.selectedKeys`) has been grain-agnostic
// and fully built since the F-arc, and `GeoChoropleth` has framed its OWN marks since C — but
// the scatters/strips/band-cake/treemaps never read `selectedKeys`, so a selection has only
// ever lit the PRODUCING viz. The set was always there; the cross-viz READBACK was the missing
// one composable. This is it: a primitive binds `useSelectionTreatment(key)` per mark and
// applies the three flags — no per-viz re-derivation of "am I selected / dimmed / primary".
//
// THE THREE FLAGS (the per-mark treatment a primitive applies):
//   • selected  — this mark IS in the live set → the brightened/ringed focus state.
//   • dimmed    — ANY selection is live AND this mark is NOT in it → the desaturate-toward-ink
//                 RECEDE (the §SELECTION dim token pair, the DIM LAW: deliberately receded, NOT
//                 an opacity-to-cream wash that reads as gone — fb-filters FB-5).
//   • isPrimary — this mark equals `primaryKey` → the gilt-rim tier (the §N6 / DESIGN §4.3
//                 one-gilt-at-a-time law; a strict subset of `selected`).
//   • neutral   — the resting state (`!selected && !dimmed`) when the SET IS EMPTY: off === off,
//                 no mark recedes when nothing is picked.
//
// GRAIN-AGNOSTIC BY CONSTRUCTION. The composable never parses the key — it only equates against
// the opaque-string set the store holds, exactly as `useSelection` does. A primitive passes the
// composite `{kind}:{id}` key its own producer minted; the membership test is a plain `Set.has`.
//
// THE STORE STAYS THE SoR. This is a pure READER — it adds no state, only reads `selectedKeys`/
// `primaryKey` off the one store. The `dimmed` VISUAL is the §SELECTION token's job (the CSS the
// primitive's `dimmed:` branch applies); this composable only decides WHICH branch fires.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { useSelection } from "../platform/stores/useSelection.js";

/** The per-mark treatment a primitive applies under the live selection. Mutually consistent by
    construction: `selected` and `dimmed` are never both true (a key is in the set or it is not);
    `isPrimary ⊆ selected`; all three false ⇒ the neutral resting state (an empty set). */
export interface SelectionTreatment {
    /** This mark is in the live set — the brightened/ringed focus state. */
    selected: boolean;
    /** A selection is live and this mark is NOT in it — the desaturate-toward-ink recede (the
        §SELECTION dim token, the DIM LAW). False when the set is empty (off === off). */
    dimmed: boolean;
    /** This mark equals `primaryKey` — the gilt-rim tier (a strict subset of `selected`). */
    isPrimary: boolean;
}

/**
 * The cross-viz treatment for one mark's `key`. Reads the grain-agnostic `selectedKeys`/
 * `primaryKey` off the ONE selection store and returns the reactive `{selected, dimmed,
 * isPrimary}` a primitive binds per mark.
 *
 * `key` is `MaybeRefOrGetter` so a `v-for` mark can pass a getter (`() => s.key`) and the
 * treatment tracks a re-keyed mark without a re-mount — the idiom every other platform
 * composable takes (`toValue` resolves a ref / getter / plain string the same tick).
 *
 *   selected  ⇔ the set HAS the key.
 *   dimmed    ⇔ the set is NON-EMPTY and does NOT have the key.
 *   isPrimary ⇔ the key EQUALS `primaryKey`.
 *   neutral   ⇔ the set is EMPTY (both selected and dimmed false) — nothing recedes.
 */
export function useSelectionTreatment(
    key: MaybeRefOrGetter<string>,
): ComputedRef<SelectionTreatment> {
    const selection = useSelection();
    return computed<SelectionTreatment>(() => {
        const k = toValue(key);
        const set = selection.selectedKeys;
        const selected = set.has(k);
        // The DIM LAW gate: a mark recedes ONLY when SOMETHING is selected and this is not it.
        // An empty set means no selection is live, so NOTHING dims (off === off, the neutral floor).
        const dimmed = set.size > 0 && !selected;
        return {
            selected,
            dimmed,
            isPrimary: k === selection.primaryKey,
        };
    });
}
