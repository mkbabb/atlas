// platform/charts/composables/useGeoPaletteEpoch.ts (J-ARCH §2/§4 — THE FOLDED THEME SEAM).
//
// The ONE settle-epoch-subscribing seam the GeoPlate family host owns, folding the `void mode.value`
// reactivity-poke the geo plates each re-threaded inline (DistrictChoropleth:125, NetRetentionMap:95,
// NormalizationFlip:139). Those pokes existed because each plate re-built its colour scale inline and
// needed it to re-fire on a theme flip — the symptom of the mirrored host scale-rebuild. The fix is
// the deepest-leverage one (J-ARCH §4 / the D6 openQ resolution): `useVizPalette` ALREADY owns the
// POST-SETTLE re-fire via its live `onFlipSettled` settle wire (useVizPalette.ts:285-318), so a scalar
// derived from it re-fires the scale builder on the post-paint settle beat with ZERO plate-side poke.
//
// A plate's scale/option `computed` reads `void geoPaletteEpoch.value` in place of `void mode.value`:
// the rebuild now keys on the engine-owned settle epoch (one subscription, the GATE-D clock unity),
// not a per-plate theme-store read. The poke is the mirror; this is its removal.
//
// GeoPlate.vue consumes this so the engine carries the subscription once; the consumer plates consume
// it too (their script-level scale computeds need the epoch the slot scope cannot reach). Idempotent —
// `useVizPalette` wires the settle subscriber ONCE per module no matter how many callers mount.
import { computed, ref, watch, type ComputedRef } from "vue";
import { useVizPalette } from "./useVizPalette.js";

/**
 * The post-settle palette epoch a geo plate's scale/option builder keys reactivity on (the folded
 * `void mode.value` poke). The returned scalar increments on the post-paint settle beat the
 * `useVizPalette` settle wire bumps — read `void geoPaletteEpoch.value` inside the scale `computed`
 * so a theme flip re-resolves the poles in the SETTLE task, off the critical flip frame.
 */
export function useGeoPaletteEpoch(): ComputedRef<number> {
    const palette = useVizPalette();
    const tick = ref(0);
    // `palette` re-fires on the post-flip settle bump (it tracks `settleEpoch` + `mode` internally and
    // returns a fresh memo object), so a settle beat changes its identity → the watch bumps the tick.
    // The consumer keys its scale rebuild on `tick`, which advances ONLY on the post-settle clock.
    watch(palette, () => tick.value++);
    return computed<number>(() => tick.value);
}
