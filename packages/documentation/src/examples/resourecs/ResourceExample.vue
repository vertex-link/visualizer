<template>
reosurces demo
<br>
    {{payload}}
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { ResourceDemo } from './ResourceDemo';
const demoReource = new ResourceDemo().resource;
const payload = ref(demoReource.payload.text);
demoReource.whenLoaded().then(res => {
  console.log(res.payload)
  payload.value = res.payload.text
});
console.log(payload.value);
</script>
