// charts/marks/unit-engine.ts — the UNIT CHART engine (U/B8 A3): morphs N marks between layouts
// (`unit-layouts.ts`) and paints them on one canvas. Two halves:
//
//   • `UnitMorph` — the state. Where every mark is now (x/y/w/h/alpha typed arrays), where it was
//     when the current morph began, and its per-mark delay. A morph is per mark, staggered by the
//     target layout's rank, and interruptible: `morphTo` first advances to its own start time, then
//     leaves from wherever the marks are. The keyframes.js spring is sampled ONCE into a lookup table,
//     so a frame is arithmetic over preallocated arrays and allocates nothing.
//   • `UnitCanvas` — the DOM half. Sizes the backing store at the device pixel ratio capped at 2,
//     batches fills by palette entry, runs the rAF only while something moves, snaps under reduced
//     motion, and hit-tests the layout on screen. Mark styling past a flat fill (Gregg's woven
//     thread) is an optional sprite: one source rect per palette entry.
//
// Framework-free: `UnitChart.vue` owns the Vue lifecycle, the CSS-variable colors and the theme flip.

import { springTimingFunction, stagger } from "@mkbabb/keyframes.js";
import { hitTest, type UnitLayout } from "./unit-layouts.js";

/** The backing-store ratio ceiling: past 2 the fill cost grows and the eye sees no difference. */
export const UNIT_MAX_DPR = 2;

export function unitDpr(raw: number = typeof devicePixelRatio === "number" ? devicePixelRatio : 1): number {
    return Math.min(raw > 0 ? raw : 1, UNIT_MAX_DPR);
}

export interface UnitSpring {
    response: number;
    dampingFraction: number;
}

/** A keyframes.js spring sampled into `samples + 1` entries over t ∈ [0, 1]: read by index per frame. */
export function sampleSpring(spring: UnitSpring & { maxDuration?: number }, samples = 256): Float32Array {
    const { fn } = springTimingFunction({ ...spring, sampleCount: 128 });
    const lut = new Float32Array(samples + 1);
    for (let i = 0; i <= samples; i++) lut[i] = fn(i / samples);
    return lut;
}

/** Linear read between two LUT entries, u ∈ [0, 1). */
function readLut(lut: Float32Array, u: number) {
    const f = u * (lut.length - 1);
    const i = f | 0;
    return lut[i] + (lut[i + 1] - lut[i]) * (f - i);
}

export interface UnitMorphOptions {
    /** One mark's flight, ms. Default 900. */
    duration?: number;
    /** The stagger from the first rank to the last, ms. Default 620. */
    spread?: number;
    /** Default: response 0.5, damping 0.68 (a light settle, the Gregg cloth's). */
    spring?: UnitSpring;
    /** The alpha of a mark outside the focused group. Default 0.26. */
    dim?: number;
}

const DEFAULT_SPRING: UnitSpring = { response: 0.5, dampingFraction: 0.68 };
// Shared by every morph on the default spring: sampled at module load, once.
let defaultLut: Float32Array | undefined;

export class UnitMorph {
    readonly x: Float32Array;
    readonly y: Float32Array;
    readonly w: Float32Array;
    readonly h: Float32Array;
    readonly alpha: Float32Array;

    private readonly fx: Float32Array;
    private readonly fy: Float32Array;
    private readonly fw: Float32Array;
    private readonly fh: Float32Array;
    private readonly delay: Float32Array;
    private readonly alphaTo: Float32Array;
    private readonly lut: Float32Array;
    private readonly duration: number;
    private readonly spread: number;
    private readonly dim: number;
    private target: UnitLayout | undefined;
    private start = 0;
    private moving = false;
    private focused: number | null = null;

    constructor(
        readonly count: number,
        options: UnitMorphOptions = {},
    ) {
        this.x = new Float32Array(count);
        this.y = new Float32Array(count);
        this.w = new Float32Array(count);
        this.h = new Float32Array(count);
        this.alpha = new Float32Array(count).fill(1);
        this.fx = new Float32Array(count);
        this.fy = new Float32Array(count);
        this.fw = new Float32Array(count);
        this.fh = new Float32Array(count);
        this.delay = new Float32Array(count);
        this.alphaTo = new Float32Array(count).fill(1);
        this.lut = options.spring ? sampleSpring(options.spring) : (defaultLut ??= sampleSpring(DEFAULT_SPRING));
        this.duration = options.duration ?? 900;
        this.spread = options.spread ?? 620;
        this.dim = options.dim ?? 0.26;
    }

    /** The layout the marks are in, or flying to. */
    get layout(): UnitLayout | undefined {
        return this.target;
    }

    /** Nothing in flight: no morph and no alpha still easing. */
    get settled(): boolean {
        if (this.moving) return false;
        for (let i = 0; i < this.count; i++) if (this.alpha[i] !== this.alphaTo[i]) return false;
        return true;
    }

