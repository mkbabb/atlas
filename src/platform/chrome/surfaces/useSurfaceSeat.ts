// useSurfaceSeat — one open surface per screen seat (U/B7 PLAN §2.5).
//
// Two seats share the viewport edge: `right` at ≥ 768 px (the EntityDetail sheet, the filter
// drawer) and `bottom` below 768 px (the dock's sheets, the EntityDetail bottom sheet). Opening a
// surface in a seat closes whichever surface held it. Opening any seat closes every figure dock menu
// that registered through `useSeatYield`. The state is one Pinia store, so every surface on the page
// reads the same holders.
import { defineStore } from "pinia";
import { computed, getCurrentScope, onScopeDispose, ref, watch, type ComputedRef, type Ref } from "vue";

import { MQ } from "../../../design/foundations/breakpoints.js";

export type SurfaceSeat = "right" | "bottom";

export const useSurfaceSeats = defineStore("platform:surface-seat", () => {
    const holders = ref<Record<SurfaceSeat, string | null>>({ right: null, bottom: null });
    const yielders = new Set<() => void>();

    function open(seat: SurfaceSeat, owner: string): void {
        if (holders.value[seat] === owner) return;
        holders.value = { ...holders.value, [seat]: owner };
        for (const y of [...yielders]) y();
    }
    function close(seat: SurfaceSeat, owner: string): void {
        if (holders.value[seat] !== owner) return;
        holders.value = { ...holders.value, [seat]: null };
    }
    function onYield(fn: () => void): () => void {
        yielders.add(fn);
        return () => yielders.delete(fn);
    }
    return { holders, open, close, onYield };
});

export interface SurfaceSeatHandle {
    /** True while this owner holds the seat. */
    isOpen: ComputedRef<boolean>;
    /** Take the seat; the surface that held it closes. */
    open(): void;
    /** Leave the seat, when this owner holds it. */
    close(): void;
}

/**
 * Claim a screen seat for one surface. `seat` may be a getter, so a surface whose seat depends on
 * the viewport (EntityDetail: right at ≥ 768 px, bottom below) moves with it. The owner releases its
 * seat when its scope is disposed.
 */
export function useSurfaceSeat(seat: SurfaceSeat | (() => SurfaceSeat), owner: string): SurfaceSeatHandle {
    const store = useSurfaceSeats();
    const seatOf = typeof seat === "function" ? seat : () => seat;
    const isOpen = computed(() => store.holders[seatOf()] === owner);
    const close = () => {
        store.close("right", owner);
        store.close("bottom", owner);
    };
    if (getCurrentScope()) onScopeDispose(close);
    return {
        isOpen,
        open: () => {
            const other: SurfaceSeat = seatOf() === "right" ? "bottom" : "right";
            store.close(other, owner);
            store.open(seatOf(), owner);
        },
        close,
    };
}

/** Run `onYield` whenever any surface takes a seat (a figure dock closes its menu). */
export function useSeatYield(onYield: () => void): void {
    const store = useSurfaceSeats();
    const off = store.onYield(onYield);
    if (getCurrentScope()) onScopeDispose(off);
}

/** The seat a viewport-bound sheet takes: `right` at ≥ 768 px, `bottom` below. */
export function useViewportSeat(): () => SurfaceSeat {
    const wide = ref(true);
    if (typeof window !== "undefined" && window.matchMedia) {
        const mq = window.matchMedia(MQ.phone);
        wide.value = !mq.matches;
        const sync = () => (wide.value = !mq.matches);
        mq.addEventListener("change", sync);
        if (getCurrentScope()) onScopeDispose(() => mq.removeEventListener("change", sync));
    }
    return () => (wide.value ? "right" : "bottom");
}

/**
 * Bind a surface's own `open` model to a seat: opening takes the seat, closing leaves it, and losing
 * the seat to another surface closes this one.
 */
export function useSeatedOpen(
    open: Ref<boolean>,
    seat: SurfaceSeat | (() => SurfaceSeat),
    owner: string,
): SurfaceSeatHandle {
    const handle = useSurfaceSeat(seat, owner);
    watch(
        open,
        (next) => (next ? handle.open() : handle.close()),
        { immediate: true },
    );
    watch(handle.isOpen, (held) => {
        if (!held && open.value) open.value = false;
    });
    return handle;
}
