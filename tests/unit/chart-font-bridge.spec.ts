import { afterEach, describe, expect, it, vi } from "vitest";
import {
    bumpVizPaletteEpoch,
    useVizPalette,
} from "@/charts/composables/useVizPalette";
import { directEndLabel } from "@/charts/contract/chartRecipe";
import { dropRule, markPointRivet } from "@/charts/marks/trajectory-marks";

vi.mock("@mkbabb/glass-ui/dark", () => ({
    useGlobalDark: () => ({ onFlipSettled: vi.fn() }),
}));

type FakeElement = {
    style: Record<string, string>;
    children: FakeElement[];
    appendChild: (child: FakeElement) => void;
    remove: () => void;
};

function fakeElement(): FakeElement {
    const children: FakeElement[] = [];
    return {
        style: {},
        children,
        appendChild: (child) => children.push(child),
        remove: () => undefined,
    };
}

afterEach(() => vi.unstubAllGlobals());

describe("chart canvas font bridge", () => {
    it("shares one live typography snapshot per palette epoch", () => {
        const root = { classList: { contains: () => false }, appendChild: () => undefined };
        const values: Record<string, string> = {
            "--font-mono": '"Test Mono", monospace',
            "--font-serif": '"Test Serif", serif',
        };
        let typographyReads = 0;
        vi.stubGlobal("window", {});
        vi.stubGlobal("document", {
            documentElement: root,
            createElement: () => fakeElement(),
        });
        vi.stubGlobal("getComputedStyle", (node: unknown) => {
            const element = node as FakeElement;
            if (element.style.fontSize) typographyReads++;
            return {
                color: element.style.color ? "rgb(1, 2, 3)" : "",
                fontSize: "13px",
                getPropertyValue: (name: string) => values[name] ?? "",
            };
        });

        const first = useVizPalette();
        const second = useVizPalette();
        expect(first.value).toBe(second.value);
        expect([first.value.fontMono, first.value.fontSerif]).toEqual([
            values["--font-mono"],
            values["--font-serif"],
        ]);
        expect(typographyReads).toBe(1);

        values["--font-mono"] = '"Next Mono", monospace';
        values["--font-serif"] = '"Next Serif", serif';
        bumpVizPaletteEpoch();

        expect(first.value).toBe(second.value);
        expect([first.value.fontMono, first.value.fontSerif]).toEqual([
            values["--font-mono"],
            values["--font-serif"],
        ]);
        expect(typographyReads).toBe(2);
    });

    it("threads the resolved mono family through pure ECharts fragments", () => {
        const fontMono = '"Test Mono", monospace';
        const line = { key: "line", label: "Line", color: "#123", points: [] };
        expect(directEndLabel(line, fontMono).endLabel.fontFamily).toBe(fontMono);

        const rule = dropRule({
            x: 2025,
            label: "forecast",
            color: "#123",
            fontMono,
            kind: "forecast",
        }) as { label: { rich: Record<string, { fontFamily: string }> } };
        expect(Object.values(rule.label.rich).map((run) => run.fontFamily)).toEqual([
            fontMono,
            fontMono,
            fontMono,
        ]);

        const rivet = markPointRivet({
            x: 2025,
            y: 1,
            color: "#123",
            fontMono,
            label: "2025",
        }) as { data: Array<{ label: { fontFamily: string } }> };
        expect(rivet.data[0]?.label.fontFamily).toBe(fontMono);

        const unlabeled = markPointRivet({ x: 2025, y: 1, color: "#123" }) as {
            data: Array<{ label: { show: boolean } }>;
        };
        expect(unlabeled.data[0]?.label).toEqual({ show: false });
    });
});
