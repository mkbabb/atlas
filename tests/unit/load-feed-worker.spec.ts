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
        const fetch = fetchBodies({ "/api/sci": JSON.stringify(feed) });
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
            const fetch = fetchBodies({ "/api/sci": JSON.stringify(feed) });
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
            "/api/sci": JSON.stringify(feed),
            "/api/sci-schools": JSON.stringify(schoolFeed),
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

    it("keeps a data failure request-local and falls from malformed live data to the snapshot", async () => {
        const fetch = fetchBodies({
            "/api/sci": "{}",
            "/data/sci.snapshot.json": JSON.stringify(feed),
        });
        class DataWorker {
            onmessage: ((event: MessageEvent<FeedParseReply>) => void) | null = null;
            onerror = null;
            onmessageerror = null;
            terminated = false;

            postMessage(request: FeedParseRequest): void {
                const data: FeedParseReply = request.url.startsWith("/api/")
                    ? { id: request.id, ok: false, error: "not a Feed envelope" }
                    : { id: request.id, ok: true, envelope: feed };
                queueMicrotask(() => this.onmessage?.({ data } as MessageEvent<FeedParseReply>));
            }

            terminate(): void {
                this.terminated = true;
            }
        }
        vi.stubGlobal("Worker", DataWorker);

        const { loadFeed } = await loader();
        await expect(loadFeed("sci")).resolves.toEqual(feed);
        expect(fetch.mock.calls.map(([url]) => url)).toEqual([
            "/api/sci",
            "/data/sci.snapshot.json",
        ]);
    });

    it("rejects when both the live body and snapshot are malformed", async () => {
        fetchBodies({ "/api/sci": "{}", "/data/sci.snapshot.json": "{}" });
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
    });

    it("uses the shared body parser for a light feed and its snapshot floor", async () => {
        const fetch = fetchBodies({
            "/api/usf": "{}",
            "/data/usf.snapshot.json": JSON.stringify(feed),
        });

        const { loadFeed } = await loader();
        await expect(loadFeed("usf")).resolves.toEqual(feed);
        expect(fetch.mock.calls.map(([url]) => url)).toEqual([
            "/api/usf",
            "/data/usf.snapshot.json",
        ]);
    });

    it("returns the same feed through worker and synchronous parsing", async () => {
        fetchBodies({ "/api/sci": JSON.stringify(feed) });
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
