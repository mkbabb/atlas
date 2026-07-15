import type {
    AtlasEvent,
    AtlasEventContract,
    AtlasEventOf,
    AtlasEventSnapshot,
    AtlasEventType,
    EventScope,
} from "./index";

type Listener = {
    readonly scope?: EventScope["grain"];
    readonly callback: (event: never) => void;
};

const EMPTY_SNAPSHOT: AtlasEventSnapshot = {
    activeVizId: "",
    selection: { primaryKey: null, selectedKeys: [] },
    filter: { predicate: "", active: false },
};

/** Create an isolated event hub. Callers own its lifetime; Atlas never installs a global bus. */
export function createAtlasEventHub(
    initial: AtlasEventSnapshot = EMPTY_SNAPSHOT,
): AtlasEventContract {
    const listeners = new Map<AtlasEventType, Set<Listener>>();
    const latest = new Map<AtlasEventType, AtlasEvent>();
    let state: AtlasEventSnapshot = copySnapshot(initial);

    function on<Type extends AtlasEventType>(
        type: Type,
        callback: (event: AtlasEventOf<Type>) => void,
        options?: {
            readonly scope?: EventScope["grain"];
            readonly immediate?: boolean;
        },
    ): () => void {
        const listener: Listener = {
            scope: options?.scope,
            callback: callback as (event: never) => void,
        };
        const bucket = listeners.get(type) ?? new Set<Listener>();
        bucket.add(listener);
        listeners.set(type, bucket);

        const current = latest.get(type) as AtlasEventOf<Type> | undefined;
        if (options?.immediate && current && matchesScope(listener, current))
            callback(current);

        return () => {
            bucket.delete(listener);
            if (bucket.size === 0) listeners.delete(type);
        };
    }

    function emit<Type extends AtlasEventType>(event: AtlasEventOf<Type>): void {
        latest.set(event.type, event);
        state = reduceSnapshot(state, event);
        const bucket = listeners.get(event.type);
        if (!bucket) return;
        for (const listener of [...bucket]) {
            if (matchesScope(listener, event)) listener.callback(event as never);
        }
    }

    return {
        on,
        emit,
        snapshot: () => copySnapshot(state),
    };
}

function matchesScope(listener: Listener, event: AtlasEvent): boolean {
    return listener.scope == null || listener.scope === event.scope.grain;
}

function reduceSnapshot(
    current: AtlasEventSnapshot,
    event: AtlasEvent,
): AtlasEventSnapshot {
    switch (event.type) {
        case "active-viz":
            return { ...current, activeVizId: event.vizId };
        case "selected-viz":
            return {
                ...current,
                selection: {
                    primaryKey: event.primaryKey,
                    selectedKeys: [...event.selectedKeys],
                },
            };
        case "filter-state":
            return {
                ...current,
                filter: { predicate: event.predicate, active: event.active },
            };
        default:
            return current;
    }
}

function copySnapshot(snapshot: AtlasEventSnapshot): AtlasEventSnapshot {
    return {
        activeVizId: snapshot.activeVizId,
        selection: {
            primaryKey: snapshot.selection.primaryKey,
            selectedKeys: [...snapshot.selection.selectedKeys],
        },
        filter: { ...snapshot.filter },
    };
}
