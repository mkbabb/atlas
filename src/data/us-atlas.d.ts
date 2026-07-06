// data/us-atlas.d.ts — ambient typing for the bare-specifier us-atlas topology import.
//
// us-atlas ships JSON topology files; tsconfig `resolveJsonModule` covers the import, but the
// package bundles no types for the bare specifier, so the literal-inferred shape does not satisfy
// `Topology`. This ambient declaration types the states-albers topology `geometry.ts` projects from
// (colocated with its sole consumer — the leaf data-plane owns the typing of the geodata it reads).
declare module "us-atlas/states-albers-10m.json" {
    const topology: import("topojson-specification").Topology;
    export default topology;
}
