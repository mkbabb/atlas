// @mkbabb/atlas · chrome/masthead — the gallery masthead cluster (src-rearchitecture §A.2; O-B8a). The
// site header + its marks: GalleryMasthead (the gallery header band), BrandMark (the TIL logo lockup),
// FigureInitial (the audacious drop-figure) and SiteColophon (the footer colophon). Pure structural
// re-home — render-identity.
export { default as GalleryMasthead } from "./GalleryMasthead.vue";
export { default as BrandMark } from "./BrandMark.vue";
export { default as FigureInitial } from "./FigureInitial.vue";
export { default as SiteColophon } from "./SiteColophon.vue";

// v1.0.1 (O-B10 re-cut) — the `Colophon` contract (the footer credit block a route declares); the
// `default`-only re-export dropped the named `<script>` type. Re-exported by name from the owning SFC.
export type { Colophon, ColophonAuthor } from "./SiteColophon.vue";
