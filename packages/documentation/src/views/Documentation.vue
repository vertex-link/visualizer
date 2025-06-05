<template>
  <div class="documentation">
    <!-- Header -->
    <div class="doc-header">
      <BaseText variant="h1" class="mb-4">DOCUMENTATION</BaseText>
      <BaseText variant="body" color="secondary" class="mb-8">
        Comprehensive guide to Vertex Link's modular TypeScript game engine framework.
      </BaseText>
    </div>

    <!-- Quick Navigation -->
    <Card variant="outlined" class="mb-8">
      <BaseText variant="h4" class="mb-4">QUICK NAVIGATION</BaseText>
      <div class="nav-grid">
        <button class="nav-item" @click="scrollTo('overview')">
          <span class="material-icons">info</span>
          <span>Overview</span>
        </button>
        <button class="nav-item" @click="scrollTo('architecture')">
          <span class="material-icons">account_tree</span>
          <span>Architecture</span>
        </button>
        <button class="nav-item" @click="scrollTo('features')">
          <span class="material-icons">star</span>
          <span>Features</span>
        </button>
        <button class="nav-item" @click="scrollTo('getting-started')">
          <span class="material-icons">rocket_launch</span>
          <span>Getting Started</span>
        </button>
      </div>
    </Card>

    <!-- Overview -->
    <section id="overview" class="doc-section">
      <BaseText variant="h2" class="mb-4">OVERVIEW</BaseText>
      <BaseText variant="body" color="secondary" class="mb-6">
        Vertex Link is a modular and flexible TypeScript framework designed for game development 
        and interactive 3D applications. It aims to become a powerful, open-source web engine 
        with features like WebGPU rendering and buffer streaming.
      </BaseText>
      <BaseText variant="body" color="secondary">
        This repository contains the core <code>acs</code> (Actor-Component-System) package, 
        the <code>engine</code> package for rendering and resource management, and documentation 
        including examples.
      </BaseText>
    </section>

    <!-- Architecture -->
    <section id="architecture" class="doc-section">
      <BaseText variant="h2" class="mb-4">CORE ARCHITECTURE</BaseText>
      <BaseText variant="body" color="secondary" class="mb-6">
        Vertex Link emphasizes a decoupled, component-based architecture. Instead of a monolithic 
        "Engine" class, it provides a set of core concepts:
      </BaseText>
      
      <div class="concepts-grid">
        <div class="concept-item">
          <BaseText variant="h4" color="accent" class="mb-2">SCENES</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Manage collections of Actors and provide querying capabilities.
          </BaseText>
        </div>
        <div class="concept-item">
          <BaseText variant="h4" color="accent" class="mb-2">ACTORS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Represent entities, acting as containers for Components.
          </BaseText>
        </div>
        <div class="concept-item">
          <BaseText variant="h4" color="accent" class="mb-2">COMPONENTS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Encapsulate data and behavior for Actors.
          </BaseText>
        </div>
        <div class="concept-item">
          <BaseText variant="h4" color="accent" class="mb-2">SERVICES</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Provide shared, cross-cutting functionalities.
          </BaseText>
        </div>
        <div class="concept-item">
          <BaseText variant="h4" color="accent" class="mb-2">PROCESSORS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Manage distinct update loops (e.g., rendering, game logic).
          </BaseText>
        </div>
        <div class="concept-item">
          <BaseText variant="h4" color="accent" class="mb-2">EVENTS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Facilitate type-safe, decoupled communication via an EventBus.
          </BaseText>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="doc-section">
      <BaseText variant="h2" class="mb-6">KEY FEATURES</BaseText>
      <div class="features-list">
        <div class="feature-item">
          <span class="material-icons">check_circle</span>
          <div>
            <BaseText variant="h4" class="mb-1">Actor-Component-System (ACS)</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              A robust foundation for entity management.
            </BaseText>
          </div>
        </div>
        <div class="feature-item">
          <span class="material-icons">check_circle</span>
          <div>
            <BaseText variant="h4" class="mb-1">Event-Driven Architecture</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Decoupled communication using a central EventBus and @OnEvent decorators.
            </BaseText>
          </div>
        </div>
        <div class="feature-item">
          <span class="material-icons">check_circle</span>
          <div>
            <BaseText variant="h4" class="mb-1">Decorator-Based API</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Simplifies hooking into update loops (@Update, @WebGPUUpdate), event handling, and dependency injection (@RequireComponent).
            </BaseText>
          </div>
        </div>
        <div class="feature-item">
          <span class="material-icons">check_circle</span>
          <div>
            <BaseText variant="h4" class="mb-1">Resource Management</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              System for loading, compiling, and managing assets like meshes, materials, and shaders.
            </BaseText>
          </div>
        </div>
        <div class="feature-item">
          <span class="material-icons">check_circle</span>
          <div>
            <BaseText variant="h4" class="mb-1">WebGPU Rendering</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              High-performance rendering using the modern WebGPU API, managed by the WebGPUProcessor and RenderGraph.
            </BaseText>
          </div>
        </div>
        <div class="feature-item">
          <span class="material-icons">check_circle</span>
          <div>
            <BaseText variant="h4" class="mb-1">Modular Design</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Core logic (@vertex-link/acs) is separate from the rendering engine (@vertex-link/engine), promoting flexibility.
            </BaseText>
          </div>
        </div>
      </div>
    </section>

    <!-- Getting Started -->
    <section id="getting-started" class="doc-section">
      <BaseText variant="h2" class="mb-6">GETTING STARTED</BaseText>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <BaseText variant="h4" class="mb-2">Initialize Core Systems</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Set up ResourceManager, ServiceRegistry, WebGPUProcessor, and Scene.
            </BaseText>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <BaseText variant="h4" class="mb-2">Load Resources</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Use ResourceManager to load/create ShaderResource, MeshResource, MaterialResource.
            </BaseText>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <BaseText variant="h4" class="mb-2">Create Actors</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Instantiate Actor and add TransformComponent, MeshRendererComponent, and custom behavior Components.
            </BaseText>
          </div>
        </div>
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <BaseText variant="h4" class="mb-2">Set up Camera</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Create an Actor with CameraComponent and TransformComponent.
            </BaseText>
          </div>
        </div>
        <div class="step">
          <div class="step-number">5</div>
          <div class="step-content">
            <BaseText variant="h4" class="mb-2">Start Processors</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Call .start() on your registered processors (e.g., WebGPUProcessor).
            </BaseText>
          </div>
        </div>
      </div>

      <Card variant="outlined" class="mt-8">
        <BaseText variant="h4" class="mb-4">Example Code Structure</BaseText>
        <pre class="code-block"><code>// Initialize systems (ResourceManager, ServiceRegistry, WebGPUProcessor, Scene)
