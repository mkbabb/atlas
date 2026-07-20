<script setup lang="ts">
// SourceLink.vue — ONE registry record, rendered at its own tier (W-21). A REFERENCE record links
// out to the document it cites. An EXACT record links NOWHERE from here: what it names is a
// snapshot we serve, and the way to read a served snapshot is the viz's own viewer — so the
// record states what it is and the figure's whisper is the door. Rendering an external link for
// an exact record is precisely the mis-citation the two tiers exist to make impossible.
import { isExact, type DataSource } from "./source-registry.js";

const { source } = defineProps<{
    source: DataSource;
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
    <span v-else class="source-link source-link--served" :data-source-id="source.id">
        {{ source.label }}
        <span class="source-link__tier">served here</span>
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

/* The served tier is not a link, so it wears none of a link's affordance — the reader must not
   aim at it. It keeps the record's ink and states its tier in the colophon register. */
.source-link--served {
    color: color-mix(in oklab, var(--foreground), transparent 8%);
    text-decoration: none;
}

.source-link__tier {
    margin-inline-start: 0.35rem;
    font-family: var(--font-mono, inherit);
    font-size: var(--type-micro);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: color-mix(in oklab, var(--foreground), transparent 42%);
}
</style>
