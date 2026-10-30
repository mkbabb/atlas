// The engine lane's per-file setup (U/B7c C1, item 7). Playwright's `emulateMedia` is a setting of
// the page, and the files a worker runs share that page: a spec that ends under
// `prefers-reduced-motion: reduce` (ChartFrame, ChartFrame.enlarge) left every later file in the
// worker under it. The Dock keeps its phone bar in under reduced motion, so Dock.phone "slides out
// after a downward scroll" failed whenever it ran after one of them, and passed alone. Each file now
// starts from the engine's default, no preference.
//
// The pointer is the page's too (U/B7d D1). A file that ends with the pointer on the dock's crest left
// it there for the next file, whose dock then mounted under a resting pointer and bloomed open
// (Dock.home "rests as a 44 × 44 circle" read open in the serial Chromium lane). Each file now starts
// with the pointer parked in the page's far corner.
import { beforeAll } from "vitest";
import { commands } from "vitest/browser";

type EngineCommands = {
    emulateMotion: (m: "reduce" | "no-preference") => Promise<void>;
    parkPointer: () => Promise<void>;
};

beforeAll(async () => {
    const c = commands as unknown as EngineCommands;
    await c.emulateMotion("no-preference");
    await c.parkPointer();
});
