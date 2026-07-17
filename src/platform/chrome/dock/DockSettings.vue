<script setup lang="ts">
// DockSettings — the MOBILE-GEAR controls sheet (J-DOCK §approach-2/§6 · C23).
//
// At @media(--phone) the dock's four secondary controls (the year-range compare toggle, the
// ⤓-save door, the filter pull-out, and the dark-mode toggle) collapse behind ONE Lucide
// `Settings` glyph — the gear. This component IS the gear: a glass `DropdownMenu` whose
// `DockTrigger` is the gear glyph and whose `DropdownMenuContent` is the controls sheet. It
// consumes glass-ui's OWN disclosure (the same `DropdownMenu` + `DockTrigger` idiom VizPlate's
// download menu rides) — NO hand-rolled popover.
//
// THE STATE BOUNDARY (§approach-6). DockSettings is PRESENTATIONAL — it RENDERS the four
// affordances, it does NOT re-own their state. The year-range mode + the ⤓-save flash live in
// J-ARCH's `useDockDataState`; the filter-open + dark-toggle are the platform singletons. This
// component takes the scalars + handlers as props and emits the gear-open model — a thin sheet,
// not a second data seam.
import { DockTrigger } from "@mkbabb/glass-ui/dock";
import {
    DropdownMenu,
    DropdownMenuContent,
} from "@mkbabb/glass-ui/dropdown-menu";
import { Button } from "@mkbabb/glass-ui/button";
import { DarkModeToggle } from "@mkbabb/glass-ui/dark-mode-toggle";
import {
    Settings,
    GitCompareArrows,
    Download,
} from "@lucide/vue";

defineProps<{
    /** The gear-sheet open model (the `v-model:open` from the dock's `useDockGear().gearOpen`). */
    open: boolean;
    /** Show the year-range compare control (a multi-year dashboard whose scope landed). */
    hasYearScope: boolean;
    /** The active year-scope mode — the range toggle reads `=== 'range'` for its pressed state. */
    yearModeNow: string;
    /** A brief accent confirm after a ⤓-save (the "View saved" visual echo). */
    saveFlash: boolean;
    /** Wire glass-ui's no-transition fast-path on the dark toggle (the INSTANT theme re-print). */
    disableTransitions: boolean;
}>();

const emit = defineEmits<{
    /** Two-way gear-sheet open model (driven by the dock's `useDockGear().gearOpen`). */
    (e: "update:open", value: boolean): void;
    /** Toggle year-range (range ↔ single-at-latest) — handler stays `useDockDataState.toggleRange`. */
    (e: "toggle-range"): void;
    /** ⤓-save the current view — handler stays `useDockDataState.saveCurrentView`. */
    (e: "save-view"): void;
}>();
</script>

