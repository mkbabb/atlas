// platform/composables/useThemeReactiveOption.ts (J-ARCH §4 — THE STRAGGLER THEME SEAM).
//
// The ONE settle-epoch-subscribing builder wrapper the two NON-family canvas stragglers consume,
// folding the `void mode.value` reactivity-poke they each re-threaded inline (ChartersTreemap:143,
// ConsultantsRankedBar:87). Those two plates host the SINGLE-consumer Treemap/RankedBar primitives —
// below the ≥2-consumer family threshold (J-ARCH §2), so they are explicitly OUT of the GeoPlate
// family engine (the other 3 geo pokes EVAPORATE into that host via `useGeoPaletteEpoch`). Their
// scale builder re-reads the `--viz-sequential-*` ramp poles off the cascade (via `makeSequentialScale`
// → `ColorScale.readVar`, memoized per `.dark` state and busted on the settle beat by `clearVarMemo`),
// so it must re-fire on a theme flip — the `void mode.value` poke was that trigger.
//
// THE TRANSPOSITION (the deepest-leverage one, J-ARCH §4 / the D6 openQ resolution): `useVizPalette`
// ALREADY owns the POST-SETTLE re-fire via its live `onFlipSettled` settle wire (useVizPalette.ts:285-318)
// — it busts the canvas-string AND the SVG-blend colour memos on the same post-paint settle beat. So a
// builder keyed on a scalar derived from it re-runs on that settle clock (the GATE-D clock unity), off
// the critical flip frame, with ZERO plate-side poke. This wrapper IS that seam: hand it the builder,
// it returns the ready `ComputedRef` that re-derives on the post-settle epoch.
//
//   const scale = useThemeReactiveOption(() =>
//       makeSequentialScale({ values: …, mode: "quantile" }),
//   );
//
// The plate reads `scale.value(…)` exactly as before — the `void mode.value` poke is structurally gone,
// proven unnecessary: the re-tint fires from the settle epoch the wrapper keys on, not the deleted poke.
// Idempotent — `useVizPalette` wires the settle subscriber ONCE per module no matter how many wrappers
// mount. (The sibling `useGeoPaletteEpoch` exposes the bare epoch SCALAR for the family host's slot
// scope; this exposes the BUILT option for a script-local scale — the same settle clock, two shapes.)
import { computed, type ComputedRef } from "vue";
import { useVizPalette } from "./useVizPalette.js";

/**
 * Wrap a theme-sensitive option/scale `builder` so it re-derives on the POST-SETTLE palette epoch (the
 * folded `void mode.value` poke). The returned `computed` keys reactivity on `useVizPalette` — which
 * re-fires on the post-paint settle beat its `onFlipSettled` wire bumps (and tracks `mode` internally),
 * returning a fresh memo object each settle — so `builder()` re-runs AFTER the cascade has settled, off
 * the critical flip frame. The builder reads no argument; it closes over the plate's reactive inputs
 * (the data values), so a data change re-derives through Vue's normal dep tracking and a THEME change
 * re-derives through the palette epoch. ONE seam, never an inline poke.
 */
export function useThemeReactiveOption<T>(builder: () => T): ComputedRef<T> {
    const palette = useVizPalette();
    return computed<T>(() => {
        // Track the post-settle palette epoch (the primary theme clock): reading `palette.value` keys
        // this computed on the settle bump the `onFlipSettled` wire drives, so a dark flip re-runs the
        // builder against the SETTLED cascade. NOT a cache key — the builder reads fresh poles itself.
        void palette.value;
        return builder();
    });
}
