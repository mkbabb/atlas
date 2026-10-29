<script setup lang="ts">
import { p1, p2, p5 } from "../../lib";
const figure = () => import("../../figs/b.ts");
const text = [p1, p2, p5].map((p) => p()).join(" ");
</script>
<template><p @click="figure">{{ text }}</p></template>
