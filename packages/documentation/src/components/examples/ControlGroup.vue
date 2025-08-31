<template>
  <div class="control-group">
    <div class="control-header">
      <label class="control-label">{{ label }}</label>
      <code
        v-if="showValue && currentValue !== undefined"
        class="value-code"
      >
        {{ formatValue(currentValue) }}
      </code>
    </div>

    <!-- Slider Control -->
    <div v-if="type === 'slider'" class="slider-control">
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="currentValue"
        @input="handleSliderInput"
        class="slider"
      />
    </div>

    <!-- Toggle Control -->
    <div v-else-if="type === 'toggle'" class="toggle-control">
      <label class="toggle">
        <input
          type="checkbox"
          :checked="currentValue"
          @change="handleToggleChange"
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <!-- Button Control -->
    <div v-else-if="type === 'button'" class="button-control">
      <Button
        :label="buttonText"
        :icon="buttonIcon ? `pi pi-${buttonIcon}` : undefined"
        @click="$emit('action')"
        :disabled="disabled"
      />
    </div>

    <!-- Select Control -->
    <div v-else-if="type === 'select'" class="select-control">
      <select
        :value="currentValue"
        @change="handleSelectChange"
        class="select"
      >
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

interface Option {
  value: any
  label: string
}

interface Props {
  type: 'slider' | 'toggle' | 'button' | 'select'
  label: string
  modelValue?: any
  min?: number
  max?: number
  step?: number
  showValue?: boolean
  precision?: number
  disabled?: boolean
  // Button specific
  buttonText?: string
  buttonIcon?: string
  // Select specific
  options?: Option[]
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  showValue: true,
  precision: 2,
  disabled: false,
  buttonText: 'Action',
  options: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  'action': []
}>()

const currentValue = computed(() => props.modelValue)

const formatValue = (value: any): string => {
  if (typeof value === 'number') {
    return value.toFixed(props.precision)
  }
  return String(value)
}

const handleSliderInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  emit('update:modelValue', value)
}

const handleToggleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

const handleSelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Slider Styles */
.slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--color-surface-tertiary);
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  transition: background var(--transition-base);
}

.slider::-webkit-slider-thumb:hover {
  background: var(--color-accent-bright);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  border: none;
  transition: background var(--transition-base);
}

.slider::-moz-range-thumb:hover {
  background: var(--color-accent-bright);
}

/* Toggle Styles */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-surface-tertiary);
  transition: var(--transition-base);
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--color-text-primary);
  transition: var(--transition-base);
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--color-accent);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
  background-color: white;
}

/* Select Styles */
.select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-surface-secondary);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-base);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
