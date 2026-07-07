// @mkbabb/atlas · chrome/dock/composables — the dock's owned composables (src-rearchitecture §A.2/§A.7;
// O-B8a). The four dock-named hooks + the scroll-chrome edge hook disperse out of the flat
// platform/composables/ bag into the dock submodule that consumes them (the §A.7 de-godding — a
// `useDock*` reappearing in the global bag is a topology-gate failure). `useMobileRegister` stays
// global (§A.7). Moved AS-IS: the collapse machine behaviour is untouched (its DELETE is O-B8b).
export * from "./useDockCollapse";
export * from "./useDockStepper";
export * from "./useDockViewMode";
export * from "./useDockGear";
export * from "./useDockDataState";
export * from "./useScrollChrome";
