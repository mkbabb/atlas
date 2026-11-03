// U/B8 A4 — one table sort in atlas. The data viewer sorted with its own comparator, which put an
// empty string FIRST ascending (only null counted as blank); the figure's table view did not exist.
// Both now sort through lib/compareCells. Fails before: DataViewerRoute carried the local comparator
// and PlateTable.vue did not exist.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sortRowsBy } from "../../src/lib/compareCells";

const SRC = join(__dirname, "../../src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");

describe("one atlas table sort", () => {
    for (const file of ["platform/provenance/DataViewerRoute.vue", "charts/frame/PlateTable.vue"]) {
        it(`${file} sorts through sortRowsBy and owns no comparator`, () => {
            const src = read(file);
            expect(src).toMatch(/import \{ sortRowsBy \} from "\.\.\/\.\.\/lib\/compareCells\.js"/);
            expect(src).not.toMatch(/\.sort\(\(a, b\)/);
            expect(src).not.toMatch(/localeCompare/);
        });
    }
    it("puts an empty viewer cell last ascending (the viewer's old comparator put it first)", () => {
        const rows = [{ n: "" }, { n: "b" }, { n: "a" }];
        expect(sortRowsBy(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual(["a", "b", ""]);
    });
});
