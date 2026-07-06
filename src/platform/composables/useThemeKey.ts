// platform/composables/useThemeKey.ts — the LIVE theme signal the SVG-fill paths key on
// (CH-5). `useColorMode` (@vueuse) is a WRITER: it sets the `.dark` class from a stored
// preference, but it does NOT observe the class, so a flip that toggles `<html>.dark`
// directly (the dock's class toggle, a test harness, a system-pref media change that the
// app maps to the class) never moves its ref — and a Vue computed keyed only on
// `useColorMode().value` stays stale, re-resolving NONE of its `getComputedStyle` token
// reads. That is exactly the choropleth's byte-identical-fill trap: `makeDivergingScale`
// re-reads the `--viz-diverging-*` tokens, but only when its `scale` computed re-runs, and
// the computed never re-runs because the mode ref is frozen (the "re-light for free" claim
// is FALSE for the reactive-SVG-fill path — Hard-Gate 8).
//
// This composable closes that gap with a MutationObserver on `<html>`'s `class` attribute:
// a `key` ref that BUMPS on every theme-class change. A computed that reads `themeKey.value`
// (alongside or instead of the mode ref) therefore re-derives on ANY theme flip — the dock
// toggle, the system flip, the test's direct class write — so the SVG `:fill` binding
// re-resolves the tokens and `fill(dark) ≠ fill(light)` byte-for-byte. The canvas charts
// re-theme on their OWN plane (the in-canvas merge-`setOption` tween batched on glass-ui's
// `onFlipSettled` settle hook — see `useEChart.ts`); this is the SVG-side equivalent, the one
// seam the choropleth fill consumes.

import { onScopeDispose, ref, type Ref } from "vue";

/** The current theme tag — read off the live `<html>` class (the cascade's actual state),
    not a stored preference. `dark` when the `.dark` class is present, else `light`. */
function readTheme(): "light" | "dark" {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// ── THE THEME FLIP IS INSTANT — NO VIEW TRANSITION (E9b, audit-e/e-theme-perf) ───────────────
// The full-page `document.startViewTransition` is GONE. The audit (R1–R3) proved it was the
// wrong engine for a chart-heavy palette swap: a page VT snapshots `::view-transition-old` of
// the ENTIRE viewport (every chart `<canvas>` + the live aurora), runs the class toggle, then
// CANNOT capture `::view-transition-new` until the post-flip render paints — which on `/sci` is
// the 6× `setOption(notMerge:true)` re-raster storm (~1.5s main-thread block). The VT does not
// batch or parallelize those re-rasters; it SERIALIZES them ahead of its own cross-fade and
// freezes a stale frame behind them (`ready` pinned at 1663ms, `finished` leaking to 9s on the
// live aurora). So the VT is dropped wholesale.
//
// In its place, the swap is split into two independent, cheap planes:
//   • THE CHROME flips INSTANT — the glass-ui `DarkModeToggle` already toggles `<html>.dark`
//     synchronously, and the chrome (paper→graphite, dock frost, masthead, SVG fills keyed on
//     `useThemeKey` below) re-tints in ONE cheap CSS class frame, no snapshot. That alone kills
//     the 1.5s frozen frame — the perf tank was the VT's stall on the storm, not the toggle.
//   • THE N CHARTS re-theme in their OWN plane via ECharts' animated MERGE `setOption`, batched
//     into ONE post-flip task on glass-ui 3.11's `onFlipSettled` settle hook (consumed at
//     `useEChart.ts`). No page snapshot, no `<canvas>` view-transition-name, the aurora excluded
//     by construction (it is never in a VT). PRM collapses to instant for free.
//
// This composable therefore installs NOTHING on the flip path. Its sole remaining job is the
// SVG-fill re-derive signal (the MutationObserver below) — the one seam the choropleth fill
// consumes, exactly as it was built for, never a flip orchestrator (root-repo law: the dark-flip
// sequencing is a glass-ui concern, owned by `useGlobalDark`'s settle hook).

/**
 * A reactive theme key that BUMPS on every `<html>` theme-class change (CH-5). Read
 * `themeKey.value` inside any computed that resolves CSS tokens via `getComputedStyle`
 * (the SVG choropleth fill, a legend bar) and it re-derives the instant the theme flips —
 * regardless of HOW the class was toggled. Returns a stable ref; the observer is torn down
 * with the consuming scope.
 *
 * The value is a monotonically-increasing counter (not a boolean) so two flips that land on
 * the same theme still register as distinct re-derive triggers — the dependency can never
 * "miss" a change by comparing equal.
 */
export function useThemeKey(): Ref<number> {
    const key = ref(0);
    let last = readTheme();

    if (typeof window !== "undefined" && typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(() => {
            const now = readTheme();
            if (now !== last) {
                last = now;
                key.value += 1;
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        onScopeDispose(() => observer.disconnect());
    }

    return key;
}
