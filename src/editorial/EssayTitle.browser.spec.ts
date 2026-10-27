// Titles paint whole at rest (U/B7 repair 1 · PLAN §4.2). RC6 inked the no-bracket lettering title
// glyph by glyph off a rewinding scroll scalar (31 of 42 glyphs below opacity 1 on /ecf at 1440 on
// scroll-up), typed the typewriter titles in at load, and gave interior hand marks the `scroll`
// clock. Every title arm now renders its text at full opacity; only the lead beat's mark draws once.
import { describe, expect, it } from "vitest";
import { createApp, h } from "vue";
import EssayTitle from "./EssayTitle.vue";
import type { TitleFacet } from "../contract/index.js";

async function mounted(facet: TitleFacet, lead: boolean, check: (host: HTMLElement) => void) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp({ render: () => h(EssayTitle, { facet, lead }) });
    app.mount(host);
    try {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        check(host);
    } finally {
        app.unmount();
        host.remove();
    }
}

/** Every element under `host` at computed opacity 1, and no per-glyph split. */
function paintedWhole(host: HTMLElement, text: string) {
    expect(host.textContent?.replace(/\s+/g, " ").trim()).toBe(text);
    const faded = [...host.querySelectorAll<HTMLElement>("*")]
        .filter((el) => !el.closest("svg"))
        .filter((el) => Number(getComputedStyle(el).opacity) < 1);
    expect(faded.map((el) => el.className)).toEqual([]);
    expect(host.querySelectorAll("[aria-hidden='true']").length).toBe(0);
}

describe("EssayTitle at rest", () => {
    it("paints a no-bracket lettering title as whole text", async () => {
        await mounted({ text: "Where the money went", treatment: "lettering" }, false, (host) => {
            paintedWhole(host, "Where the money went");
            expect(host.querySelector("[role='img']")).toBeNull();
            expect(host.querySelector("[data-scroll-tl]")).toBeNull();
        });
    });

    it("rests an interior picked-word mark drawn, with no scroll clock", async () => {
        await mounted({ text: "The [cliff] arrives", treatment: "lettering" }, false, (host) => {
            expect(host.textContent?.trim()).toBe("The cliff arrives");
            expect(host.querySelector(".hand-mark")?.getAttribute("data-mark-clock")).toBe("static");
        });
    });

    it("draws the lead beat's mark on the load clock", async () => {
        await mounted({ text: "The [cliff] arrives", treatment: "lettering" }, true, (host) => {
            expect(host.querySelector(".hand-mark")?.getAttribute("data-mark-clock")).toBe("load");
        });
    });
});
