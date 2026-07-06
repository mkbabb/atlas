// platform/filter/signals.ts — THE CALLABLE-SIGNAL ADAPTER OVER VUE REACTIVITY (N.WA1 · N.md §4.A1).
//
// The NP2 kernel stood on a bespoke ~90-line pull-based signal engine (proto-seeds/coordinator/
// signals.ts). The PORT is `signal→ref, computed→computed, effect→watchEffect` — mechanical, because
// Vue 3.5's reactive core IS a pull-based signal graph (the shipped `computed` is lazy + memoized +
// `Object.is`-short-circuiting; that is exactly the kernel's contract). So this file is NOT a second
// signal library (the one-engine gestalt, N.md §1 · the same law that keeps motion on keyframes.js):
// it is a THIN callable façade that preserves the kernel's `Signal<T>` call shape (`sig()` reads,
// `sig.set(v)` writes, `sig.peek()` reads-without-tracking) while the substrate is `vue`.
//
// WHY THE FAÇADE AND NOT `.value` EVERYWHERE: keeping the callable `Signal<T>` surface lets the ported
// `predicate.ts` / `selection.ts` / `coordinator.ts` — and their 30+ kernel tests — read BYTE-IDENTICAL
// (a `coord.filteredFor(id)()` call is still a call). The interop the port turns on is that a callable
// read done INSIDE a Vue `computed`/`watchEffect` registers the underlying `ref`/`computed` as a Vue
// dependency — so a coordinator signal read inside a route `computed` tracks with zero glue. That
// interop IS the port; there is no bespoke dirty-marking left to trust.

import { computed as vueComputed, shallowRef, watchEffect, type ComputedRef } from "vue";

/** The kernel's callable reactive value. `sig()` reads (tracking, inside a Vue reactive scope);
    `sig.set(v)` writes (short-circuits on `Object.is`-equal via Vue's ref setter); `sig.peek()` reads
    WITHOUT establishing a dependency (the imperative snapshot read the kernel's `update`/`set` use). */
export interface Signal<T> {
    (): T;
    set(v: T): void;
    peek(): T;
}

/** A writable source (≙ Vue `shallowRef`). Reading inside a `computed`/`watchEffect` tracks it; a
    write triggers only when the value actually changed (Vue's referential short-circuit). `shallowRef`
    (not `ref`) is deliberate: every kernel source is REPLACED immutably (`clauses.set([...])`,
    `bag.set({...})`), so the reactive edge is the whole-object swap — a deep `ref` would needlessly
    proxy the clause trees (Sets + accessor closures) with no gain. `peek()` returns a plain mirror of
    the latest value, so it never touches the ref and thus never tracks (faithful to the kernel). */
export function signal<T>(initial: T): Signal<T> {
    const r = shallowRef(initial);
    let latest = initial;
    const read = (() => r.value as T) as Signal<T>;
    read.set = (v: T): void => {
        latest = v;
        r.value = v;
    };
    read.peek = (): T => latest;
    return read;
}

/** A lazy, MEMOIZED derivation (≙ Vue `computed`). Recomputes only when a tracked dep changed AND it
    is next read — the pull semantics the perf verdict leans on (an idle `computed` costs nothing). */
export function computed<T>(fn: () => T): Signal<T> {
    const c: ComputedRef<T> = vueComputed(fn);
    const read = (() => c.value) as Signal<T>;
    read.set = (): void => {
        throw new Error("computed is read-only");
    };
    read.peek = (): T => c.value;
    return read;
}

/** An eager auto-tracked side effect (≙ Vue `watchEffect`). Runs once immediately, re-runs SYNCHRONOUSLY
    when a tracked dep changes (`flush:"sync"` preserves the kernel's write-then-read determinism — the
    coarse imperative param→clause edge relies on it). Returns a disposer. */
export function effect(fn: () => void): () => void {
    return watchEffect(fn, { flush: "sync" });
}
