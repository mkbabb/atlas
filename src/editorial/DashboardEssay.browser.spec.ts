// DashboardEssay in a real engine (U/B7 lane A3; RULINGS §N N-1 M-2; PLAN §4.2, §5.1 S-4, §5.8,
// §6.2 F9). Every height and position check here is exact: no pixel slack.
//
// - M-2: the first figure beat reserves the route's estimate while its plate resolves, then is its
//   own height. B5 measured the band the old floor left at 195/93/180 px at 390 on
//   /usf-integrity, /demand and /speedtest, 374/242 px on /usf and 319/210 px on /ecf.
// - S-4: a beat paints at rest; no fade or lift is bound to its view timeline.
// - F9: a point mounts in idle time once its beat is within 1.5 viewports; until then the beat
//   reserves the route height and shows the skeleton. A cold #fragment mounts its target and the
//   beat before it at setup.
// - §5.8: the masthead carries no eyebrow, and no versal unless the chapter declares one.
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, onMounted, ref } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import DashboardEssay from "./DashboardEssay.vue";
import { installDashboardRegistry } from "../contract/registry-inject";
import type { StoryManifest } from "../story/manifest";
import "../design/overlays/map-draw.css";
import "../design/overlays/scroll-driven.css";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const Icon = { render: () => null };

/** A plate that renders nothing for `delayMs`, then settles at `height` px. */
function latePlate(height: number, delayMs: number) {
    return defineComponent({
        setup() {
            const ready = ref(false);
            onMounted(() => setTimeout(() => (ready.value = true), delayMs));
            return () =>
                ready.value ? h("div", { "data-test-plate": "", style: `height:${height}px` }) : null;
        },
    });
}

/** A plate that is there at once, `height` px tall. */
function plate(height: number) {
    return defineComponent({
        render: () => h("div", { "data-test-plate": "", style: `height:${height}px` }),
    });
}

type Plate = ReturnType<typeof defineComponent>;

function story(plates: Plate[], extra: Record<string, unknown> = {}): StoryManifest {
    const cover = defineComponent({ render: () => h("div", { style: "height:200px" }, "cover") });
    const slugs = ["fig", "next", "third", "fourth", "fifth"];
    return {
        id: "floor",
        points: [
            { slug: "cover", kind: "cover", title: "Cover", viz: { kind: "component", component: cover, load: async () => ({ default: cover }) } },
            ...plates.map((p, i) => ({
                slug: slugs[i],
                kind: "beat",
                icon: Icon,
                eyebrow: `Eyebrow ${i}`,
                title: `Figure ${i}`,
                dek: "Dek.",
                viz: { kind: "component", component: p, load: async () => ({ default: p }) },
                ...extra,
            })),
        ],
    } as unknown as StoryManifest;
}

let unmount: (() => void) | null = null;
afterEach(() => {
    unmount?.();
    unmount = null;
    window.scrollTo(0, 0);
});

async function mountEssay(manifest: StoryManifest, { tokens = "--beat-cis: 1200px", path = "/floor" } = {}) {
    const host = document.createElement("div");
    host.style.cssText = `${tokens}; width: 720px`;
    document.body.appendChild(host);
    const app = createApp(defineComponent({ setup: () => () => h(DashboardEssay, { story: manifest }) }));
    app.use(createPinia());
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] });
    app.use(router);
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    await router.push(path);
    app.mount(host);
    unmount = () => {
        app.unmount();
        host.remove();
    };
    const beat = (id = "fig") => host.querySelector<HTMLElement>(`#${id}`)!;
    return {
        host,
        beat,
        /** The beat's painted height against its content's own height. */
        band: (id = "fig") => {
            const b = beat(id);
            const painted = b.offsetHeight;
            const prev = b.style.minBlockSize;
            b.style.minBlockSize = "0px";
            const own = b.offsetHeight;
            b.style.minBlockSize = prev;
            return { painted, own, band: painted - own };
        },
    };
}

