import { effectScope, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import { useActiveBeat } from "../../src/platform/stores/useActiveBeat";
import { useComponentPointLoading } from "../../src/editorial/useComponentPointLoading";

describe("component-point loading", () => {
    it("warms only eager and active-adjacent components from the existing beat signal", async () => {
        setActivePinia(createPinia());
        const scope = effectScope();
        const loaded = scope.run(() =>
            useComponentPointLoading([
                { id: "cover", component: true, eager: true },
                { id: "one", component: true },
                { id: "stage", component: false },
                { id: "three", component: true },
                { id: "four", component: true },
            ]),
        )!;

        expect([...loaded.value]).toEqual(["cover"]);
        useActiveBeat().setActiveBeat("one");
        await nextTick();
        expect([...loaded.value]).toEqual(["cover", "one"]);

        useActiveBeat().setActiveBeat("three");
        await nextTick();
        expect([...loaded.value]).toEqual(["cover", "one", "three", "four"]);
        scope.stop();
    });

    it("warms the point BEFORE the active one (U·B3: the anchor jump past a short beat)", async () => {
        // /sci order: …map, trend (component), scatter (stage), about. An anchor jump to #trend
        // makes the scatter beat active because the unloaded trend card is short; trend must load.
        setActivePinia(createPinia());
        const scope = effectScope();
        const loaded = scope.run(() =>
            useComponentPointLoading([
                { id: "hero", component: true, eager: true },
                { id: "rainbow", component: true },
                { id: "map", component: true },
                { id: "trend", component: true },
                { id: "scatter", component: false },
                { id: "about", component: true },
            ]),
        )!;
        useActiveBeat().setActiveBeat("scatter");
        await nextTick();
        expect(loaded.value.has("trend")).toBe(true);
        expect([...loaded.value].sort()).toEqual(["about", "hero", "trend"]);
        scope.stop();
    });
});
