/** The one motion family shared by Atlas's page and per-viz instruments. */
export const INSTRUMENT_SPRING = Object.freeze({
    durationMs: 360,
    easing: "var(--spring-smooth, cubic-bezier(0.22, 1, 0.36, 1))",
});

export type InstrumentSpringStyle = Readonly<Record<string, string>>;

/** CSS-variable bridge for Vue hosts. Reduced motion keeps the terminal state and drops frames. */
export function instrumentSpringStyle(reducedMotion: boolean): InstrumentSpringStyle {
    return {
        "--instrument-spring-duration": reducedMotion
            ? "0ms"
            : `${INSTRUMENT_SPRING.durationMs}ms`,
        "--instrument-spring-ease": INSTRUMENT_SPRING.easing,
    };
}
