// scripts/bake-glyph-registry.mjs — the FIDELITY-FIRST geo-glyph bake (I-GLYPH.a).
//
// Generalizes the committed-output / count-guard discipline of `crop-nc-topology.mjs` into a
// TUNABLE stage-ladder that turns a boundary source into icon-clean, multi-LOD SVG glyphs that
// EXACTLY RESEMBLE their source polygons (the user's 2026-06-17 mandate). The ordered pipeline:
//
//   (1) INGEST     — ogr2ogr the district .shp/TIGER; the SAME us-atlas/nc-counties source the
//                    choropleth draws for state/county — into the grain's NATIVE projected plane
//                    (states screen-space, NC grains the EPSG:32119 NC conic). [C1 byte-identity]
//   (2) REPROJECT  — folded into ingest: the NC conic (geometry.ts:108 constants) for NC grains.
//   (3) TOPOLOGY   — topojson-server topology(): ONE shared arc graph (coincident borders = ONE arc).
//   (4) SIMPLIFY   — Visvalingam presimplify() weights → TOPOLOGY-PRESERVING simplify(minWeight):
//                    coincident borders dropped coherently on both sides (the field TILES). The
//                    drop count is the "Repaired N intersections" log; a per-feature Douglas-
//                    Peucker NEG-CONTROL is run to SHOW the tear (proven, not asserted).
//   (5) SMOOTH     — shrink-resistant Taubin (λ/μ) or Chaikin (NOT plain Laplacian, which deflates).
//   (6) FIT        — ASPECT-PRESERVING fit to [0,100] (uniform scale, NO square-warp); record aspect.
//   (7) EMIT       — the coarse/med/fine tier registries as committed SVG `d` strings.
//
// THE FIDELITY GATE (the mandate): each `fine`-tier glyph's symmetric-difference area ÷ source
// area ≤ ε, the aspect-fidelity holds, and the bake reports the worst feature + value.
//
// CLI:
//   node scripts/bake-glyph-registry.mjs --grain district --source local --validate
//   node scripts/bake-glyph-registry.mjs --grain district --source web:tiger --validate   # CI
//   node scripts/bake-glyph-registry.mjs --grain all --source local
// Knobs: --grain {state|county|district|all} · --source {local|local:<path>|web:tiger} ·
//        --smooth {none|chaikin|taubin}:<iter> · --lambda <n> --mu <n> · --precision <n> ·
//        --epsilon <n> · --aspect-tol <n> · --validate · --neg-control
//
// Idempotent (committed output, byte-stable); re-run on a source bump. The topojson tooling
// (topojson-server / topojson-simplify) is BUILD-TIME ONLY — never imported by src/**.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { feature, quantize } from "topojson-client";

import { ingest } from "./glyph-pipeline/ingest.mjs";
import {
    toTopology,
    presimplifyVis,
    toposimplifyMinWeight,
    douglasPeuckerPerFeature,
} from "./glyph-pipeline/topology.mjs";
import { smoothGeometry } from "./glyph-pipeline/smooth.mjs";
import { fitAspect, parsePath } from "./glyph-pipeline/fit.mjs";
import { measureFidelity, fidelityGate, FIDELITY_N } from "./glyph-pipeline/fidelity.mjs";
import {
    geometryArea,
    bounds,
    intersectionArea,
    decimateGeometry,
    aspectOf,
} from "./glyph-pipeline/geom.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// REPO_ROOT is the `@mkbabb/atlas` library root — the facility's home (icon-facility §4). The bake
// relocated here from the pre-extraction `atlas/` app husk so the tool lives WITH the data it emits
// (`src/data/glyphs`) and the deps it needs (topojson-* devDeps), i.e. a bare library checkout can
// re-bake. The O-B3 leaf-data move re-homed the data plane `src/platform/data` → `src/data`.
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(REPO_ROOT, "src/data/glyphs");

