<script setup lang="ts">
// PlatformShell — the generic platform chrome: a SINGLE full-width content stage with
// FLOATING overlay slots. (C.W3.1 — the grid→stage collapse; CP-0/CP-4.)
//
// THE COLLAPSE (C-AESTHETIC §2.6). The B-tranche shell was a 2-track grid (a fixed dock
// column + a content column): the dock owned a reserved left column, the filter was a
// left-`calc` panel, and the content INSET past a persistent filter rail through the §K5
// gutter stack (a reactive content-gutter var + a specificity-out-bidding doubled-class
// main selector + a desktop/mobile structural fork). That encoded preferences as
// STRUCTURE — collapse was non-existent because a grid track has no width transition,
// and the filter occluded the hero on first paint.
//
// Once the dock FLOATS (C3.2 → position:fixed GlassDock), the filter is a closed
// live-behind Drawer (C3.3 — occludes nothing), and the viz expands over everything
// (C3.4), the shell's reason-to-be-a-grid EVAPORATES. The two-track grid collapses to
// ONE content stage; dock / filter / expanded-viz become FLOATING OVERLAY SLOTS, none a
// layout participant. The hero is full-bleed under the floating dock at every viewport —
// nothing is reserved, nothing inset. The whole §K5 sub-system (the gutter calc, the
// specificity hack, the desktop/mobile grid fork) is DELETED, not re-aimed (CP-3/H6).
//
// Named slots — all FLOAT over the single stage, none reserve space:
//   `aurora`   — the app-level pole-wash mount (behind content).
//   `dock`     — the floating dock instrument. Defaults to the current Dock, ONE responsive
//                component (the atlas-unified-register law, MEMORY "Unified chrome register"):
//                the floating VERTICAL LEFT rail at every viewport (position:fixed off the left
//                margin). It rests COLLAPSED at the phone register (Dock.vue
//                `:start-collapsed="isPhone"`), where its gilt crest is the BUTTON that expands
//                the top-left ruled section-menu SHEET — crest→ruled-sheet, NEVER a
//                bottom/horizontal fork. One Dock, one orientation, re-collapsed responsively.
//   `filter`   — the right live-behind filter Drawer (C3.3 fills; a peer at --z-panel).
import { computed, inject, onBeforeUnmount, onMounted } from "vue";
import Dock from "@/platform/chrome/dock/Dock.vue";
import { DASHBOARD_KEY } from "@/contract";
import { useSelection } from "@/platform/stores/useSelection";
import { useFilterPane } from "@/filter/composables/useFilterPane";

// The active dashboard's context — the dock reads its nav at every register (the filter is the
// floating Drawer, one affordance for both). Bound here as the `--route-*` cascade + injected by
// the route view.
const ctx = inject(DASHBOARD_KEY);

// ── THE --route-* CHROME-IDENTITY CASCADE (design-palette-identity §2.4 MOVE 4 — the keystone) ──
// The shell IS the EXACT element wrapping the dock + the content stage, so it binds the active
// route's `chromeIdentity` profile as the `--route-*` custom-property GROUP here, via inline
// `:style` — the data-DRIVEN cascade, NEVER a `[data-dashboard]` stylesheet fork (the
// C1-retired anti-pattern). The tokens cascade to every
// chrome descendant (the dock rivets via `rivetHue()`, the eyebrow icon, the legend chip). Each
// leg falls through to the tokens.css `:root` neutral default when the profile omits it (warm/cool
// ⇒ the accent; ECF declares no legs). A route with no `chromeIdentity` (the gallery/about, which
// mounts no PlatformShell anyway) leaves the `:root` defaults untouched. Theme-aware for free —
// the values are `var(--viz-*)`/`var(--rainbow-*)` references, so a theme flip retunes them.
const routeIdentityStyle = computed<Record<string, string>>(() => {
    const id = ctx?.chromeIdentity;
    if (!id) return {};
    const style: Record<string, string> = { "--route-accent": id.accent };
    if (id.accentWarm) style["--route-accent-warm"] = id.accentWarm;
    if (id.accentCool) style["--route-accent-cool"] = id.accentCool;
    if (id.eyebrowHue) style["--route-eyebrow-hue"] = id.eyebrowHue;
    return style;
});

