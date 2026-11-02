<script setup lang="ts">
// DockSettingsMenu — the live More menu: the gear and its controls sheet (U/B7c M1, O-7 entry JS).
//
// DockSettings is always mounted. It held this glass DropdownMenu, and glass's DropdownMenu root
// provides the whole reka DropdownMenu family (content, popper, dismissable layer, focus scope,
// sub-menus) and floating-ui, so every consumer's entry carried about 60 KB raw for a sheet the
// reader may never open. DockSettings now seats a face and loads this module on the gear's first
// pointer, focus or open. The controls are TOGGLES, not menu commands: they sit in the content as
// glass Buttons (no `DropdownMenuItem` auto-dismiss), so a year-range flip keeps the sheet open.
// The state stays with the dock (`useDockDataState`, the platform singletons).
import { DockTrigger } from "@mkbabb/glass-ui/dock-trigger";
import { DropdownMenu, DropdownMenuContent } from "@mkbabb/glass-ui/menu";
import { Button } from "@mkbabb/glass-ui/button";
import { DarkModeToggle } from "@mkbabb/glass-ui/dark-mode-toggle";
import { Settings, GitCompareArrows, Download } from "@lucide/vue";

// The seat's attributes (the bar's end cell) land on the gear.
defineOptions({ inheritAttrs: false });

defineProps<{
    /** Show the year-range compare control (a multi-year dashboard whose scope landed). */
    hasYearScope: boolean;
    /** The active year-scope mode: the range toggle reads `=== 'range'` for its pressed state. */
    yearModeNow: string;
    /** A brief accent confirm after a save (the "View saved" echo). */
    saveFlash: boolean;
    /** Wire glass-ui's no-transition fast-path on the dark toggle. */
    disableTransitions: boolean;
    /** Offer "Save this view": only on a dashboard route. */
    canSave?: boolean;
}>();

/** The sheet is open (the dock's `useDockGear().gearOpen`, through DockSettings). */
const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
    (e: "toggle-range"): void;
    (e: "save-view"): void;
    /** The sheet's close auto-focus, for DockSettings to keep or cancel. */
    (e: "close-auto-focus", event: Event): void;
}>();
</script>

<template>
    <DropdownMenu v-model:open="open">
        <DockTrigger
            v-bind="$attrs"
            for="dropdown"
            class="usf-dock__gear"
            aria-label="More"
            title="More"
            data-testid="dock-gear"
        >
            <Settings class="usf-dock__ctl-glyph" aria-hidden="true" />
        </DockTrigger>

        <DropdownMenuContent
            side="top"
            align="end"
            :side-offset="8"
            class="usf-dock-settings"
            @close-auto-focus="(event: Event) => emit('close-auto-focus', event)"
        >
            <!-- The year-range compare toggle (the third arm of the year grammar). -->
            <Button
                v-if="hasYearScope"
                emphasis="quiet"
                size="sm"
                class="usf-dock-settings__row"
                :class="{ 'usf-dock-settings__row--on': yearModeNow === 'range' }"
                :aria-pressed="yearModeNow === 'range'"
                data-testid="dock-year-range"
                @click="emit('toggle-range')"
            >
                <GitCompareArrows class="usf-dock__ctl-glyph" aria-hidden="true" />
                <span>Compare years</span>
            </Button>

            <!-- Save the current full URL state onto the views shelf. -->
            <Button
                v-if="canSave"
                emphasis="quiet"
                size="sm"
                class="usf-dock-settings__row"
                :class="{ 'usf-dock-settings__row--flash': saveFlash }"
                data-testid="dock-save-view"
                @click="emit('save-view')"
            >
                <Download class="usf-dock__ctl-glyph" aria-hidden="true" />
                <span>{{ saveFlash ? "View saved" : "Save this view" }}</span>
            </Button>

            <!-- The dark-mode toggle: `size="dock"` routes the glyph through the dock-control register;
                 `:disable-transitions` wires the instant theme re-print. -->
            <div class="usf-dock-settings__row usf-dock-settings__row--theme">
                <DarkModeToggle size="dock" :disable-transitions="disableTransitions" />
                <span>Theme</span>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
</template>

<style scoped>
/* The gear face: the shared control size (DockSettings' seat face wears the same rule). */
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
