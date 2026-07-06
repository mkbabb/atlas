// platform/composables/useAtmosphereTier.ts — THE ATMOSPHERE DEVICE-TIER LADDER (O-F5 · motion-arch
// §2.3 · the device selector). The ONE place the atmosphere's device ladder (tier A high / B mid /
// C low) is derived; both backdrop consumers (`Aurora.vue`, `Constellation.host.vue`) READ this
// surface and gate their own richness/motion off it — no per-component re-derivation.
//
// WHY THE LADDER IS ATLAS-SIDE NOW (the TREE governs). glass-ui 4.2.0's `resolveRenderMode`
// RETIRED its device heuristics (BC.W-VIZ-AURORA T1): the `hardwareConcurrency <= 4` / `saveData`
// falls are GONE, so `renderMode="auto"` arms WebGL on every capable device (only a detected
// SOFTWARE rasteriser still falls to css). The library therefore no longer picks a device tier for
// the field — so the ATLAS side owns it. O-F2 already holds the substrate OFF the shader by default
// (css-baked), so this ladder is NOT about arming WebGL; it grades the CSS field's RICHNESS + MOTION:
//   • tier A (high) — the full pole-derived CSS-baked gradient WITH the scroll Tide (the nuclei
//     drift as the page scrolls) + the static-baked constellation + the breathing brand fleck.
//   • tier B (mid)  — the same rich CSS gradient, but the Tide/drift is OFF (a static field); the
//     constellation stays its static bake; the fleck breath freezes.
//   • tier C (low)  — a flat 2-stop wash (the 2+2+1 rule-of-thirds field collapses to one warm +
//     one cool lobe); the fleck freezes. PRM / save-data / a low-core device land HERE.
//
// PRM LANDS TIER C (motion-arch §2.3 — the half-wired close). Reduced-motion is folded into the
// signal so PRM resolves the fully-static low tier — a strict superset of the O-F4 belt's PRM park
// (the belt zeroes the per-frame LOOP; the tier zeroes the field's structural MOTION so nothing has
// to be parked in the first place). The carried O-F1 finding stands: on THIS prod build PRM already
// fully quiets the backdrop (0 gpuPresent / 0 UpdateLayer / 0 rAF, all 8 routes) — so this wave's
// PRM arm VERIFIES + LOCKS that quiet (the o0-atmosphere-prm-quiet standing gate), it does not fix a
// half-wire.
//
// THE SIGNAL IS A MOUNT-TIME SNAPSHOT (glass-ui's contract: "the device tier is a mount-time
// decision, not a reactive one" — a connection-type flip mid-session does not re-tier; the consumer
// remounts to re-evaluate). The ONE reactive leg is PRM: `useReducedMotion` tracks a live OS flip so
// an un-reduce mid-session lifts C→A/B without a remount. SSR-safe (no `navigator` → assume a capable
// device, tier A — never a false downgrade, the `isSoftwareWebGLRenderer` principle). The device
// legs are DI-injectable (the `useAtmosphereActivity` DI style) so a test drives a tier without a
// real device.

import {
    computed,
    toValue,
    type ComputedRef,
    type MaybeRefOrGetter,
} from "vue";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { prefersReducedData } from "@/data/dataSaver";

/** The three atmosphere tiers (motion-arch §2.3). A = high (rich field + Tide), B = mid (rich field,
    static), C = low (flat 2-stop wash, static). PRM / save-data / a low-core device land C. */
export type AtmosphereTier = "A" | "B" | "C";

/** The raw device signal the pure ladder resolves over. `cores`/`memory` are `0` when the host does
    not report them (SSR / a browser without the API) — the resolver reads `0` as "unknown", never as
    "low" (no false downgrade). */
export interface AtmosphereDeviceSignal {
    /** `navigator.hardwareConcurrency` — logical cores; `0` when unknown. */
    cores: number;
    /** `navigator.deviceMemory` — coarse GiB (Chromium only); `0` when unknown. */
    memory: number;
    /** the Save-Data / `prefers-reduced-data` frugality signal. */
    saveData: boolean;
    /** `prefers-reduced-motion: reduce`. */
    reducedMotion: boolean;
}

/** ≥ this many logical cores (with no C signal) ⇒ the HIGH tier A. */
export const TIER_A_MIN_CORES = 8;
/** ≤ this many logical cores ⇒ the LOW tier C (a base-tier / throttled device). */
export const TIER_C_MAX_CORES = 4;
/** ≤ this many reported GiB ⇒ the LOW tier C (a memory-constrained device). */
export const TIER_C_MAX_MEMORY = 2;

