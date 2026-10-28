// platform/composables/useUrlState.ts — the URL-as-document primitive (INV-5).
// Every deep-linkable param a dashboard owns lives in the query string, so a copied
// URL reconstructs the view on reload; nothing meaningful hides in component-local
// state. This owns the ONE reactive bag of `string` params (the door `useYearScope`
// binds the year-scope through) plus typed get/set helpers, so a caller reads
// numbers and lists without re-implementing the parse each time.
//
// String is the wire form (the query string is text); the typed accessors are the
// only place a param is coerced, so the round-trip (`set` → URL → reload → `get`) is
// one codec, not scattered `Number(params.x)` reads.
//
// U-F60 clause 3 (U RULINGS §K K-3): nothing writes the URL on load. The bag is seeded from
// `location.search` BEFORE its write-back watch exists, so reading the link never writes it.
// (@vueuse `useUrlSearchParams` armed its deep watch first and then seeded the state, so every
// load with a query wrote it straight back, re-encoded: `?sel=state:06` became `state%3A06`.)
// Back and Forward re-read the bag and never write. So does a router navigation (`sync`): vue-router
// moves the address with `pushState`, which fires no event, so the view store re-reads the bag on
// every route change; without it an in-app link carrying a query (`/data/sci?lea=…`, a saved view)
// left the bag on the previous route's keys, and its next write put them back.

import { onScopeDispose, reactive, watch } from "vue";

/** A reactive param bag — every value is the URL's text form (or absent). */
export type UrlState<Keys extends string> = Record<Keys, string | undefined>;

/** The composable's surface: the live bag plus typed read/write helpers. */
export interface UseUrlState<Keys extends string> {
    /** The reactive params bag; reading/writing a key mutates the URL query. */
    params: UrlState<Keys>;
    /** Read a string param (the raw query value), or `fallback` when absent. */
    get: (key: Keys, fallback?: string) => string | undefined;
    /** Write a string param; `undefined`/`""` clears it from the URL. */
    set: (key: Keys, value: string | undefined) => void;
    /** Read a numeric param, or `fallback` when absent / non-finite. */
    getNumber: (key: Keys, fallback?: number) => number | undefined;
    /** Write a numeric param (serialized to its decimal string). */
    setNumber: (key: Keys, value: number | undefined) => void;
    /** Read a comma-separated list param as trimmed, non-empty tokens. */
    getList: (key: Keys) => string[];
    /** Write a list param as a comma-joined token string (empty clears it). */
    setList: (key: Keys, values: readonly string[]) => void;
    /** Re-read the bag from `location.search` without writing it: the host calls this after a
        router navigation, which moves the address by `pushState` and fires no event. */
    sync: () => void;
}

/**
 * Bind a typed set of param keys to the URL query. The params live in the path's
 * `?…` (not the hash), so saved-view links and the browser's back/forward both carry
 * the full document state. A write is a `replaceState`. The keys are advisory typing —
 * the bag stores whatever is written — so a dashboard declares its own param vocab
 * and the helpers narrow the reads.
 */
export function useUrlState<Keys extends string>(): UseUrlState<Keys> {
    const params = reactive({}) as UrlState<Keys>;
    if (typeof window === "undefined") return helpers(params, () => {});

    const bag = params as Record<string, string | undefined>;
    /** Mirror `location.search` into the bag (a key repeated in the query keeps its last value). */
    function read(): void {
        const next = new URLSearchParams(window.location.search);
        for (const key of Object.keys(bag)) if (!next.has(key)) delete bag[key];
        for (const [key, value] of next) bag[key] = value;
    }
    read(); // seeded before the watch below exists: the load is read, never written

    let reading = false;
    watch(
        params,
        () => {
            if (reading) return;
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries(bag))
                if (value != null && value !== "") query.set(key, value);
            const q = query.toString();
            const { pathname, hash } = window.location;
            const url = `${pathname}${q ? `?${q}` : ""}${hash}`;
            window.history.replaceState(window.history.state, "", url);
        },
        { deep: true, flush: "sync" },
    );

    /** Re-read the address into the bag; the write-back watch is muted, so a read never writes. */
    const sync = (): void => {
        reading = true;
        read();
        reading = false;
    };
    window.addEventListener("popstate", sync);
    onScopeDispose(() => window.removeEventListener("popstate", sync), true);

    return helpers(params, sync);
}

/** The typed read/write helpers over one bag. */
function helpers<Keys extends string>(params: UrlState<Keys>, sync: () => void): UseUrlState<Keys> {
    function get(key: Keys, fallback?: string): string | undefined {
        const v = params[key];
        return v == null || v === "" ? fallback : v;
    }

    function set(key: Keys, value: string | undefined): void {
        if (value == null || value === "") delete params[key];
        else params[key] = value;
    }

    function getNumber(key: Keys, fallback?: number): number | undefined {
        const v = params[key];
        if (v == null || v === "") return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }

    function setNumber(key: Keys, value: number | undefined): void {
        set(key, value == null || !Number.isFinite(value) ? undefined : String(value));
    }

    function getList(key: Keys): string[] {
        const v = params[key];
        if (v == null || v === "") return [];
        return v
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }

    function setList(key: Keys, values: readonly string[]): void {
        const cleaned = values.map((s) => s.trim()).filter((s) => s.length > 0);
        set(key, cleaned.length > 0 ? cleaned.join(",") : undefined);
    }

    return { params, get, set, getNumber, setNumber, getList, setList, sync };
}
