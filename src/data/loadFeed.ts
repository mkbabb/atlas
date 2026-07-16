// platform/data/loadFeed.ts — the ONE client loader every dashboard reads through
// (INV-3). It generalizes the USF-bound `src/data/usf.ts`: instead of the hardcoded
// `/api/usf` → `/data/usf.snapshot.json` pair, it takes a `slug` and derives both
// URLs from it, so USF, SCI, and ECF all load through the same door. The live CF
// Function is tried first with a 4s timeout; on any non-200, parse error, or
// timeout it falls back to the build-time snapshot — the resilience floor (G6 §6).
//
// The shape is validated with `isFeed` from the shared contract (do not redefine
// it here), and the key column is coerced per `meta.keyField`: a state-grain feed's
// key is a zero-padded FIPS string (us-atlas `f.id` is "06", and the Sheet
// round-trip drops the leading zero — the bug `usf.ts:10-13` fixes, generalized).
//
// THE WORKER PARSE (I-PERF-DATA.a · T-PERF-3a): the heavy slugs' parse is the
// uncounted TBT driver (fb-perf P-3) — `res.json()` on 3.1 MB ran the JSON.parse on
// the MAIN thread behind the 2399ms /sci mobile TBT. The fix, root-homed at this ONE
// loader (INV-3): the main thread does the (non-blocking) `fetch`, then hands the raw
// TEXT to a Web Worker that JSON.parses + validates OFF-thread and posts the parsed
// ENVELOPE back. `res.json()` (the blocking parse) leaves the main thread.
//
// THE DOUBLE-MATERIALIZE TRANSPOSE (J-DATA arm e · j2 P8 · j-data-worker-clone): the
// worker posts the COLUMNAR envelope back (the field-name-written-once form), NOT a
// re-inflated row graph — so the structured-clone moves the compact columnar bytes and
// the 3.1 MB SCI feeds are materialized as rows EXACTLY ONCE, here on the main side
// (`materializeValidated` decodes and normalizes the already-validated envelope without a
// second strict scan). The decode is the SAME `decodeColumnar` the contract owns;
// only WHERE it runs moved (worker → main), so the consumers receive the IDENTICAL Feed.
// Light slugs (usf/ecf/speedtest — small, row-shaped) stay synchronous: the worker
// round-trip is not worth its postMessage clone for a cheap parse.
import {
    isFeed,
    decodeColumnar,
    isColumnarFeed,
    type Feed,
    type FeedColumnar,
    type FeedRow,
} from "./contract";
import type { FeedParseReply, FeedParseRequest } from "./feedParse.worker";
import { prefersReducedData } from "./dataSaver";

const TIMEOUT_MS = 4000;

/**
 * The heavy slugs whose 3.1 MB parse MUST run off the main thread (fb-perf P-3).
 * `sci` (1.99 MB) + `sci-schools` (1.12 MB) are the only feeds large enough that the
 * worker round-trip pays for itself; light slugs parse synchronously.
 */
const HEAVY_SLUGS = new Set(["sci", "sci-schools"]);

/** The live CF Pages Function route for a dashboard slug (e.g. `/api/usf`). */
export function apiUrl(slug: string): string {
    return `/api/${slug}`;
}

/** The committed build-time snapshot for a slug (the fallback floor). */
export function snapshotUrl(slug: string): string {
    return `/data/${slug}.snapshot.json`;
}

/**
 * Normalize the key column per the feed's grain. State-grain feeds join geometry on
 * zero-padded 2-char FIPS, so the key field is coerced to a left-padded string; other
 * grains (district `leaNumber`, entity `ben`) carry their own padding rule and are
 * left untouched here until their dashboards land (G6 §6.1).
 *
 * Exported so the worker (`feedParse.worker.ts`) runs the IDENTICAL coercion off-thread
 * — the parity law: the worker-decoded Feed is byte-equal to the main-thread parse.
 */
export function normalize<Row extends FeedRow>(feed: Feed<Row>): Feed<Row> {
    const { keyField, entityGrain } = feed.meta;
    if (entityGrain !== "state") return feed;
    const rows = feed.rows.map((r) => ({
        ...r,
        [keyField]: String(r[keyField] ?? "").padStart(2, "0"),
    }));
    return { meta: feed.meta, rows };
}

// ── The worker singleton + the in-flight request registry ───────────────────────────
// ONE module-scoped worker handles every heavy parse (the parses are quick and serial
// per route — a single worker avoids spinning a thread per fetch). Each request carries
// a monotonic id so a reply routes to its awaiting promise. The worker is created LAZILY
// on the first heavy parse so light-only routes (gallery, usf, ecf) never spin a thread.
let worker: Worker | null = null;
let nextId = 0;
// The registry resolves with the PARSED ENVELOPE the worker posts back (columnar for a heavy
// slug, a row Feed for a light one) — NOT a decoded row graph. `parseInWorker` runs the
// columnar→row decode + `normalize` main-side, so the heavy feeds materialize as rows once.
const pending = new Map<
    number,
    {
        resolve: (envelope: FeedColumnar | Feed) => void;
        reject: (err: Error) => void;
    }
>();

