import type { ExportPayload } from "@/charts/lib/source-data";
import type { AtlasEventContract, EventScope } from "@/events";
import type { ExportGrain, RowsReader } from "@/filter/engine/rows";
import type { VirtualKey } from "@/filter/composables/useVirtualWindow";
import { getCurrentScope, onScopeDispose, readonly, ref, type Ref } from "vue";

export interface SourceDataColumn<Row> {
    readonly key: string;
    readonly label: string;
    readonly value: (row: Row) => unknown;
}

export interface SourceDataGrainOption<Scope = unknown> {
    readonly grain: ExportGrain<Scope>;
    readonly label?: string;
}

export type SourceDataAvailableGrain<Scope = unknown> =
    | ExportGrain<Scope>
    | SourceDataGrainOption<Scope>;

export type SourceDataExportFactory<Row, Scope = unknown> = (
    rows: readonly Row[],
    grain: ExportGrain<Scope>,
    vizId: string,
) => ExportPayload<Row, Scope>;

export type SourceDataRowsReader<Row, Scope = unknown> =
    | RowsReader<Row, Scope>
    | ((vizId: string) => RowsReader<Row, Scope>);

export interface SourceBrowserEventState {
    readonly activeVizId: Readonly<Ref<string>>;
    readonly selectedKeys: Readonly<Ref<readonly string[]>>;
    readonly grain: Readonly<Ref<string | null>>;
    readonly fields: Readonly<Ref<readonly string[]>>;
    readonly filter: Readonly<Ref<{ predicate: string; active: boolean }>>;
    stop(): void;
}

/** Keep one mounted virtual row in the tab order after pointer scrolling recycles the window. */
export function reconcileMountedFocus<Key extends VirtualKey>(
    focused: Key | null,
    mounted: readonly Key[],
): Key | null {
    if (mounted.length === 0 || (focused != null && mounted.includes(focused)))
        return focused;
    return mounted[0] ?? null;
}

/** The five P-budgeted event consumers. The browser projects their state; it mints no writer. */
export function useSourceBrowserEvents(
    hub: AtlasEventContract | undefined,
    initialVizId = "source-data",
): SourceBrowserEventState {
    const activeVizId = ref(initialVizId);
    const selectedKeys = ref<readonly string[]>([]);
    const grain = ref<string | null>(null);
    const fields = ref<readonly string[]>([]);
    const filter = ref({ predicate: "", active: false });
    const stops = hub
        ? [
              hub.on(
                  "active-viz",
                  (event) => {
                      if (event.vizId === activeVizId.value) return;
                      activeVizId.value = event.vizId;
                      selectedKeys.value = [];
                      grain.value = null;
                      fields.value = [];
                  },
                  { immediate: true },
              ),
              hub.on(
                  "selected-viz",
                  (event) => {
                      if (event.vizId === activeVizId.value)
                          selectedKeys.value = event.selectedKeys;
                  },
                  { immediate: true },
              ),
              hub.on(
                  "granularity",
                  (event) => {
                      if (event.vizId === activeVizId.value) grain.value = event.grain;
                  },
                  { immediate: true },
              ),
              hub.on(
                  "provenance",
                  (event) => {
                      if (event.vizId === activeVizId.value)
                          fields.value = event.fields;
                  },
                  { immediate: true },
              ),
              hub.on(
                  "filter-state",
                  (event) => {
                      filter.value = {
                          predicate: event.predicate,
                          active: event.active,
                      };
                  },
                  { immediate: true },
              ),
          ]
        : [];
    const stop = (): void => stops.splice(0).forEach((dispose) => dispose());
    if (getCurrentScope()) onScopeDispose(stop);
    return {
        activeVizId: readonly(activeVizId),
        selectedKeys: readonly(selectedKeys),
        grain: readonly(grain),
        fields: readonly(fields),
        filter: readonly(filter),
        stop,
    };
}

export interface SourceDataBrowserProps<
    Row,
    Scope = unknown,
    Key extends VirtualKey = VirtualKey,
> {
    readonly rowsReader: SourceDataRowsReader<Row, Scope>;
    readonly availableGrains: readonly SourceDataAvailableGrain<Scope>[];
    readonly columns: readonly SourceDataColumn<Row>[];
    readonly rowKey: (row: Row, index: number) => Key;
    /** Always built from the currently projected rows; a static second payload path is forbidden. */
    readonly exportPayload: SourceDataExportFactory<Row, Scope>;
    readonly eventHub?: AtlasEventContract;
    readonly vizId?: string;
    readonly eventScope?: EventScope;
    readonly ariaLabel?: string;
}
