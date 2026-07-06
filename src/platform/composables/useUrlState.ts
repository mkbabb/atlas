// platform/composables/useUrlState.ts — the URL-as-document primitive (INV-5).
// Every deep-linkable param a dashboard owns lives in the query string, so a copied
// URL reconstructs the view on reload; nothing meaningful hides in component-local
// state. This is a thin, typed wrapper over @vueuse `useUrlSearchParams('history')`
// — the same door `useYearScope` already binds the year-scope through — exposing a
// single reactive bag of `string` params plus typed get/set helpers so a caller
// reads numbers and lists without re-implementing the parse each time.
//
// String is the wire form (the query string is text); the typed accessors are the
// only place a param is coerced, so the round-trip (`set` → URL → reload → `get`) is
// one codec, not scattered `Number(params.x)` reads.

import { useUrlSearchParams } from "@vueuse/core";

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
}

/**
 * Bind a typed set of param keys to the URL query. `'history'` mode keeps the
 * params in the path's `?…` (not the hash), so saved-view links and the browser's
 * back/forward both carry the full document state. The keys are advisory typing —
 * @vueuse stores whatever is written — so a dashboard declares its own param vocab
 * and the helpers narrow the reads.
 */
export function useUrlState<Keys extends string>(): UseUrlState<Keys> {
    // @vueuse returns a reactive object already proxying writes back to
    // `window.location`; we keep that instance as the live params bag.
    const params = useUrlSearchParams<Record<Keys, string | undefined>>(
        "history",
    ) as UrlState<Keys>;

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

    return { params, get, set, getNumber, setNumber, getList, setList };
}
