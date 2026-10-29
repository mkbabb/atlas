<script setup lang="ts">
import { p1, p2, p3, p9 } from "../../lib";
const figure = () => import("../../figs/a.ts");
const text = [p1, p2, p3, p9].map((p) => p()).join(" ");
</script>
<template><p @click="figure">{{ text }}</p></template>