<template>
    <!-- THE GEAR — ONE Lucide Settings glyph opening the controls sheet. The `DropdownMenu` root
         is the open model (driven by the dock's `useDockGear().gearOpen` via `v-model:open`); the
         `DockTrigger` is the gear's rounded dock-control face (the same ≥44px hitbox the
         rail controls wear); the `DropdownMenuContent` is the sheet holding the four controls. -->
    <DropdownMenu
        :open="open"
        @update:open="(v: boolean) => emit('update:open', v)"
    >
        <DockTrigger
            for="dropdown"
            class="usf-dock__gear"
            aria-label="Dock settings"
            title="Settings"
            data-testid="dock-gear"
        >
            <Settings class="usf-dock__ctl-glyph" aria-hidden="true" />
        </DockTrigger>

        <!-- THE CONTROLS SHEET — the four secondary affordances, resolved INSIDE the opened gear
             (NOT inline rail rungs at --phone). They render as glass-ui `<Button>`s (the G2
             glassy-Button swap folded here). The controls are TOGGLES, not menu commands — they sit
             in the content as buttons (no `DropdownMenuItem` auto-dismiss), so a year-range flip
             keeps the sheet open. -->
        <DropdownMenuContent
            align="start"
            :side-offset="8"
            class="usf-dock-settings"
        >
            <!-- The year-range compare toggle (the third arm of the year grammar). -->
            <Button
                v-if="hasYearScope"
                variant="ghost"
                size="sm"
                class="usf-dock-settings__row"
                :class="{ 'usf-dock-settings__row--on': yearModeNow === 'range' }"
                :aria-pressed="yearModeNow === 'range'"
                data-testid="dock-year-range"
                @click="emit('toggle-range')"
            >
                <GitCompareArrows
                    class="usf-dock__ctl-glyph"
                    aria-hidden="true"
                />
                <span>Compare years</span>
            </Button>

            <!-- The ⤓-save door — quick-save the current full URL state onto the views shelf. -->
            <Button
                variant="ghost"
                size="sm"
                class="usf-dock-settings__row"
                :class="{ 'usf-dock-settings__row--flash': saveFlash }"
                data-testid="dock-save-view"
                @click="emit('save-view')"
            >
                <Download class="usf-dock__ctl-glyph" aria-hidden="true" />
                <span>{{ saveFlash ? "View saved" : "Save this view" }}</span>
            </Button>

            <!-- The filter pull-out — summons the live-behind filter Drawer (ONE open truth). -->
            <!-- The dark-mode toggle — `size="dock"` routes the glyph through the dock-control
                 register; `:disable-transitions` wires the INSTANT theme re-print. The toggle
                 owns its OWN label, so it rides the sheet as the library control (no wrapper). -->
            <div class="usf-dock-settings__row usf-dock-settings__row--theme">
                <DarkModeToggle
                    size="dock"
                    :disable-transitions="disableTransitions"
                />
                <span>Theme</span>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
</template>

<style scoped>
/* The gear face — the ≥44px rounded dock-control hitbox. N.WG1 Arm H (the L-DOCK residue cleanup):
   the trigger formerly ALSO carried `.usf-dock__ctl`, but that class lives ONLY in DockFoot's
   SCOPED block, so the forward never reached this component (scoped-away, an under-consumed remnant
   of the killed L-DOCK cluster). It is removed — the gear's engrave/hover face is DockTrigger's
   own glass styling; this rule owns only the shared control SIZE (the `--dock-control-size` floor). */
.usf-dock__gear {
    inline-size: var(--dock-control-size, 2.75rem);
    block-size: var(--dock-control-size, 2.75rem);
}
.usf-dock__ctl-glyph {
    inline-size: 1.05rem;
    block-size: 1.05rem;
}

/* THE CONTROLS SHEET — a compact column of the four secondary affordances, opened off the gear.
   The DropdownMenuContent owns the floating glass plate; we lay the rows out as a tidy stack. */
.usf-dock-settings {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-inline-size: 12rem;
    padding: 0.375rem;
}

/* A control ROW — a full-width labelled button, the icon leading the word (the sheet is wide
   enough to carry the label the narrow rail could not). The pressed/flash states reuse the rail
   control's chrome-accent pill (one-color-one-meaning: --cp-accent, never a data hue). */
.usf-dock-settings__row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    inline-size: 100%;
    min-block-size: 2.75rem;
    text-align: start;
}
.usf-dock-settings__row--theme {
    /* the DarkModeToggle owns its own glyph; the row only seats it beside its label. */
    padding-inline: 0.5rem;
    color: var(--muted-foreground);
    font-size: 0.875rem;
}
.usf-dock-settings__row--on {
    color: var(--cp-accent-ink, var(--background));
    background: var(--cp-accent, var(--foreground));
}
.usf-dock-settings__row--flash {
    color: var(--cp-accent-ink, var(--background));
    background: var(--cp-accent, var(--foreground));
    transition:
        color 120ms ease,
        background 120ms ease;
}
</style>
