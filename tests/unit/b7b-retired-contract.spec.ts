// U/B7b X1: two contract fields with no behaviour behind them are retired, with no alias.
//   · The rule variant. PLAN §4.2 deleted the scroll-scrubbed draw, so `draw` painted as `rule` and the
//     register had one expression under two names. `RuleVariant`, `RULE_VARIANTS`,
//     `rotateRuleVariant`, `AnimatedRule`'s `variant` prop and the story `rule` field go with it.
//   · `DashboardMeta.crest`. Nothing read it: the dock takes the crest from the lazy
//     `DashboardContext`, and an eager crest on the meta put a route's SVG in the entry chunk.
// The `@ts-expect-error` lines are checked by vue-tsc (tests/ is in tsconfig `include`): each fails the
// typecheck while the retired field still exists.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DashboardMeta } from "../../src/contract/types";
import { resolveBeatTemplate, type AuthoredBeat } from "../../src/story/beat-template";
import type { StoryPoint } from "../../src/story/manifest";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : /\.(ts|vue|css)$/.test(name) ? [path] : [];
    });

const RETIRED = [/\bRuleVariant\b/, /\bRULE_VARIANTS\b/, /\brotateRuleVariant\b/, /rule-register/, /data-variant=/, /variant="(rule|draw)"/];

describe("retired contract fields (U/B7b)", () => {
    it("no source file names the rule variant", () => {
        const hits = walk(SRC).flatMap((path) =>
            readFileSync(path, "utf8")
                .split("\n")
                .flatMap((text, i) => (RETIRED.some((re) => re.test(text)) ? [`${path.slice(SRC.length + 1)}:${i + 1}`] : [])),
        );
        expect(hits).toEqual([]);
    });

    it("a resolved beat template carries no rule", () => {
        const t = resolveBeatTemplate({ id: "r", beats: [{ title: "left" }] }, 0, 1);
        expect(Object.keys(t)).not.toContain("rule");
    });

    it("the retired fields do not type-check", () => {
        // @ts-expect-error `rule` is retired from the authored beat.
        const beat: AuthoredBeat = { rule: "draw" };
        // @ts-expect-error `rule` is retired from the story point.
        const point: Pick<StoryPoint, "rule"> = {};
        // @ts-expect-error `crest` is retired from DashboardMeta.
        const crest: DashboardMeta["crest"] = undefined;
        expect([beat, point, crest]).toHaveLength(3);
    });
});
