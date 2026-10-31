// interaction/useTapPin.ts — the phone readout for a mark that is not an entity (U/B7c C1, O-13).
//
// On the phone (a narrow viewport with a coarse pointer) there is no hover: the hover card is
// suppressed, and a tap on an entity opens EntityDetail's sheet. A mark that is not an entity (a
// tier band, a period on a trend, a cohort bar) opens no detail, so before this the tap showed
// nothing. Now a tap that lands a readout and opens no detail PINS that readout: the card stays,
// at the mark, until the reader taps elsewhere, opens a detail, or the card's own dismissals fire
// (Escape, a route change: HoverCard calls `release`). A touch that moves (a scroll) is not a tap
// and pins nothing.
//
// The tap clock and the last published readout live in the readout store (`lastTap`, `published`),
// not here (U/B7d M2). A consumer mounts the card on the first readout, so the first tap on a page
// ends, and its plate clears, before this composable exists; it reads that tap when it mounts.
import { onBeforeUnmount, onMounted, watch, shallowRef, type Ref } from "vue";
import type { HoverReadout, PublishedReadout } from "../platform/stores/useHoverReadout.js";

/** A readout counts as the tap's when it was published this close to the tap's end. */
export const TAP_READOUT_MS = 600;

export function useTapPin(opts: {
    /** The phone register is on (the card is otherwise suppressed). */
    enabled: () => boolean;
    /** When the last tap ended (the store's `lastTap`). */
    lastTap: () => number;
    /** The last readout the store accepted, kept after its plate clears it (the store's `published`). */
    published: () => PublishedReadout | null;
    /** EntityDetail is open (an entity tap: the sheet is the readout). */
    entityOpen: () => boolean;
    /** The pinned card's element, so a tap inside it does not release it. */
    card: () => Element | null;
}): { pinned: Ref<HoverReadout | null>; release: () => void } {
    const pinned = shallowRef<HoverReadout | null>(null);
    // the published readout a tap already pinned or released: it never pins a second time
    let spent: PublishedReadout | null = null;

    const release = () => {
        pinned.value = null;
    };

    function settle(): void {
        if (!opts.enabled() || opts.entityOpen()) return;
        const last = opts.published();
        if (!last || last === spent || !last.readout.anchor) return;
        if (Math.abs(last.t - opts.lastTap()) > TAP_READOUT_MS) return;
        spent = last;
        pinned.value = last.readout;
    }
    // let EntityDetail open first: an entity tap is the sheet's, not the card's
    const settleSoon = () => requestAnimationFrame(() => requestAnimationFrame(settle));

    // a tap ended; or a readout arrived after the tap ended (a plate that publishes on click)
    watch(opts.lastTap, settleSoon);
    watch(opts.published, settleSoon);
    watch(opts.entityOpen, (open) => open && release());
    watch(opts.enabled, (on) => !on && release());

    function onDown(e: PointerEvent): void {
        if (e.pointerType !== "touch") return;
        const card = opts.card();
        if (pinned.value && !(card && e.target instanceof Node && card.contains(e.target))) {
            // this tap releases the pin, so the pinned readout must not pin again when the tap ends;
            // a readout this tap lands on another mark (published as the touch entered it, before
            // this pointerdown) is a new record and still pins
            const last = opts.published();
            if (last?.readout === pinned.value) spent = last;
            release();
        }
    }
    onMounted(() => {
        window.addEventListener("pointerdown", onDown, true);
        // the tap that published the first readout ended before this card mounted
        settleSoon();
    });
    onBeforeUnmount(() => {
        window.removeEventListener("pointerdown", onDown, true);
    });

    return { pinned, release };
}
