<template>
reosurces demo
<br>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { ResourceDemo } from './ResourceDemo';

import { ComputeResource } from '@vertex-link/acs'
import * as mathModule from './../../compute/math.zig'

// const demoReource = new ResourceDemo().resource;
// const payload = ref(demoReource.payload.text);
// demoReource.whenReady().then(res => {
//   console.log(res.payload)
//   payload.value = res.payload.text
// });
// console.log(payload.value);

// Define types
interface MathExports {
  add(a: number, b: number): Promise<number>;
  multiply(a: number, b: number): Promise<number>;
}

// Create and use
const mathCompute = new ComputeResource<MathExports>(mathModule);

// Wait for ready, then use
setTimeout(async () => {
  const result = await mathCompute.add(5, 3);
  console.log('5 + 3 =', result);
}, 1000);


</script>
