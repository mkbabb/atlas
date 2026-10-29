// src/vite/routeChunks.ts — THE ROUTE-CHUNK CONTRACT (U/B7c C1, phone LCP).
//
// Rollup's default cut makes one chunk per distinct set of dynamic imports that reach a module.
// atlas ships one file per source module (preserveModules), so a dashboard route reached 79–89
// files before its body rendered, a third of them under 2 KB, and on HTTP/1.1's six connections
// that queue, not the bytes, set the phone LCP (REPORT-B7B §4).
//
// This plugin cuts by ROUTE:
//   · a module the entry needs stays in the entry chunk;
//   · a dashboard's two roots, `dashboards/<slug>/DashboardBody.vue` and
//     `dashboards/<slug>/context.ts` (the registry layout, contract/registry.ts), load together on
//     that route (the route guard starts both), so they count as ONE route;
//   · every other module joins one chunk per exact set of routes that need it. A lazy import inside
//     a route (a figure loaded on demand) keeps its own chunk unless a route needs the module at once.
// A route therefore loads the modules it loaded under the default cut, in fewer files.
//
// "Needs" is computed on the names a module uses, the way Rollup tree-shakes: a barrel
// (`@mkbabb/atlas/charts`) re-exports a route's components beside the entry's helpers, and a
// side-effect-free module's unused declarations pull nothing. A manual chunk must be this exact,
// because Rollup adds every static dependency of a manual chunk's module that no manual chunk
// claims: an over-wide reach moves route code into the entry.
import type { Plugin } from "vite";

/** The dashboard route a module id roots, by the registry layout; undefined for any other module. */
export function dashboardRouteOf(id: string): string | undefined {
    return /\/dashboards\/([^/_][^/]*)\/(?:DashboardBody\.vue|context\.ts)$/.exec(id.split("?", 1)[0])?.[1];
}

const ALL = "*";
const EFFECTS = "\0effects"; // the module runs, no name used

// The ESTree nodes this reads (Rollup's `ModuleInfo.ast`).
export interface Node {
    type: string;
    start?: number;
    end?: number;
    [k: string]: unknown;
}

interface Statement {
    declares: string[];
    refs: Set<string>;
    effect: boolean;
}

/** One module's import and export shape: what each exported name needs. */
export interface Shape {
    /** local binding → the module and name it imports */
    imports: Map<string, { from: string; name: string }>;
    /** exported name → the module and name it re-exports */
    reexports: Map<string, { from: string; name: string }>;
    /** `export * from` sources */
    stars: string[];
    /** exported name → local binding */
    locals: Map<string, string>;
    statements: Statement[];
    /** `import "x"` */
    bare: string[];
    /** Rollup's `moduleSideEffects`: when true, importing the module runs its effects even if no
        name is used; when false, the module runs only for a used name. */
    sideEffects: boolean;
    /** The module's code length, in characters, as Rollup holds it after the transforms. */
    size: number;
}

const name = (n: unknown): string => {
    const x = n as { type?: string; name?: string; value?: unknown };
    return x?.type === "Literal" ? String(x.value) : String(x?.name ?? "");
};

// Calls Rollup knows are free of side effects, by callee text.
const PURE_CALLEES = /^(Object\.(freeze|create|keys|values|entries|fromEntries|getOwnPropertyNames)|Array\.(from|of|isArray)|Symbol|Number|String|Boolean|BigInt|Math\.\w+|JSON\.parse)$/;
const PURE_NEW = /^(Map|Set|WeakMap|WeakSet|Array|Object|Date|RegExp|Error|TypeError|RangeError|Intl\.\w+)$/;

function calleeText(n: Node): string {
    if (n.type === "Identifier") return name(n);
    if (n.type === "MemberExpression" && !n.computed) return `${calleeText(n.object as Node)}.${name(n.property)}`;
    return "";
}

