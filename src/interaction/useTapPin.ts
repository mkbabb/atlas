// interaction/useTapPin.ts — the phone readout for a mark that is not an entity (U/B7c C1, O-13).
//
// On the phone (a narrow viewport with a coarse pointer) there is no hover: the hover card is
// suppressed, and a tap on an entity opens EntityDetail's sheet. A mark that is not an entity (a
// tier band, a period on a trend, a cohort bar) opens no detail, so before this the tap showed
// nothing. Now a tap that lands a readout and opens no detail PINS that readout: the card stays,
// at the mark, until the reader taps elsewhere, opens a detail, or the card's own dismissals fire
// (Escape, a route change: HoverCard calls `release`). A touch that moves (a scroll) is not a tap
// and pins nothing.
import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from "vue";
import type { HoverReadout } from "../platform/stores/useHoverReadout.js";

/** The longest press, and the farthest drift, that still count as a tap. */
export const TAP_MS = 500;
export const TAP_SLOP_PX = 10;
/** A readout counts as the tap's when it landed this close to the tap. */
export const TAP_READOUT_MS = 600;

export function useTapPin(opts: {
    /** The phone register is on (the card is otherwise suppressed). */
    enabled: () => boolean;
    /** The live transient readout. */
    readout: () => HoverReadout | null;
    /** EntityDetail is open (an entity tap: the sheet is the readout). */
    entityOpen: () => boolean;
    /** The pinned card's element, so a tap inside it does not release it. */
    card: () => Element | null;
}): { pinned: Ref<HoverReadout | null>; release: () => void } {
    const pinned = shallowRef<HoverReadout | null>(null);
    let down: { x: number; y: number; t: number } | null = null;
    let seen: { readout: HoverReadout; t: number } | null = null;
    let tapAt = Number.NEGATIVE_INFINITY;

    const release = () => {
        pinned.value = null;
    };

    function settle(): void {
        if (!opts.enabled() || opts.entityOpen()) return;
        const now = performance.now();
        if (now - tapAt > TAP_READOUT_MS || !seen || Math.abs(seen.t - tapAt) > TAP_READOUT_MS) return;
        pinned.value = seen.readout;
    }

    watch(opts.readout, (r) => {
        if (!r || !r.anchor) return;
        seen = { readout: r, t: performance.now() };
        // the readout arrived after the tap ended (a plate that publishes on click)
        if (performance.now() - tapAt <= TAP_READOUT_MS) requestAnimationFrame(settle);
    });
    watch(opts.entityOpen, (open) => open && release());
    watch(opts.enabled, (on) => !on && release());

    function onDown(e: PointerEvent): void {
        if (e.pointerType !== "touch") return;
        down = { x: e.clientX, y: e.clientY, t: performance.now() };
        const card = opts.card();
        if (pinned.value && !(card && e.target instanceof Node && card.contains(e.target))) {
            // this tap releases the pin, so it must not pin the same readout again when it ends;
            // a readout this tap lands on another mark is a new object and still pins
            if (seen?.readout === pinned.value) seen = null;
            release();
        }
    }
    function onUp(e: PointerEvent): void {
        if (e.pointerType !== "touch" || !down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const held = performance.now() - down.t;
        down = null;
        if (moved > TAP_SLOP_PX || held > TAP_MS) return;
        tapAt = performance.now();
        // let EntityDetail open first: an entity tap is the sheet's, not the card's
        requestAnimationFrame(() => requestAnimationFrame(settle));
    }
    onMounted(() => {
        window.addEventListener("pointerdown", onDown, true);
        window.addEventListener("pointerup", onUp, true);
    });
    onBeforeUnmount(() => {
        window.removeEventListener("pointerdown", onDown, true);
        window.removeEventListener("pointerup", onUp, true);
    });

    return { pinned, release };
}
