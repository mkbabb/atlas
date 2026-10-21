// PLAN §2.5: one open surface per seat. Opening one surface closes the other in its seat; opening
// any seat closes a figure dock menu; a surface whose seat follows the viewport leaves the old seat.
import { beforeEach, describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSeatedOpen, useSeatYield, useSurfaceSeat } from "../../src/platform/chrome/surfaces/useSurfaceSeat";

beforeEach(() => setActivePinia(createPinia()));

describe("useSurfaceSeat (PLAN §2.5)", () => {
    it("right seat: opening the filter drawer closes the entity detail, and the reverse", () => {
        const detail = useSurfaceSeat("right", "entity-detail");
        const drawer = useSurfaceSeat("right", "filter-drawer");
        detail.open();
        expect([detail.isOpen.value, drawer.isOpen.value]).toEqual([true, false]);
        drawer.open();
        expect([detail.isOpen.value, drawer.isOpen.value]).toEqual([false, true]);
        detail.open();
        expect([detail.isOpen.value, drawer.isOpen.value]).toEqual([true, false]);
        detail.close();
        expect([detail.isOpen.value, drawer.isOpen.value]).toEqual([false, false]);
    });

    it("the seats are independent: a bottom sheet leaves the right seat alone", () => {
        const right = useSurfaceSeat("right", "filter-drawer");
        const bottom = useSurfaceSeat("bottom", "dock-sections");
        right.open();
        bottom.open();
        expect([right.isOpen.value, bottom.isOpen.value]).toEqual([true, true]);
    });

    it("a viewport-bound seat moves: the detail leaves the right seat when it opens at the bottom", () => {
        const wide = ref(true);
        const detail = useSurfaceSeat(() => (wide.value ? "right" : "bottom"), "entity-detail");
        const dock = useSurfaceSeat("bottom", "dock-more");
        detail.open();
        wide.value = false;
        dock.open();
        expect(detail.isOpen.value).toBe(false);
        detail.open();
        expect([detail.isOpen.value, dock.isOpen.value]).toEqual([true, false]);
    });

    it("opening any seat closes a figure dock menu", () => {
        let menu = true;
        const scope = effectScope();
        scope.run(() => useSeatYield(() => (menu = false)));
        useSurfaceSeat("right", "entity-detail").open();
        expect(menu).toBe(false);
        scope.stop();
        menu = true;
        useSurfaceSeat("right", "filter-drawer").open();
        expect(menu).toBe(true);
    });

    it("a disposed owner releases its seat", () => {
        const scope = effectScope();
        const h = scope.run(() => useSurfaceSeat("right", "entity-detail"))!;
        h.open();
        const other = useSurfaceSeat("right", "probe");
        scope.stop();
        expect(other.isOpen.value).toBe(false);
        other.open();
        expect(other.isOpen.value).toBe(true);
    });

    it("a bound open model: the drawer closes when the detail takes its seat", async () => {
        const drawerOpen = ref(false);
        const detailOpen = ref(false);
        const scope = effectScope();
        scope.run(() => {
            useSeatedOpen(drawerOpen, "right", "filter-drawer");
            useSeatedOpen(detailOpen, "right", "entity-detail");
        });
        drawerOpen.value = true;
        await nextTick();
        detailOpen.value = true;
        await nextTick();
        await nextTick();
        expect([drawerOpen.value, detailOpen.value]).toEqual([false, true]);
        drawerOpen.value = true;
        await nextTick();
        await nextTick();
        expect([drawerOpen.value, detailOpen.value]).toEqual([true, false]);
        scope.stop();
    });
});
