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

    <!-- Desktop: Splitter Layout -->
    <Splitter v-if="!isMobile" class="feature-splitter">
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

    <!-- Mobile: Stacked Layout -->
    <div v-else class="mobile-stack">
      <div class="mobile-demo-container">
        <iframe ref="iframeRef" :src="iframeUrl" class="demo-iframe" frameborder="0"></iframe>
      </div>

      <Accordion :multiple="true" :active-index="[0]" class="mobile-accordion">
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
  </Panel>
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
  gap: 1rem;
}

.demo-iframe {
  width: 100%;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Mobile Stacked Layout */
.mobile-stack {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.mobile-demo-container {
  min-height: 300px;
  height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--p-surface-border);
}

.mobile-accordion {
  flex-grow: 1;
  overflow-y: auto;
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .feature-title {
    font-size: 1.25rem;
  }

  .feature-description {
    font-size: 0.875rem;
  }

  .feature-header-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
