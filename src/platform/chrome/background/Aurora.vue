<script setup lang="ts">
// Aurora — a THIN glass-ui <Aurora> consumer (C.W6.a Scope 2; fd-atmosphere-suffusion §3
// AS-1). It is the WebGL painterly field behind every DATA surface: one canvas the dock,
// the floating filter, and the resting plates all read THROUGH, the page-glow that fills
// the dark-on-dark voids so a dark instrument never bottoms out to flat black.
//
// THE RE-POINT (the AT-1 root-fix). This component used to be two CSS radial-gradient
// blooms (filter:blur(40px), a 38s autonomous CSS drift) — a NET DECREASE in glass-ui
// suffusion vs the deployed WebGL field, and (fatally) a field with NO `config` to push,
// so the W5 Tide could not couple to it. It is now the canonical consumer: it computes
// nothing of the shader itself — its only job is to choose WHICH surface's poles the field
// derives from and hand glass-ui's <Aurora> the pole-derived reactive AuroraConfig.
//
// POLE-DERIVED, PER DASHBOARD (FD6 §5.2; N.WD2 §4.D2 the ruled departure). The config comes from
// useAuroraConfig, which derives the 5-stop palette + the 2+2+1 nuclei ENTIRELY from the route's
// DECLARED atmosphere poles (or its chromeIdentity legs — the D6 default) through the canonical OKLab
// matrix (oklab.ts — the B3.1 root-fix; NEVER value.js mixColorsN), so page-glow IS data-glow. The
// hardcoded three-slug switch is DELETED: the poles are declared on the instance context, resolved
// late through the EXISTING resolveColorsBatch bridge. Absent a context (the gallery never mounts this
// — it is a brand surface — but SSR/an unknown route can) it falls back to the NEUTRAL paper wash, NOT
// USF's tide (the deliberate D2.5 delta — an unknown route never wears the fund's directional currents).
//
// THE f(p) TIDE rides LIVE (C6's Aurora-`p` BIND close obligation). useAuroraConfig reads
// C5's useDocumentScrollProgress() and lerps the nuclei y / valueBias against it; the push
// is glass-ui's reactive-config deep-watch (NO imperative instance.update — it ships none),
// so the field breathes with the real scroll and reverses on scroll-up.
//
// THE CEILING — the felt-but-DEFT compositing envelope, now OWNED by useAuroraConfig (J-CLOSE
// re-gate · arm b). `opacityCeiling` is the OUTER compositing envelope glass-ui applies uniformly
// to the canvas AND the CSS placeholder (via `--aurora-opacity-ceiling`): the maximum opacity the
// whole aurora surface ever composites at. The atmosphere-aurora gate (render-matrix (b)) clamps the
// LIGHT envelope to the deft floor (≤ 0.10): on the warm near-white data ground a brighter envelope
// reads as a wash AND bleeds the warm centre through the translucent floating dock plate, lighting
// its centre past the Bug-1 radial-glow floor. So the ceiling is 0.10 light / 0.12 dark — FELT at
// rest yet subliminal: the data plates float on glass with their OWN opaque surface, so the field
// behind them never darkens a number below its legibility floor, and the dock plate reads as an even
// glass plate.
//
// THE O-F2 CSS-BAKED DEFAULT (idle-burn fix 1 of 3; motion-arch §2.1 MOVE 1 · §2.4 · §4.2). The field
// no longer runs a per-frame WebGPU program to paint a subliminal wash. `render-mode` DEFAULTS to
// `"css"`: glass-ui paints the SAME pole-derived pigment as a stack of radial-gradients positioned at
// the `useAuroraConfig` nuclei x/y (`auroraFallbackGround(config)`) — 0 live WebGPU contexts, 0 present
// loop, 0 `writeBuffer` on scroll, near-zero idle. The Tide (nuclei `y` lerp on `p`) survives at parity:
// the config stays reactive, so a scroll re-lays the CSS radial-gradient stops on the compositor with NO
// GPU frame — the same breath, off the shader. At the 0.10/0.12 ceiling behind opaque data plates the
// dropped fBm warp is imperceptible (motion-arch §2.1 "on killing WebGPU"), so this is a visual parity,
// not a downgrade. WebGPU stays OFF the default path for ANY route; the `shader` prop is the explicit
// HIGH-TIER opt-in (a future hero/brand moment) that arms `render-mode="webgl"` — never ambient chrome.
//
// STALE-SPEC NOTE (the TREE governs): the wave + motion-arch premise that `render-mode="auto"` degrades
// to CSS on low-power/PRM/save-data is OUTDATED — glass-ui's BC.W-VIZ-AURORA (T1) RETIRED those falls;
// `"auto"` now arms WebGL on EVERY capable device (only a detected software rasteriser falls to css). So
// the CSS default is set EXPLICITLY as `"css"`, not reached through `"auto"`. Reduced-motion is carried
// by the O-F4 belt (`useAtmosphereActivity`) + glass-ui's live `matchMedia` freeze on the opt-in path.
//
// THE PER-SURFACE COMPOSITED TABLE (one ceiling per theme, the deft floor):
//   surface  ceiling(L)  ceiling(D)   note
//   USF/SCI/  .10         .12          the diverging/rainbow data ground — felt, deft, subliminal.
//   ECF                                The ceiling is per-THEME (dark stock absorbs more) and lives
//                                      in useAuroraConfig now. What differs per route is the DECLARED
//                                      DEPOSITION (N.WD2 §4.D2 — the atmosphere facet's
//                                      granulation/breath/huePath + warm-current elongation, clamped
//                                      to the D6 envelope), riding the SAME PAPER_WASH_GROUND crayon
//                                      floor (MOVE 1) — many GROUNDS, one ceiling.
import { inject, ref, watchPostEffect } from "vue";
import { Aurora as GlassAurora } from "@mkbabb/glass-ui/aurora";
import type { AuroraRenderMode } from "@mkbabb/glass-ui/aurora";
import { DASHBOARD_KEY } from "@/contract";
import { useAuroraConfig } from "@/platform/chrome/background/composables/useAuroraConfig";
import { useAtmosphereActivity } from "@/platform/chrome/background/composables/useAtmosphereActivity";
import { useAtmosphereTier } from "@/platform/chrome/background/composables/useAtmosphereTier";

