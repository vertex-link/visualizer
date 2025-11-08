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
import { onMounted } from "vue";

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
  padding: 0.5rem;
}

.parameter-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--p-surface-card);
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border);
}

.parameter-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 500;
  font-size: 0.9375rem;
  color: var(--p-text-color);
}

.parameter-description {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
  line-height: 1.4;
}

.parameter-value {
  align-self: flex-end;
  margin-top: 0.25rem;
}

.parameter-value code {
  color: var(--p-primary-color);
  font-size: 0.8125rem;
  background-color: var(--p-surface-100);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

.parameter-slider,
.parameter-select,
.parameter-color,
.parameter-text,
.parameter-number {
  width: 100%;
}

/* Touch-friendly slider */
.parameter-slider :deep(.p-slider-handle) {
  width: 1.25rem;
  height: 1.25rem;
}

/* Touch-friendly toggle */
.parameter-toggle {
  align-self: flex-start;
}

/* Mobile optimizations */
@media (max-width: 767px) {
  .parameter-panel {
    gap: 1rem;
    padding: 0.25rem;
  }

  .parameter-group {
    gap: 0.625rem;
    padding: 0.875rem;
  }

  .parameter-label {
    font-size: 0.875rem;
  }

  .parameter-description {
    font-size: 0.75rem;
  }

  /* Larger touch targets on mobile */
  .parameter-slider :deep(.p-slider-handle) {
    width: 1.5rem;
    height: 1.5rem;
  }

  .parameter-select :deep(.p-select),
  .parameter-text :deep(.p-inputtext),
  .parameter-number :deep(.p-inputnumber-input) {
    min-height: 2.75rem;
    font-size: 1rem;
  }
}
</style>
