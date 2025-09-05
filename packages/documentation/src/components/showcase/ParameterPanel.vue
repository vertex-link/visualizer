<template>
  <div class="parameter-panel">
    <div
      v-for="param in parameters"
      :key="param.key"
      class="parameter-group"
    >
      <label class="parameter-label">
        {{ param.label }}
        <span v-if="param.description" class="parameter-description">
          {{ param.description }}
        </span>
      </label>

      <!-- Slider Parameter -->
      <Slider
        v-if="param.type === 'slider'"
        :model-value="values[param.key]"
        :min="param.min"
        :max="param.max"
        :step="param.step"
        @update:model-value="updateValue(param.key, $event)"
        class="parameter-slider"
      />

      <!-- Toggle Parameter -->
      <ToggleSwitch
        v-else-if="param.type === 'toggle'"
        :model-value="values[param.key]"
        @update:model-value="updateValue(param.key, $event)"
        class="parameter-toggle"
      />

      <!-- Select Parameter -->
      <Select
        v-else-if="param.type === 'select'"
        :model-value="values[param.key]"
        :options="param.options"
        option-label="label"
        option-value="value"
        @update:model-value="updateValue(param.key, $event)"
        class="parameter-select"
      />

      <!-- Color Parameter -->
      <ColorPicker
        v-else-if="param.type === 'color'"
        :model-value="values[param.key]"
        @update:model-value="updateValue(param.key, $event)"
        class="parameter-color"
      />

      <!-- Text Parameter -->
      <InputText
        v-else-if="param.type === 'text'"
        :model-value="values[param.key]"
        @update:model-value="updateValue(param.key, $event)"
        class="parameter-text"
      />

      <!-- Number Parameter -->
      <InputNumber
        v-else-if="param.type === 'number'"
        :model-value="values[param.key]"
        @update:model-value="updateValue(param.key, $event)"
        class="parameter-number"
      />

      <!-- Current value display -->
      <div class="parameter-value">
        <code>{{ formatValue(values[param.key]) }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ParameterDefinition } from "@/types/features";
import ColorPicker from "primevue/colorpicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Slider from "primevue/slider";
import ToggleSwitch from "primevue/toggleswitch";

interface Props {
  parameters: ParameterDefinition[];
  values: Record<string, any>;
}

defineProps<Props>();

const emit = defineEmits<{
  update: [key: string, value: any];
}>();

function updateValue(key: string, value: any) {
  emit("update", key, value);
}

function formatValue(value: any): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
</script>

<style scoped>
.parameter-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.parameter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.parameter-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.parameter-description {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--p-primary-500);
}

.parameter-value {
  align-self: flex-end;
}

.parameter-value code {
  color: var(--p-primary-600);
  font-size: 0.75rem;
}

.parameter-slider,
.parameter-select,
.parameter-color,
.parameter-text,
.parameter-number {
  width: 100%;
}
</style>
