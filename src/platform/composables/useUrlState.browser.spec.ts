// useUrlState in a real engine: U-F60 clause 3 (U RULINGS §K K-3). Reading the link never writes
// it. A query with characters URLSearchParams would re-encode (`:` and `,`) stays byte-identical
// through the bag's creation; a reader's write is one replaceState; Back and Forward re-read the bag
// without writing.
import { afterEach, describe, expect, it } from "vitest";
import { effectScope, nextTick } from "vue";
import { useUrlState } from "./useUrlState";

const startSearch = location.search;
const withQuery = (q: string) =>
    history.replaceState(history.state, "", `${location.pathname}${startSearch}&${q}`);

let stop: (() => void) | null = null;
afterEach(() => {
    stop?.();
    stop = null;
    history.replaceState(history.state, "", `${location.pathname}${startSearch}`);
});

function bind() {
    const scope = effectScope();
    const url = scope.run(() => useUrlState<string>())!;
    stop = () => scope.stop();
    return url;
}

describe("useUrlState reads the link without writing it (K-3)", () => {
    it("creating the bag over a query leaves location.href byte-identical", async () => {
        withQuery("sel=state:06&years=2020,2021&at=map.floor-2018");
        const before = location.href;
        const url = bind();
        await nextTick();
        await new Promise((r) => setTimeout(r, 50));
        expect(url.get("sel")).toBe("state:06");
        expect(url.getList("years")).toEqual(["2020", "2021"]);
        expect(location.href).toBe(before);
    });

    it("a write is one replaceState that carries the other keys", async () => {
        withQuery("sel=state:06");
        const url = bind();
        const length = history.length;
        url.set("grain", "county");
        expect(new URLSearchParams(location.search).get("grain")).toBe("county");
        expect(new URLSearchParams(location.search).get("sel")).toBe("state:06");
        expect(history.length).toBe(length);
        url.set("grain", undefined);
        expect(new URLSearchParams(location.search).has("grain")).toBe(false);
    });

    it("a popstate re-reads the bag and writes nothing", async () => {
        const url = bind();
        withQuery("year=2019&sel=county:37001");
        const before = location.href;
        window.dispatchEvent(new PopStateEvent("popstate"));
        await nextTick();
        expect(url.get("year")).toBe("2019");
        expect(location.href).toBe(before);
    });

    it("sync re-reads a pushState navigation (a router move) and writes nothing", async () => {
        const url = bind();
        url.set("grain", "county");
        history.pushState(history.state, "", `${location.pathname}${startSearch}&lea=0003`);
        const before = location.href;
        const length = history.length;
        url.sync();
        await nextTick();
        expect(url.get("lea")).toBe("0003");
        expect(url.get("grain")).toBeUndefined();
        expect(location.href).toBe(before);
        expect(history.length).toBe(length);
    });
});