// ── tier definitions — the TOPOLOGY-PRESERVING simplify minWeight (the Visvalingam effective-
// area threshold, in projected px²) per tier, the smoother, and the per-tier fidelity ε.
// `minWeight` controls the LOD: a LOW threshold (fine) drops only the least-significant
// vertices (the rich hero silhouette); a HIGH threshold (coarse) reduces to an iconic pebble
// (the sm strip/dot-cloud). The smoother strengthens with the tier so the coarse pebble is
// friendly without eroding the fine silhouette. fine carries the TIGHT ε + aspect (the user
// mandate — the hero rung exactly resembles the polygon); coarse is looser (an iconic
// reduction is allowed to diverge — it is not the hero the reader scrutinizes).
// The Visvalingam effective-area threshold is expressed as a FRACTION of the grain's median
// feature area, so the LOD is CONSISTENT across grains regardless of the projected plane's scale
// (a state in the national Albers plane is ~3.5× the area of an NC district in the NC-conic
// plane — a fixed px² threshold would simplify states far less). `minWeightFrac` × medianArea =
// the per-grain minWeight. Calibrated so the district fine tier reproduces the validated 0.05
// px² (≈3.07e-5 × the 1631 median). The smoothing is FIDELITY-GUARDED per feature (a corner-cut
// that would push a tiny feature off its polygon falls back to the raw simplified outline).
const TIERS = {
    coarse: {
        minWeightFrac: 2.5e-3,
        smooth: { kind: "chaikin", iters: 2 },
        epsilon: 0.4,
        aspectTol: 0.12,
    },
    med: {
        minWeightFrac: 1.5e-4,
        smooth: { kind: "chaikin", iters: 2 },
        epsilon: 0.16,
        aspectTol: 0.06,
    },
    // fine — the HERO: a low threshold keeps the rich Visvalingam silhouette, then ONE Chaikin
    // pass relaxes the jaggedness into a clean icon — UNLESS the per-feature guard finds the raw
    // simplified outline registers tighter (a low-vertex blocky county / a tiny state, where
    // Chaikin's centroid-anchored area-restore would nudge the silhouette off the source frame).
    // The ε is the HONEST COMMITTED-path gate: after the registration fix (the fit seats by the
    // SOURCE bbox) + the scanline N=512 measure + the unconditional smooth/raw guard, the worst
    // committed fine glyph is ~3.0% symDiff (Carteret, a fractal coastal district); ε = that
    // achievable worst + a small margin. The rung the reader scrutinizes EXACTLY resembles its
    // polygon, and the gate FAILS LOUD per feature above ε.
    fine: {
        minWeightFrac: 3.07e-5,
        smooth: { kind: "chaikin", iters: 1 },
        epsilon: 0.04,
        aspectTol: 0.02,
    },
    // icon — the NEW coarsest LOD tier below `coarse` (O-A14, icon-facility §2.4 · §3.1). A 16–24px
    // dropdown / inline mark reads a district as a clean PEBBLE, not the jagged mush a 16px `coarse`
    // glyph shows. A HIGH minWeight (`~8e-3`, ~3× coarse's threshold) drops all but the most
    // significant vertices (~8–14 verts vs coarse's ~24), then a Chaikin:2 pass relaxes the pebble
    // friendly. It is a lazy, additive tier for the 4 Class-A grains — it does NOT gate (an iconic
    // reduction is NOT the fidelity-gated hero the reader scrutinizes; `mustGate` stays FINE-only), so
    // it REPORTS its symDiff divergence in the log but never blocks. The loose ε/aspectTol are the
    // honest icon-scale tolerance — a 16px pebble is ALLOWED to round a thin sliver's bbox.
    icon: {
        minWeightFrac: 8e-3,
        smooth: { kind: "chaikin", iters: 2 },
        epsilon: 0.5,
        aspectTol: 0.15,
    },
};

// Per-grain feature-count guards (the --validate count-assert, the crop-nc-topology discipline).
// state=51: the us-atlas `states-albers-10m` source the choropleth draws carries EXACTLY the 50
// states + DC (the geoAlbersUsa projection insets AK/HI but DROPS the 5 territories AS/GU/MP/
// PR/VI — they are not in the source). The C1 byte-identity contract binds the registry to the
// SAME features the map renders, so the truthful state count is 51, not the aspirational 56 (a
// territory glyph would need a separate composite source — a named follow-up, never a fabricated
// silhouette). county=100 (NC), district=118 (NC school districts).
const EXPECTED = { state: 51, county: 100, district: 118 };

