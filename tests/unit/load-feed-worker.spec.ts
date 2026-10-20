import { afterEach, describe, expect, it, vi } from "vitest";

import type { Feed } from "../../src/data/contract";
import type { FeedParseReply, FeedParseRequest } from "../../src/data/feedParse.worker";

const feed = {
    meta: {
        schemaVersion: 2,
        dataset: "sci",
        keyField: "leaNumber",
        entityGrain: "district",
        years: [2023],
        latestYear: 2023,
        generatedAt: "2026-07-15T00:00:00Z",
        measures: [],
        aggregable: {},
    },
    rows: [{ leaNumber: "001", year: 2023 }],
} satisfies Feed;

type WorkerFailure = "postMessage" | "error" | "messageerror";

function fetchBodies(bodies: Record<string, string>) {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        return new Response(bodies[url] ?? "", { status: url in bodies ? 200 : 404 });
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
}

function failingWorker(failure: WorkerFailure) {
    class FailingWorker {
        static instances: FailingWorker[] = [];

        onmessage: ((event: MessageEvent<FeedParseReply>) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        onmessageerror: ((event: MessageEvent) => void) | null = null;
        terminated = false;

        constructor() {
            FailingWorker.instances.push(this);
        }

        postMessage(): void {
            if (failure === "postMessage") throw new Error("post failed");
            queueMicrotask(() => {
                if (failure === "error") {
                    this.onerror?.({ message: "worker failed" } as ErrorEvent);
                } else {
                    this.onmessageerror?.({} as MessageEvent);
                }
            });
        }

        terminate(): void {
            this.terminated = true;
        }
    }

    vi.stubGlobal("Worker", FailingWorker);
    return FailingWorker;
}

async function loader() {
    vi.resetModules();
    return await import("../../src/data/loadFeed");
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
});

