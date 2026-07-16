import { afterEach, describe, expect, it, vi } from "vitest";

const guardCalls = vi.hoisted(() => ({ row: 0, columnar: 0 }));
vi.mock("@/data/contract", async (importOriginal) => {
    const contract = await importOriginal<typeof import("@/data/contract")>();
    return {
        ...contract,
        isFeed(value: unknown) {
            guardCalls.row++;
            return contract.isFeed(value);
        },
        isColumnarFeed(value: unknown) {
            guardCalls.columnar++;
            return contract.isColumnarFeed(value);
        },
    };
});

import { loadFeed } from "@/data/loadFeed";
import type { Feed } from "@/data/contract";
import type { FeedParseReply, FeedParseRequest } from "@/data/feedParse.worker";

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

class FailingThenHealthyWorker {
    static instances: FailingThenHealthyWorker[] = [];

    onmessage: ((event: MessageEvent<FeedParseReply>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    readonly attempt = FailingThenHealthyWorker.instances.length;
    terminated = false;

    constructor() {
        FailingThenHealthyWorker.instances.push(this);
    }

    postMessage(request: FeedParseRequest): void {
        queueMicrotask(() => {
            if (this.attempt === 0) {
                this.onerror?.({ message: "worker chunk unavailable" } as ErrorEvent);
                return;
            }
            this.onmessage?.(
                new MessageEvent<FeedParseReply>("message", {
                    data: { id: request.id, ok: true, envelope: feed },
                }),
            );
        });
    }

    terminate(): void {
        this.terminated = true;
    }
}

afterEach(() => {
    vi.unstubAllGlobals();
    FailingThenHealthyWorker.instances.length = 0;
    guardCalls.row = 0;
    guardCalls.columnar = 0;
});

describe("loadFeed worker recovery", () => {
    it("recreates a failed worker before parsing the snapshot fallback", async () => {
        const fetch = vi.fn(async (_url: RequestInfo | URL) => new Response("{}"));
        vi.stubGlobal("fetch", fetch);
        vi.stubGlobal("Worker", FailingThenHealthyWorker);

        await expect(loadFeed("sci")).resolves.toEqual(feed);

        expect(FailingThenHealthyWorker.instances).toHaveLength(2);
        expect(FailingThenHealthyWorker.instances.map(({ terminated }) => terminated)).toEqual([
            true,
            false,
        ]);
        expect(fetch.mock.calls.map(([url]) => url)).toEqual([
            "/api/sci",
            "/data/sci.snapshot.json",
        ]);
        expect(guardCalls).toEqual({ row: 0, columnar: 0 });
    });
});