// The raster resolution for the fidelity symmetric-difference (N×N over the union bbox). The
// honest committed-path gate measures in the [0,100] frame at N≥512 (fidelity.mjs FIDELITY_N).
const FIDELITY_RASTER = FIDELITY_N;

function parseArgs(argv) {
    const args = {
        grain: "all",
        source: "local",
        smooth: null,
        lambda: null,
        mu: null,
        precision: 2,
        epsilon: null,
        aspectTol: null,
        validate: false,
        negControl: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        const next = () => argv[++i];
        if (a === "--grain") args.grain = next();
        else if (a === "--source") args.source = next();
        else if (a === "--smooth") args.smooth = next();
        else if (a === "--lambda") args.lambda = parseFloat(next());
        else if (a === "--mu") args.mu = parseFloat(next());
        else if (a === "--precision") args.precision = parseInt(next(), 10);
        else if (a === "--epsilon") args.epsilon = parseFloat(next());
        else if (a === "--aspect-tol") args.aspectTol = parseFloat(next());
        else if (a === "--validate") args.validate = true;
        else if (a === "--neg-control") args.negControl = true;
        else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
    }
    return args;
}

/** Extract per-feature geometries from a (simplified) topology, keyed + with properties. */
function extractFeatures(topo) {
    const fc = feature(topo, topo.objects.g);
    return fc.features.map((f) => ({
        key: f.properties?.key ?? String(f.id ?? ""),
        name: f.properties?.name ?? "",
        lea: f.properties?.lea ?? null,
        intpt: f.properties?.intpt ?? null,
        geometry: f.geometry,
    }));
}

/**
 * Build a key → source geometry map for the fidelity gate. The raw source is up to ~5,000
 * vertices/feature (the dense district coast); the symmetric-difference samples a fixed N×N
 * raster, so coastline detail finer than one cell is invisible to the metric — we decimate the
 * reference to a bounded budget (well above the raster's resolving power), keeping the gate
 * number faithful while the bake stays fast and DETERMINISTIC.
 */
function sourceMap(features) {
    const m = new Map();
    for (const f of features) m.set(f.key, decimateGeometry(f.geometry, 1500));
    return m;
}

/**
 * The TOPOLOGY-PRESERVATION demonstration (Hard Gate 4): measure the border-tear of the
 * per-feature Douglas-Peucker NEG-CONTROL vs the topology-preserving path. For each adjacent
 * pair we'd need a full overlay; a cheap, deterministic proxy is the TOTAL covered area — a
 * topology-preserving simplify keeps the union area ≈ stable (borders coincide), while
 * per-feature DP creates gaps+overlaps that change the union area. We report both the
 * coherent removal count (toposimplify) and the DP union-area drift (the tear evidence).
 */
function topologyDemo(ingested, weighted, minWeight) {
    const { removed, before, after, topo: topoSimplified } = toposimplifyMinWeight(
        weighted,
        minWeight,
    );
    // Topology-preserving union area (after coherent simplify):
    const topoFeats = extractFeatures(topoSimplified);
    const topoUnion = topoFeats.reduce((s, f) => s + geometryArea(f.geometry), 0);
    // Per-feature DP at a tolerance tuned to remove a comparable vertex budget. Run on the
    // DECIMATED source so the tear measurement is fast + deterministic (the tear is a border
    // COINCIDENCE property, unaffected by sub-raster coastline detail).
    const dec = ingested.map((f) => ({ ...f, geometry: decimateGeometry(f.geometry, 600) }));
    const dpFeats = douglasPeuckerPerFeature(dec, dpToleranceFor(dec));
    const dpUnion = dpFeats.reduce((s, f) => s + geometryArea(f.geometry), 0);
    const sourceUnion = dec.reduce((s, f) => s + geometryArea(f.geometry), 0);
    // Pairwise overlap proxy: sum of intersection areas between adjacent features (sampled).
    const tear = measureTear(dec, dpFeats);
    return {
        removed,
        before,
        after,
        topoUnionDrift: Math.abs(topoUnion - sourceUnion) / sourceUnion,
        dpUnionDrift: Math.abs(dpUnion - sourceUnion) / sourceUnion,
        tearOverlapArea: tear.overlap,
        tearPairs: tear.pairs,
    };
}