// ── THE DOCUMENT-LEVEL Esc CONTRACT (D2.4 / D6) ──────────────────────────────────────────
// ONE chrome-level keydown seam — the platform's single Escape arbiter (the user's ask:
// "Esc after clicking a selection ANYWHERE should clear it"). Until now the only Escape
// handler was SelectionRegion-LOCAL (reachable only with a chart-region widget focused), so a
// body-focused Esc did nothing. This seam closes that gap WITHOUT double-handling the overlays
// that own their own Escape.
//
// Escape PRIORITY (the documented order):
//   (a) a topmost OVERLAY is open → DEFER. The overlays each carry their OWN Escape-to-close:
//       the expand fullscreen (glass-ui ExpandableContainer's `useKeyboardShortcuts`), the
//       filter drawer (vaul's `dismissible:true`, D2.b), and the save-popover (its input's
//       `@keydown.esc`). This seam must NOT also clear the selection on that same Escape (the
//       double-handle), so when ANY overlay is open it returns and lets the overlay's handler
//       run. expand → drawer → save-popover is the close order, each self-closing; we only need
//       to know "is SOMETHING open" to defer.
//   (b) no overlay, not in an editable field → CLEAR the selection set (`clearSelection`).
//   (c) nothing to clear → no-op (a bare Escape on an empty page does nothing).
//
// GUARDS:
//   • focus-in-input: an Escape while a text input / textarea / contenteditable holds focus is
//     the FIELD'S own concern (the save-view name input cancels its edit) — never a global
//     selection clear (the negative control). We defer on any editable focus.
//   • role=img: the SVG charts are `role="img"`; an Escape originating inside one is the
//     plate's own (the SelectionRegion sibling handles the keyboard clear). We never reach in.
const selection = useSelection();
const { open: filterOpen } = useFilterPane();

/** True when a higher-priority overlay owns this Escape (defer to its own close handler). */
function anOverlayIsOpen(): boolean {
    // The drawer — the shared single-source open flag (no DOM probe needed).
    if (filterOpen.value) return true;
    // The expand fullscreen — glass-ui teleports a `.fixed.inset-0.z-modal` surface to <body>
    // while a plate is expanded (its own Escape closes it). Its presence is the open signal.
    if (
        typeof document !== "undefined" &&
        document.querySelector(".fixed.inset-0.z-modal")
    ) {
        return true;
    }
    // The per-viz OPTIONS popover (D4.a · the §6 Esc ladder's OUTERMOST rung) — reka teleports
    // its content with `[data-dismissable-layer][data-state="open"]` while open (its own Escape
    // closes it). Detecting it here lets the document handler DEFER, so an Esc that dismisses the
    // popover does NOT also clear the selection (the compound-Esc bug the ladder exists to end).
    if (
        typeof document !== "undefined" &&
        document.querySelector("[data-dismissable-layer][data-state='open']")
    ) {
        return true;
    }
    return false;
}

/** True when focus sits in an editable field — the field owns its Escape, never the document. */
function focusInEditable(): boolean {
    const el = (
        typeof document !== "undefined" ? document.activeElement : null
    ) as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
}

function onDocKeydown(e: KeyboardEvent): void {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    // (a) DEFER — an overlay owns this Escape; do not also clear the selection (no double-handle).
    if (anOverlayIsOpen()) return;
    // GUARD — an Escape inside an editable field (the save-view input) is the field's, not ours.
    if (focusInEditable()) return;
    // (b) CLEAR the selection set if one is live; (c) otherwise a no-op (nothing pinned).
    if (selection.hasSelection) {
        selection.clearSelection();
    }
}