    private accept(layout: UnitLayout) {
        if (layout.count !== this.count) {
            throw new Error(`unit morph: layout count ${layout.count} differs from the mark count ${this.count}`);
        }
        this.target = layout;
        this.retarget();
    }

    /** Land on a layout at once: the first paint, a resize, reduced motion. */
    snap(layout: UnitLayout): void {
        this.accept(layout);
        this.x.set(layout.x);
        this.y.set(layout.y);
        this.w.set(layout.w);
        this.h.set(layout.h);
        this.moving = false;
    }

    /** Fly every mark to `layout`, each leaving from wherever it is at `now`. */
    morphTo(layout: UnitLayout, now: number): void {
        if (!this.target) return this.snap(layout);
        // Bring the marks to `now` first, so an interrupt between frames starts from the truth.
        if (this.moving) this.step(now);
        this.accept(layout);
        this.fx.set(this.x);
        this.fy.set(this.y);
        this.fw.set(this.w);
        this.fh.set(this.h);
        const n = this.count;
        const delays = stagger(n, { each: this.spread / Math.max(1, n - 1), ease: (t: number) => Math.pow(t, 0.72) }).delays();
        for (let i = 0; i < n; i++) this.delay[i] = delays[layout.rank[i]] ?? 0;
        this.start = now;
        this.moving = true;
    }

    /** Dim every mark outside `group` in the current layout; null brings them all back. */
    focus(group: number | null): void {
        this.focused = group;
        this.retarget();
    }

    /** Land the alpha now (reduced motion). */
    settleAlpha(): void {
        this.alpha.set(this.alphaTo);
    }

    private retarget() {
        const g = this.target?.group;
        for (let i = 0; i < this.count; i++) {
            this.alphaTo[i] = this.focused === null || !g || g[i] === this.focused ? 1 : this.dim;
        }
    }

    /** Advance to `now`. True while anything still moves. Allocation-free. */
    step(now: number): boolean {
        let moving = false;
        if (this.moving) {
            const { x, y, w, h, fx, fy, fw, fh, delay, lut, duration } = this;
            const to = this.target!;
            const t = now - this.start;
            let done = true;
            for (let i = 0; i < this.count; i++) {
                const u = (t - delay[i]) / duration;
                if (u >= 1) {
                    x[i] = to.x[i];
                    y[i] = to.y[i];
                    w[i] = to.w[i];
                    h[i] = to.h[i];
                    continue;
                }
                done = false;
                if (u <= 0) {
                    x[i] = fx[i];
                    y[i] = fy[i];
                    w[i] = fw[i];
                    h[i] = fh[i];
                    continue;
                }
                const e = readLut(lut, u);
                x[i] = fx[i] + (to.x[i] - fx[i]) * e;
                y[i] = fy[i] + (to.y[i] - fy[i]) * e;
                // An overshoot may carry a size past zero; a mark never turns inside out.
                const sw = fw[i] + (to.w[i] - fw[i]) * e;
                const sh = fh[i] + (to.h[i] - fh[i]) * e;
                w[i] = sw < 0 ? 0 : sw;
                h[i] = sh < 0 ? 0 : sh;
            }
            this.moving = !done;
            moving = !done;
        }
        const { alpha, alphaTo } = this;
        for (let i = 0; i < this.count; i++) {
            const d = alphaTo[i] - alpha[i];
            if (d === 0) continue;
            if (d > -0.004 && d < 0.004) {
                alpha[i] = alphaTo[i];
                continue;
            }
            alpha[i] += d * 0.22;
            moving = true;
        }
        return moving;
    }
}

/** A mark's look past a flat fill: an image and, per palette entry, its source rect (sx, sy, sw, sh). */
export interface UnitSprite {
    image: CanvasImageSource;
    rects: Float32Array;
}

/** Builds the sprite for a resolved palette; called again on every palette change (a theme flip). */
export type UnitSpriteFactory = (colors: readonly string[]) => UnitSprite;

export interface UnitCanvasOptions {
    morph?: UnitMorphOptions;
    sprite?: UnitSpriteFactory;
    /** Snap every change instead of morphing. */
    reduced?: boolean;
    /** Injectable clock and frame scheduler (tests); default the window's. */
    now?: () => number;
    raf?: (cb: FrameRequestCallback) => number;
    caf?: (id: number) => void;
}

export class UnitCanvas {
    readonly morph: UnitMorph;
    reduced: boolean;

