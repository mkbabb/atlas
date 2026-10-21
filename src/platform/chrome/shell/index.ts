// @mkbabb/atlas · chrome/shell — the platform shell barrel (src-rearchitecture §A.2; O-B8a).
// SiteShell is the app frame: it owns the dock and wraps the router outlet (U/B7 §2.2). PlatformShell
// is a dashboard route's frame inside it (the content stage, the filter slot, the Escape arbiter).
export { default as SiteShell } from "./SiteShell.vue";
export { default as PlatformShell } from "./PlatformShell.vue";