onMounted(() => window.addEventListener("keydown", onDocKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onDocKeydown));
</script>

<template>
    <div class="platform-shell text-foreground" :style="routeIdentityStyle">
        <!-- The app-level pole-wash mount (fills behind content; inert here). -->
        <slot name="aurora" />

        <!-- Skip link — first focusable element (the keyboard landmark). -->
        <a
            href="#main-content"
            class="skip-link sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
        >
            Skip to content
        </a>

        <!-- ① The floating dock — an OVERLAY, not a grid track. ONE responsive Dock (the
             atlas-unified-register law): the position:fixed VERTICAL LEFT rail at every viewport,
             resting collapsed at the phone register where its crest expands the ruled section-menu
             sheet (crest→sheet, never a bottom/horizontal fork). The stage flows UNDER it, its
             inline-start reserved by the 112px dock gutter (D1) so no hero ink sits under the rail.

             O-D3 PLAT-6 — THE BANNER LANDMARK. The dock is the ONE persistent site-chrome present
             at every route (the brand crest + the primary section nav), so it is the shell's
             `role=banner` (a11y.md: "no route exposes a banner … landmark"). `<header>` carries no
             layout CSS of its own here — `.platform-shell__dock-slot` still owns the z-rung, and a
             bare semantic wrapper does not create a new containing block, so the dock's OWN
             `position:fixed` continues to size against the viewport, unchanged. -->
        <header role="banner" class="platform-shell__dock-slot">
            <slot name="dock"><Dock /></slot>
        </header>

        <!-- ② The content — the SINGLE full-width stage. No reserved gutter, no inset; the
             hero is full-bleed under the floating dock at every viewport.

             O-D3 PLAT-8 — the skip-link's target gets `tabindex="-1"`: today activating "Skip to
             content" scrolls to `#main-content` but never MOVES focus there (a11y.md: "focus lands
             on body"). A programmatically-focusable non-interactive landmark is the standard skip-
             target fix; it does not enter the Tab order (only script-driven `.focus()` reaches it). -->
        <main
            id="main-content"
            tabindex="-1"
            class="platform-shell__main min-w-0 px-4 pb-28 pt-6 md:px-8 md:pb-24 md:pt-10"
        >
            <slot />
        </main>

        <!-- ③ The right live-behind filter Drawer (C3.3 fills; floats at --z-panel, a peer
             of the dock — occludes nothing when closed). -->
        <slot name="filter" />
    </div>
</template>

<style scoped>
/* THE SINGLE CONTENT STAGE (C-AESTHETIC §2.6). No grid, no reserved dock column, no
   filter gutter, no desktop/mobile structural fork — one full-width stage the floating
   slots hover over. The §K5 machinery (the reactive content-gutter calc, the
   doubled-class out-bidding main selector, the per-breakpoint grid fork) is DELETED,
   not re-aimed. */
.platform-shell {
    position: relative;
    min-height: 100dvh;
}

/* The dock slot — a floating overlay container. The dock surface inside FLOATS
   (C3.2's GlassDock is position:fixed); this slot reserves no layout space, it only
   seats the z-rung so the dock rides above the content stage and below the panels. */
.platform-shell__dock-slot {
    z-index: var(--z-dock);
}

/* The content stage — the single full-width track. min-w-0 (utility) lets wide charts
   shrink past min-content so they never blow the stage open. Seats the flat content
   rung beneath every floating overlay.

   THE TRUE EXPANDED-RAIL GUTTER (N.WG1 · M.W1 D1 · the F9 occlusion fix) — the dock is the
   persistent vertical rail floating off the LEFT margin at the desktop register (Dock.vue,
   position:fixed). The content stage reserves the FULL float footprint — the inset gap + the
   expanded rail column + the inset gap again (`--cp-dock-reserve`, the tokens.css root term =
   7rem/112px) — so NO hero ink is ever laid in the dock's track (x < 112px). The J-DOCK reclaim
   reserved only `inset + tab` and let a full-bleed masthead flow UNDER the floating rail, which
   is exactly what clipped the five heroes (F9); D1 reverses it to the static gutter. `max(2rem,
   …)` keeps the desktop `md:px-8` base where it already clears the reserve and grows to the full
   112px gutter on the narrow-desktop band. At ≥1550px the route body (`.dashboard-body`,
   `margin-inline: auto`) re-centres in the NON-dock track. The `md:px-8` utility still governs
   the inline-END pad; this overrides only the START. No local shadow — the stage inherits the
   ONE tokens.css root reserve (the gate asserts the RELATION reserve === inset + dock-w + inset). */
