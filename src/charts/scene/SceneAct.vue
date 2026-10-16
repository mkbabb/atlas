<script setup lang="ts">
// charts/scene/SceneAct.vue — place a figure's act row in the enclosing focal scene's act seat, or in
// place when there is none (A-39 · D3-C N-C17). In a focal scene the narrated step chips overlay the
// pinned graphic, so an act row left inside the graphic sits under the chips (P2 measured the /sci
// map's act hit-testing to a step footer at 390 px). The seat is the scene's own chrome layer, inside
// the same figure's scene: nothing crosses to page chrome. `defer`: the seat renders after the graphic.
import { inject } from "vue";
import { SCENE_ACT_SEAT } from "../frame/plate-act.js";

const seat = inject(SCENE_ACT_SEAT, null);
</script>

<template>
    <Teleport v-if="seat" defer :to="seat">
        <slot :in-seat="true" />
    </Teleport>
    <slot v-else :in-seat="false" />
</template>
