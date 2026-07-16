// platform/composables/useMobileRegister.ts — THE ONE JS PHONE-REGISTER PROBE (J-MOBILE ARM-a · C8).
//
// Consolidates the 8 scattered `useMediaQuery(MQ.phone)` / `useMediaQuery(MQ.touch)` probes
// (Treemap, RankedStrip, NetRetentionMap, BreakEvenScatter ×2, HexMapPlate, SchoolMap,
// SciScatter) behind ONE composable reading the `MQ` strings from breakpoints.ts — so no
// component re-derives the seam string (the literal lives ONLY in breakpoints.ts). Each `is*` is a
// reactive `Ref<boolean>` (the same vueuse `useMediaQuery` contract the call-sites already
// consume via `.value`), so this is a behavior-PRESERVING re-point, not a new abstraction.

import { useMediaQuery } from "@vueuse/core";
import type { Ref } from "vue";
import { MQ } from "../../design/foundations/breakpoints.js";

export interface MobileRegister {
    /** the --phone register (MQ.phone). */
    isPhone: Ref<boolean>;
    /** the --compact register (MQ.compact). */
    isCompact: Ref<boolean>;
    /** the --narrow register (MQ.narrow). */
    isNarrow: Ref<boolean>;
    /** the --touch register (MQ.touch). */
    isTouch: Ref<boolean>;
    /** the --no-hover register (MQ.noHover). */
    isNoHover: Ref<boolean>;
}

/** The §V phone-register probe — the single home for the reactive media-query subscriptions.
    Returns the same `Ref<boolean>` shape the call-sites already read (`isPhone.value` etc.). */
export function useMobileRegister(): MobileRegister {
    return {
        isPhone: useMediaQuery(MQ.phone),
        isCompact: useMediaQuery(MQ.compact),
        isNarrow: useMediaQuery(MQ.narrow),
        isTouch: useMediaQuery(MQ.touch),
        isNoHover: useMediaQuery(MQ.noHover),
    };
}
