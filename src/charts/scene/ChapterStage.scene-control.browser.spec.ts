// O-12 S-2 (PLAN §5.1): a stage's scenes move only by its segmented control. Wheeling through the
// stage leaves `?scene=` and the scene unchanged; choosing a scene on the control changes both, runs
// the scene's effect and announces it. Before B7 the scene followed a scroll step observer.
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import ChapterStage from "./ChapterStage.vue";
import { installDashboardRegistry } from "../../contract/registry-inject.js";
import { createAtlasEventHub } from "../../events/index.js";
import { useOptionalSceneContext, type ChapterStage as Stage, type StageAnatomy } from "../contract/scene-contract.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sceneParam = () => new URLSearchParams(window.location.search).get("scene");
const startUrl = window.location.href;

const anatomy = {
    foot: { title: "Consequence scatter" },
    gear: { label: "Controls" },
    provenance: { peekLabel: "Source" },
    export: { open: () => undefined, panel: () => null },
} satisfies StageAnatomy;

function mount() {
    window.history.replaceState(window.history.state, "", startUrl.split("?")[0]);
    const applied: string[] = [];
    const changes: string[] = [];
    const Graphic = defineComponent({
        setup() {
            const scene = useOptionalSceneContext();
            return () => h("div", { "data-testid": "graphic", style: "height:600px" }, scene?.activeStep.value.id ?? "none");
        },
    });
    const events = createAtlasEventHub();
    events.on("scene-change", (e) => void changes.push(`${e.from}->${e.to}`));
    const stage: Stage = {
        kind: "stage",
        id: "scatter",
        grain: "district",
        instance: Graphic,
        identity: { field: "leaNumber" },
        transition: { mode: "blend" },
        events,
        anatomy,
        apply: (option) => void applied.push(option.id),
        scenes: [
            { id: "utilization", label: "Utilization", prose: "Use against contract.", state: {}, encode: { x: "district:x", y: "district:y" } },
            { id: "scale", label: "Size", prose: "Per-student bandwidth against enrollment.", state: {}, encode: { x: "district:x", y: "district:y" } },
            { id: "equity", label: "Free and reduced lunch share", prose: "Against NSLP share.", state: {}, encode: { x: "district:x", y: "district:y" } },
        ],
    };
    const host = document.createElement("div");
    host.innerHTML = `<div style="height:300px"></div><div id="stage-host"></div><div style="height:3000px"></div>`;
    document.body.appendChild(host);
    const app = createApp(defineComponent({ render: () => h(ChapterStage, { stage, beatId: "scatter" }) }));
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] }));
    app.use(createPinia());
    app.mount(host.querySelector("#stage-host")!);
    return {
        root: host,
        applied,
        changes,
        done: () => {
            app.unmount();
            host.remove();
            window.scrollTo(0, 0);
            window.history.replaceState(window.history.state, "", startUrl);
        },
    };
}

let done: (() => void) | null = null;
afterEach(() => {
    done?.();
    done = null;
});

const graphicText = (root: ParentNode) => root.querySelector('[data-testid="graphic"]')?.textContent;

describe("ChapterStage scene control (O-12 S-2)", () => {
    it("wheeling through the stage leaves ?scene= and the scene unchanged", async () => {
        const m = mount();
        done = m.done;
        await wait(300);
        expect(graphicText(m.root)).toBe("utilization");
        const url = window.location.href;
        const graphic = m.root.querySelector<HTMLElement>('[data-testid="graphic"]')!;
        graphic.scrollIntoView({ block: "start" });
        for (let i = 0; i < 20; i++) {
            await userEvent.wheel(graphic, { delta: { y: 100 } });
            await wait(20);
        }
        await wait(300);
        expect(graphicText(m.root)).toBe("utilization");
        expect(sceneParam()).toBeNull();
        expect(window.location.href).toBe(url);
        expect(m.changes).toEqual([]);
    });

    it("the segmented control changes the scene and ?scene=, and runs its effect", async () => {
        const m = mount();
        done = m.done;
        await wait(300);
        const control = m.root.querySelector<HTMLElement>('[data-testid="scene-control"]')!;
        expect(control).not.toBeNull();
        const labels = [...control.querySelectorAll("button")].map((b) => b.textContent?.trim());
        expect(labels).toEqual(["Utilization", "Size", "Free and reduced lunch share"]);
        await userEvent.click([...control.querySelectorAll("button")].find((b) => b.textContent?.includes("Size"))!);
        await nextTick();
        await wait(50);
        expect(graphicText(m.root)).toBe("scale");
        expect(sceneParam()).toBe("scale");
        expect(m.applied.at(-1)).toBe("scale");
        expect(m.changes).toEqual(["utilization->scale"]);
        expect(m.root.querySelector("[data-scene-caption]")?.textContent).toContain("enrollment");
    });
});