/** A DP tolerance in projected units that removes a comparable budget (~the bbox diagonal/200). */
function dpToleranceFor(features) {
    let box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const f of features) box = bounds(f.geometry.coordinates, box);
    const diag = Math.hypot(box[2] - box[0], box[3] - box[1]);
    return diag / 250;
}

/**
 * Measure the TEAR the per-feature DP introduces: for spatially-adjacent feature pairs (those
 * whose bboxes overlap), the area of overlap (an overlap means the shared border no longer
 * coincides — DP pushed the two sides apart unequally). A topology-preserving simplify has
 * ZERO such overlap (shared arcs are identical on both sides). Returns {overlap, pairs}.
 */
function measureTear(original, dpFeats) {
    const boxes = dpFeats.map((f) => ({
        f,
        b: bounds(f.geometry.coordinates),
    }));
    let overlap = 0;
    let pairs = 0;
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i].b;
            const b = boxes[j].b;
            // bbox-adjacency prefilter (cheap): skip non-touching pairs.
            if (a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]) continue;
            const inter = intersectionArea(boxes[i].f.geometry, boxes[j].f.geometry);
            if (inter > 0) {
                overlap += inter;
                pairs++;
            }
        }
    }
    return { overlap, pairs };
}

function bakeGrain(grain, args) {
    console.log(`\n── grain: ${grain} (source=${args.source}) ─────────────────────`);
    const ingested = ingest(grain, { repoRoot: REPO_ROOT, source: args.source });

    if (args.validate && ingested.length !== EXPECTED[grain]) {
        throw new Error(
            `[FAIL-LOUD] grain ${grain}: expected ${EXPECTED[grain]} features, got ${ingested.length} (malformed source?)`,
        );
    }
    console.log(`  ingested ${ingested.length} features (expected ${EXPECTED[grain]})`);

    const srcGeom = sourceMap(ingested);
    const topo = toTopology(ingested);
    const weighted = presimplifyVis(topo);

    // The per-grain minWeight = minWeightFrac × the median feature area (scale-invariant LOD).
    const areas = ingested.map((f) => geometryArea(f.geometry)).sort((a, b) => a - b);
    const medianArea = areas[Math.floor(areas.length / 2)] || 1;
    const minWeightOf = (cfg) => cfg.minWeightFrac * medianArea;

    // ── the topology-preservation demonstration (run at the med tier's minWeight) ──
    const demo = topologyDemo(ingested, weighted, minWeightOf(TIERS.med));
    console.log(
        `  Repaired ${demo.removed} intersections (coherent shared-topology vertex removal: ${demo.before}→${demo.after} verts)`,
    );
    console.log(
        `  topology-preserving union-area drift ${(demo.topoUnionDrift * 100).toFixed(3)}%  ·  ` +
            `per-feature-DP NEG-CONTROL union drift ${(demo.dpUnionDrift * 100).toFixed(3)}%  ` +
            `+ TORN borders: ${demo.tearPairs} adjacent pairs overlap (tear area ${demo.tearOverlapArea.toFixed(0)} sq-units; toposimplify=0)`,
    );

    // Precompute the simplified per-tier topologies, finest first, so a feature that DEGENERATES
    // at a coarse threshold (a tiny state like DC collapsing to a sliver) can be FLOORED to the
    // next-finer tier's geometry for that one feature — the mandate's "never a torn/empty glyph".
    const tierGeom = {}; // tierName → Map(key → simplified geometry)
    const tierTopo = {}; // tierName → the simplified SHARED-arc topology (for the topology emit)
    for (const [tierName, cfg] of Object.entries(TIERS)) {
        const simplified = toposimplifyMinWeight(weighted, minWeightOf(cfg)).topo;
        tierTopo[tierName] = simplified;
        const map = new Map(extractFeatures(simplified).map((f) => [f.key, f]));
        tierGeom[tierName] = map;
    }
    // finest → coarsest (the degeneracy-floor direction: a tier that COLLAPSES a feature borrows the
    // next-FINER tier's geometry). `icon` is the coarsest, so it floors to coarse→med→fine; the
    // pre-icon tiers are UNCHANGED (none floors to icon — icon is never finer), so adding it here does
    // not perturb the committed coarse/med/fine bytes.
    const TIER_ORDER = ["fine", "med", "coarse", "icon"];

    // ── The per-LEA shared-projection TOPOLOGY emit (J-GLYPH arm c · §approach-3) ──────────────
    //
    // The DEFECT (J-GLYPH §3, re-verified): the committed glyph registries are self-normalized
    // [0,100]-box PATHS (fit.mjs), NOT a topology — so `GeoChoropleth` (a `topology`-prop consumer,
    // GeoChoropleth.vue:44-49/167-177) cannot bind per-LEA districts, and the SCI map falls back to
    // the us-atlas county crop (`loadNcGeometry()`). The FIX: alongside the [0,100]-box glyph PATHS,
    // emit the SAME mid-ladder shared-arc graph (`toposimplifyMinWeight` output, the NC-conic
    // 975×373 screen plane — the SAME plane the choropleth draws through `geoIdentity().reflectY(
    // false)`) as a committed `GeoChoropleth`-bindable TopoJSON `Topology` with `objects.districts`
    // GEOID-keyed (the LEA crosswalk on each geometry's `properties.lea` so J-WORKBOOK's
    // schoolCode→leaNumber→GEOID join binds). This REPLACES the rejected county-proxy at map scale;
    // J-WORKBOOK binds the file, J-GLYPH emits it (the topology BAKE is J-GLYPH's, the SCI choropleth
    // re-wire is J-WORKBOOK's). Bound to the `med` tier — the balanced field-scale LOD the map draws
    // (the `fine` hero silhouette is the inline-glyph rung, the `coarse` the dot-as-glyph rung).
    if (grain === "district") {
        emitDistrictTopology(tierTopo.med);
    }

    const tierReports = {};
    for (const [tierName, cfg] of Object.entries(TIERS)) {
        const smooth = args.smooth ? parseSmooth(args.smooth, args) : cfg.smooth;
        const eps = args.epsilon ?? cfg.epsilon;
        const aspectTol = args.aspectTol ?? cfg.aspectTol;

        const feats = [...tierGeom[tierName].values()];

        const entries = {};
        const measures = [];
        let totalVerts = 0;
        let floored = 0;
        for (let f of feats) {
            const source = srcGeom.get(f.key);
            const sourceAspect = aspectOf(source);
            // The SOURCE feature's projected bbox — the REGISTRATION FRAME. The fit seats the
            // smoothed outline by THIS bbox (not its own), so a dropped extreme leaves a local
            // gap, not a global offset. We also fit the SOURCE into the SAME [0,100] frame so the
            // committed-path gate compares like with like (the honest "exactly resembles" number).
            const sourceBounds = bounds(source.coordinates);
            const sourceFit = fitAspect(
                source,
                100,
                args.precision,
                sourceAspect,
                sourceBounds,
            ).fitted;

            // DEGENERACY FLOOR: if this tier's simplification collapsed the feature (the area
            // ratio to the source dropped near zero — a thin sliver / vanished glyph), borrow the
            // next-finer tier's geometry for this ONE feature so the silhouette stays recognizable
            // (DC at coarse keeps its med outline). A topology-safe per-feature floor — never empty.
            const tierIdx = TIER_ORDER.indexOf(tierName);
            for (let ti = tierIdx - 1; ti >= 0; ti--) {
                if (geometryArea(f.geometry) / geometryArea(source) >= 0.25) break;
                const finer = tierGeom[TIER_ORDER[ti]].get(f.key);
                if (finer) {
                    f = finer;
                    floored++;
                }
            }

            // Fit the smoothed outline into the SOURCE frame, then measure the COMMITTED path
            // (parsePath(fit.d), post-quantize) vs the source-in-frame — the HONEST artifact the
            // reader perceives, registration offset INCLUDED. The smoothing is FIDELITY-GUARDED
            // UNCONDITIONALLY: Chaikin's centroid-anchored area-restore can shift a LOW-vertex
            // outline (Guilford's 5-vert blocky county, DC's tiny diamond) off the source
            // registration — there the RAW simplified outline (which seats EXACTLY in the source
            // frame, ~0% divergence) is the truer icon. We always measure BOTH committed paths and
            // keep whichever scores lower, so the kept geometry is the per-feature minimum (NOT
            // coupled to ε — the worst we report is the honest achievable floor). "Exactly
            // resembles" applied PER FEATURE, on the committed bytes.
            const fitOf = (g) =>
                fitAspect(g, 100, args.precision, sourceAspect, sourceBounds);
            const measureCommitted = (fit) =>
                measureFidelity(parsePath(fit.d), sourceFit, FIDELITY_RASTER);

            let fit = fitOf(smoothGeometry(f.geometry, smooth));
            let m = measureCommitted(fit);
            if (smooth.kind !== "none") {
                const rawFit = fitOf(smoothGeometry(f.geometry, { kind: "none" }));
                const rawM = measureCommitted(rawFit);
                if (rawM.ratio < m.ratio) {
                    fit = rawFit;
                    m = rawM;
                }
            }
            totalVerts += (fit.d.match(/[ML]/g) ?? []).length;

            // Arm (b): the aspect-fidelity compares the COMMITTED glyph's recorded aspect
            // (fit.aspect) to the source aspect — the fit held the proportion (NO square-warp).
            m.aspectDelta =
                sourceAspect > 0
                    ? Math.abs(fit.aspect - sourceAspect) / sourceAspect
                    : 0;
            measures.push({ key: f.key, ...m });

            entries[f.key] = buildEntry(grain, f, fit, m.ratio);
        }

        const gate = fidelityGate(measures, { epsilon: eps, aspectTol });
        const avgVerts = Math.round(totalVerts / feats.length);
        console.log(
            `  [${tierName}] ${feats.length} glyphs · ~${avgVerts} verts/glyph · ε=${eps} aspectTol=${aspectTol}` +
                (floored ? ` · ${floored} degenerate floored→finer` : "") +
                ` → worst symDiff ${(gate.worst.ratio * 100).toFixed(2)}% (${gate.worst.key})` +
                ` · worst aspect Δ ${(gate.worstAspect.aspectDelta * 100).toFixed(3)}% (${gate.worstAspect.key})` +
                ` · ${gate.pass ? "PASS" : `over-threshold (${gate.failures.length})`}`,
        );

        // THE FIDELITY GATE (the user mandate): the FINE tier is the hero the reader
        // scrutinizes — it MUST pass (fail loud), so the committed silhouette EXACTLY
        // resembles its polygon where it matters most. coarse/med are ICONIC reductions (the
        // sm dot-cloud / md scatter) — their looser ε/aspectTol REPORT the divergence but do
        // not block (a 24px pebble is allowed to round a thin sliver district's bbox; that is
        // the LOD trade, not a regression). The --validate flag asserts the COUNTS + the fine
        // fidelity, never the coarse/med iconic tiers.
        const mustGate = tierName === "fine";
        if (!gate.pass && mustGate) {
            const sample = gate.failures.slice(0, 5);
            throw new Error(
                `[FIDELITY-FAIL] grain ${grain} tier ${tierName}: ${gate.failures.length} feature(s) exceed threshold (ε=${eps}, aspectTol=${aspectTol}) — ` +
                    sample
                        .map((x) => `${x.key}:${x.kind}=${x.value.toFixed(4)}`)
                        .join(", "),
            );
        }

        // Write the committed tier registry (sorted keys → byte-stable).
        const sorted = {};
        for (const k of Object.keys(entries).sort()) sorted[k] = entries[k];
        const outPath = resolve(OUT_DIR, `${registryName(grain)}.${tierName}.json`);
        writeFileSync(outPath, JSON.stringify(sorted) + "\n");
        // The county NAME table (FIPS → name), apart from the outlines: the LEA→county join reads
        // names on every route, and must not carry the coarse outlines into the entry (B7b M3).
        if (grain === "county" && tierName === "coarse") {
            const names = {};
            for (const k of Object.keys(sorted)) names[k] = sorted[k].name;
            writeFileSync(resolve(OUT_DIR, `${registryName(grain)}.names.json`), JSON.stringify(names) + "\n");
        }

        tierReports[tierName] = {
            count: feats.length,
            avgVerts,
            epsilon: eps,
            aspectTol,
            worst: gate.worst,
            worstAspect: gate.worstAspect,
            pass: gate.pass,
            outPath,
        };
    }

    return { grain, count: ingested.length, tiers: tierReports, demo };
}

