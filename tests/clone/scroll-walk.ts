// The scroll-free walk's verdict (scroll-free.browser.spec.ts), kept apart from the browser so the
// rule itself has a unit witness (scroll-walk.spec.ts). The spec feeds one sample per wheel step.

export interface Sample {
    /** scrollY after the step. */
    sy: number;
    /** `scrollHeight - innerHeight` after the step. */
    end: number;
}

export interface Stuck {
    k: number;
    moved: number;
    sy: number;
}

export class ScrollWalk {
    readonly stuck: Stuck[] = [];
    private k = 0;

    constructor(
        private last: number,
        private readonly stepPx: number,
    ) {}

    /** Judge one step. Returns the rounded movement and whether the walk is over. */
    step({ sy, end }: Sample): { moved: number; done: boolean } {
        const k = this.k++;
        const moved = Math.round(sy - this.last);
        const remaining = end - this.last;
        const expected = Math.min(this.stepPx, remaining);
        if (Math.abs(moved - expected) > 2) this.stuck.push({ k, moved, sy: Math.round(sy) });
        this.last = sy;
        return { moved, done: sy >= end - 1 };
    }

    /**
     * Firefox can deliver a wheel event late: a 0 px step and a two-step catch-up within three
     * steps of each other are one input arriving late (the page position catches up), not a held
     * or jumped page. Pair each such 0 with the nearest later catch-up and drop both.
     */
    settle(): Stuck[] {
        const late = new Set<number>();
        for (const x of this.stuck) {
            if (x.moved !== 0 || late.has(x.k)) continue;
            const y = this.stuck.find(
                (z) => z.k > x.k && z.k <= x.k + 3 && !late.has(z.k) && Math.abs(z.moved - 2 * this.stepPx) <= 2,
            );
            if (y) late.add(x.k).add(y.k);
        }
        return this.stuck.filter((x) => !late.has(x.k));
    }
}
