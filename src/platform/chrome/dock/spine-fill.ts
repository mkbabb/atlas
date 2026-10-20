// platform/chrome/dock/spine-fill.ts — the chapter rail's identity spine, as paint (B6 · U RULINGS
// §M M-4).
//
// The spine is the dashboard's identity ramp (SCI's rainbow, ECF's sequential ramp, the route
// tritone elsewhere) drawn as a thin vertical bar behind the Roman rungs, foot → crown. It used to
// be an element (`ControlPlaneSpine`) inside a wrapper around the rungs. glass 10.1.0's toolbar run
// roves its direct children as seats, so the rungs now sit in the run directly and any element
// beside them would be a seat; the spine is the run's own background instead (Dock.css), built
// here as one CSS image.
//
// Every stop is mixed toward transparent by `--spine-o` (a registered number, 1 at rest), so the
// B4 §4 year cross-fade can dip the spine alone without fading the rungs it runs behind.

/** The spine's CSS image: the ramp painted `to top` (base at the foot, apex at the crown), evenly
    spaced, each stop weighted by `--spine-o`. A one-colour ramp paints a solid bar. */
export function spineFill(ramp: readonly string[]): string {
    const stops = ramp.length === 1 ? [ramp[0], ramp[0]] : ramp;
    const at = (i: number) => (i / (stops.length - 1)) * 100;
    const body = stops
        .map(
            (c, i) =>
                `color-mix(in oklab, ${c} calc(var(--spine-o, 1) * 100%), transparent) ${at(i)}%`,
        )
        .join(", ");
    return `linear-gradient(to top, ${body})`;
}
