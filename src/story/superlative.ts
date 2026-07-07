// story/superlative.ts — THE OPTIONAL SUPERLATIVE REGISTER (O-A15 ANSWERS Q-48).
//
// Every figure/story item gains an OPTIONAL `superlative` template field — an authored superlative
// caption/badge per item ("drew the most per student," "ranks Nth," "sits far from peers"). The field
// is an OPTION on ALL items and deployed DEFTLY in every story: a QUIET register, never a loud crown.
//
// THE NEVER-INCRIMINATE CEILING (the usf-integrity route governs its phrasings by this list): a
// superlative may claim a CEILING VERB (the loudest permitted — a factual position, not a charge) but
// NEVER a loud-crown / incriminating verb. `isWithinCeiling` is the guard the integrity route runs its
// authored copy through; the copy itself is authored per story (a WG-D per-route successor).
//
// FACILITY ONLY — the template field + the register + the guard land here; the per-item COPY is
// authored per route (the storybook hosts the exemplar). PURE — no DOM, no Vue.

/** The superlative TONE — a QUIET register by default (never a loud crown). `quiet` recesses to a
    deft badge/caption; `neutral` is the plain factual note. There is deliberately NO `loud` member —
    a crown is un-representable (the D5 no-overfit law at the copy grain). */
export type SuperlativeTone = "quiet" | "neutral";

/** THE SUPERLATIVE — the authored per-item register. Optional on every figure/story item; omitted ⇒
    the item renders NO superlative (the register is opt-in, never forced — the Q-48 NEG). */
export interface Superlative {
    /** The authored superlative caption/badge copy (a WG-D per-route successor authors it; the
        integrity route's copy is guarded by `isWithinCeiling`). */
    label: string;
    /** The register tone (default `quiet` — a whisper, never a crown). */
    tone?: SuperlativeTone;
}

/** THE REGISTER — the closed superlative vocabulary bound. `ceilingVerbs` is the loudest a superlative
    may CLAIM (a factual position: "drew," "ranks," "sits" — never a charge); `forbidden` is the
    never-incriminate floor (loud-crown / accusatory verbs a dashboard-facing superlative NEVER speaks,
    per the usf-integrity never-incriminate scope). Frozen — the register is a constant, not a knob. */
export const SuperlativeRegister = Object.freeze({
    /** The permitted CEILING verbs — the loudest a quiet superlative claims (a position, not a verdict). */
    ceilingVerbs: Object.freeze([
        "drew",
        "ranks",
        "sits",
        "holds",
        "spans",
        "leads",
        "reaches",
        "tops",
        "trails",
        "sits far from",
    ] as const),
    /** The FORBIDDEN loud-crown / incriminating claims (the never-incriminate floor — dashboard-facing
        copy NEVER accuses; the internal per-entity case files are a separate, non-dashboard surface). */
    forbidden: Object.freeze([
        "cheated",
        "defrauded",
        "gamed",
        "stole",
        "rigged",
        "colluded",
        "fraud",
        "scheme",
        "kickback",
        "guilty",
    ] as const),
});

/** THE CEILING GUARD — a superlative label is WITHIN CEILING iff it names no forbidden accusatory verb.
    The integrity route runs its authored copy through this before render (the never-incriminate law);
    a violating label is a FAIL the route surfaces, never a silent pass. Case-insensitive substring
    match — `"colluded"` in "the district colluded" trips; "drew the most per student" passes. */
export function isWithinCeiling(label: string): boolean {
    const l = label.toLowerCase();
    return !SuperlativeRegister.forbidden.some((verb) => l.includes(verb));
}

/** Resolve a superlative to its rendered tone (default `quiet` — the deft register). A single call
    site the host reads so the "quiet register, never a loud crown" default is structural, not per-route. */
export function superlativeTone(s: Superlative): SuperlativeTone {
    return s.tone ?? "quiet";
}
