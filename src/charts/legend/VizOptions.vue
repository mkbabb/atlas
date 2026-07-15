<script setup lang="ts">
// platform/charts/VizOptions.vue — the ONE per-plate OPTIONS primitive (D13 / D4.a ·
// ds-per-viz-options §3.2). The sibling of <ChartLegend>: ONE platform primitive that
// each plate mounts into the ChartFrame `#actions` rung, fed the plate's own declarative
// spec (the `useVizOptions` controller). A plate with no options mounts nothing; this
// component never hand-rolls a menu — it consumes glass-ui popover/toggle-group/select/
// switch ONLY (the SOLE-mechanism law).
//
// THE ANATOMY ON THE RUNG: `[ legend ] [ ⛭ options trigger ]` — a single quiet glyph
// button (SlidersHorizontal, the SAME icon the filter trigger wears, so "sliders =
// controls" is one icon language platform-wide). Quiet-at-rest (opacity 0, revealed on
// plate hover/focus — the exact expand-trigger doctrine), EXCEPT at the `--no-hover` register
// where it is ALWAYS visible (a hover-gated affordance does not exist on touch — the C7
// first-class-mobile law; this is the mobile tap-to-explain peek register). A DIRTY DOT
// rides the trigger when any option is non-default, so a screenshotted plate is never
// silently re-projected.
//
// THE POPOVER is the glass-ui `Popover`/`PopoverContent` (reka-ui under the hood):
// collision-aware positioning (stays on-screen at 390px), Esc-to-close + focus-return from
// the primitive, the page LIVE behind (a popover is non-modal — the "lens not a modal"
// property). It joins the document Esc ladder as the OUTERMOST rung (reka marks the event
// consumed, so the PlatformShell document handler does not also clear the selection).
//
// THE CONTROLS map one-to-one to spec.kind, the filter body's exact vocabulary: a
// `segmented` → ToggleGroup (≤4 choices), a `select` → Select (longer enumerations), a
// `switch` → Switch. Every control row is ≥44px (the touch floor). A foot Reset row shows
// only when non-default; a polite live region announces the active reading (a11y).
import { computed, ref } from "vue";
import { SlidersHorizontal } from "@lucide/vue";
import { Popover, PopoverTrigger, PopoverContent } from "@mkbabb/glass-ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@mkbabb/glass-ui/toggle-group";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@mkbabb/glass-ui/select";
import { Switch } from "@mkbabb/glass-ui/switch";
import { LabeledField } from "@mkbabb/glass-ui/labeled-field";
import type { UseVizOptions, VizOptionSpec } from "@/charts/composables/useVizOptions";

const props = defineProps<{
    /** The plate's option controller (the `useVizOptions` state engine). */
    controller: UseVizOptions;
    /** The plate's accessible name (woven into the trigger + dialog aria labels). */
    ariaLabel?: string;
}>();

const open = ref(false);

const c = computed(() => props.controller);
const isDefault = computed(() => c.value.isDefault.value);

// THE OVERLAY-TIER RE-POINT (f-vizoptions §1). glass-ui's PopoverContent wears the `glass-floating`
// utility, whose `backdrop-filter: var(--glass-blur-floating)` resolves to the floating tier
// (blur 16). The per-viz options panel is a LENS OVER THE LIVE DATA, so it must wear the OVERLAY
// tier (blur 24) — deeper-frosted than the floating dock/legend chrome below it. We re-point the
// tier TOKEN the utility reads, via an INLINE style (not scoped CSS) so it survives the popover's
// Teleport-to-body (a scoped `[data-v-*]` rule does not reliably reach the portalled root). The
// `glass-floating` class then computes its backdrop at the overlay radius — one token re-point,
// no library reach. The bg/border ride the overlay tier in lockstep.
const overlayTierVars: Record<string, string> = {
    "--glass-blur-floating": "var(--glass-blur-overlay)",
    "--glass-bg-floating": "var(--glass-bg-overlay)",
    "--glass-border-floating": "var(--glass-border-overlay)",
};

/** The polite-live announcement — the active reading of the last-touched dial, so a
    screen reader hears "Showing capacity" when an option flips. */
const announce = ref("");

