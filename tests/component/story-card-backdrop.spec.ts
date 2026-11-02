import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";

/* U/B8 PF (P-3). RED before: the StoryCard plate is a glass Card (quiet tier, veil) that
   samples its backdrop, so a 1296 px plate, up to 2,600 px tall, re-filtered the field
   behind it on every scroll frame. The desktop paint trace put the scroll drops there: with
   the plate's filter withheld, /usf fell from 35 to 8 dropped frames per walk, /ecf from 22
   to 2, /bead 31 to 6, /vft-germination 32 to 3 and /demand 18 to 2 (out/b8-pf/trace).
   The plate is in the page flow over a still field, so it is glass's `static` case. */
vi.mock("../../src/editorial/Beat.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return { default: defineComponent({ setup: (_, { slots }) => () => h("section", slots.figure?.()) }) };
});
vi.mock("../../src/editorial/AnimatedRule.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});
vi.mock("../../src/editorial/StoryCardStats.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});

describe("StoryCard — an in-flow plate samples no backdrop", () => {
    it("renders the glass plate with data-backdrop-mode=static", async () => {
        const { default: StoryCard } = await import("../../src/editorial/StoryCard.vue");
        const html = await renderToString(
            createSSRApp({ render: () => h(StoryCard, { id: "s1" }, { title: () => "Title" }) }),
        );
        expect(html).toMatch(/<article[^>]*data-testid="story-card"/);
        expect(html).toMatch(/<article[^>]*data-backdrop-mode="static"/);
    });
});
