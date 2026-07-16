/** The emitter's grain. Event payloads remain one union; scope records where they were minted. */
export type EventScope =
    | { readonly grain: "document" }
    | { readonly grain: "stage"; readonly stageId: string }
    | { readonly grain: "viz"; readonly vizId: string };

/** Atlas's discrete event contract. Continuous scroll position deliberately stays outside this union. */
export type AtlasEvent =
    | {
          readonly type: "active-viz";
          readonly scope: EventScope;
          readonly vizId: string;
          readonly beat: { readonly id: string; readonly label: string };
      }
    | {
          readonly type: "scene-change";
          readonly scope: EventScope;
          readonly from: string;
          readonly to: string;
          readonly dir: "forward" | "back";
          readonly sceneIndex: number;
          readonly sceneCount: number;
      }
    | {
          readonly type: "stage-active";
          readonly scope: EventScope;
          readonly active: boolean;
      }
    | {
          readonly type: "selected-viz";
          readonly scope: EventScope;
          readonly vizId: string;
          readonly primaryKey: string | null;
          readonly selectedKeys: readonly string[];
      }
    | {
          readonly type: "granularity";
          readonly scope: EventScope;
          readonly vizId: string;
          readonly grain: string;
      }
    | {
          readonly type: "provenance";
          readonly scope: EventScope;
          readonly vizId: string;
          readonly fields: readonly string[];
          readonly filterExplain: string;
      }
    | {
          readonly type: "provenance-drawer";
          readonly scope: EventScope;
          readonly detent: "shut" | "peek" | "full";
      }
    | {
          readonly type: "filter-state";
          readonly scope: EventScope;
          readonly predicate: string;
          readonly active: boolean;
      };

export type AtlasEventType = AtlasEvent["type"];
export type AtlasEventOf<Type extends AtlasEventType> = Extract<
    AtlasEvent,
    { readonly type: Type }
>;

export interface AtlasEventSnapshot {
    readonly activeVizId: string;
    readonly selection: {
        readonly primaryKey: string | null;
        readonly selectedKeys: readonly string[];
    };
    readonly filter: { readonly predicate: string; readonly active: boolean };
}

export interface AtlasEventContract {
    on<Type extends AtlasEventType>(
        type: Type,
        callback: (event: AtlasEventOf<Type>) => void,
        options?: {
            readonly scope?: EventScope["grain"];
            readonly immediate?: boolean;
        },
    ): () => void;
    emit<Type extends AtlasEventType>(event: AtlasEventOf<Type>): void;
    snapshot(): AtlasEventSnapshot;
}

export { createAtlasEventHub } from "./hub.js";