describe("M-2 · the first-figure floor reserves while the plate resolves, then the beat is its own height", () => {
    it("a plate shorter than the route estimate leaves no painted band once settled", async () => {
        const essay = await mountEssay(story([latePlate(400, 300)]));
        await sleep(100);
        expect(essay.beat().getAttribute("data-first-figure")).toBe("held");
        expect(essay.band().painted).toBeGreaterThanOrEqual(1200);
        await sleep(2000);
        expect(essay.beat().querySelector("[data-test-plate]")).not.toBeNull();
        expect(essay.beat().getAttribute("data-first-figure")).toBe("settled");
        const { band, own } = essay.band();
        expect(own).toBeGreaterThan(400);
        expect(band).toBe(0);
    });

    it("a plate taller than the route estimate grows past it and paints no band either", async () => {
        const essay = await mountEssay(story([latePlate(1600, 300)]));
        await sleep(2300);
        const { band, own } = essay.band();
        expect(own).toBeGreaterThan(1600);
        expect(band).toBe(0);
    });

    it("a route's declared --first-figure-cis is the beat's own height: the release moves nothing", async () => {
        const probe = await mountEssay(story([latePlate(400, 300)]));
        await sleep(2000);
        const own = probe.band().own;
        unmount?.();
        unmount = null;
        const essay = await mountEssay(story([latePlate(400, 300)]), {
            tokens: `--beat-cis: 1200px; --first-figure-cis: ${own}px`,
        });
        // Painted frames only: a layout forced before the first rendering update sees the beat's
        // `content-visibility` placeholder (Beat.vue), which is never painted.
        await frame();
        await frame();
        const heights = new Set<number>();
        const t0 = performance.now();
        while (performance.now() - t0 < 2200) {
            heights.add(essay.beat().offsetHeight);
            await frame();
        }
        expect(essay.beat().getAttribute("data-first-figure")).toBe("settled");
        expect([...heights]).toEqual([own]);
    });
});

describe("S-4 · a beat paints at rest", () => {
    it("binds no fade or lift to the view timeline: a beat entering the viewport is at opacity 1, untransformed", async () => {
        const essay = await mountEssay(story([plate(600), plate(600), plate(600)]));
        await sleep(300);
        // Put the third beat's top 10% of a viewport above the fold: inside the old entry window.
        const third = essay.beat("third");
        window.scrollTo(0, third.getBoundingClientRect().top + window.scrollY - innerHeight * 0.9);
        await frame();
        await frame();
        const cs = getComputedStyle(third);
        expect(cs.opacity).toBe("1");
        expect(cs.transform).toBe("none");
        const names = third.getAnimations().map((a) => (a as CSSAnimation).animationName);
        expect(names.filter((n) => n !== "scroll-tl-pos")).toEqual([]);
    });
});

describe("§5.8 · the masthead carries no eyebrow, and no versal unless declared", () => {
    it("renders the h2 and dek with no eyebrow line and no FigureInitial", async () => {
        const essay = await mountEssay(story([plate(300), plate(300)]));
        await sleep(100);
        expect(essay.host.querySelector(".essay-masthead-cluster .eyebrow")).toBeNull();
        expect(essay.host.textContent).not.toContain("Eyebrow 0");
        expect(essay.host.querySelector(".beat__initial")).toBeNull();
        expect(essay.beat().querySelector("h2")?.textContent).toContain("Figure 0");
    });

    it("mounts a versal where the chapter declares one", async () => {
        const essay = await mountEssay(story([plate(300)], { versal: "route" }));
        await sleep(100);
        expect(essay.beat().querySelector(".beat__initial")).not.toBeNull();
    });
});

describe("F9 · points mount ahead of the viewport in idle time", () => {
    it("a beat beyond 1.5 viewports waits behind its reserve; one inside the band mounts before it scrolls in", async () => {
        const tall = Math.round(innerHeight * 1.2);
        const essay = await mountEssay(
            story([plate(tall), plate(tall), plate(tall), plate(tall), plate(tall)]),
            { tokens: `--beat-cis: ${tall}px` },
        );
        await sleep(900);
        // The fifth beat starts about four viewports down: it has not mounted, and it reserves.
        const fifth = essay.beat("fifth");
        expect(fifth.querySelector("[data-test-plate]")).toBeNull();
        expect(fifth.hasAttribute("data-point-pending")).toBe(true);
        expect(fifth.querySelector("[data-testid='plate-skeleton']")).not.toBeNull();
        expect(fifth.offsetHeight).toBeGreaterThanOrEqual(tall);
        // Scroll until the fifth beat's top is 1.2 viewports below the fold: inside the band, still
        // off screen. It mounts within the idle deadline, before any of it is visible.
        window.scrollTo(0, fifth.getBoundingClientRect().top + window.scrollY - innerHeight * 2.2);
        await sleep(800);
        expect(fifth.getBoundingClientRect().top).toBeGreaterThan(innerHeight);
        expect(fifth.querySelector("[data-test-plate]")).not.toBeNull();
        expect(fifth.hasAttribute("data-point-pending")).toBe(false);
    });

    it("a cold #fragment mounts its target and the beat before it at setup", async () => {
        const essay = await mountEssay(story([plate(900), plate(900), plate(900), plate(900)]), {
            path: "/floor#fourth",
        });
        // Synchronously after mount, before any idle callback or observer delivery.
        expect(essay.beat("fourth").querySelector("[data-test-plate]")).not.toBeNull();
        expect(essay.beat("third").querySelector("[data-test-plate]")).not.toBeNull();
    });
});
