// U/B7d M3: on a shared border the press and the release can land on two marks, and the browser sends
// the click to their common ancestor. The map selects the mark the pointer came up on.
import "./GeoChoropleth.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import { geoIdentity } from "d3-geo";
import GeoChoropleth from "./GeoChoropleth.vue";

const square = (key: string, x: number) => ({
    type: "Feature" as const,
    properties: { key, name: key },
    geometry: { type: "Polygon" as const, coordinates: [[[x, 0], [x, 100], [x + 100, 100], [x + 100, 0], [x, 0]]] },
});

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

describe("a click on a shared border", () => {
    it("selects the mark the pointer came up on", async () => {
        const selected: Array<{ key: string; multi: boolean }> = [];
        const el = document.createElement("div");
        document.body.appendChild(el);
        const app = createApp({
            render: () =>
                h(GeoChoropleth, {
                    features: [square("A", 0), square("B", 100)],
                    projection: geoIdentity(),
                    viewport: [200, 100],
                    keyField: (f: { properties: { key: string } }) => f.properties.key,
                    nameField: (f: { properties: { name: string } }) => f.properties.name,
                    fill: () => "#88a",
                    ariaLabel: "squares",
                    onSelect: (e: { key: string; multi: boolean }) => selected.push(e),
                } as never),
        });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        await nextTick();
        const b = el.querySelector<SVGPathElement>("[data-key='B']")!;
        expect(b, "the mark drew").not.toBeNull();
        b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
        b.parentElement!.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
        expect(selected).toEqual([{ key: "B", multi: true }]);
    });

    it("does not select an earlier mark on a tap on empty field", async () => {
        const selected: Array<{ key: string; multi: boolean }> = [];
        const el = document.createElement("div");
        document.body.appendChild(el);
        const app = createApp({
            render: () =>
                h(GeoChoropleth, {
                    features: [square("A", 0), square("B", 100)],
                    projection: geoIdentity(),
                    viewport: [200, 100],
                    keyField: (f: { properties: { key: string } }) => f.properties.key,
                    nameField: (f: { properties: { name: string } }) => f.properties.name,
                    fill: () => "#88a",
                    ariaLabel: "squares",
                    onSelect: (e: { key: string; multi: boolean }) => selected.push(e),
                } as never),
        });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        await nextTick();
        const b = el.querySelector<SVGPathElement>("[data-key='B']")!;
        // A hybrid device: a mouse click on B, then a tap on the field beside the marks.
        b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
        b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(selected).toEqual([{ key: "B", multi: false }]);
        const field = b.parentElement!;
        field.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
        field.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(selected).toEqual([{ key: "B", multi: false }]);
    });
});
