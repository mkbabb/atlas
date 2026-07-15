import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
    new URL("../../src/filter/ui/SourceDataBrowser.vue", import.meta.url),
    "utf8",
);
const barrel = readFileSync(
    new URL("../../src/filter/ui/index.ts", import.meta.url),
    "utf8",
);

describe("SourceDataBrowser", () => {
    it("exports the browser through the filter surface", () => {
        expect(barrel).toContain(
            'export { default as SourceDataBrowser } from "./SourceDataBrowser.vue";',
        );
    });

    it("keeps the source grid virtual, keyboard-stable, and explicitly described", () => {
        expect(source).toContain("useVirtualWindow<Row, Key>");
        expect(source).toContain("virtual.ensureTargetWindow(key)");
        expect(source).toContain('role="grid"');
        expect(source).toContain(':aria-rowcount="virtual.ariaRowCount.value"');
        expect(source).toContain('role="columnheader"');
        expect(source).toContain("payload.meta.source.label");
        expect(source).toContain("payload.meta.asOf");
        expect(source).toContain("payload.meta.filterExplain");
    });

    it("routes only the two browser event classes and both supplied serializers", () => {
        const emittedTypes = [...source.matchAll(/type: "([^"]+)"/g)].map(
            (match) => match[1],
        );
        expect(emittedTypes).toEqual(["granularity", "provenance"]);
        expect(source).toContain("payload.value.serialize(format)");
        expect(source).toContain("serialize('csv')");
        expect(source).toContain("serialize('json')");
    });
});
