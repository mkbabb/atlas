// The title register carries no reveal machinery (U/B7 repair 1 · PLAN §4.2 "Load, dashboard":
// no typewriter titles; "Scroll": no scroll-scrubbed reveals, hand marks hold no text below full
// opacity). RC6 kept the typewriter arm, the scroll-scrubbed lettering cascade and its section
// reveal scalar, the `scroll` mark clock, and the count-up timing residue (`countAt`,
// `storyRevealTiming`, comments naming the deleted `useCountUp`).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { TitleFacet } from "../../src/contract/index";
import type { MarkClock } from "../../src/motion/useHandMarkClock";

const SRC = join(__dirname, "../../src");
function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) return files(p);
        return /\.(vue|ts|css)$/.test(n) ? [p] : [];
    });
}

describe("title register", () => {
    it("declares two treatments and two mark clocks", () => {
        expectTypeOf<NonNullable<TitleFacet["treatment"]>>().toEqualTypeOf<"plain" | "lettering">();
        expectTypeOf<MarkClock>().toEqualTypeOf<"load" | "static">();
    });

    it("ships no typewriter, cascade or section-reveal module", () => {
        const gone = [
            "editorial/TypewriterTitle.vue",
            "editorial/EssayTitleCascade.vue",
            "charts/scene/ScrollLetteringHeading.vue",
            "motion/useScrollLettering.ts",
            "motion/useSectionReveal.ts",
        ].filter((f) => existsSync(join(SRC, f)));
        expect(gone).toEqual([]);
    });

    it("names no deleted reveal symbol anywhere in src", () => {
        const pattern =
            /useCountUp|countAt|storyRevealTiming|titleRevealProgress|TITLE_COMPLETE_AT|useSectionReveal|useScrollLettering|ScrollLetteringHeading|TypewriterTitle|EssayTitleCascade|TITLE_LETTERING_REGISTER|clock="scroll"/;
        const hits = files(SRC)
            .filter((f) => !f.endsWith(".spec.ts"))
            .filter((f) => pattern.test(readFileSync(f, "utf8")))
            .map((f) => f.slice(SRC.length + 1));
        expect(hits).toEqual([]);
    });
});