/**
 * THE PURE LADDER — resolve a device signal to a tier (pure, unit-testable, SSR-safe). Order:
 *   1. reduced-motion OR save-data ⇒ C (the user asked for the still, frugal field).
 *   2. a KNOWN low-core (≤4) or low-memory (≤2 GiB) device ⇒ C.
 *   3. a KNOWN high-core (≥8) device, OR an UNKNOWN device (cores `0` — SSR / assume capable) ⇒ A.
 *   4. everything between (5–7 cores) ⇒ the mid tier B.
 * `0`/unknown is never read as "low": an unmeasurable device gets the rich default (the
 * `isSoftwareWebGLRenderer` conservative-never-downgrade principle), not the flat wash.
 */
export function resolveAtmosphereTier(s: AtmosphereDeviceSignal): AtmosphereTier {
    if (s.reducedMotion || s.saveData) return "C";
    if (s.cores > 0 && s.cores <= TIER_C_MAX_CORES) return "C";
    if (s.memory > 0 && s.memory <= TIER_C_MAX_MEMORY) return "C";
    if (s.cores === 0 || s.cores >= TIER_A_MIN_CORES) return "A"; // ≥8 cores, or unknown → assume capable
    return "B"; // the mid band: 5–7 known cores
}

/** Tuning + dependency-injection surface. The device legs default to the live `navigator` read; the
    PRM leg defaults to the reactive `useReducedMotion`. All injectable for DI/tests (the
    `useAtmosphereActivity` DI style). */
export interface UseAtmosphereTierOptions {
    /** The reduced-motion fence. Defaults to `useReducedMotion()` (reactive); injectable for tests. */
    reducedMotion?: MaybeRefOrGetter<boolean>;
    /** The save-data fence. Defaults to a mount-time `prefersReducedData()` snapshot; injectable. */
    saveData?: MaybeRefOrGetter<boolean>;
    /** Override the device legs (`cores`/`memory`) — a test drives a tier without a real device. */
    device?: Partial<Pick<AtmosphereDeviceSignal, "cores" | "memory">>;
}

/** The ladder surface both backdrop consumers read (all read-only to them). */
export interface UseAtmosphereTierReturn {
    /** THE RESOLVED TIER — `"A"` | `"B"` | `"C"`. Reactive on PRM; the device legs are a mount-time
        snapshot. Surfaced on `[data-atmosphere-tier]` by the consumers so a probe/gate can read the
        picked tier off the built route. */
    tier: ComputedRef<AtmosphereTier>;
    /** TIER A ONLY — the field MOTION is live: the aurora scroll Tide (nuclei drift) runs and the
        brand fleck breathes. `false` at B/C ⇒ a fully static field (no drift/Tide, frozen fleck). */
    tide: ComputedRef<boolean>;
    /** TIER C ONLY — the aurora collapses from the 2+2+1 rule-of-thirds field to a flat 2-stop wash
        (one warm + one cool lobe). `false` at A/B ⇒ the full pole-derived gradient. */
    flatWash: ComputedRef<boolean>;
}

/**
 * THE ATMOSPHERE DEVICE-TIER SELECTOR. Reads the mount-time device snapshot + the reactive PRM fence,
 * folds them through {@link resolveAtmosphereTier}, and projects the tier into the two richness/motion
 * gates the backdrop consumes. See the file header for the ladder + the PRM-lands-C doctrine.
 */
export function useAtmosphereTier(
    opts: UseAtmosphereTierOptions = {},
): UseAtmosphereTierReturn {
    // The reactive PRM leg — the ONE live source (an un-reduce mid-session re-tiers without a remount).
    const reduced: MaybeRefOrGetter<boolean> =
        opts.reducedMotion ?? useReducedMotion();

    // The mount-time device snapshot — cores / memory / save-data read ONCE (glass-ui's "device tier
    // is a mount-time decision"). SSR-safe: no `navigator` → `0` (unknown → the resolver assumes
    // capable). `deviceMemory` is Chromium-only, typed defensively (it is not on the DOM `Navigator`).
    const hasNav = typeof navigator !== "undefined";
    const cores =
        opts.device?.cores ?? (hasNav ? navigator.hardwareConcurrency || 0 : 0);
    const memory =
        opts.device?.memory ??
        (hasNav
            ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0
            : 0);
    const saveData: MaybeRefOrGetter<boolean> =
        opts.saveData ?? prefersReducedData();

    const tier = computed<AtmosphereTier>(() =>
        resolveAtmosphereTier({
            cores,
            memory,
            saveData: toValue(saveData),
            reducedMotion: toValue(reduced),
        }),
    );

    const tide = computed<boolean>(() => tier.value === "A");
    const flatWash = computed<boolean>(() => tier.value === "C");

    return { tier, tide, flatWash };
}
