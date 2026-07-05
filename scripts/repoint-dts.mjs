// scripts/repoint-dts.mjs — THE ALIAS-REPOINT (COPIED verbatim from packages/atlas-core at O-B0).
//
// vue-tsc emits clean .d.ts, but each `@/…` specifier stays verbatim in the output (types/…/*.d.ts
// import `@/platform/charts/colorKind`). attw's BUNDLER profile does not deep-check internal
// resolution, so it goes green regardless — but a CONSUMER WITHOUT the `@` alias cannot resolve the
// emitted types. The clean fix (vite-plugin-dts `rollupTypes`, which drives @microsoft/api-extractor)
// is NOT installed here AND is the known DefineComponent hazard; the L7 alias-repoint is the hard
// dependency it is. This is that repoint: rewrite every emitted `@/X` specifier to the correct
// RELATIVE path (types/ mirrors src/, so `@/X` → ./…/X), making the shipped d.ts resolve for a
// consumer with no alias, under bundler AND node moduleResolution.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPES = resolve(HERE, "../types");

/** Every `@/…` specifier in a `from "…"` / `import("…")` / `import … "…"` clause. */
const ALIAS_SPEC = /((?:from|import)\s*\(?\s*["'])@\/([^"']+)(["'])/g;

async function walk(dir) {
    const out = [];
    for (const ent of await readdir(dir, { withFileTypes: true })) {
        const p = resolve(dir, ent.name);
        if (ent.isDirectory()) out.push(...(await walk(p)));
        else if (ent.name.endsWith(".d.ts")) out.push(p);
    }
    return out;
}

/** Turn a POSIX relative path into an explicit-relative specifier (`./x` / `../x`). */
function rel(fromFile, subpath) {
    let r = relative(dirname(fromFile), resolve(TYPES, subpath)).split("\\").join("/");
    if (!r.startsWith(".")) r = "./" + r;
    return r;
}

let files = [];
try {
    files = await walk(TYPES);
} catch {
    console.error(`repoint-dts: no types/ dir at ${TYPES} — run the dts emit first.`);
    process.exit(1);
}

let rewritten = 0;
let hits = 0;
for (const f of files) {
    const before = await readFile(f, "utf8");
    let n = 0;
    const after = before.replace(ALIAS_SPEC, (_m, pre, sub, post) => {
        n++;
        return `${pre}${rel(f, sub)}${post}`;
    });
    if (n > 0) {
        await writeFile(f, after);
        rewritten++;
        hits += n;
    }
}

// Verify: zero surviving `@/` specifiers anywhere in the emitted types (the portability assertion).
let residual = 0;
for (const f of files) {
    const src = await readFile(f, "utf8");
    const m = src.match(/(?:from|import)\s*\(?\s*["']@\//g);
    if (m) residual += m.length;
}

console.log(
    `repoint-dts: ${files.length} .d.ts scanned · ${hits} \`@/\` specifiers repointed in ${rewritten} files · residual \`@/\` = ${residual}`,
);
if (residual > 0) {
    console.error("repoint-dts: FAILED — surviving `@/` specifiers remain (non-portable dts).");
    process.exit(1);
}
