// charts/frame/plate-view.ts — the figure's two views (U/B8 A4): the drawn figure, or its export rows
// as a table. The plate owns the state and its dock toggles it. A composed stage owns its graphic's
// dock, so it provides the view (`PLATE_VIEW_KEY`) and its graphic's plate reads it from there.
import type { InjectionKey, Ref } from "vue";

export type PlateView = "chart" | "table";

/** Provided by a host that owns a plate's dock (ChapterStage); the plate reads its view from it. */
export const PLATE_VIEW_KEY: InjectionKey<Ref<PlateView>> = Symbol("atlas:plate-view");
