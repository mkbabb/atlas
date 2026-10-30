// U/B7d M3 repair 1: `labelLayout` needs the LabelLayout feature. echarts' core entry installs it, but
// echarts declares that entry free of side effects, so a production build drops the install and dev
// keeps it. Only TimeSeries registered the feature, so until a TimeSeries chunk loaded, `hideOverlap`
// did nothing in production and the /sci scatter's outlier names overprinted. A browser spec cannot
// see this (it runs unbundled); the production witness is the lane's canvas probe. The register call
// belongs to the one module every chart goes through.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("the label layout feature", () => {
    it("is registered by useEChart", () => {
        const src = read("src/charts/composables/useEChart.ts");
        expect(src).toMatch(/import \{ LabelLayout \} from "echarts\/features";/);
        expect(src).toMatch(/use\(\[CanvasRenderer, LabelLayout\]\);/);
    });
    it("is registered nowhere else", () => {
        expect(read("src/charts/marks/TimeSeries.vue")).not.toMatch(/LabelLayout/);
    });
});
