/** Deterministically pack values into the nearest free lane among their x-neighbours. */
export function packSwarm(values: readonly number[], radius = 0.14): number[] {
    const lanes = new Array<number>(values.length);
    const placed: Array<{ x: number; lane: number }> = [];
    const order = values.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x || a.index - b.index);

    for (const point of order) {
        const occupied = new Set(
            placed.filter((other) => point.x - other.x < radius).map((other) => other.lane),
        );
        let lane = 0;
        while (occupied.has(lane)) lane = lane <= 0 ? 1 - lane : -lane;
        lanes[point.index] = lane;
        placed.push({ x: point.x, lane });
        while (placed[0] && point.x - placed[0].x >= radius) placed.shift();
    }

    const extent = Math.max(1, ...lanes.map(Math.abs));
    return lanes.map((lane) => 0.5 + lane / (2 * extent));
}