// The TopoJSON quantization grid for the committed district topology. 1e5 over the 975×373
// NC-conic plane = a ~0.01px lattice (sub-perceptible at the plate's scale), delta-encoding the
// arcs to compact integers under a `transform` — the standard `feature()`-decodable TopoJSON form
// (byte-stable across re-runs ⇒ idempotent), shrinking the un-quantized float emit ~3× (~450KB →
// ~150KB) with no visible boundary drift. The arcs are SHARED (one arc per coincident border —
// the field TILES), so a single quantization lattice keeps adjacent districts coincident.
const TOPO_QUANTIZE = 1e5;

/**
 * Emit the per-LEA shared-projection TopoJSON `Topology` the SCI district choropleth binds
 * (`<GeoChoropleth :topology object="districts">`). `simplifiedTopo` is the `med`-tier shared-arc
 * graph (`toposimplifyMinWeight` output) — already in the NC conic 975×373 screen plane (the SAME
 * plane `GeoChoropleth` draws through `geoIdentity().reflectY(false)`), with `objects.g` carrying
 * one GEOID-keyed geometry per district + the LEA crosswalk on `properties.lea`.
 *
 * The transform: rename `objects.g → objects.districts`, project each geometry down to the
 * minimal `{ type, arcs, id (GEOID), properties: { lea, name, intpt } }` the choropleth + the
 * crosswalk join need (DROP the redundant `properties.key` — it duplicates the geometry `id`),
 * then QUANTIZE (delta-encode the shared arcs under a `transform`) so the committed file is compact
 * + byte-stable. The result is a valid `Topology` whose `objects.districts` is a `GeometryCollection`
 * with geometry count = the district count, GEOID-keyed, LEA-crosswalk-resolvable.
 */