/** Whether evaluating `n` at module scope can have a side effect (function bodies are deferred). */
function effectful(n: unknown, code: string): boolean {
    if (!n || typeof n !== "object") return false;
    if (Array.isArray(n)) return n.some((x) => effectful(x, code));
    const node = n as Node;
    switch (node.type) {
        case "FunctionExpression":
        case "ArrowFunctionExpression":
        case "FunctionDeclaration":
            return false;
        case "ClassDeclaration":
        case "ClassExpression":
            return (
                effectful(node.superClass, code) ||
                (((node.body as Node)?.body as Node[]) ?? []).some(
                    (m) =>
                        m.type === "StaticBlock" ||
                        (m.static === true && m.type === "PropertyDefinition" && effectful(m.value, code)) ||
                        (m.computed === true && effectful(m.key, code)),
                )
            );
        case "CallExpression":
        case "NewExpression": {
            const before = code.slice(Math.max(0, (node.start ?? 0) - 40), node.start ?? 0);
            const pure = /[@#]__PURE__\s*\*\/\s*\(?\s*$/.test(before);
            const known = (node.type === "CallExpression" ? PURE_CALLEES : PURE_NEW).test(calleeText(node.callee as Node));
            if (!pure && !known) return true;
            return effectful(node.arguments, code) || (!known && effectful(node.callee, code));
        }
        case "AssignmentExpression":
        case "UpdateExpression":
        case "AwaitExpression":
        case "YieldExpression":
        case "TaggedTemplateExpression":
        case "ThrowStatement":
        case "ImportExpression":
            return true;
        case "UnaryExpression":
            return node.operator === "delete" || effectful(node.argument, code);
        default:
            for (const [k, v] of Object.entries(node)) {
                if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "range") continue;
                if (v && typeof v === "object" && effectful(v, code)) return true;
            }
            return false;
    }
}

/** The names a binding pattern declares. */
function patternNames(p: unknown, out: string[] = []): string[] {
    const q = p as Node | null;
    if (!q) return out;
    if (q.type === "Identifier") out.push(name(q));
    else if (q.type === "ObjectPattern")
        for (const pr of q.properties as Node[]) patternNames(pr.type === "RestElement" ? pr.argument : pr.value, out);
    else if (q.type === "ArrayPattern") for (const el of q.elements as Node[]) patternNames(el, out);
    else if (q.type === "RestElement") patternNames(q.argument, out);
    else if (q.type === "AssignmentPattern") patternNames(q.left, out);
    return out;
}

