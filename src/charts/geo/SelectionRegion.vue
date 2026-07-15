<script setup lang="ts">
// platform/charts/SelectionRegion.vue — the KEYBOARD control persona (C.W4.2 S4b), layered
// as a SIBLING over any geometry plate. The plate stays `role="img"` with its offscreen
// accessible TABLE (the READ surface); this is the separate, opt-in CONTROL surface, so we
// never put interactive roles inside `role="img"` (the WCAG 4.1.2 breach the GeoChoropleth
// comment correctly refuses).
//
// A 50-shape (or 2,600-dot) tab order is hostile and 4.1.2-illegal. The idiom is a SINGLE
// roving-tabindex `role="listbox"` region — ONE tab stop, arrow keys move a virtual cursor
// (`aria-activedescendant`), Enter/Space selects, Cmd/Ctrl+Enter toggles-in-set, Escape
// clears (the WAI-ARIA APG listbox pattern). It NEVER paints the data; it emits the SAME
// `SelectEvent` the pointer producer does, so it routes through the identical
// `useChartSelection(kind).onSelect`. The visible focus indicator is the `activeKey` → a
// `data-kbd-active` attribute the plate's mark reads (the `kbd-active:` variant), so the
// keyboard cursor is visible on the map without a second render system.
//
// `aria-selected` reflects the live set, so a screen-reader user hears the multi-selection.
// The select-feedback is compositor-only (a ring) and PRM-fenced by the plate's own variant.
//
// RENDER-ACTIVE-ONLY (O-F9 / virtualization §3 R2-a). The options are a DATA array (`keys`), NOT
// a DOM layer: a roving-`aria-activedescendant` listbox needs only the ACTIVE option to EXIST in
// the tree (that is what `aria-activedescendant` must resolve to), so we render exactly ONE
// `role="option"` node — the cursor's — and it carries the FULL logical count via a fixed
// `aria-setsize` (= `keys.length`) plus its 1-based `aria-posinset`. This is the standard
// large-combobox pattern: ~315 per-LEA divs/beat collapse to ONE. As the cursor moves, the single
// node re-keys to the new active option (its label + selected state + posinset follow), so the SR
// still announces each option it lands on. Pointer selection is UNAFFECTED — it lives entirely on
// the plate's own SVG marks (this layer is `pointer-events:none`), never on these option nodes.
import { computed, ref, watch } from "vue";
import { isMultiSelect, type SelectEvent } from "@/charts/contract/selection-contract";

const props = defineProps<{
    /** The ordered key list — the offscreen table's row order (the meaningful traversal order). */
    keys: string[];
    /** A key's accessible label (the same nameField the table uses). */
    label: (key: string) => string;
    /** The live selected set — drives `aria-selected` on each option. */
    selectedKeys: ReadonlySet<string>;
    ariaLabel?: string;
}>();

const emit = defineEmits<{
    /** The SAME event the pointer producer emits — routed through `useChartSelection`. */
    select: [ev: SelectEvent];
    /** The roving cursor's current key (or null) — the plate reads it as `kbd-active`. */
    "active-change": [key: string | null];
}>();

const cursor = ref(0); // the roving index (virtual focus)

// Clamp the cursor when the key list shrinks (a filter narrows the field), so the virtual
// focus never points past the end.
watch(
    () => props.keys.length,
    (n) => {
        if (cursor.value >= n) cursor.value = Math.max(0, n - 1);
    },
);

const activeKey = computed<string>(() => props.keys[cursor.value] ?? "");

// Surface the active key upward so the plate can ring it (the `data-kbd-active` channel).
watch(activeKey, (k) => emit("active-change", k === "" ? null : k), {
    immediate: true,
});

// THE COMPARE CHORD (f6-interaction-grammar §2.1 / G-SHIFT-PIN) — Shift+Enter is the keyboard
// twin of Shift-click, aliased to Cmd/Ctrl+Enter. Routed through the ONE `isMultiSelect` seam
// so the keyboard reads the SAME modifier convention every pointer producer does.
function multi(e: KeyboardEvent): boolean {
    return isMultiSelect(e);
}

function onKeydown(e: KeyboardEvent): void {
    const n = props.keys.length;
    if (n === 0) return;
    switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
            cursor.value = (cursor.value + 1) % n;
            e.preventDefault();
            break;
        case "ArrowUp":
        case "ArrowLeft":
            cursor.value = (cursor.value - 1 + n) % n;
            e.preventDefault();
            break;
        case "Home":
            cursor.value = 0;
            e.preventDefault();
            break;
        case "End":
            cursor.value = n - 1;
            e.preventDefault();
            break;
        case "Enter":
        case " ":
            emit("select", { key: props.keys[cursor.value] ?? "", multi: multi(e) });
            e.preventDefault();
            break;
        case "Escape":
            // The consumer (`useChartSelection`) maps an empty key → clearSelection.
            emit("select", { key: "", multi: false });
            e.preventDefault();
            break;
    }
}

// Clear the keyboard ring when focus leaves the region (the cursor is virtual; on blur the
// plate should not keep a phantom ring lit).
function onBlur(): void {
    emit("active-change", null);
}
function onFocus(): void {
    emit("active-change", activeKey.value === "" ? null : activeKey.value);
}
</script>

<template>
    <!-- A focusable listbox SIBLING of the SVG plate (NOT a child of `role="img"`). One tab
         stop; roving virtual focus over the ORDERED key DATA array; Enter selects, Cmd/Ctrl+Enter
         toggles-in-set, Escape clears. Only the ACTIVE option is rendered (render-active-only,
         O-F9): `aria-activedescendant` resolves to it, and it carries the FULL logical count via
         `aria-setsize` so the SR announces "N of 315". The visible cursor is the plate's
         `kbd-active` ring (driven by `active-change`). The region is visually unobtrusive (an
         absolutely-positioned focus target) but reachable and announced. -->
    <div
        role="listbox"
        tabindex="0"
        aria-multiselectable="true"
        :aria-activedescendant="activeKey ? `selopt-${activeKey}` : undefined"
        :aria-label="
            ariaLabel ??
            'Select areas — arrow keys to move, Enter to pin, Shift+Enter to compare, Escape to clear'
        "
        class="selection-region"
        data-testid="selection-region"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
    >
        <!-- Render-active-only: the ONE option `aria-activedescendant` resolves to. `aria-setsize`
             carries the FULL logical count (the list is the DATA array `keys`, not this DOM);
             `aria-posinset` places the cursor within it. Re-keys as the cursor moves. -->
        <div
            v-if="activeKey"
            :id="`selopt-${activeKey}`"
            :key="activeKey"
            role="option"
            :aria-selected="selectedKeys.has(activeKey)"
            :aria-setsize="keys.length"
            :aria-posinset="cursor + 1"
            class="selection-region__option"
        >
            {{ label(activeKey) }}
        </div>
    </div>
</template>

<style scoped>
/* The region is a thin focusable surface OVER the plate (a sibling, not a child of the
   role=img). It carries no visible chrome of its own — the focus cursor IS the plate's
   `kbd-active` ring — so it occludes nothing; it is the keyboard door, not a second map. */
.selection-region {
    position: absolute;
    inset: 0;
    /* The pointer producer is the SVG's own marks; this layer is keyboard-only, so it must
       not steal pointer events from the live plate behind it. */
    pointer-events: none;
}
.selection-region:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
    border-radius: var(--radius, 0.5rem);
}
/* The single active option carries the accessible label for the screen reader; it is not a
   visible list (the map IS the visual), so it reads offscreen — present in the a11y tree, out
   of the visual flow. */
.selection-region__option {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
}
</style>