.platform-shell__main {
    position: relative;
    z-index: var(--z-content);
    padding-inline-start: max(2rem, var(--cp-dock-reserve));
}

/* C7.c (FIX 5) · the MOBILE foot safe-area inset — the last plate + colophon clear the home
   indicator / gesture bar (the `pb-28` = 7rem utility is the floor via max()).
   env(safe-area-inset-bottom) is 0 on every non-notched surface. */
@media (--phone) {
    .platform-shell__main {
        /* the dock rests COLLAPSED at the phone register (Dock.vue `:start-collapsed="isPhone"`)
           — it floats over the page margin as the tab sliver, so the phone re-bases the reserve
           to the collapsed-tab footprint and the prose reclaims the phone width (j0-dock-reserve
           holds). */
        --cp-dock-reserve: calc(var(--cp-inset) + var(--cp-dock-tab-w));
        /* THE PHONE BLOCK RESERVE (D1 · N.WG1 Arm B — the crest→sheet pair). The phone trades the
           desktop's INLINE gutter for a TOP reserve: the collapsed crest pill (inset 1.25rem +
           the hugged dome ≈ 3.75rem) floats over the page's head margin, so the content stage
           starts BELOW it — no eyebrow/title ink under the pill (the F9 family, phone arm). */
        padding-block-start: 5rem;
        padding-block-end: max(7rem, calc(7rem + env(safe-area-inset-bottom)));
    }
}

/* The skip-link, when focused, must sit above everything reachable. */
.skip-link:focus {
    z-index: var(--z-hovercard);
}
</style>

<!-- C7.c (FIX 5) · the right live-behind filter Drawer's SAFE-AREA inset. The Drawer
     (FilterPanel's DrawerContent, `data-testid="filter-panel"`) is body-TELEPORTED by
     vaul-vue, so a scoped `:deep()` from the shell cannot reach it — this UN-scoped block is
     the within-bounds binding that pushes the floating drawer's foot clear of the home
     indicator / gesture bar (the right-drawer idiom, NOT a bottom sheet). MOBILE-ONLY (the
     @media gates it) and env(safe-area-inset-bottom) is 0 on every non-notched surface, so
     desktop + flat phones are byte-unchanged; only a notched phone grows the inset. -->
<style>
@media (--phone) {
    [data-testid="filter-panel"] {
        padding-block-end: max(0.5rem, env(safe-area-inset-bottom));
    }

    /* C7.c (FIX 1/G2) · the colophon's STANDALONE brand wordmark link
       (`.colophon__brand`, "TIL · atlas.friday.institute") is a genuine standalone control —
       NOT an inline-in-a-sentence prose link — so it IS gated at the WCAG 2.5.5 44px floor
       (the gate stays STRICT for standalone links). It renders ~147×19.5px (the text run is
       wide but only ~20px tall). This MOBILE PROPERTY pads its OWN hit box to the 44px block
       floor (the wordmark glyph stays its size, the box pads vertically — "the visual glyph can
       stay; pad the tap target"). The link lives in the colophon (out of the shell's scoped
       tree), so this un-scoped shell block is the within-bounds binding; @media gates it so
       desktop is byte-unchanged. */
    .colophon__brand {
        display: inline-flex;
        align-items: center;
        min-block-size: 44px;
    }
}
</style>
