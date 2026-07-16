import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
) as {
    name: string;
    files: string[];
    peerDependencies: Record<string, string>;
};

const BOUNDED_RANGE = /^\^\d+\.\d+(?:\.\d+)?(?:\s*\|\|\s*\^\d+\.\d+(?:\.\d+)?)*$/;

describe("published package contract", () => {
    it("keeps the public identity and publish whitelist exact", () => {
        expect(pkg.name).toBe("@mkbabb/atlas");
        expect(pkg.files).toEqual(["dist", "types"]);
    });

    it("uses bounded registry peer ranges", () => {
        for (const [name, range] of Object.entries(pkg.peerDependencies))
            expect(range, name + ": " + range).toMatch(BOUNDED_RANGE);
    });
});
