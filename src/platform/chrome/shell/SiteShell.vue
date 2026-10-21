<script setup lang="ts">
// SiteShell — the site frame (U/B7 §2.2, §2.3; O-1, O-2). It owns the dock and wraps the router
// outlet, so the dock is mounted once and is the same node on every route: the homepage, each
// dashboard, a subject page, `/data/*` and a 404. The instance's `App.vue` renders `<SiteShell />`
// and nothing else.
//
// It resolves the active dashboard itself (the dock sits above the route view, where the route's own
// `provide` cannot reach): the route named `dashboardRoute` carries the slug in `params.slug`; the
// registry entry loads that dashboard's context lazily (`loadContext`, F10). Every other route gets
// the site layer only. The outlet is keyed by dashboard slug, so a dashboard change re-mounts the
// route view (its setup provides the new context to the body) while the dock stays.
//
// It is also the one binder of the active route's `--route-*` theme cascade (the dock and the route
// frame both read it) and the scope of the dock-portal registry (the dock's pin and the route's
// filter drawer share it).
import { computed, shallowRef, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import Dock from "../dock/Dock.vue";
import { AMERICA, themeCssVars, useDashboardRegistry, type DashboardContext } from "../../../contract/index.js";
import { atmosphereCssVars } from "../background/composables/atmosphere.js";
import { provideDockPortals } from "../dock/composables/useDockPortals.js";
import type { SiteSearchSource, SiteSubject } from "../dock/site.js";

const props = withDefaults(
    defineProps<{
        /** The name of the route whose `params.slug` names a dashboard. */
        dashboardRoute?: string;
        /** The name of the homepage route (the dock rests open there at ≥ 768 px). */
        homeRoute?: string;
        /** The subject index the dock's "By subject" row opens. */
        subjects?: readonly SiteSubject[];
        /** Search sources beyond the dashboards, loaded on the first open of Search. */
        searchSources?: readonly SiteSearchSource[];
    }>(),
    { dashboardRoute: "dashboard", homeRoute: "gallery", subjects: () => [], searchSources: () => [] },
);

const route = useRoute();
const { findDashboard } = useDashboardRegistry();
provideDockPortals();

const slug = computed<string | undefined>(() => {
    if (route.name !== props.dashboardRoute) return undefined;
    const raw = route.params.slug;
    const s = Array.isArray(raw) ? raw[0] : raw;
    return s ? String(s) : undefined;
});
const home = computed(() => route.name === props.homeRoute);

/** The active dashboard's context, once its module has loaded; undefined off a dashboard route. */
const context = shallowRef<DashboardContext | undefined>(undefined);
watch(
    slug,
    async (s) => {
        const entry = s ? findDashboard(s) : undefined;
        if (!entry) {
            context.value = undefined;
            return;
        }
        const loaded = await entry.loadContext();
        if (slug.value === s) context.value = loaded;
    },
    { immediate: true },
);

const themeStyle = computed<Record<string, string>>(() => {
    const ctx = context.value;
    if (!ctx) return {};
    const theme = ctx.theme ?? AMERICA;
    return { ...themeCssVars(theme), ...atmosphereCssVars(theme.atmosphere?.intensity) };
});

/** The outlet key: one per dashboard slug (not per `/:view` sub-segment), else the route name. */
const outletKey = computed(() => (slug.value ? `dashboard:${slug.value}` : String(route.name ?? route.path)));
</script>

<template>
    <div class="site-shell" :style="themeStyle" :data-site-dashboard="context?.id">
        <a
            href="#main-content"
            class="skip-link sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow-lg focus-visible:ring-2 focus-visible:ring-(--focus-ring-color)"
        >
            Skip to content
        </a>
        <!-- The banner landmark: the dock is the one persistent site chrome on every route. -->
        <header role="banner">
            <Dock :context="context" :home="home" :subjects="subjects" :search-sources="searchSources" />
        </header>
        <RouterView v-slot="{ Component }">
            <component :is="Component" :key="outletKey" />
        </RouterView>
    </div>
</template>

<style scoped>
.site-shell {
    min-block-size: 100dvh;
}
.skip-link:focus {
    z-index: var(--z-hovercard);
}
</style>

<!-- THE ROUTE HAND-OFF (site-transition.ts): the arriving page slides in from the inline end over
     240 ms on the dock spring while the leaving page fades; the dock is not part of the transition.
     Reduced motion never starts the transition (a cut). -->
<style>
::view-transition-old(root) {
    animation: site-leave 240ms var(--spring-dock, ease) both;
}
::view-transition-new(root) {
    animation: site-arrive 240ms var(--spring-dock, ease) both;
}
::view-transition-group(site-dock),
::view-transition-old(site-dock),
::view-transition-new(site-dock) {
    animation: none;
}
@keyframes site-leave {
    to {
        opacity: 0;
    }
}
@keyframes site-arrive {
    from {
        opacity: 0;
        translate: 1.5rem 0;
    }
}
</style>