function getWorker(): Worker {
    if (worker) return worker;
    // Vite resolves `new Worker(new URL(…, import.meta.url), {type:"module"})` natively —
    // it bundles `feedParse.worker.ts` into its own module-worker chunk (ZERO new dep, no
    // `?worker` suffix, no comlink). The worker imports only contract.ts's pure type guards
    // (`isColumnarFeed`/`isFeed`) — no decode, no `normalize`; the row materialization lives
    // main-side now (the double-materialize transpose), so the worker chunk stays minimal.
    worker = new Worker(new URL("./feedParse.worker.ts", import.meta.url), {
        type: "module",
    });
    worker.onmessage = (e: MessageEvent<FeedParseReply>) => {
        const reply = e.data;
        const entry = pending.get(reply.id);
        if (!entry) return;
        pending.delete(reply.id);
        if (reply.ok) entry.resolve(reply.envelope);
        else entry.reject(new Error(reply.error));
    };
    worker.onerror = (e) => {
        // A worker-level failure rejects EVERY in-flight parse so the caller can fall
        // through to the snapshot floor (or surface the error) — never a silent hang.
        const err = new Error(`feedParse.worker failed: ${e.message}`);
        worker?.terminate();
        worker = null;
        for (const [, entry] of pending) entry.reject(err);
        pending.clear();
    };
    return worker;
}

/**
 * Post one raw body to the worker, await its parsed ENVELOPE, then decode+normalize it to
 * rows MAIN-SIDE — exactly once. The worker did the blocking JSON.parse + validate and posted
 * the COLUMNAR envelope back (the field-name-written-once form); `materializeValidated` runs the
 * columnar→row decode + key normalization without repeating the worker's strict validation.
 * This is the double-materialize transpose: the 3.1 MB feed is materialized as rows ONCE (no
 * worker-side decode + clone double-allocation).
 */
function parseInWorker<Row extends FeedRow>(
    text: string,
    url: string,
): Promise<Feed<Row>> {
    const w = getWorker();
    const id = nextId++;
    return new Promise<FeedColumnar | Feed>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        const req: FeedParseRequest = { id, url, text };
        w.postMessage(req);
    }).then((envelope) => materializeValidated<Row>(envelope));
}

/**
 * Parse a heavy slug OFF the main thread: the main thread does the (non-blocking)
 * `fetch` + `res.text()`, the worker does the (blocking) JSON.parse + validate and posts
 * the validated COLUMNAR envelope back; `parseInWorker` materializes it main-side once.
 * If the worker is unavailable (an environment with no Worker, e.g. a jsdom test), fall
 * back to a synchronous main-thread parse so the loader never hard-fails on platform gaps.
 */
async function fetchHeavy<Row extends FeedRow>(
    url: string,
    signal?: AbortSignal,
): Promise<Feed<Row>> {
    const res = await fetch(url, { signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    // The no-Worker fallback (jsdom tests / a platform with no Worker) parses on the main
    // thread; the live browser path NEVER does — the worker owns the heavy JSON.parse.
    if (typeof Worker === "undefined") {
        const json: unknown = await res.json();
        return decodeAndNormalize<Row>(json, url);
    }
    const text = await res.text();
    return parseInWorker<Row>(text, url);
}

/** Materialize an envelope already validated by `feedParse.worker`. The boundary is trusted:
    decoding and state-key normalization run once without repeating the strict O(n) guards. */
function materializeValidated<Row extends FeedRow>(
    envelope: FeedColumnar | Feed,
): Feed<Row> {
    const feed = "columnar" in envelope ? decodeColumnar(envelope) : envelope;
    return normalize(feed as Feed<Row>);
}

/**
 * Validate and materialize raw main-thread JSON: columnar-decode-if-columnar → strict row
 * validation → normalize. Shared by light feeds and the no-Worker heavy fallback.
 */
function decodeAndNormalize<Row extends FeedRow>(
    json: unknown,
    url: string,
): Feed<Row> {
    const rowFeed: unknown = isColumnarFeed(json) ? decodeColumnar(json) : json;
    if (!isFeed(rowFeed)) throw new Error(`${url} → not a Feed envelope`);
    return normalize(rowFeed as Feed<Row>);
}

async function fetchFeed<Row extends FeedRow>(
    slug: string,
    url: string,
    signal?: AbortSignal,
): Promise<Feed<Row>> {
    // Heavy slugs route the parse through the worker; light slugs (cheap parse) stay
    // synchronous on the main thread via the existing `res.json()` door — the worker
    // round-trip is not worth its postMessage clone for a small body.
    if (HEAVY_SLUGS.has(slug)) return fetchHeavy<Row>(url, signal);
    const res = await fetch(url, { signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const json: unknown = await res.json();
    return decodeAndNormalize<Row>(json, url);
}

/**
 * Load a dashboard's feed by slug. The live Function first, the snapshot as the
 * fallback floor; always resolves with a key-normalized `Feed`, or rejects only if
 * both transports fail. Generic over the dashboard's concrete row type.
 */
export async function loadFeed<Row extends FeedRow = FeedRow>(
    slug: string,
): Promise<Feed<Row>> {
    // THE DATA-SAVER SEAM (N.WF2 · B7): under `Save-Data` / `prefers-reduced-data`, skip the
    // speculative live round-trip (+ its 4s timeout) and load the committed snapshot directly —
    // the leaner transport (a static, long-cache, WF1-minified asset) the user's frugality signal
    // asks for. The snapshot is ALWAYS a valid Feed (it is the resilience floor), so this trades
    // live-freshness for bytes without degrading correctness; a snapshot-fetch failure still
    // surfaces as a reject exactly as the live path's would.
    if (prefersReducedData()) {
        return await fetchFeed<Row>(slug, snapshotUrl(slug));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetchFeed<Row>(slug, apiUrl(slug), controller.signal);
    } catch {
        // The live path is unavailable (timeout / non-200 / parse) — fall to the
        // committed snapshot so the dashboard renders regardless (G6 §6 floor).
        return await fetchFeed<Row>(slug, snapshotUrl(slug));
    } finally {
        clearTimeout(timer);
    }
}
