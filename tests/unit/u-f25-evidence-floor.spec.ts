import { describe, expect, it } from "vitest";
import { effectScope, ref } from "vue";
import {
    EVIDENCE_FLOOR,
    countNoun,
    floorMet,
    nCount,
    nounFor,
    subFloorNote,
    subFloorReason,
    valueSpan,
} from "../../src/editorial/evidence-floor";
import { useEvidenceFloor } from "../../src/editorial/useEvidenceFloor";

// U-F25 (sci-report RULINGS §E, homed in atlas by §H M-5): the floor licenses rank and superlative
// wording only; a sub-floor cell prints its value with its n, and the n names what it counts.

const filer = countNoun("filer");

describe("U-F25 — the floor predicate", () => {
    it("is 5, and licenses wording at n ≥ 5 only", () => {
        expect(EVIDENCE_FLOOR).toBe(5);
        expect(floorMet(4)).toBe(false);
        expect(floorMet(5)).toBe(true);
        expect(floorMet(458)).toBe(true);
    });

    it("never licenses a missing or zero count", () => {
        expect(floorMet(0)).toBe(false);
        expect(floorMet(Number.NaN)).toBe(false);
        expect(floorMet(Number.POSITIVE_INFINITY)).toBe(false);
    });

    it("takes a feed's own floor", () => {
        expect(floorMet(3, 3)).toBe(true);
        expect(floorMet(9, 10)).toBe(false);
    });
});

describe("U-F25 — every figure names what n counts", () => {
    it("pluralises only on exactly one", () => {
        expect(nounFor(1, filer)).toBe("filer");
        expect(nounFor(0, filer)).toBe("filers");
        expect(nounFor(2, filer)).toBe("filers");
    });

    it("builds the count line from the noun, with irregular plurals", () => {
        expect(nCount(1, filer)).toBe("n = 1 filer");
        expect(nCount(3, countNoun("test"))).toBe("n = 3 tests");
        expect(nCount(2, countNoun("county", "counties"))).toBe("n = 2 counties");
    });

    it("writes the sub-floor note with no rank or median word", () => {
        const note = subFloorNote({ n: 1, noun: filer, withheld: "A peer band", shown: "counts" });
        expect(note).toBe(
            "n = 1 filer. A peer band needs at least 5 filers, so each filer's own counts are shown without one.",
        );
        expect(note).not.toMatch(/median|rank|top|highest|most/i);
        expect(subFloorReason({ noun: filer, withheld: "A peer-relative score", floor: 7 })).toBe(
            "A peer-relative score needs at least 7 filers, so each filer's own values are shown without one.",
        );
    });
});

describe("U-F25 — a sub-floor value is the values, never an order statistic", () => {
    const f = (v: number) => v.toFixed(2);
    it("prints one value as itself, several as their span, none as a dash", () => {
        expect(valueSpan([0.16], f)).toBe("0.16");
        expect(valueSpan([0.4, 0.12, 0.3], f)).toBe("0.12–0.40");
        expect(valueSpan([], f)).toBe("—");
        expect(valueSpan([Number.NaN, 0.2], f)).toBe("0.20");
    });
});

describe("U-F25 — useEvidenceFloor", () => {
    it("follows a live n with a non-zero count below the floor (the mutation-killing case)", () => {
        // REGISTRY item 148: a floor test whose only sub-floor case has n = 0 passes with the floor
        // switched off. This case sits below the floor with a non-zero count.
        const scope = effectScope();
        scope.run(() => {
            const n = ref(4);
            const fl = useEvidenceFloor(n, filer);
            expect(fl.licensed.value).toBe(false);
            expect(fl.count.value).toBe("n = 4 filers");
            n.value = 5;
            expect(fl.licensed.value).toBe(true);
            n.value = 1;
            expect(fl.count.value).toBe("n = 1 filer");
            expect(fl.noun.value).toBe("filer");
        });
        scope.stop();
    });

    it("reads a reactive floor (the SCI edition's evidenceFloor meta)", () => {
        const scope = effectScope();
        scope.run(() => {
            const floor = ref(5);
            const fl = useEvidenceFloor(() => 6, filer, floor);
            expect(fl.licensed.value).toBe(true);
            floor.value = 10;
            expect(fl.licensed.value).toBe(false);
            expect(fl.floor.value).toBe(10);
        });
        scope.stop();
    });
});