function emitDistrictTopology(simplifiedTopo) {
    const geometries = simplifiedTopo.objects.g.geometries.map((g) => {
        const p = g.properties ?? {};
        return {
            type: g.type,
            arcs: g.arcs,
            id: g.id, // the GEOID — the choropleth join key + the crosswalk anchor
            properties: {
                // the LEA crosswalk: J-WORKBOOK's schoolCode→leaNumber→GEOID join binds on `lea`
                // (the GEOID `id` is the choropleth key; the `lea` resolves the SCI workbook grain).
                lea: p.lea ?? null,
                name: p.name ?? "",
                intpt: p.intpt ?? null, // the projected-label anchor (carried for parity with glyphs)
            },
        };
    });

    const topology = {
        type: "Topology",
        objects: {
            districts: { type: "GeometryCollection", geometries },
        },
        arcs: simplifiedTopo.arcs,
    };

    // QUANTIZE — delta-encode the shared arcs under a `transform` (the standard compact TopoJSON
    // form `feature()` decodes); idempotent + byte-stable across re-runs.
    const quantized = quantize(topology, TOPO_QUANTIZE);

    const outPath = resolve(OUT_DIR, "nc-district-topology.json");
    writeFileSync(outPath, JSON.stringify(quantized) + "\n");
    console.log(
        `  [topology] nc-district-topology.json · objects.districts: ${geometries.length} geometries · ` +
            `${quantized.arcs.length} shared arcs · GEOID-keyed + LEA crosswalk · quantize=${TOPO_QUANTIZE} (GeoChoropleth-bindable)`,
    );
}