    private readonly ctx: CanvasRenderingContext2D;
    private readonly now: () => number;
    private readonly raf: (cb: FrameRequestCallback) => number;
    private readonly caf: (id: number) => void;
    private readonly spriteFactory: UnitSpriteFactory | undefined;
    private sprite: UnitSprite | undefined;
    private colors: readonly string[] = ["#000"];
    /** Marks in draw order, bucketed by palette entry: one fill switch per entry per frame. */
    private order: Uint32Array;
    private colorOf: Uint16Array;
    private dpr = 1;
    private frameId = 0;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        readonly count: number,
        options: UnitCanvasOptions = {},
    ) {
        this.ctx = canvas.getContext("2d")!;
        this.morph = new UnitMorph(count, options.morph);
        this.reduced = options.reduced ?? false;
        this.spriteFactory = options.sprite;
        this.now = options.now ?? (() => performance.now());
        this.raf = options.raf ?? ((cb) => requestAnimationFrame(cb));
        this.caf = options.caf ?? ((id) => cancelAnimationFrame(id));
        this.colorOf = new Uint16Array(count);
        this.order = new Uint32Array(count);
        for (let i = 0; i < count; i++) this.order[i] = i;
    }

    /** True while a frame is scheduled. */
    get running(): boolean {
        return this.frameId !== 0;
    }

    /** Resolved colors and each mark's palette entry. Repaints. */
    setPalette(colors: readonly string[], colorOf: ArrayLike<number>): void {
        this.colors = colors.length ? colors : ["#000"];
        const last = this.colors.length - 1;
        const buckets = new Uint32Array(this.colors.length + 1);
        for (let i = 0; i < this.count; i++) {
            const k = Math.min(Math.max(0, colorOf[i] | 0), last);
            this.colorOf[i] = k;
            buckets[k + 1]++;
        }
        for (let k = 0; k < last + 1; k++) buckets[k + 1] += buckets[k];
        for (let i = 0; i < this.count; i++) this.order[buckets[this.colorOf[i]]++] = i;
        this.sprite = this.spriteFactory?.(this.colors);
        this.kick();
    }

    /** The frame in CSS px and the raw device ratio (capped here). Repaints. */
    setSize(width: number, height: number, dpr?: number): void {
        this.dpr = unitDpr(dpr);
        const pw = Math.round(width * this.dpr);
        const ph = Math.round(height * this.dpr);
        if (this.canvas.width !== pw) this.canvas.width = pw;
        if (this.canvas.height !== ph) this.canvas.height = ph;
        this.kick();
    }

    /** Show a layout: morph into it, or land on it under reduced motion and on the first paint. */
    show(layout: UnitLayout): void {
        if (this.reduced || !this.morph.layout) this.morph.snap(layout);
        else this.morph.morphTo(layout, this.now());
        this.kick();
    }

    /** Land the current layout at once (a resize rebuilt it at a new size). */
    snap(layout: UnitLayout): void {
        this.morph.snap(layout);
        this.kick();
    }

    focus(group: number | null): void {
        this.morph.focus(group);
        if (this.reduced) this.morph.settleAlpha();
        this.kick();
    }

    hit(px: number, py: number): number {
        const l = this.morph.layout;
        return l ? hitTest(l, px, py) : -1;
    }

    private kick() {
        if (!this.frameId) this.frameId = this.raf(this.frame);
    }

    private readonly frame = (): void => {
        this.frameId = 0;
        const moving = this.morph.step(this.now());
        this.draw();
        if (moving) this.kick();
    };

    private draw() {
        const { ctx, dpr, order, colorOf, colors, sprite } = this;
        const { x, y, w, h, alpha } = this.morph;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.morph.layout) return;
        let lastAlpha = 1;
        let lastColor = -1;
        ctx.globalAlpha = 1;
        for (let k = 0; k < this.count; k++) {
            const i = order[k];
            const dw = w[i];
            const dh = h[i];
            if (dw <= 0 || dh <= 0) continue;
            const a = alpha[i];
            if (a !== lastAlpha) {
                ctx.globalAlpha = a;
                lastAlpha = a;
            }
            const c = colorOf[i];
            const px = (x[i] - dw / 2) * dpr;
            const py = (y[i] - dh / 2) * dpr;
            if (sprite) {
                const r = c * 4;
                const rects = sprite.rects;
                ctx.drawImage(sprite.image, rects[r], rects[r + 1], rects[r + 2], rects[r + 3], px, py, dw * dpr, dh * dpr);
                continue;
            }
            if (c !== lastColor) {
                ctx.fillStyle = colors[c];
                lastColor = c;
            }
            ctx.fillRect(px, py, dw * dpr, dh * dpr);
        }
        ctx.globalAlpha = 1;
    }

    /** Paint now, outside the frame loop (a print, a palette read while at rest). */
    paint(): void {
        if (this.frameId) this.caf(this.frameId);
        this.frame();
    }

    destroy(): void {
        if (this.frameId) this.caf(this.frameId);
        this.frameId = 0;
    }
}
