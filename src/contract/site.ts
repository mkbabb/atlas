// contract/site.ts — THE TENANT SITE-CONFIG APP-LEVEL INJECT (L1-INVERSION · D1).
//
// The site config is the INSTANCE's tenant branding (org/short/tagline/apex/build). A
// publishable core cannot hard-import THIS instance's `@/site.config` — it would be one
// tenant's data baked into the framework. So the instance passes its config at bootstrap
// (`installAtlasSite(app, site)`) and core chrome reads it through `useAtlasSite()`. Core
// NEVER imports `@/site.config`.

import { inject, type App, type InjectionKey } from "vue";

/** The typed tenant contract — the site branding every instance supplies (the slides idiom). */
export interface AtlasSiteConfig {
    /** The owning organisation's full name. */
    org: string;
    /** The short brand handle (the crest/footer monogram). */
    short: string;
    /** The one-line site tagline. */
    tagline: string;
    /** The apex domain the site serves under. */
    apex: string;
    /** The shipped arc/build stamp (also a deploy-cache key — see site.config). */
    build: string;
}

/** The provide/inject token the chrome reads the instance tenant config through. */
export const ATLAS_SITE_KEY: InjectionKey<AtlasSiteConfig> = Symbol("atlas-site-config");

/** Install the instance tenant config at bootstrap (the instance's `main.ts` calls this). */
export function installAtlasSite(app: App, config: AtlasSiteConfig): void {
    app.provide(ATLAS_SITE_KEY, config);
}

/** Read the installed tenant config, or `undefined` when none is installed (Law 2's
    befitting-silent default — a primitive that may legitimately render outside the
    provider, e.g. a story/preview harness). Never throws. */
export function useOptionalAtlasSite(): AtlasSiteConfig | undefined {
    return inject(ATLAS_SITE_KEY);
}

/** Read the installed tenant config. THROWS when uninstalled (fail-explicit — no silent
    default masks a missing bootstrap). */
export function useAtlasSite(): AtlasSiteConfig {
    const site = useOptionalAtlasSite();
    if (!site) {
        throw new Error(
            "useAtlasSite(): no site config installed — call installAtlasSite(app, site) at bootstrap.",
        );
    }
    return site;
}
