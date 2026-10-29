// The engine lane's per-file setup (U/B7c C1, item 7). Playwright's `emulateMedia` is a setting of
// the page, and the files a worker runs share that page: a spec that ends under
// `prefers-reduced-motion: reduce` (ChartFrame, ChartFrame.enlarge) left every later file in the
// worker under it. The Dock keeps its phone bar in under reduced motion, so Dock.phone "slides out
// after a downward scroll" failed whenever it ran after one of them, and passed alone. Each file now
// starts from the engine's default, no preference.
import { beforeAll } from "vitest";
import { commands } from "vitest/browser";

beforeAll(async () => {
    await (commands as unknown as { emulateMotion: (m: "reduce" | "no-preference") => Promise<void> }).emulateMotion(
        "no-preference",
    );
});
