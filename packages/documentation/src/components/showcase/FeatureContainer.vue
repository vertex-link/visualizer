<template>
  <div class="feature-container">
    <!-- Feature header -->
    <header class="feature-header">
      <div class="header-content">
        <h1 class="feature-title">{{ title }}</h1>
        <p class="feature-description">{{ description }}</p>
      </div>
      <div class="header-actions">
        <Button
          label="Reset Parameters"
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          @click="resetParameters"
        />
      </div>
    </header>
    
    <!-- Main content area -->
    <div class="feature-content">
      <!-- Demo canvas area -->
      <div class="demo-area">
        <slot name="demo" />
      </div>
      
      <!-- Right panel with controls and docs -->
      <div class="side-panel">
        <!-- Parameter controls -->
        <div class="panel-section">
          <h3 class="panel-title">
            <i class="pi pi-sliders-h"></i>
            Controls
          </h3>
          <ParameterPanel
            :parameters="parameters"
            :values="parameterValues"
            @update="updateParameter"
          />
        </div>
        
        <!-- Documentation -->
        <div class="panel-section">
          <h3 class="panel-title">
            <i class="pi pi-book"></i>
            Documentation
          </h3>
          <DocumentationPanel :content="documentation" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ParameterDefinition } from "@/types/features";
import Button from "primevue/button";
import { reactive } from "vue";
import DocumentationPanel from "./DocumentationPanel.vue";
import ParameterPanel from "./ParameterPanel.vue";

interface Props {
  title: string;
  description: string;
  parameters: ParameterDefinition[];
  documentation: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "parameter-change": [key: string, value: any];
}>();

// Initialize parameter values with defaults
const parameterValues = reactive<Record<string, any>>({});
for (const param of props.parameters) {
  parameterValues[param.key] = param.defaultValue;
}

function updateParameter(key: string, value: any) {
  parameterValues[key] = value;
  emit("parameter-change", key, value);
}

function resetParameters() {
  for (const param of props.parameters) {
    parameterValues[param.key] = param.defaultValue;
  }
  // Emit all parameter resets
  for (const param of props.parameters) {
    emit("parameter-change", param.key, param.defaultValue);
  }
}
</script>

<style scoped>
.feature-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 2rem;
  border-bottom: var(--p-border-width) solid var(--p-surface-200);
  background-color: var(--p-surface-0);
}

.header-content h1 {
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--p-primary-800);
  margin-bottom: 0.5rem;
}

.feature-description {
  color: var(--p-primary-600);
  font-size: 1rem;
}

.feature-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.demo-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--p-surface-0);
  position: relative;
}

.side-panel {
  width: 320px;
  background-color: var(--p-surface-50);
  border-left: var(--p-border-width) solid var(--p-surface-200);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-section {
  padding: 1.5rem;
  border-bottom: var(--p-border-width) solid var(--p-surface-200);
}

.panel-section:last-child {
  border-bottom: none;
  flex: 1;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-primary-600);
  margin-bottom: 1rem;
}
</style>
