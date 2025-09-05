<template>
  <Panel class="feature-panel">
    <template #header>
      <div class="feature-header-content">
        <div>
          <h1 class="feature-title">{{ route.meta.title }}</h1>
          <p class="feature-description">{{ route.meta.description }}</p>
        </div>
        <Button
          label="Reset"
          icon="pi pi-refresh"
          severity="secondary"
          text
          rounded
          @click="resetParameters"
        />
      </div>
    </template>

    <Splitter class="feature-splitter">
      <SplitterPanel :min-size="40" class="flex items-center justify-center">
        <iframe ref="iframeRef" :src="iframeUrl" class="demo-iframe" frameborder="0"></iframe>
      </SplitterPanel>

      <SplitterPanel :min-size="25" :size="30" class="side-panel-container">
        <Accordion :multiple="true" :active-index="[0, 1]" class="w-full">
          <AccordionTab>
            <template #header>
              <div class="panel-header">
                <i class="pi pi-sliders-h"></i>
                <span>Controls</span>
              </div>
            </template>
            <ParameterPanel
              :parameters="parameters"
              :values="parameterValues"
              @update="updateParameter"
            />
          </AccordionTab>
          <AccordionTab>
            <template #header>
              <div class="panel-header">
                <i class="pi pi-book"></i>
                <span>Documentation</span>
              </div>
            </template>
            <DocumentationPanel :content="route.meta.content as string" />
          </AccordionTab>
        </Accordion>
      </SplitterPanel>
    </Splitter>
  </Panel>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

// PrimeVue Component Imports
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';

// Local Component Imports
import DocumentationPanel from "./DocumentationPanel.vue";
import ParameterPanel from "./ParameterPanel.vue";

const route = useRoute();
const iframeRef = ref<HTMLIFrameElement | null>(null);
const parameters = computed(() => (route.meta.parameters || []) as any[]);
const parameterValues = reactive<Record<string, any>>({});

// Function to initialize parameters from route meta
const initializeParameters = () => {
  parameters.value.forEach(p => {
    if (p.key) {
      parameterValues[p.key] = p.defaultValue;
    }
  });
};

const iframeUrl = computed(() => route.meta.entryUrl as string);

function updateParameter(key: string, value: any) {
  parameterValues[key] = value;

  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.postMessage({ key, value }, '*');
  }
}

function resetParameters() {
  initializeParameters();
}

// Initialize when the component is mounted
onMounted(() => {
  initializeParameters();
});
</script>

<style scoped>
/* Minimal, layout-only CSS. All colors, borders, fonts, etc.,
  are handled by the PrimeVue theme.
*/
.feature-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feature-panel :deep(.p-panel-content-container) {
    height: 100%;
}

.feature-panel :deep(.p-panel-content) {
  padding: 0;
  flex-grow: 1;
  display: flex;
  height: 100%;
}

.feature-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.demo-iframe {
  width: 100%;
  height: 100%;
}

.panel-header {
  display: flex;
}
</style>