describe("loadFeed worker resilience", () => {
    it("parses the fetched body when worker construction fails", async () => {
        const fetch = fetchBodies({ "/data/sci.snapshot.json": JSON.stringify(feed) });
        vi.stubGlobal("Worker", class {
            constructor() {
                throw new Error("chunk unavailable");
            }
        });

        const { loadFeed } = await loader();
        await expect(loadFeed("sci")).resolves.toEqual(feed);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it.each(["postMessage", "error", "messageerror"] as const)(
        "retires a worker after a %s infrastructure failure and parses its fetched body",
        async (failure) => {
            const fetch = fetchBodies({ "/data/sci.snapshot.json": JSON.stringify(feed) });
            const Worker = failingWorker(failure);

            const { loadFeed } = await loader();
            await expect(loadFeed("sci")).resolves.toEqual(feed);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(Worker.instances).toHaveLength(1);
            expect(Worker.instances[0]?.terminated).toBe(true);
        },
    );

    it("drains concurrent requests after the singleton fails", async () => {
        const schoolFeed = {
            ...feed,
            meta: { ...feed.meta, dataset: "sci-schools" },
        } satisfies Feed;
        const fetch = fetchBodies({
            "/data/sci.snapshot.json": JSON.stringify(feed),
            "/data/sci-schools.snapshot.json": JSON.stringify(schoolFeed),
        });
        let posted = 0;
        class ConcurrentWorker {
            onmessage = null;
            onerror = null;
            onmessageerror: ((event: MessageEvent) => void) | null = null;
            terminated = false;

            postMessage(): void {
                posted++;
                if (posted === 2) queueMicrotask(() => this.onmessageerror?.({} as MessageEvent));
            }

            terminate(): void {
                this.terminated = true;
            }
        }
        vi.stubGlobal("Worker", ConcurrentWorker);

        const { loadFeed } = await loader();
        await expect(Promise.all([loadFeed("sci"), loadFeed("sci-schools")])).resolves.toEqual([
            feed,
            schoolFeed,
        ]);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("rejects a malformed snapshot loudly, with one request and no second transport", async () => {
        const fetch = fetchBodies({ "/data/sci.snapshot.json": "{}" });
        class RejectingWorker {
            onmessage: ((event: MessageEvent<FeedParseReply>) => void) | null = null;
            onerror = null;
            onmessageerror = null;

            postMessage({ id }: FeedParseRequest): void {
                const data: FeedParseReply = { id, ok: false, error: "not a Feed envelope" };
                queueMicrotask(() => this.onmessage?.({ data } as MessageEvent<FeedParseReply>));
            }

            terminate(): void {}
        }
        vi.stubGlobal("Worker", RejectingWorker);

        const { loadFeed } = await loader();
        await expect(loadFeed("sci")).rejects.toThrow("not a Feed envelope");
        expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/data/sci.snapshot.json"]);
    });

    it("uses the shared body parser for a light feed read from its stamped snapshot", async () => {
        const fetch = fetchBodies({ "/data/usf.snapshot.json": JSON.stringify(feed) });

        const { loadFeed } = await loader();
        await expect(loadFeed("usf")).resolves.toEqual(feed);
        expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/data/usf.snapshot.json"]);
    });

    it("returns the same feed through worker and synchronous parsing", async () => {
        fetchBodies({ "/data/sci.snapshot.json": JSON.stringify(feed) });
        class ParsingWorker {
            onmessage: ((event: MessageEvent<FeedParseReply>) => void) | null = null;
            onerror = null;
            onmessageerror = null;

            postMessage(request: FeedParseRequest): void {
                const data: FeedParseReply = {
                    id: request.id,
                    ok: true,
                    envelope: JSON.parse(request.text) as Feed,
                };
                queueMicrotask(() => this.onmessage?.({ data } as MessageEvent<FeedParseReply>));
            }

            terminate(): void {}
        }
        vi.stubGlobal("Worker", ParsingWorker);
        const workerResult = await (await loader()).loadFeed("sci");

        vi.stubGlobal("Worker", undefined);
        const synchronousResult = await (await loader()).loadFeed("sci");
        expect(workerResult).toEqual(synchronousResult);
    });
});

// U §L H9 (a): the build's stamped snapshot is the only source. The deleted live arm read
// `/api/<slug>` first and fell back silently; every case below failed against it.
describe("loadFeed reads only the stamped snapshot (H9 (a))", () => {
    it.each(["sci", "usf"])("never requests the live /api/%s arm, even when it would answer", async (slug) => {
        const fetch = fetchBodies({
            [`/api/${slug}`]: JSON.stringify(feed),
            [`/data/${slug}.snapshot.json`]: JSON.stringify(feed),
        });
        vi.stubGlobal("Worker", undefined);

        const { loadFeed } = await loader();
        await expect(loadFeed(slug)).resolves.toEqual(feed);
        expect(fetch.mock.calls.map(([url]) => url)).toEqual([`/data/${slug}.snapshot.json`]);
    });

    it.each(["sci", "usf"])("refuses loudly when the %s snapshot fetch fails, with no fallback", async (slug) => {
        // Only the live arm answers: the old loader would have served it (or fallen back);
        // the stamped loader rejects with the snapshot's own failure.
        const fetch = fetchBodies({ [`/api/${slug}`]: JSON.stringify(feed) });
        vi.stubGlobal("Worker", undefined);

        const { loadFeed } = await loader();
        await expect(loadFeed(slug)).rejects.toThrow(`/data/${slug}.snapshot.json → HTTP 404`);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("refuses loudly when the network itself fails", async () => {
        const fetch = vi.fn(async () => {
            throw new TypeError("Failed to fetch");
        });
        vi.stubGlobal("fetch", fetch);
        vi.stubGlobal("Worker", undefined);

        const { loadFeed } = await loader();
        await expect(loadFeed("usf")).rejects.toThrow("Failed to fetch");
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it.each(["/api/sci", "https://example.org/api/sci", "../sci", "sci/../api", "SCI", ""])(
        "refuses a live URL or path %j before any fetch",
        async (slug) => {
            const fetch = fetchBodies({ "/api/sci": JSON.stringify(feed) });

            const { loadFeed } = await loader();
            await expect(loadFeed(slug)).rejects.toThrow("is not a dataset slug");
            expect(fetch).not.toHaveBeenCalled();
        },
    );

    it("exports no live-route builder", async () => {
        const mod: Record<string, unknown> = await loader();
        expect(mod.apiUrl).toBeUndefined();
    });
});
