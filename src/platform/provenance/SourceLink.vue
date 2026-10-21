<script setup lang="ts">
// SourceLink.vue — ONE registry record, rendered at its own tier (W-21). A REFERENCE record links
// out to the document it cites. An EXACT record names a snapshot we serve, so its link is our own
// data viewer (`/data/<id>`, U/B7 O-19): "Data file (view)" opens the rows with every column's
// source. An external link for an exact record is the mis-citation the two tiers exist to prevent.
import { RouterLink } from "vue-router";
import { isExact, type DataSource } from "./source-registry.js";

const { source, basePath = "/data" } = defineProps<{
    source: DataSource;
    /** Where the host mounts the data viewer route. */
    basePath?: string;
}>();
</script>

<template>
    <a
        v-if="!isExact(source)"
        class="source-link"
        :href="source.href"
        target="_blank"
        rel="noopener noreferrer"
        :data-source-id="source.id"
    >
        {{ source.label }} <span aria-hidden="true">↗</span>
    </a>
    <span v-else class="source-link--served" :data-source-id="source.id">
        {{ source.label }}
        <RouterLink :to="`${basePath}/${source.id}`" class="source-link source-link__view">Data file (view)</RouterLink>
    </span>
</template>

<style scoped>
.source-link {
    color: light-dark(
        color-mix(in oklab, var(--route-accent), var(--foreground) 50%),
        color-mix(in oklab, var(--route-accent), var(--foreground) 22%)
    );
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: color-mix(in oklab, currentColor, transparent 55%);
}

.source-link:hover {
    text-decoration-color: currentColor;
}

/* The served record keeps its ink; its link to the viewer follows the name. */
.source-link--served {
    color: color-mix(in oklab, var(--foreground), transparent 8%);
}

.source-link__view {
    margin-inline-start: 0.35rem;
}
</style>
