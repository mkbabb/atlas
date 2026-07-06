<script setup lang="ts">
// platform/editorial/DataAside.vue — ③ the promoted VizOptions control, seated as a beat (the
// "interactive element"). F3a / design-interstitial-system §3.3 · f6-hero-interstitials §2.B-③.
//
// THE ARCHITECTURE (the load-bearing decision): DataAside does NOT re-implement a control. It
// binds `useVizOptions(vizId, [spec])` and renders ONE dial through the SAME control vocabulary
// `<VizOptions>` renders (ToggleGroup / Select / Switch) — so a between-plate toggle and the
// same dial inside a plate header are ONE source of truth (the `?viz.<id>.<key>=` codec). The
// USF §III story ("Flip the normalization and watch the map re-sort") is ALREADY this story in
// prose; DataAside makes the words CLICKABLE in-flow. When `scope="global"` the dial reads/writes
// the GLOBAL filter store as a MIRROR (DESIGN §10 scope contract — one source, two surfaces; NO
// `?viz.<id>.year=` shadow ever exists; excluded from the plate dirty-dot/Reset).
//
// THE RUNG — ④ chrome (it is a control, the margin register): DataAside binds --attn-chrome
// (0.46). The control wears the CONTROL-GLASS register (DESIGN §4.5 — one rung quieter than its
// host; the `ToggleGroup register="glass"` carve from E1). The `prompt` is Newsreader prose
// (the legend voice) framing the control.
//
// GLASS XOR PAPER: the CONTROL is glass (the control register, lawful — it is furniture); the
// prompt + the surrounding river is paper. This is the ONE place an interstitial wears glass, and
// it is the lawful exception (a control, not a plate).
//
// THE REVEAL CLOCK — the `<Beat>` scroll register reveals the prompt + control together; the
// control has no internal animation (a control is not a reveal — it is a seated INLINE dial, no
// popover). PRM: static (a control has no choreography to lose). a11y: the control's existing
// roving-radio / `aria-pressed` semantics (the F6.10 keyboard grammar — Tab-reachable,
// Arrow-walks the choices); the prompt is its `aria-describedby`.
import { computed, useId } from "vue";
import { ToggleGroup, ToggleGroupItem } from "@mkbabb/glass-ui/toggle-group";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@mkbabb/glass-ui/select";
import { Switch } from "@mkbabb/glass-ui/switch";
import { useVizOptions, type VizOptionSpec } from "@/charts/composables/useVizOptions";

const props = defineProps<{
    /** The SHARED viz id the control writes (NOT a new namespace — the plate's own slug). */
    vizId: string;
    /** ONE dial from useVizOptions (segmented | select | switch). */
    spec: VizOptionSpec;
    /** The editorial framing ("Flip the normalization and watch…"). */
    prompt: string;
}>();

// THE ONE SOURCE OF TRUTH — bind the SAME controller `<VizOptions>` binds, with this single dial.
// A `scope="global"` spec mirrors the global filter store (DESIGN §10); a `local` spec is the
// plate's own `?viz.<id>.<key>` lens — the SAME codec, so the in-flow toggle and the plate-header
// dial never drift.
const controller = useVizOptions(
    props.vizId,
    [props.spec],
);

const promptId = `data-aside-prompt-${useId()}`;

/** A segmented/select dial reads/writes a single string value through the controller. */
const strValue = computed(() => String(controller.values[props.spec.key]));
function setStr(v: string | string[]): void {
    const next = Array.isArray(v) ? v[0] : v;
    if (next == null || next === "") return; // ToggleGroup may emit "" on re-press — keep a value
    controller.set(props.spec.key, next);
}

/** A switch dial reads/writes a boolean through the controller. */
const boolValue = computed(() => controller.values[props.spec.key] === true);
function setBool(v: boolean): void {
    controller.set(props.spec.key, v);
}

const isGlobal = computed(() => props.spec.scope === "global");
</script>

<template>
    <!-- The promoted control, seated as a beat — the editorial prompt above its dial. The rung ④
         chrome recession rides the host (the SUFFUSION contract). The control is the ONE lawful
         glass in the river (the control register); the prompt is paper. -->
    <div class="data-aside" data-attn="chrome" data-testid="data-aside">
        <p :id="promptId" class="data-aside__prompt text-prose-muted">{{ prompt }}</p>

        <div class="data-aside__control">
            <!-- SEGMENTED → ToggleGroup (the control-glass register; the F6.10 roving-radio
                 keyboard grammar — Tab-reachable, Arrow-walks the choices). The prompt is its
                 aria-describedby (the framing names the dial). -->
            <ToggleGroup
                v-if="spec.kind === 'segmented'"
                :model-value="strValue"
                type="single"
                register="glass"
                :aria-label="spec.label"
                :aria-describedby="promptId"
                class="flex flex-wrap gap-1"
                :data-testid="`data-aside-${vizId}-${spec.key}`"
                :data-viz-scope="isGlobal ? 'global' : undefined"
                @update:model-value="(v) => setStr(v as string | string[])"
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

            <!-- SELECT → glass-ui Select (the longer-enumeration form). -->
            <Select
                v-else-if="spec.kind === 'select'"
                :model-value="strValue"
                @update:model-value="(v) => setStr(v as string)"
            >
                <SelectTrigger
                    :aria-label="spec.label"
                    :aria-describedby="promptId"
                    class="data-aside__select min-h-[44px] text-xs"
                    :data-testid="`data-aside-${vizId}-${spec.key}`"
                    :data-viz-scope="isGlobal ? 'global' : undefined"
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

            <!-- SWITCH → glass-ui Switch (the boolean form). -->
            <Switch
                v-else
                :model-value="boolValue"
                :aria-label="spec.label"
                :aria-describedby="promptId"
                :data-testid="`data-aside-${vizId}-${spec.key}`"
                :data-viz-scope="isGlobal ? 'global' : undefined"
                @update:model-value="(v) => setBool(v as boolean)"
            />
        </div>
    </div>
</template>

<style scoped>
/* THE PROMOTED CONTROL, AS A BEAT — the editorial prompt above its dial, on the bare river. The
   rung ④ chrome recession rides the host (the SUFFUSION contract — never a per-surface alpha). The
   control wears the control-glass register (the ToggleGroup `register="glass"` carve); the prompt
   + the river are paper. */
.data-aside {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    align-items: center;
    text-align: center;
    /* the rung ④ chrome recession (the SUFFUSION contract). */
    opacity: var(--attn-chrome);
}
.data-aside__prompt {
    margin: 0;
    max-inline-size: 42ch;
}
.data-aside__control {
    display: inline-flex;
}
.data-aside__select {
    inline-size: min(16rem, calc(100vw - 2rem));
}
</style>
