<script setup lang="ts">
import { inject } from "vue";
import { STORY_CARD_KEY } from "../charts/frame/story-card-context.js";
import VizAggregateStats from "../charts/legend/VizAggregateStats.vue";

const storyCard = inject(STORY_CARD_KEY);
</script>

<template>
    <div
        v-if="storyCard?.aggregateStats.value.length"
        class="story-card__sector story-card__stats"
    >
        <VizAggregateStats :stats="storyCard.aggregateStats.value" placement="bottom" />
    </div>
</template>
