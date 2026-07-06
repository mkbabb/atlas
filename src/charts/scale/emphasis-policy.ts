// platform/charts/emphasis-policy.ts — THE EMPHASIS-SCOPE LAW (E3 §1.4 · f-hover-flicker F6).
//
// The user's F6 ("a great deal of flickering and flashing when hovering over most items"):
// ECharts' `emphasis.focus: "self"` makes the library BLUR every non-focused element to 10 %
// opacity (`echarts/lib/util/states.js`: the blur state = `fromState.opacity * 0.1`). On a
// part-of-whole CANVAS field (the ECF treemaps the user screenshotted) that washes the WHOLE
// plate ghost-pale the instant one box is entered (+86.8 / +99.9 mean luminance, live), and a
// transit re-fires the wash on EVERY box-boundary crossing (≈89 full-canvas repaints per sweep,
// each an instant hard-cut under PRM) — the "flashing" the user feels distinct from the static
// wash. The SVG choropleth is the clean CONTROL: it raises a STROKE on the one hovered shape and
// leaves every other shape at full opacity (`opacity min=max=1, dimmedCount=0`, live). That is
// the correct affordance for a part-of-whole field — raise the ONE, do not ghost the rest.
//
// THE LAW (one home, inherited everywhere — never six per-viz `focus:"self"` copies):
//   • RAISE_ONLY — NO plate-wide blur. The hovered mark keeps its own emphasis (the itemStyle
//     border / the linked `raisedKeys` channel); the rest of the field stays fully inked. This
//     is the treemap/choropleth-matching default for a part-of-whole field. A +0 luminance
//     transit — no wash, no per-crossing flash.
//   • boundedBlur(floor) — where a recede IS genuinely wanted, a DESIGNED, BOUNDED dim: a small
//     opacity floor (default 0.82 ≈ an 18 % recede, perceptible but never ghost-pale), NEVER the
//     library's 10 % default. A small delta means even an un-tweened per-crossing toggle reads as
//     a slide, not a flash. (`focus` is still omitted so the rest of the field is only RECEDED,
//     not zeroed — the floor is the whole point.)
//
// Routing every plate's `emphasis` through THIS module is what the config tripwire enforces (the
// F6 gate's secondary assertion): a raw `focus:"self"` can never re-enter a viz. ROOT-REPO note:
// this is the ATLAS's own primitive policy (no @mkbabb/* republish) — the treemap wash roots in
// the atlas `Treemap.vue`, not in glass-ui.

// The emphasis config a series spreads into its `emphasis` field. Each ECharts series TYPE
// (treemap / bar / line / scatter) narrows `emphasis` to its own state shape, so a single
// extracted union is not assignable across all of them; this minimal structural interface carries
// EXACTLY the two universally-valid fields the policy uses (`disabled` + a `blur.itemStyle.opacity`
// floor). The load-bearing omission is `focus` — no `focus` ⇒ no plate-wide blur. A consumer
// spreads it into `emphasis`, where ECharts accepts the broader object.
interface EmphasisPolicy {
    /** Keep emphasis ENABLED (the hovered mark still raises) — never the disabled escape hatch. */
    disabled: false;
    /** The optional BOUNDED de-emphasis floor (omitted ⇒ raise-only, no recede at all). */
    blur?: { itemStyle: { opacity: number } };
}

/**
 * RAISE-ONLY — the part-of-whole default: highlight the hovered mark, NEVER blur the field.
 * `focus` is intentionally OMITTED (the whole defect was `focus:"self"`); the hovered mark still
 * gets ECharts' default item emphasis + whatever `raisedKeys` border the plate paints. The result
 * is the SVG-choropleth affordance the user's clean control proves: raise the one, leave the rest.
 */
export const RAISE_ONLY: EmphasisPolicy = { disabled: false };

/**
 * A DESIGNED, BOUNDED de-emphasis — use ONLY where a recede genuinely aids the read. The non-
 * hovered marks dim to `floor` opacity (default 0.82, an ~18 % recede), never the library's 10 %.
 * `focus` stays omitted: the dim rides the explicit `blur.itemStyle.opacity` floor, so a transit
 * is a small slide, not a +86 flash. The delta is small enough that an un-tweened per-crossing
 * toggle is imperceptible — the bounded-delta invariant the F6 gate holds.
 */
export function boundedBlur(floor = 0.82): EmphasisPolicy {
    return {
        disabled: false,
        blur: { itemStyle: { opacity: floor } },
    };
}
