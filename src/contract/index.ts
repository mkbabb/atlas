// contract/index.ts — @atlas/core/contract, THE PLATFORM-OWNED CONTRACT BARREL (L1-INVERSION).
//
// The keystone: the contract the platform legitimately shares with every dashboard lives HERE,
// in the platform-owned core, so the platform stops importing DOWN into the dashboards it must
// not know about. The four lifted symbols (DASHBOARD_KEY · findDashboard [→ the registry
// inject] · DashboardContext · DockNavItem) + the full registry/figure-fusion contract ride
// this single curated subpath (the `./contract` export L5 publishes). `dashboards/{types,
// registry}.ts` stay as re-export SHIMS so the dashboard-side import paths resolve unchanged.

export * from "./types.js";
export * from "./theme.js";
export * from "./registry.js";
export * from "./registry-inject.js";
export * from "./site.js";

// U/B7 O-19 (PLAN §5.4): the per-measure source record every snapshot's `meta` carries. The types
// live with the provenance family; the contract subpath names them for the producers' readers.
export type {
    FeedCoverage,
    FeedDictionary,
    FeedDictionaryEntry,
    FeedInputFile,
    FeedVintage,
    FeedVintageStatus,
} from "../platform/provenance/feed-dictionary.js";