/** A segmented/select dial reads/writes a single string value through the controller. */
function strModel(spec: VizOptionSpec): string {
    return String(c.value.values[spec.key]);
}
function setStr(spec: VizOptionSpec, v: string | string[]): void {
    // ToggleGroup type="single" can emit "" on a re-press (deselect); ignore the empty
    // so a segmented control always keeps a chosen value (never a no-selection state).
    const next = Array.isArray(v) ? v[0] : v;
    if (next == null || next === "") return;
    c.value.set(spec.key, next);
    const choice =
        (spec.kind === "segmented" || spec.kind === "select") &&
        spec.choices.find((ch) => ch.value === next);
    announce.value = choice ? `Showing ${choice.label}` : "";
}

/** A switch dial reads/writes a boolean through the controller. */
function boolModel(spec: VizOptionSpec): boolean {
    return c.value.values[spec.key] === true;
}
function setBool(spec: VizOptionSpec, v: boolean): void {
    c.value.set(spec.key, v);
    announce.value = `${spec.label} ${v ? "on" : "off"}`;
}

function reset(): void {
    c.value.reset();
    announce.value = "Options reset to defaults";
}

// THE ESC LADDER (ds §6) — the options popover is the OUTERMOST overlay rung. reka owns the
// close (its DismissableLayer), and the PlatformShell document handler ALREADY defers to any
// open overlay via `anOverlayIsOpen()` (the same DOM probe it uses for the expand layer +
// drawer). The popover joins that priority by its open marker: reka's teleported content
// carries `[data-dismissable-layer][data-state="open"]`, which PlatformShell detects so an Esc
// that closes the popover does NOT also clear the selection (the compound-Esc bug the ladder
// exists to end). We do NOT preventDefault here (that would veto reka's own close).
</script>

