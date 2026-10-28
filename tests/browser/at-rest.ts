// Wait for a surface's motion to finish before a spec presses through it or measures it. A sheet
// rises on a spring, so a fixed number of frames is too few under load: the 390 detail measured
// 171 px mid-rise, and a 1440 press sampled the page before the filter drawer covered it. A box
// can also hold still for several frames before its rise starts (the 390 detail held 171 px for
// about 50 ms), so a box with a running finite animation is never at rest.

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function moving(el: Element): boolean {
    return el
        .getAnimations()
        .some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity);
}

function box(el: Element): string {
    const r = el.getBoundingClientRect();
    return `${r.left},${r.top},${r.width},${r.height}`;
}

/**
 * Resolve true once every element the selector matches holds the same box for `frames` frames in a
 * row with no finite animation running on it, or false after `ms`. A selector that matches nothing
 * is at rest.
 */
export async function atRest(selector: string, ms = 4000, frames = 3): Promise<boolean> {
    const end = performance.now() + ms;
    let last = "";
    let still = 0;
    while (performance.now() < end) {
        const els = [...document.querySelectorAll(selector)];
        const now = els.map(box).join("|");
        still = now === last && !els.some(moving) ? still + 1 : 0;
        if (still >= frames) return true;
        last = now;
        await frame();
    }
    return false;
}
