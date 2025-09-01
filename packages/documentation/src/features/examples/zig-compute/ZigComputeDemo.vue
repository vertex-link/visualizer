<template>
  <FeatureContainer
    title="Zig Compute (WASM)"
    description="Demonstrates calling Zig functions compiled to WebAssembly via ComputeResource"
    :parameters="parameters"
    :documentation="documentation"
    @parameter-change="handleParameterChange"
  >
    <template #demo>
      <div class="compute-results">
        <div class="result-card">
          <div class="result-title">Inputs</div>
          <div class="result-value">
            a = <code>{{ a }}</code>, b = <code>{{ b }}</code>
          </div>
        </div>
        <div class="result-card">
          <div class="result-title">add(a, b)</div>
          <div class="result-value"><code>{{ sum }}</code></div>
        </div>
        <div class="result-card">
          <div class="result-title">multiply(a, b)</div>
          <div class="result-value"><code>{{ product }}</code></div>
        </div>
      </div>
    </template>
  </FeatureContainer>
</template>

<script setup lang="ts">
import FeatureContainer from "@/components/showcase/FeatureContainer.vue";
import * as zigModule from "@/compute/math.zig";
import { ComputeResource } from "@vertex-link/acs";
import { onMounted, onUnmounted, ref } from "vue";
import definition from "./definition";
import docsContent from "./docs.md?raw";

const parameters = definition.parameters;
const documentation = docsContent;

// Parameter state
const a = ref<number>(parameters.find((p) => p.key === "a")?.defaultValue ?? 2);
const b = ref<number>(parameters.find((p) => p.key === "b")?.defaultValue ?? 3);

// Results
const sum = ref<number>(0);
const product = ref<number>(0);

// Compute resource instance
let math: InstanceType<typeof ComputeResource<any>> | null = null;

async function init() {
  // Instantiate Zig WASM via ComputeResource
  math = new ComputeResource<any>(zigModule);
  await math.whenReady();
  recompute();
}

function recompute() {
  if (!math) return;
  try {
    sum.value = math.add(a.value, b.value);
    product.value = math.multiply(a.value, b.value);
  } catch (e) {
    console.error("Zig compute error:", e);
  }
}

function handleParameterChange(key: string, value: any) {
  if (key === "a") a.value = Number(value);
  if (key === "b") b.value = Number(value);
  recompute();
}

onMounted(init);
onUnmounted(() => {
  /* no explicit dispose needed for ComputeResource example */
});
</script>

<style scoped>
.compute-results {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 840px;
}

.result-card {
  border: var(--p-border-width) solid var(--p-surface-200);
  border-radius: var(--p-border-radius);
  padding: 1rem;
  background: var(--p-surface-0);
  box-shadow: var(--p-shadow-sm);
}

.result-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-primary-600);
  margin-bottom: 0.5rem;
}

.result-value {
  font-size: 1.125rem;
  color: var(--p-primary-800);
}
</style>
