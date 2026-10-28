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

/** A step after which the document can no longer hold the position the page already had. */
export interface Collapse {
    k: number;
    sy: number;
    end: number;
    /** scrollY before the step. */
    from: number;
}

export class ScrollWalk {
    readonly stuck: Stuck[] = [];
    readonly collapsed: Collapse[] = [];
    private k = 0;

    constructor(
        private last: number,
        private readonly stepPx: number,
    ) {}

    /**
     * Judge one step. Returns the rounded movement and whether the walk is over.
     *
     * A page whose route dies mid-walk (an error state, an emptied document) reads scrollY 0 and an
     * end of 0. Judged against that end, the jump to the top looks like reaching the end. So the
     * end is checked against where the page already was: an end that falls below it is a collapse,
     * which fails the cell and ends the walk. Otherwise a step moves 300 px, or what is left.
     */
    step({ sy, end }: Sample): { moved: number; done: boolean } {
        const k = this.k++;
        const from = this.last;
        const moved = Math.round(sy - from);
        this.last = sy;
        if (end < from - 1) {
            this.collapsed.push({ k, sy: Math.round(sy), end: Math.round(end), from: Math.round(from) });
            return { moved, done: true };
        }
        const expected = Math.min(this.stepPx, end - from);
        if (Math.abs(moved - expected) > 2) this.stuck.push({ k, moved, sy: Math.round(sy) });
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
