<template>
  <!-- Desktop Layout -->
  <Panel v-if="!isMobile" class="feature-panel">
    <template #header>
      <div class="feature-header-content">
        <div class="header-text">
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

  <!-- Mobile Layout -->
  <div v-else class="mobile-container">
    <div class="mobile-header">
      <div class="header-text">
        <h1 class="feature-title">{{ route.meta.title }}</h1>
        <p class="feature-description">{{ route.meta.description }}</p>
      </div>
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        text
        rounded
        size="small"
        @click="resetParameters"
        aria-label="Reset parameters"
      />
    </div>

    <div class="mobile-demo-container">
      <iframe ref="iframeRef" :src="iframeUrl" class="demo-iframe" frameborder="0"></iframe>
    </div>

    <div class="mobile-controls">
      <Accordion :multiple="false" :active-index="0" class="mobile-accordion">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

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

// Mobile detection
const MOBILE_BREAKPOINT = 768;
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
};


watch(route, () => {
  initializeParameters();
  console.log(parameterValues);
  triggerValueUpdate();
}, {deep: true})

// Function to initialize parameters from route meta
const initializeParameters = () => {
  parameters.value.forEach(p => {
    if (p.key) {
      parameterValues[p.key] = p.defaultValue;
    }
  });
};

const iframeUrl = computed(() => route.meta.entryUrl as string);

const updateParameter = (key: string, value: any) => {
  parameterValues[key] = value;

  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.postMessage({ key, value }, '*');
  }
}

const triggerValueUpdate = () => {
  parameters.value.forEach(p => {
    console.log('p',p);
    if (p.key) {
      setTimeout(()=> {
        updateParameter(p.key, p.defaultValue)
      }, 200)
    }
  });
}

function resetParameters() {
  initializeParameters();
}

// Initialize when the component is mounted
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
  initializeParameters();
  triggerValueUpdate();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>

<style scoped>
/* Desktop Panel Layout */
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
  gap: 1rem;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.feature-description {
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

.demo-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

/* Mobile Container Layout */
.mobile-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--p-surface-ground);
}

.mobile-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

.mobile-header .header-text {
  flex: 1;
  min-width: 0;
}

.mobile-header .feature-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.mobile-header .feature-description {
  font-size: 0.875rem;
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.4;
}

.mobile-demo-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background-color: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  overflow: hidden;
}

.mobile-demo-container .demo-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.mobile-controls {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-color: var(--p-surface-ground);
}

.mobile-accordion {
  width: 100%;
}

/* Touch-friendly accordion headers on mobile */
.mobile-accordion :deep(.p-accordion-header-link) {
  padding: 1rem;
  min-height: 3rem;
  font-size: 0.9375rem;
}

.mobile-accordion :deep(.p-accordion-content) {
  padding: 0.75rem;
}

.mobile-accordion :deep(.panel-header) {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.mobile-accordion :deep(.panel-header i) {
  font-size: 1.125rem;
}

/* Landscape mobile optimization */
@media (max-width: 767px) and (orientation: landscape) {
  .mobile-demo-container {
    padding-bottom: 40%;
    max-height: 60vh;
  }
}

/* Small mobile devices */
@media (max-width: 400px) {
  .mobile-header {
    padding: 0.875rem;
  }

  .mobile-header .feature-title {
    font-size: 1rem;
  }

  .mobile-header .feature-description {
    font-size: 0.8125rem;
  }

  .mobile-demo-container {
    padding-bottom: 75%; /* 4:3 aspect ratio for smaller screens */
  }
}
</style>
