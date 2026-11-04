// The engine lane's one way to read a figure's readiness (U RULINGS §J J-1). A spec that needs a
// figure to have drawn waits on the figure's own `settled` gate from `useEChart`. It never adds a
// private `finished` subscription. That event fires once per render: the first paint is at rest
// (U/B8 P-G4, no animation), so its `finished` can pass before a late subscriber exists, and the
// spec then waits forever (U/B8 I-1).
//
// Use it from a spec's hoisted mock, so every `useEChart` the figure mounts lands in `sink`:
//
//     const captured = vi.hoisted(() => ({ apis: [] as UseEChart[] }));
//     vi.mock("../composables/useEChart", async (importOriginal) =>
//         (await import("../../../tests/browser/echart-capture")).captureEChart(await importOriginal(), captured),
//     );
import type * as UseEChartModule from "../../src/charts/composables/useEChart";
import type { UseEChart } from "../../src/charts/composables/useEChart";

/** The real module with `useEChart` wrapped: each call still runs the real seam, and its API is kept. */
export function captureEChart(
    real: typeof UseEChartModule,
    sink: { apis: UseEChart[] },
): typeof UseEChartModule {
    return {
        ...real,
        useEChart: (opts) => {
            const api = real.useEChart(opts);
            sink.apis.push(api);
            return api;
        },
    };
}
