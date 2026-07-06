// platform/composables/useAffordance.ts — THE AFFORDANCE BINDING FACTORY (K-ANIM A5 · proto/A5-afford.md §3.3).
//
// Norman's affordance→signifier pairing, made a SYSTEM. A primitive declares its affordance KIND; the
// composable returns the binding (the `data-afd` attribute + the a11y attrs) the `affordance.css` recipe
// paints. The keystone besting: the no-false-affordance law is a TYPE — `click` REQUIRES a `handler`, so
// `cursor:pointer` without a real action cannot be written. The SELECT/ACTIVE/FILTER reactive signifiers
// keep their own composables; this owns the static four (click / grab / disabled / focus).
//
// THREE HARDEN FIXES baked in:
//   • `disabled` is a MODIFIER, not a fabricated affordance — disabled=true overlays the negative
//     signifier (+ tabindex:-1, OUT of tab order); disabled=false returns an EMPTY binding (the host's
//     OWN click/grab binding stands).
//   • `grab` does NOT fabricate `role="slider"` — it stamps the cursor signifier only; the HOST owns the
//     role + value attrs (an incomplete slider role is an a11y regression).
//   • `click` keyboard ACTIVATION is delivered — a synthetic `role="button"` element gets an `onKeydown`
//     that activates on Enter/Space (a div/svg does NOT fire click on Space). A NATIVE button/anchor
//     (`native:true`) gets NO role/tabindex/onKeydown.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

/** The STATIC affordance kinds (the ones with NO reactive store read — pure signifier recipes). The
    reactive kinds (select/active/filter) are NAMED in the register but route through their own composable. */
export type AffordanceKind = "click" | "grab" | "disabled" | "focus";

/** The binding a primitive spreads (`v-bind`) onto its interactive element. `data-afd` is OPTIONAL because
    the `disabled`-when-false binding is EMPTY (the host's own binding stands — disabled is an overlay). */
export interface AffordanceBinding {
    "data-afd"?: AffordanceKind;
    /** keyboard reach — a SYNTHETIC clickable gets tabindex:0; a DISABLED control gets tabindex:-1; a
        native element / grab host manages its own. */
    tabindex?: number;
    /** role — ONLY for a synthetic clickable ("button"); grab/disabled never fabricate a role. */
    role?: string;
    "aria-disabled"?: "true";
}

/** The opts — DISCRIMINATED by kind so the no-false-affordance law is a TYPE: `click` REQUIRES a
    `handler` (the real action the cursor promises). `grab`/`disabled`/`focus` need no handler. */
export type AffordanceOpts =
    /** clickable — the cursor MUST back a real action. `handler` is REQUIRED (the no-lie type). `native`
        marks a real <button>/<a> (omit the redundant role/tabindex/keydown). */
    | { kind: "click"; handler: (e: Event) => void; native?: boolean }
    /** draggable — the grip. NO role: the host (a real slider/scrubber) owns role + aria-value*. */
    | { kind: "grab"; onGrab?: () => void; onRelease?: () => void }
    /** the negative affordance MODIFIER — overlay greyed + not-allowed when `when` is true; empty when
        false. Spread AFTER the host's primary binding. */
    | { kind: "disabled"; when: MaybeRefOrGetter<boolean> }
    /** focusable-only (no pointer action) — the keyboard halo, e.g. a roving-cursor mark. */
    | { kind: "focus"; gilt?: boolean };

export interface UseAffordance {
    /** The reactive binding to `v-bind` onto the interactive element. */
    bind: ComputedRef<AffordanceBinding>;
    /** For `click` — the handler to wire on `@click` (the SAME fn the type required). Undefined else. */
    on?: (e: Event) => void;
    /** For a SYNTHETIC `click` (not `native`) — the `@keydown` handler that activates on Enter/Space.
        Undefined for native click + all non-click kinds. */
    onKeydown?: (e: KeyboardEvent) => void;
}

/**
 * Bind an affordance KIND to a primitive's interactive element. Returns the `data-afd` binding the recipe
 * paints + (for `click`) the handler + (for a synthetic click) the keydown activator. The
 * no-false-affordance law is the TYPE: `click` cannot be called without a `handler`.
 */
export function useAffordance(opts: AffordanceOpts): UseAffordance {
    const bind = computed<AffordanceBinding>(() => {
        switch (opts.kind) {
            case "click":
                // a NATIVE button/anchor already has role + keyboard + focus — stamp the cursor signifier
                // only. A SYNTHETIC element gets the button role + tab stop.
                return opts.native
                    ? { "data-afd": "click" }
                    : { "data-afd": "click", tabindex: 0, role: "button" };
            case "grab":
                // cursor signifier ONLY — the host owns role="slider" + aria-value* + its own tab stop.
                return { "data-afd": "grab" };
            case "disabled":
                // a MODIFIER: overlay when disabled (out of tab order so no halo on a dead control);
                // EMPTY when enabled (the host's own binding, spread first, stands).
                return toValue(opts.when)
                    ? { "data-afd": "disabled", "aria-disabled": "true", tabindex: -1 }
                    : {};
            case "focus":
                return { "data-afd": "focus", tabindex: 0 };
        }
    });

    // the synthetic-click keyboard activator (Enter activates; Space activates + prevents page scroll).
    const onKeydown =
        opts.kind === "click" && !opts.native
            ? (e: KeyboardEvent): void => {
                  if (e.key === "Enter" || e.key === " ") {
                      if (e.key === " ") e.preventDefault();
                      opts.handler(e);
                  }
              }
            : undefined;

    return {
        bind,
        on: opts.kind === "click" ? opts.handler : undefined,
        onKeydown,
    };
}
