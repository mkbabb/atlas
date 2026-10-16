import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import SubFloorValues, { type SubFloorRow } from "../../src/editorial/SubFloorValues.vue";
import { countNoun } from "../../src/editorial/evidence-floor";

// U-F25 (§E; library home §H M-5): the sub-floor plate prints each entity's own values with the n
// first, names what n counts, keeps feed order, and carries no rank or median wording.

type Props = InstanceType<typeof SubFloorValues>["$props"];
async function render(props: Props): Promise<string> {
    return renderToString(createSSRApp({ render: () => h(SubFloorValues, props) }));
}

const rows: SubFloorRow[] = [
    { key: "f2", label: "Consultant B", values: [{ value: "3", unit: "requests" }, { value: "2", unit: "applicants" }] },
    { key: "f1", label: "Consultant A", values: [{ value: "41", unit: "requests" }, { value: "9", unit: "applicants" }] },
];

describe("U-F25 — SubFloorValues", () => {
    it("leads with the count line that names what n counts, then the reason", async () => {
        const html = await render({
            rows,
            n: 2,
            noun: countNoun("filer"),
            withheld: "A peer band",
            shown: "counts",
            listLabel: "Each filer's own counts",
        });
        const caption = html.indexOf("subfloor-values-note");
        const list = html.indexOf("<dl");
        expect(caption).toBeGreaterThan(-1);
        expect(caption).toBeLessThan(list);
        expect(html).toContain("n = 2 filers");
        expect(html).toContain("A peer band needs at least 5 filers, so each filer&#39;s own counts are shown without one.");
        expect(html).toContain('data-n="2"');
        expect(html).toContain('aria-label="Each filer&#39;s own counts"');
    });

    it("keeps feed order (never sorts by value) and prints every value with its unit", async () => {
        const html = await render({
            rows,
            n: 2,
            noun: countNoun("filer"),
            withheld: "A peer band",
            listLabel: "x",
        });
        expect(html.indexOf("Consultant B")).toBeLessThan(html.indexOf("Consultant A"));
        for (const t of ["41", "9", "requests", "applicants"]) expect(html).toContain(t);
    });

    it("speaks no rank, crown or median word", async () => {
        const html = await render({
            rows: [{ key: "t", label: "Hex 8a2a", values: [{ value: "767", unit: "Mbps" }] }],
            n: 1,
            noun: countNoun("test"),
            withheld: "A median",
            listLabel: "Each test's own speed",
        });
        expect(html).toContain("n = 1 test");
        const text = html.replace(/<[^>]+>/g, " ").replace("A median needs", "");
        expect(text).not.toMatch(/\b(median|rank|ranked|top|fastest|slowest|highest|most)\b/i);
    });
});