// THE HIGH-TIER SHADER OPT-IN (O-F2 · motion-arch §2.1 "on killing WebGPU"). The default is the
// CSS-baked field (0 WebGPU); `shader` is the ONLY door back to the WebGPU substrate — an explicit,
// deliberate high-tier opt-in for a future hero/brand moment, resolved once at mount (glass-ui's
// render-mode is a mount-time decision). No route opts in today, so every DATA route rides the CSS field.
const { shader = false } = defineProps<{ shader?: boolean }>();

// The render substrate: CSS-baked pole-derived gradient by default (the O-F2 promotion), WebGPU ONLY
// behind the explicit high-tier `shader` opt-in. NOT `"auto"` — glass-ui's `"auto"` arms WebGL on every
// capable device (BC.W-VIZ-AURORA retired the low-power/PRM/save-data css falls), so `"css"` is set
// explicitly to hold the default off the shader.
const renderMode: AuroraRenderMode = shader ? "webgl" : "css";

// The active dashboard context — the field derives its poles from the route's DECLARED atmosphere
// (N.WD2 §4.D2 — the ruled departure; the hardcoded three-slug switch is DELETED). Absent (SSR / an
// unknown route) → the NEUTRAL paper wash, NOT USF's tide (the deliberate D2.5 delta, render-matrix-
// verified): an unknown route never wears the fund's directional currents.
const ctx = inject(DASHBOARD_KEY, undefined);