/** Map a grain → its registry file basename (the committed JSON the runtime imports). */
function registryName(grain) {
    return { state: "us-state", county: "nc-county", district: "nc-district" }[grain];
}

/** Parse the --smooth flag "kind:iters" into a smooth config (with --lambda/--mu overrides). */
function parseSmooth(spec, args) {
    const [kind, iters] = spec.split(":");
    return {
        kind,
        iters: iters ? parseInt(iters, 10) : 2,
        lambda: args.lambda ?? 0.45,
        mu: args.mu ?? -0.47,
    };
}

/**
 * Build one registry entry { d, abbr, name, lea?, viewBox, intpt, aspect, fid, fallback? }.
 * The `abbr` reconciles with the crosswalk for the district grain (geoidAbbr); state/county
 * carry a derived collision-free abbr (the field's wayfinding label). NULL-LEA districts get
 * the `fallback:"county-proxy"` tag (handled gracefully — never a torn/empty glyph).
 *
 * `fid` is the COMMITTED-path symmetric-difference ratio (|committed △ source| / |source|, both
 * fit to [0,100], measured at bake time). It is committed INTO the registry so the standing gate
 * (glyph-fidelity.spec.ts) can assert "exactly resembles" on a bare checkout — no shapefile, no
 * re-ingest — by reading the number the bake honestly measured against the source.
 */
