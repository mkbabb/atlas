// O-17 S3 strip and O-11 D-5 (PLAN §5.5, §5.7): the provenance strip is one sentence-case line, 36 px
// tall, with a bar radius, no uppercase, mono or letter-spacing, and one "Source & method" action.
// Opening the disclosure at 1440 moves the page by 0 px and its trigger by at most 1 px. Before B7
// the strip was an uppercase mono capsule that read "<dataset> SOURCE & METHOD ⌄", wrapped to 11 lines
// at 390, and the disclosure moved the page by up to 521 px (with the root snap, deleted in A3).
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import VizAppendixDock from "./VizAppendixDock.vue";

const DATASET = "SCI feed 2025–26, MCNC utilization through June 2026, NCDPI ADM and the NSLP/EDS file";

function lines(el: Element): number {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set<number>();
    for (const r of range.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top));
    return tops.size;
}

let done: (() => void) | null = null;
afterEach(async () => {
    done?.();
    done = null;
    await page.viewport(1440, 900);
});

function mount(width: string) {
    const host = document.createElement("div");
    host.innerHTML = `<div style="height:1200px"></div><div id="dock-host" style="inline-size:${width}"></div><div style="height:2400px"></div>`;
    document.body.appendChild(host);
    const app = createApp(
        defineComponent({
            render: () =>
                h(
                    VizAppendixDock,
                    { label: DATASET, peekLabel: "Source", browse: () => undefined },
                    { default: () => h("p", { style: "height:320px" }, "The full record.") },
                ),
        }),
    );
    app.mount(host.querySelector("#dock-host")!);
    done = () => {
        app.unmount();
        host.remove();
        window.scrollTo(0, 0);
    };
    return host;
}

describe("the S3 strip (O-17)", () => {
    for (const [vw, w] of [[1440, "900px"], [390, "358px"]] as const) {
        it(`${vw}: one line, at most 36 px, bar radius, sentence case, one action`, async () => {
            await page.viewport(vw, 844);
            const host = mount(w);
            await nextTick();
            const strip = host.querySelector<HTMLElement>("[data-appendix-strip]");
            expect(strip, "the strip renders").not.toBeNull();
            const rect = strip!.getBoundingClientRect();
            expect(rect.height).toBeLessThanOrEqual(36.5);
            const source = strip!.querySelector<HTMLElement>(".appendix-dock__source")!;
            expect(lines(source)).toBe(1);
            expect(source.scrollWidth).toBeGreaterThan(source.clientWidth); // the long name ellipsizes
            for (const el of strip!.querySelectorAll<HTMLElement>("*")) {
                const cs = getComputedStyle(el);
                expect(cs.textTransform).not.toBe("uppercase");
                expect(cs.letterSpacing === "normal" || cs.letterSpacing === "0px").toBe(true);
                expect(cs.fontFamily).not.toMatch(/mono/i);
            }
            const r = parseFloat(getComputedStyle(strip!).borderTopLeftRadius);
            expect(r).toBeGreaterThan(4);
            expect(r).toBeLessThan(rect.height / 2);
            const text = strip!.textContent ?? "";
            expect(text.match(/Source & method/gi)?.length).toBe(1);
            expect(text).not.toMatch(/SOURCE AND METHOD|⌄/);
            expect(strip!.textContent).not.toMatch(/browse/i);
        });
    }

    it("1440: opening the disclosure moves the page 0 px and the trigger at most 1 px", async () => {
        await page.viewport(1440, 900);
        const host = mount("900px");
        await nextTick();
        const trigger = host.querySelector<HTMLElement>(".appendix-dock__control")!;
        trigger.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 50));
        const y = window.scrollY;
        const top = trigger.getBoundingClientRect().top;
        await userEvent.click(trigger);
        await nextTick();
        await new Promise((r) => setTimeout(r, 100));
        expect(host.querySelector(".appendix-dock__pane:not([hidden])")).not.toBeNull();
        expect(window.scrollY - y).toBe(0);
        expect(Math.abs(trigger.getBoundingClientRect().top - top)).toBeLessThanOrEqual(1);
        expect(host.querySelector('[data-testid="appendix-dock-browse"]')).not.toBeNull();
    });
});