// Load shader, mesh, material resources
// Create an Actor
const myActor = new scene.createActor("MyCube");
myActor.with(TransformComponent, { position: [0,0,0] })
       .with(MeshRendererComponent, { mesh: myMeshResource, material: myMaterialResource })
       .with(MyCustomRotationComponent, { speed: 1.0 });
// Add camera, start gpuProcessor.start()</code></pre>
      </Card>
    </section>
  </div>
</template>

<script setup lang="ts">
import BaseText from '../components/base/BaseText.vue'
import Card from '../components/base/Card.vue'

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.documentation {
  max-width: var(--content-max-width);
}

.doc-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-base);
  background-color: var(--color-surface-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
}

.nav-item:hover {
  border-color: var(--color-accent);
  background-color: var(--color-surface-secondary);
}

.nav-item .material-icons {
  font-size: 20px;
  color: var(--color-accent);
}

.doc-section {
  margin-bottom: var(--space-16);
}

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-6);
}

.concept-item {
  padding: var(--space-4);
  border-left: var(--border-width-thick) solid var(--color-accent);
  background-color: var(--color-surface-secondary);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.feature-item {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
}

.feature-item .material-icons {
  color: var(--color-success);
  font-size: 20px;
  margin-top: var(--space-1);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.step {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  padding-top: var(--space-1);
}

.code-block {
  background-color: var(--color-surface-tertiary);
  padding: var(--space-4);
  border-radius: var(--border-radius-base);
  border: var(--border-width) solid var(--color-border);
  overflow-x: auto;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

@media (max-width: 640px) {
  .nav-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .concepts-grid {
    grid-template-columns: 1fr;
  }
}
</style>