/** `var` and function declarations hoisted to a function body (nested functions excluded). */
function hoisted(n: unknown, out: string[] = []): string[] {
    if (!n || typeof n !== "object") return out;
    if (Array.isArray(n)) {
        for (const x of n) hoisted(x, out);
        return out;
    }
    const node = n as Node;
    if (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression" || node.type === "ClassExpression") return out;
    if (node.type === "FunctionDeclaration") {
        if (node.id) out.push(name(node.id));
        return out;
    }
    if (node.type === "VariableDeclaration" && node.kind === "var")
        for (const d of node.declarations as Node[]) patternNames(d.id, out);
    for (const [k, v] of Object.entries(node)) if (k !== "type" && v && typeof v === "object") hoisted(v, out);
    return out;
}

/** Block-scoped declarations made directly in a statement list. */
function lexical(body: Node[]): string[] {
    const out: string[] = [];
    for (const st of body) {
        if (st.type === "VariableDeclaration" && st.kind !== "var") for (const d of st.declarations as Node[]) patternNames(d.id, out);
        else if ((st.type === "ClassDeclaration" || st.type === "FunctionDeclaration") && st.id) out.push(name(st.id));
    }
    return out;
}

/**
 * Every free name a node reads, as `x` or, for a member read, `x.member`. Names a nested scope
 * declares (parameters, locals, catch bindings) are not free: minified code reuses one-letter
 * names, and an inner `e` must not read as the module's import `e`.
 */
function refsOf(n: unknown, into: Set<string>, scope: ReadonlySet<string> = new Set()): Set<string> {
    if (!n || typeof n !== "object") return into;
    if (Array.isArray(n)) {
        for (const x of n) refsOf(x, into, scope);
        return into;
    }
    const node = n as Node;
    const within = (names: string[]) => (names.length ? new Set([...scope, ...names]) : scope);
    const patternRefs = (p: unknown, sc: ReadonlySet<string>): void => {
        // a pattern declares its identifiers; its defaults and computed keys read names
        const q = p as Node | null;
        if (!q) return;
        if (q.type === "AssignmentPattern") {
            patternRefs(q.left, sc);
            refsOf(q.right, into, sc);
        } else if (q.type === "ObjectPattern")
            for (const pr of q.properties as Node[]) {
                if (pr.type === "RestElement") patternRefs(pr.argument, sc);
                else {
                    if (pr.computed) refsOf(pr.key, into, sc);
                    patternRefs(pr.value, sc);
                }
            }
        else if (q.type === "ArrayPattern") for (const el of q.elements as Node[]) patternRefs(el, sc);
        else if (q.type === "RestElement") patternRefs(q.argument, sc);
        else if (q.type !== "Identifier") refsOf(q, into, sc); // a member target in an assignment
    };
    switch (node.type) {
        case "Identifier":
            if (!scope.has(name(node))) into.add(name(node));
            return into;
        case "MemberExpression": {
            const object = node.object as Node;
            if (!node.computed && object.type === "Identifier") {
                // `ns.member`: a namespace import read this way needs only that member, as Rollup reads it.
                if (!scope.has(name(object))) into.add(`${name(object)}.${name(node.property)}`);
                return into;
            }
            refsOf(object, into, scope);
            if (node.computed) refsOf(node.property, into, scope);
            return into;
        }
        case "FunctionDeclaration":
        case "FunctionExpression":
        case "ArrowFunctionExpression": {
            const params = (node.params as Node[]).flatMap((p) => patternNames(p));
            const own = node.type === "FunctionExpression" && node.id ? [name(node.id)] : [];
            const body = node.body as Node;
            const sc = within([...own, ...params, ...hoisted(body), ...(body.type === "BlockStatement" ? lexical(body.body as Node[]) : [])]);
            for (const p of node.params as Node[]) patternRefs(p, sc);
            if (body.type === "BlockStatement") refsOf(body.body, into, sc);
            else refsOf(body, into, sc);
            return into;
        }
        case "ClassExpression":
        case "ClassDeclaration": {
            const sc = node.type === "ClassExpression" && node.id ? within([name(node.id)]) : scope;
            refsOf(node.superClass, into, sc);
            refsOf(node.body, into, sc);
            return into;
        }
        case "BlockStatement":
        case "StaticBlock":
            refsOf(node.body, into, within(lexical(node.body as Node[])));
            return into;
        case "SwitchStatement": {
            refsOf(node.discriminant, into, scope);
            const cases = node.cases as Node[];
            const sc = within(lexical(cases.flatMap((c) => c.consequent as Node[])));
            for (const c of cases) {
                refsOf(c.test, into, sc);
                refsOf(c.consequent, into, sc);
            }
            return into;
        }
        case "ForStatement":
        case "ForInStatement":
        case "ForOfStatement": {
            const head = (node.init ?? node.left) as Node | null;
            const sc = head?.type === "VariableDeclaration" && head.kind !== "var" ? within(lexical([head])) : scope;
            for (const k of ["init", "left", "test", "update", "right", "body"]) refsOf(node[k], into, sc);
            return into;
        }
        case "CatchClause": {
            const sc = within(patternNames(node.param));
            patternRefs(node.param, sc);
            refsOf(node.body, into, sc);
            return into;
        }
        case "VariableDeclarator":
            patternRefs(node.id, scope);
            refsOf(node.init, into, scope);
            return into;
        case "AssignmentExpression":
            // writing a module binding keeps its declaration, so the target counts as a read
            if ((node.left as Node).type === "Identifier") refsOf(node.left, into, scope);
            else patternRefs(node.left, scope);
            refsOf(node.right, into, scope);
            return into;
        case "LabeledStatement":
            refsOf(node.body, into, scope);
            return into;
        case "BreakStatement":
        case "ContinueStatement":
            return into;
        case "Property":
        case "PropertyDefinition":
        case "MethodDefinition":
            if (node.computed) refsOf(node.key, into, scope);
            refsOf(node.value, into, scope);
            return into;
        default:
            for (const [k, v] of Object.entries(node)) {
                if (k === "type" || k === "start" || k === "end") continue;
                if (v && typeof v === "object") refsOf(v, into, scope);
            }
            return into;
    }
}

function declaredBy(n: Node): string[] {
    if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") return n.id ? [name(n.id)] : [];
    if (n.type !== "VariableDeclaration") return [];
    return (n.declarations as Node[]).flatMap((d) => patternNames(d.id));
}

const statementEffect = (node: Node, code: string): boolean => {
    if (node.type === "FunctionDeclaration") return false;
    if (node.type === "VariableDeclaration" || node.type === "ClassDeclaration") return effectful(node, code);
    return !(node.type === "ExpressionStatement" && typeof node.directive === "string");
};

/** Read one module's shape from its AST and code, resolving each import source with `resolve`. */
export async function shapeOf(
    ast: { body: Node[] } | null,
    code: string,
    sideEffects: boolean,
    resolve: (source: string) => Promise<string | undefined>,
): Promise<Shape> {
    const shape: Shape = {
        imports: new Map(),
        reexports: new Map(),
        stars: [],
        locals: new Map(),
        statements: [],
        bare: [],
        sideEffects,
        size: code.length,
    };
    if (!ast) return { ...shape, sideEffects: true };
    for (const node of ast.body) {
        const source = (node.source as { value?: string } | null | undefined)?.value;
        const to = source === undefined ? undefined : await resolve(source);
        if (node.type === "ImportDeclaration") {
            if (!to) continue;
            const specs = (node.specifiers as Node[]) ?? [];
            if (!specs.length) shape.bare.push(to);
            for (const s of specs) {
                const imported =
                    s.type === "ImportNamespaceSpecifier" ? ALL : s.type === "ImportDefaultSpecifier" ? "default" : name(s.imported);
                shape.imports.set(name(s.local), { from: to, name: imported });
            }
        } else if (node.type === "ExportAllDeclaration") {
            if (!to) continue;
            if (node.exported) shape.reexports.set(name(node.exported), { from: to, name: ALL });
            else shape.stars.push(to);
        } else if (node.type === "ExportNamedDeclaration") {
            if (node.declaration) {
                const decl = node.declaration as Node;
                const declares = declaredBy(decl);
                for (const d of declares) shape.locals.set(d, d);
                shape.statements.push({ declares, refs: refsOf(decl, new Set()), effect: statementEffect(decl, code) });
                continue;
            }
            for (const s of (node.specifiers as Node[]) ?? []) {
                if (to) shape.reexports.set(name(s.exported), { from: to, name: name(s.local) });
                else shape.locals.set(name(s.exported), name(s.local));
            }
        } else if (node.type === "ExportDefaultDeclaration") {
            const decl = node.declaration as Node;
            if (decl.type === "Identifier") {
                shape.locals.set("default", name(decl));
                continue;
            }
            const own = (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") && decl.id ? name(decl.id) : undefined;
            const local = own ?? "\0default";
            shape.locals.set("default", local);
            const effect = decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration" ? statementEffect(decl, code) : effectful(decl, code);
            shape.statements.push({ declares: [local], refs: refsOf(decl, new Set()), effect });
        } else {
            shape.statements.push({ declares: declaredBy(node), refs: refsOf(node, new Set()), effect: statementEffect(node, code) });
        }
    }
    return shape;
}

/** The modules a root needs: names walked through barrels and through each module's declarations. */
function walk(roots: string[], shapes: Map<string, Shape>, kept?: Map<string, Set<number>>) {
    const included = new Set<string>();
    const statements = new Map<string, Set<number>>();
    const done = new Map<string, Set<string>>(); // module → export names, locals ("\0l:") and statements ("\0s:") handled
    const queue: [string, string][] = roots.map((r) => [r, ALL]);
    while (queue.length) {
        const [id, key] = queue.pop()!;
        const seen = done.get(id) ?? new Set<string>();
        if (seen.has(key)) continue;
        seen.add(key);
        done.set(id, seen);
        const shape = shapes.get(id);
        if (!shape) {
            included.add(id);
            continue;
        }
        if (!included.has(id)) {
            // An included module runs its effectful statements, and every module it imports that
            // Rollup keeps for its side effects runs too, whether or not a name is used.
            included.add(id);
            if (kept) for (const i of kept.get(id) ?? []) queue.push([id, `\0s:${i}`]);
            else
                shape.statements.forEach((s, i) => {
                    if (s.effect) queue.push([id, `\0s:${i}`]);
                });
            const targets = [...shape.bare, ...shape.stars, ...[...shape.imports.values(), ...shape.reexports.values()].map((x) => x.from)];
            for (const t of new Set(targets)) if (shapes.get(t)?.sideEffects !== false) queue.push([t, EFFECTS]);
        }
        if (key === EFFECTS) continue;
        if (key === ALL) {
            // the whole namespace: every statement and every export; imports follow from those
            shape.statements.forEach((_s, i) => queue.push([id, `\0s:${i}`]));
            for (const l of shape.locals.values()) queue.push([id, `\0l:${l}`]);
            for (const r of shape.reexports.values()) queue.push([r.from, r.name]);
            for (const s of shape.stars) queue.push([s, ALL]);
        } else if (key.startsWith("\0s:")) {
            const i = Number(key.slice(3));
            if (!statements.has(id)) statements.set(id, new Set());
            statements.get(id)!.add(i);
            for (const r of shape.statements[i].refs) queue.push([id, `\0l:${r}`]);
        } else if (key.startsWith("\0l:")) {
            const [l, member] = key.slice(3).split(".", 2);
            const imp = shape.imports.get(l);
            if (imp) queue.push([imp.from, imp.name === ALL && member ? member : imp.name]);
            shape.statements.forEach((s, i) => {
                if (s.declares.includes(l)) queue.push([id, `\0s:${i}`]);
            });
        } else {
            const re = shape.reexports.get(key);
            if (re) queue.push([re.from, re.name]);
            else if (shape.locals.has(key)) queue.push([id, `\0l:${shape.locals.get(key)}`]);
            else for (const s of shape.stars) queue.push([s, key]);
        }
    }
    return { included, statements };
}

/**
 * The modules a root loads at once. Without `kept`, a statement-level reach (what the root alone
 * would keep). With `kept` (the statements the whole build keeps), the reach Rollup's chunking
 * uses: a module that is loaded brings every statement the build keeps in it, and those
 * statements' imports, because tree-shaking is global while chunking is per module.
 */
export function reachOf(root: string, shapes: Map<string, Shape>, kept?: Map<string, Set<number>>): Set<string> {
    return walk([root], shapes, kept).included;
}

/** The statements the whole build keeps: a reach from every entry and every dynamic import. */
export function keptStatements(roots: string[], shapes: Map<string, Shape>): Map<string, Set<number>> {
    return walk(roots, shapes).statements;
}

/**
 * Name every module's chunk. The route roots are the modules the entry's own modules import
 * dynamically; the inner roots every other dynamic import. A module the entry needs → "index", the
 * entry's chunk; else one chunk per exact set of routes that need it at once, or, when no route
 * does, per exact set of inner roots.
 */
export function assignChunks(
    entries: string[],
    dynamicOf: (id: string) => readonly string[],
    shapes: Map<string, Shape>,
    routeOf: (id: string) => string | undefined = dashboardRouteOf,
): Map<string, string> {
    const dynamic = [...new Set([...shapes.keys()].flatMap(dynamicOf))];
    const kept = keptStatements([...entries, ...dynamic], shapes);
    const inEntry = walk(entries, shapes, kept).included;
    const routeRoots = [...new Set([...inEntry].flatMap(dynamicOf))].filter((r) => !inEntry.has(r));
    const innerRoots = dynamic.filter((r) => !inEntry.has(r) && !routeRoots.includes(r));
    const reach = new Map<string, Set<string>>();
    const reachKept = (root: string) => {
        if (!reach.has(root)) reach.set(root, reachOf(root, shapes, kept));
        return reach.get(root)!;
    };
    // Where each inner root can load: the routes (and the entry) from which a chain of imports,
    // static or dynamic, reaches it.
    const ENTRY = "\0entry";
    const hosts = new Map<string, Set<string>>();
    const host = (key: string, roots: string[]) => {
        const seen = new Set<string>(roots);
        const queue = [...roots];
        while (queue.length) {
            const r = queue.pop()!;
            const modules = r === ENTRY ? inEntry : reachKept(r);
            for (const m of modules)
                for (const d of dynamicOf(m)) {
                    if (inEntry.has(d) || routeRoots.includes(d)) continue;
                    if (!hosts.has(d)) hosts.set(d, new Set());
                    hosts.get(d)!.add(key);
                    if (!seen.has(d)) {
                        seen.add(d);
                        queue.push(d);
                    }
                }
        }
    };
    host(ENTRY, [ENTRY]);
    const routes = new Map<string, string[]>();
    for (const r of routeRoots) {
        const key = routeOf(r) ?? r;
        routes.set(key, [...(routes.get(key) ?? []), r]);
    }
    for (const [key, roots] of routes) host(key, roots);

    const byRoute = new Map<string, Set<string>>();
    const byInner = new Map<string, Set<string>>();
    const tally = (into: Map<string, Set<string>>, root: string, key: string) => {
        for (const id of reachKept(root)) {
            if (inEntry.has(id)) continue;
            if (!into.has(id)) into.set(id, new Set());
            into.get(id)!.add(key);
        }
    };
    for (const [key, roots] of routes) for (const r of roots) tally(byRoute, r, key);
    for (const r of innerRoots) tally(byInner, r, r);
    const names = new Map<string, string>();
    const routeSets = new Map<string, RouteSet>();
    for (const id of inEntry) names.set(id, "index");
    // Rollup merges manual chunks by name, so each key set gets its own: a readable label, and a
    // count when two sets read alike (route `c` and a lazy `figs/c.ts`).
    const alias = new Map<string, string>();
    const taken = new Set<string>();
    const label = (k: string) => (k.includes("/") ? k.split("?", 1)[0].split("/").pop()!.replace(/\.[^.]+$/, "") : k);
    const nameFor = (keys: string[], prefix: string) => {
        const k = [...keys].sort().join("\n");
        if (!alias.has(k)) {
            const parts = keys.map(label).sort();
            let name = `${prefix}${parts.length > 3 ? `shared-${parts.length}` : parts.join("+")}`;
            for (let n = 2; taken.has(name); n++) name = `${name.replace(/~\d+$/, "")}~${n}`;
            taken.add(name);
            alias.set(k, name);
        }
        return alias.get(k)!;
    };
    // A module's chunk is keyed by the routes that need it at once, plus each lazy import that needs
    // it and can load where none of those routes has already loaded it. A lazy import that only ever
    // loads on routes holding the module adds nothing, so a route's own figures share its chunk; one
    // that also loads elsewhere keeps the module in a chunk that route can fetch without the rest of
    // the route's code.
    // A barrel imported dynamically (`import("@mkbabb/atlas/filter")`) is a namespace: its chunk
    // re-exports every name. In a route's chunk it would make the route import all of them; alone,
    // it is the code-free facade Rollup would emit, and static importers bind past it.
    const facades = new Set(
        dynamic.filter((id) => {
            const shape = shapes.get(id);
            return shape !== undefined && !shape.statements.length && !shape.bare.length;
        }),
    );
    for (const id of facades) names.set(id, nameFor([id], "lazy-"));
    for (const id of new Set([...byRoute.keys(), ...byInner.keys()])) {
        if (facades.has(id)) continue;
        const at = byRoute.get(id) ?? new Set<string>();
        const lazy = [...(byInner.get(id) ?? [])].filter((r) => ![...(hosts.get(r) ?? [ENTRY])].every((h) => at.has(h)));
        names.set(id, nameFor([...at, ...lazy], at.size ? "route-" : "lazy-"));
        // The routes where this chunk can load: its own, and every host of a lazy import that needs
        // it. A lazy import the entry can load reaches past every route chunk, so that one stays.
        const where = new Set([...at, ...lazy.flatMap((r) => [...(hosts.get(r) ?? [ENTRY])])]);
        if (at.size && !where.has(ENTRY)) routeSets.set(names.get(id)!, { keys: where, exact: !lazy.length });
    }
    foldSmallSets(names, routeSets, shapes);
    return names;
}

/** A set chunk whose modules hold fewer characters than this rides a wider route set's chunk. */
export const MIN_SET_CHUNK = 8192;

const STYLE_ID = /\.(css|scss|sass|less|styl)($|\?)|[?&]type=style/;

/** A route chunk's reach: the routes where it can load, and whether each of them loads it at once
    (exact) or some only through a lazy import. Only an exact chunk can take a fold. */
interface RouteSet {
    keys: Set<string>;
    exact: boolean;
}

/**
 * Fold each small chunk that two or more routes can load into the smallest exact chunk of a route
 * set that covers them (U/B7c M1, O-7). The exact-set cut gave a phone dashboard route 34–37 files
 * before its hero, most of them an icon or a helper of 0–2 KB; on HTTP/1.1's six connections the
 * file count set the paint. A chunk folds only when every module in it is free of side effects,
 * imports no sheet, and imports only modules that every route of the wider set already loads, so a
 * route outside the small set evaluates nothing and fetches nothing more than the folded bytes.
 */
function foldSmallSets(names: Map<string, string>, routeSets: Map<string, RouteSet>, shapes: Map<string, Shape>) {
    const members = new Map<string, string[]>();
    for (const [id, n] of names) if (routeSets.has(n)) members.set(n, [...(members.get(n) ?? []), id]);
    const pure = (id: string) => {
        const shape = shapes.get(id);
        if (!shape || STYLE_ID.test(id) || shape.bare.length) return false;
        return !shape.sideEffects || !shape.statements.some((st) => st.effect);
    };
    const depsOf = (id: string) => {
        const shape = shapes.get(id)!;
        return [...shape.stars, ...[...shape.imports.values(), ...shape.reexports.values()].map((x) => x.from)];
    };
    const within = (narrow: Set<string>, wide: Set<string>) => [...narrow].every((k) => wide.has(k));
    const into = new Map<string, string>();
    const final = (n: string): string => (into.has(n) ? final(into.get(n)!) : n);
    const order = [...routeSets.keys()].sort((a, b) => routeSets.get(b)!.keys.size - routeSets.get(a)!.keys.size);
    for (const n of order) {
        const ids = members.get(n) ?? [];
        const { keys, exact } = routeSets.get(n)!;
        // a one-route set is that route's own chunk, which the route fetches anyway
        if (keys.size < 2 || ids.reduce((sum, id) => sum + shapes.get(id)!.size, 0) >= MIN_SET_CHUNK || !ids.every(pure)) continue;
        const wider = order
            .filter((m) => {
                const t = routeSets.get(m)!;
                return m !== n && !into.has(m) && t.exact && within(keys, t.keys) && (!exact || t.keys.size > keys.size);
            })
            .sort((a, b) => routeSets.get(a)!.keys.size - routeSets.get(b)!.keys.size);
        const target = wider.find((m) => {
            const there = routeSets.get(m)!.keys;
            return ids.every((id) =>
                depsOf(id).every((d) => {
                    const dn = names.get(d);
                    if (dn === undefined || dn === "index" || dn === n) return true;
                    const ds = routeSets.get(final(dn));
                    return ds !== undefined && ds.exact && within(there, ds.keys);
                }),
            );
        });
        if (target) into.set(n, target);
    }
    for (const [id, n] of names) if (into.has(n)) names.set(id, final(n));
}

/**
 * The route-chunk plugin: it reads the module graph at `buildEnd` and supplies `manualChunks`.
 * A consumer that sets its own `manualChunks` is refused: two owners of the cut is a second path.
 */
export function atlasRouteChunks(options: { routeOf?: (id: string) => string | undefined } = {}): Plugin {
    let names = new Map<string, string>();
    return {
        name: "atlas:route-chunks",
        apply: "build",
        config(config) {
            const out = config.build?.rollupOptions?.output;
            const outs = Array.isArray(out) ? out : out ? [out] : [];
            if (outs.some((o) => o.manualChunks))
                throw new Error("atlas:route-chunks: the consumer sets output.manualChunks; the atlas preset owns the route cut");
            return { build: { rollupOptions: { output: { manualChunks: (id: string) => names.get(id) } } } };
        },
        async buildEnd(error) {
            if (error) return;
            const ids = [...this.getModuleIds()];
            const shapes = new Map<string, Shape>();
            await Promise.all(
                ids.map(async (id) => {
                    const info = this.getModuleInfo(id);
                    if (!info || info.isExternal) return;
                    const cache = new Map<string, Promise<string | undefined>>();
                    const resolve = (source: string) => {
                        if (!cache.has(source)) cache.set(source, this.resolve(source, id).then((r) => r?.id));
                        return cache.get(source)!;
                    };
                    shapes.set(
                        id,
                        await shapeOf(info.ast as { body: Node[] } | null, info.code ?? "", info.moduleSideEffects !== false, resolve),
                    );
                }),
            );
            const entries = ids.filter((id) => this.getModuleInfo(id)?.isEntry);
            const dynamicOf = (id: string) => this.getModuleInfo(id)?.dynamicallyImportedIds ?? [];
            names = assignChunks(entries, dynamicOf, shapes, options.routeOf);
        },
    };
}
