<script setup lang="ts">
import type { AppendixSource } from "./appendix.js";

defineProps<{
    source: AppendixSource;
}>();
</script>

<template>
    <a
        class="source-link"
        :href="source.href"
        target="_blank"
        rel="noopener noreferrer"
        :data-source-id="source.id"
    >
        {{ source.label }} <span aria-hidden="true">↗</span>
    </a>
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
</style>
