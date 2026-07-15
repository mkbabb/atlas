<script setup lang="ts">
// The canonical persistent-stage adapter. StickyScene remains the sole runtime authority: it owns
// the one observer/deck and mounts the graphic once while ordered discrete states move both ways.
import StickyScene from "./StickyScene.vue";
import type {
    ChapterScene,
    ChapterStage as ChapterStageContract,
} from "@/charts/contract/scene-contract";

const props = defineProps<{
    stage: ChapterStageContract;
    index?: number;
}>();

// Stage declarations are static for a mounted story. Preserve the authored option objects and only
// translate the canonical vocabulary (`scenes`) to StickyScene's legacy vocabulary (`steps`).
const scene: ChapterScene = {
    kind: "scene",
    graphic: props.stage.graphic,
    steps: props.stage.scenes,
    focal: props.stage.focal,
    anchor: props.stage.anchor,
    apply: props.stage.apply,
};
</script>

<template>
    <StickyScene :scene="scene" :index="index" />
</template>