// The pole-derived reactive config + the live Tide scalar (the f(p) seam) + the theme-aware
// compositing ceiling. useAuroraConfig resolves the route's declared → chromeIdentity → NEUTRAL
// atmosphere ladder (the DOM pole resolution rides the EXISTING resolveColorsBatch bridge). The config
// is a reactive AuroraConfig glass-ui deep-watches; we hand it straight to <Aurora :config>. The
// ceiling is OWNED by useAuroraConfig (J-CLOSE re-gate arm b): the aurora's light-stock envelope is the
// DEFT FLOOR by composition (0.10 light / 0.12 dark), so the field stays subliminal on the warm
// near-white ground and never bleeds the warm centre through the translucent floating dock plate.
// THE O-F5 DEVICE-TIER LADDER (motion-arch §2.3). The shared `useAtmosphereTier` selector grades the
// CSS field's richness + motion off the device signal (cores / memory / save-data / PRM): tier A =
// the full pole-derived gradient WITH the scroll Tide, B = the same gradient FROZEN (no Tide/drift),
// C = a flat 2-stop wash. PRM lands tier C. The gates are HANDED to useAuroraConfig (the ONE
// derivation — no per-component tier logic); `tier` is surfaced on the wrapper for the standing gate.
const { tier, tide, flatWash } = useAtmosphereTier();

const { config, opacityCeiling } = useAuroraConfig(() => ctx, { tide, flatWash });

// THE O-F4 ACTIVITY BELT (motion-arch §2.1 MOVE 4). glass-ui's <Aurora> exposes imperative
// `pause()`/`resume()` (the substrate's "manual" suspend reason). The belt drives them off the ONE
// `active` signal so the WebGPU present loop ZEROES when the tab is hidden / idle > 4 s / under PRM,
// and resumes on the reader's return — the atlas-side lever O-F1 proved parks the loop the breath
// scalar alone cannot reach, WITHOUT touching glass-ui. The last frame stays composited (a frozen
// wash, never cleared), so the idle park is graceful, not a vanish. `watchPostEffect` runs after the
// DOM flush so the template ref is live, and re-runs only when `active` (or the ref) changes.
//
// O-F2 COMPOSITION: on the CSS default path there is NO present loop to park, so `pause()`/`resume()`
// are safe no-ops (glass-ui only arms them for the WebGL runtime) — the belt lever is inert by
// construction. The wiring stays intact so the belt still governs the `shader` opt-in path unchanged.
const auroraRef = ref<InstanceType<typeof GlassAurora> | null>(null);
const { active } = useAtmosphereActivity();
watchPostEffect(() => {
    const inst = auroraRef.value;
    if (!inst) return;
    if (active.value) inst.resume?.();
    else inst.pause?.();
});
</script>

<template>
    <!-- The thin glass-ui consumer. The pole-derived config + the live Tide ride through
         the reactive :config; the ceiling clamps the composite to the deft floor;
         `render-mode` is CSS-baked by default (the O-F2 idle-burn cure — the nuclei paint as a
         reactive radial-gradient stack, 0 WebGPU), WebGPU only behind the `shader` opt-in. The
         wrapper is fixed-to-viewport and one rung below the content track (the backdrop, never an
         overlay). -->
    <div
        class="aurora"
        aria-hidden="true"
        data-testid="aurora"
        :data-dashboard="ctx?.id ?? undefined"
        :data-render-mode="renderMode"
        :data-atmosphere-tier="tier"
    >
        <GlassAurora
            ref="auroraRef"
            :config="config"
            :render-mode="renderMode"
            :opacity-ceiling="opacityCeiling"
            class="aurora__field"
        />
    </div>
</template>

<style scoped>
/* The field — fixed to the viewport, seated one rung BELOW the content track so it is the
   backdrop, never an overlay. pointer-events:none so it never eats a click. The glass-ui
   <Aurora> fills this wrapper (its own canvas + CSS placeholder size to the container via
   ResizeObserver). */
.aurora {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-content, 10) - 1);
    overflow: hidden;
    pointer-events: none;
}

.aurora__field {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}
</style>
