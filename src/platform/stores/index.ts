// stores/index.ts — @mkbabb/atlas · THE PINIA-STORES FAMILY BARREL (src-rearchitecture §A.6; O-B9).
//
// The platform stores move as-is into the library (`useHoverReadout` + `useSelection` stay GLOBAL —
// the drill-down/provenance substrate, NOT pushed into `filter/`, §A.6). A curated re-export barrel.
//
// ── O-B9 PARTIAL (curated to the COPY-stays-green closure) ─────────────────────────────────────
// The stores sit inside the O-B4 SCC: the bulk value-imports the charts `HoverCard.vue` (`Fact`
// type) and the top-level `contract/` (`useDashboardRegistry`), BOTH of which are O-B4R (the charts
// closure pass, sequenced AFTER this wave). Under the COPY-into-library model (the library MUST stay
// typecheck-green — NO dangling imports), this wave lands the ACYCLIC stores and DEFERS the cyclic
// remainder to O-B4R, where they co-land with the charts components they cycle through:
//   · `useActiveDashboard` → `@atlas/core/contract` `useDashboardRegistry` (top-level `contract/`,
//     a genesis stub) ==> O-B4R.
//   · `useViewParams`      → `useActiveDashboard` (→ contract) + `data/useYearScope` (landed here) ==> O-B4R.
//   · `useHoverReadout`    → charts `HoverCard.vue` (`Fact` type; the 2-cycle HoverCard↔readout)   ==> O-B4R.
//   · `useSelectionStat`   → charts `HoverCard.vue` + `useHoverReadout`                             ==> O-B4R.
// Landing `useSelection` + `useActiveBeat` here is the SCC keystone: it lets O-B4R's charts
// components (which value-import them) resolve, so the closure pass can land the readout/frame giants.
//
// The monorepo import flip to this home is O-B11.

// — the selection substrate: the global hover/pin state + the mark-colour resolver (§A.6) —
export * from "./useSelection";

// — the active-beat resolver (the scroll-driven beat cursor every viz reads) —
export * from "./useActiveBeat";