<template>
    <Popover v-model:open="open">
        <PopoverTrigger as-child>
            <button
                type="button"
                class="viz-options__trigger"
                :class="{ 'viz-options__trigger--dirty': !isDefault }"
                :aria-label="`Chart options${ariaLabel ? ` — ${ariaLabel}` : ''}`"
                aria-haspopup="dialog"
                :aria-expanded="open"
                :data-testid="`viz-options-trigger-${c.vizId}`"
            >
                <SlidersHorizontal class="viz-options__glyph" aria-hidden="true" />
                <!-- THE DIRTY DOT — a quiet --primary mark riding the corner when any option
                     is non-default (the at-a-glance "this plate is re-projected" tell, the
                     filterActive-reset idiom). Decorative; the aria state carries the meaning. -->
                <span v-if="!isDefault" class="viz-options__dot" aria-hidden="true" />
            </button>
        </PopoverTrigger>

        <!-- The content surface is the glass-ui PopoverContent (the overlay-rung frost over
             the live plate; collision-aware so it never clips at 390px). `side=bottom
             align=end` off the rung trigger. Esc-to-close + focus-return are the primitive's;
             the page stays live behind (a non-modal lens, never an opaque card). -->
        <PopoverContent
            side="bottom"
            align="end"
            :side-offset="6"
            role="dialog"
            aria-label="Options"
            class="viz-options__panel"
            :style="overlayTierVars"
            :data-testid="`viz-options-panel-${c.vizId}`"
        >
            <p class="viz-options__crest">Options</p>

            <div class="viz-options__rows">
                <!-- THE LABELED-FIELD CONSUME (J-ABSORB arm-b · A9 clean-consume, 4.0.1). Every
                     option row composes the bare glass-ui <LabeledField> slot — the canonical
                     label recipe that emits a REAL native `<label id for>` (the a11y UPGRADE over
                     the former `<span :id>`-pseudo-label). The slot exposes `controlId` (the `for`
                     target) + `labelledBy` (the label's id); each control binds `:id="controlId"`
                     so the `<label for>` association resolves to the focusable control AND keeps
                     its live `aria-labelledby` binding (now pointing at the LabeledField label id).
                     We pass the bare slot for ALL three arms (not the LabeledSelect/LabeledSwitch
                     wrappers) because those wrappers render their OWN fixed Select/Switch from a
                     `string[]` and cannot carry the per-choice `disabled`/`value≠label`/testid/
                     `data-viz-scope` plumbing these controls need — the slot preserves each reka
                     primitive verbatim while still upgrading the label. The label stays VISIBLE
                     (no `hide-label`) wearing the prior `.viz-options__label` typography via
                     `label-class` (the library's own `.labeled-field-label` is absent from the
                     atlas's glass-ui.css bundle, so this override fully owns the paint). -->
                <LabeledField
                    v-for="spec in c.specs"
                    :key="spec.key"
                    :label="spec.label"
                    :label-class="'viz-options__label'"
                    class="viz-options__row"
                    v-slot="{ controlId, labelledBy }"
                >
                    <!-- SEGMENTED → ToggleGroup (the SciFilter idiom verbatim — min-h-[44px]
                         items, the SOLE enum-choice mechanism). -->
                    <ToggleGroup
                        v-if="spec.kind === 'segmented'"
                        :id="controlId"
                        :model-value="strModel(spec)"
                        type="single"
                        register="glass"
                        :aria-labelledby="labelledBy"
                        class="flex flex-wrap gap-1"
                        :data-testid="`viz-opt-${c.vizId}-${spec.key}`"
                        :data-viz-scope="spec.scope === 'global' ? 'global' : undefined"
                        @update:model-value="(v) => setStr(spec, v as string | string[])"
                    >
                        <ToggleGroupItem
                            v-for="ch in spec.choices"
                            :key="ch.value"
                            :value="ch.value"
                            :aria-label="ch.label"
                            :disabled="ch.disabled"
                            :title="ch.hint"
                            class="min-h-[44px] text-xs"
                        >
                            {{ ch.label }}
                        </ToggleGroupItem>
                    </ToggleGroup>

                    <!-- SELECT → glass-ui Select (the longer-enumeration form, e.g. the
                         treemap top-N: 6 · 12 · 24 · all). -->
                    <Select
                        v-else-if="spec.kind === 'select'"
                        :model-value="strModel(spec)"
                        @update:model-value="(v) => setStr(spec, v as string)"
                    >
                        <SelectTrigger
                            :id="controlId"
                            :aria-labelledby="labelledBy"
                            class="viz-options__select min-h-[44px] text-xs"
                            :data-testid="`viz-opt-${c.vizId}-${spec.key}`"
                            :data-viz-scope="spec.scope === 'global' ? 'global' : undefined"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="ch in spec.choices"
                                :key="ch.value"
                                :value="ch.value"
                                :disabled="ch.disabled"
                            >
                                {{ ch.label }}
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <!-- SWITCH → glass-ui Switch (the boolean form, e.g. the trendline). -->
                    <Switch
                        v-else
                        :id="controlId"
                        :model-value="boolModel(spec)"
                        :aria-labelledby="labelledBy"
                        :data-testid="`viz-opt-${c.vizId}-${spec.key}`"
                        :data-viz-scope="spec.scope === 'global' ? 'global' : undefined"
                        @update:model-value="(v) => setBool(spec, v as boolean)"
                    />
                </LabeledField>
            </div>

            <!-- The foot Reset row — plate-scoped (clears only this plate's viz.<id>.*),
                 visible only when re-projected (the filter-reset idiom). -->
            <button
                v-if="!isDefault"
                type="button"
                class="viz-options__reset min-h-[44px]"
                :data-testid="`viz-options-reset-${c.vizId}`"
                @click="reset"
            >
                Reset to defaults
            </button>

            <!-- The polite live region — announces the active reading on a flip (a11y). -->
            <span class="sr-only" aria-live="polite">{{ announce }}</span>
        </PopoverContent>
    </Popover>
</template>

<style scoped>
/* THE QUIET TRIGGER — opacity 0 at rest, revealed on plate hover/focus (the exact
   expand-trigger doctrine, ChartFrame.vue:353-365). A single engraved glyph button at the
   far-right of the title rung; ≥44px hit area via padding. The reveal is plate-scoped: the
   `.plate:hover`/`.plate:focus-within` selectors live in ChartFrame's cascade, so this
   trigger reveals together with the expand corner (one register, one reveal). */
.viz-options__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    /* a ≥44px touch target from a compact glyph (the padding makes the hit area). */
    min-width: 44px;
    min-height: 44px;
    margin: -0.5rem; /* claim the hit area without bloating the rung's visual height */
    padding: 0.5rem;
    color: var(--muted-foreground);
    background: transparent;
    border: 0;
    border-radius: var(--radius-plate, 6px);
    cursor: pointer;
    /* LEGIBLE AT REST (F3 "better affordance" · f-vizoptions §1): the trigger is PRESENT-BUT-
       RECESSIVE at rest (~0.55), not invisible — a hover-gated-invisible control on a data-dense
       plate is undiscoverable (the proof:trigger-affordance finding). It WAKES to full ink on
       plate hover/focus (the reveal below), rising from the recessive rest, never from nothing. */
    opacity: 0.55;
    transition: opacity 0.18s ease, color 0.18s ease;
}
.viz-options__glyph {
    width: 1rem;
    height: 1rem;
}
.viz-options__trigger:hover,
.viz-options__trigger:focus-visible {
    color: var(--foreground);
}
/* QUIET-ON-REST: the trigger reveals when the plate is hovered/focused (mirroring expand),
   OR when this trigger itself takes focus (keyboard reach), OR when its popover is open. */
:where([data-chart-frame]:hover) .viz-options__trigger,
:where([data-chart-frame]:focus-within) .viz-options__trigger,
.viz-options__trigger:focus-visible,
.viz-options__trigger[aria-expanded="true"] {
    opacity: 1;
}
/* THE TOUCH FENCE (C7 first-class-mobile · the mobile tap-to-explain peek register): a
   hover-gated affordance does not exist on a coarse pointer, so on touch the trigger is
   ALWAYS visible — the options join the right peek register beside the expand. */
@media (--no-hover) {
    .viz-options__trigger {
        opacity: 1;
    }
}
@media (prefers-reduced-motion: reduce) {
    .viz-options__trigger {
        transition: none;
    }
}

/* THE DIRTY DOT — a 5px --primary mark on the trigger's top-right corner when re-projected. */
.viz-options__dot {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    width: 5px;
    height: 5px;
    border-radius: var(--radius-pill);
    background: var(--primary);
}

/* THE POPOVER PANEL — the OVERLAY-TIER lens (f-vizoptions §1 · d-glassui). glass-ui's
   PopoverContent defaults to the FLOATING tier (blur 16); the per-viz options panel is a LENS
   OVER the live plate, so it wears the OVERLAY tier (`--glass-blur-overlay` = blur(24px)) —
   DEEPER-frosted than the floating dock/legend chrome below it (the z-of-frost reads: the lens
   over the data is the deepest blur on the fold). One token, the tier the proof asserts (blur
   ≥ 20px). The content width caps at the C7 390px register so it never clips on a phone. */
/* The overlay-tier re-point rides the INLINE `overlayTierVars` (the script) so it survives the
   Teleport-to-body; this scoped rule only sets the content width + inner layout. */
.viz-options__panel {
    inline-size: min(20rem, calc(100vw - 2rem));
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}
/* THE CONTROL-GLASS REGISTER INSIDE THE PANEL (d-glassui R6/M5 — the glass must not stop at the
   hull). The ToggleGroup wears `register="glass"` (the 3.11 carve) on the element; the Select
   trigger + the Switch carry no `register` prop, so the control-glass register reaches them here:
   the library's WASH tier (`--glass-blur-wash` — the "wash-rest" control-glass register the glass
   register itself names), the QUIETEST frost rung, so a control reads as a frosted chip in the
   frosted box, never a papered flat control on glass. The wash blur (≈1px) is ALWAYS ≤ the panel's
   overlay blur (the proportion law the proof guards holds at EVERY device-pixel-ratio — never the
   1dppx inversion a fixed floating radius would cause). One library token, the rung tracks the
   design system. */
.viz-options__panel :deep(.viz-options__select),
.viz-options__panel :deep([role="switch"]) {
    -webkit-backdrop-filter: var(--glass-blur-wash);
    backdrop-filter: var(--glass-blur-wash);
}
/* The mono-caps "Options" crest — the drawer-title register at popover scale. */
.viz-options__crest {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
.viz-options__rows {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}
/* THE ROW + LABEL — now the consumed <LabeledField> root + its native `<label>` (the
   labeled-field consume, J-ABSORB arm-b). The class flows onto the child component's
   rendered nodes, which do NOT carry this SFC's `[data-v-*]` scope attribute, so the
   layout/typography reach them through `:deep()`. `.viz-options__row` keeps the prior
   stacked control register; `.viz-options__label` preserves the prior label typography
   (it composes over the library's `.labeled-field-label`, which is absent from the
   atlas's imported glass-ui.css bundle — a harmless no-op — so this rule fully owns the
   visible label paint). */
.viz-options__rows :deep(.viz-options__row) {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.viz-options__rows :deep(.viz-options__label) {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--foreground);
}
.viz-options__select {
    inline-size: 100%;
}
/* The plate-scoped Reset — the filter-reset idiom (a quiet underline-on-hover row). */
.viz-options__reset {
    align-self: flex-start;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    color: var(--muted-foreground);
    background: transparent;
    border: 0;
    border-radius: var(--radius, 6px);
    text-underline-offset: 2px;
    cursor: pointer;
}
.viz-options__reset:hover {
    text-decoration: underline;
}
.viz-options__reset:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
}
</style>