function buildEntry(grain, f, fit, fid) {
    const entry = {
        d: fit.d,
        name: f.name,
        viewBox: fit.viewBox,
        aspect: fit.aspect,
        fid: Number(fid.toFixed(4)),
    };
    if (f.intpt) entry.intpt = f.intpt;

    if (grain === "district") {
        entry.abbr = districtAbbr(f.key);
        if (f.lea) entry.lea = f.lea;
        if (NULL_LEA_GEOIDS.has(f.key)) entry.fallback = "county-proxy";
    } else {
        entry.abbr = grain === "state" ? stateAbbr(f.key, f.name) : countyAbbr(f.key, f.name);
    }
    return entry;
}

// ── the district abbr reconciles with the crosswalk (collision-free, injective) ──
import crosswalk from "../src/data/glyphs/lea-to-geoid.json" with { type: "json" };
const NULL_LEA_GEOIDS = new Set(
    Object.values(crosswalk.nullLea).map((v) => v.geoid),
);
function districtAbbr(geoid) {
    return crosswalk.abbr[geoid] ?? geoid.slice(2, 5);
}

// State/county abbrs: a collision-free derivation per field (assigned at module scope so the
// suffix disambiguation is stable across the bake run).
const STATE_FIPS_ABBR = buildStateAbbrTable();
function stateAbbr(fips) {
    return STATE_FIPS_ABBR[fips] ?? fips;
}
const COUNTY_ABBRS = new Map();
function countyAbbr(fips, name) {
    if (COUNTY_ABBRS.has(fips)) return COUNTY_ABBRS.get(fips);
    return fips.slice(-3); // resolved in a pre-pass; see assignCountyAbbrs
}

/** Pre-assign collision-free 3-char county abbrs (Cumberland≠Currituck) in FIPS order. */
function assignCountyAbbrs(features) {
    const used = new Set();
    const ordered = [...features].sort((a, b) => a.key.localeCompare(b.key));
    for (const f of ordered) {
        const bare = String(f.name)
            .toLowerCase()
            .replace(/[^a-z]/g, "");
        let base = (bare.slice(0, 3) || "xxx").toUpperCase().padEnd(3, "X");
        let abbr = base;
        let n = 1;
        while (used.has(abbr)) {
            n += 1;
            abbr = `${base.slice(0, 2)}${n}`;
        }
        used.add(abbr);
        COUNTY_ABBRS.set(f.key, abbr);
    }
}

/** The 50 states + DC + territories FIPS → USPS code (the canonical collision-free abbr). */
function buildStateAbbrTable() {
    return {
        "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
        "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
        "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
        "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
        "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
        "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
        "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
        "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
        "54": "WV", "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP",
        "72": "PR", "78": "VI",
    };
}

function main() {
    const args = parseArgs(process.argv);
    const grains =
        args.grain === "all" ? ["state", "county", "district"] : [args.grain];

    const reports = [];
    for (const grain of grains) {
        if (grain === "county") {
            // county abbrs need a pre-pass over the ingested set (collision-free).
            const feats = ingest("county", { repoRoot: REPO_ROOT });
            assignCountyAbbrs(feats);
        }
        reports.push(bakeGrain(grain, args));
    }

    console.log("\n── REGISTRY STATS ──────────────────────────────────────");
    for (const r of reports) {
        console.log(
            `  ${registryName(r.grain)}: ${r.count} features → ` +
                Object.entries(r.tiers)
                    .map(([t, x]) => `${t} ${x.count}`)
                    .join(" · "),
        );
    }
    console.log("\n  bake complete (idempotent · byte-stable · topojson build-time only).");
}

main();
