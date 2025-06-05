<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <BaseText variant="label" color="accent" class="mb-2">
          VERTEX LINK DOCUMENTATION SYSTEM
        </BaseText>
        
        <BaseText variant="h1" class="mb-4">
          MODULAR TYPESCRIPT GAME ENGINE
        </BaseText>
        
        <BaseText variant="body" color="secondary" class="mb-6">
          Vertex Link is a modular and flexible TypeScript framework designed for game development 
          and interactive 3D applications, aiming to become a powerful, open-source web engine 
          with features like WebGPU rendering and buffer streaming.
        </BaseText>
        
        <div class="hero-actions">
          <Button variant="primary" icon="description">
            <router-link to="/documentation">Documentation</router-link>
          </Button>
          <Button variant="accent" icon="code">
            <router-link to="/examples">Examples</router-link>
          </Button>
        </div>
      </div>
      
      <div class="hero-status">
        <Status variant="active">SYSTEM OPERATIONAL</Status>
        <BaseText variant="mono" size="xs" color="tertiary">v0.1.0 | BUILD ALPHA</BaseText>
      </div>
    </section>

    <!-- Core Philosophy -->
    <section class="philosophy">
      <BaseText variant="h2" class="mb-4">CORE PHILOSOPHY</BaseText>
      <BaseText variant="body" color="secondary" class="mb-6">
        Vertex Link emphasizes a decoupled, component-based architecture. Instead of a monolithic 
        "Engine" class, it provides a set of core concepts:
      </BaseText>
      
      <div class="grid grid-2 gap-4">
        <Card>
          <BaseText variant="h4" class="mb-2">SCENES</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Manage collections of Actors and provide querying capabilities.
          </BaseText>
        </Card>
        
        <Card>
          <BaseText variant="h4" class="mb-2">ACTORS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Represent entities, acting as containers for Components.
          </BaseText>
        </Card>
        
        <Card>
          <BaseText variant="h4" class="mb-2">COMPONENTS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Encapsulate data and behavior for Actors.
          </BaseText>
        </Card>
        
        <Card>
          <BaseText variant="h4" class="mb-2">SERVICES</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Provide shared, cross-cutting functionalities.
          </BaseText>
        </Card>
        
        <Card>
          <BaseText variant="h4" class="mb-2">PROCESSORS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Manage distinct update loops (e.g., rendering, game logic).
          </BaseText>
        </Card>
        
        <Card>
          <BaseText variant="h4" class="mb-2">EVENTS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Facilitate type-safe, decoupled communication via an EventBus.
          </BaseText>
        </Card>
      </div>
    </section>

    <!-- Key Features -->
    <section class="features">
      <BaseText variant="h2" class="mb-6">KEY FEATURES</BaseText>
      
      <div class="grid grid-3 gap-6">
        <Card variant="outlined" interactive>
          <div class="feature-icon">
            <span class="material-icons">account_tree</span>
          </div>
          <BaseText variant="h4" class="mb-2">ACTOR-COMPONENT-SYSTEM</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            A robust foundation for entity management with modern TypeScript features.
          </BaseText>
        </Card>
        
        <Card variant="outlined" interactive>
          <div class="feature-icon">
            <span class="material-icons">event</span>
          </div>
          <BaseText variant="h4" class="mb-2">EVENT-DRIVEN</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Decoupled communication using a central EventBus and @OnEvent decorators.
          </BaseText>
        </Card>
        
        <Card variant="outlined" interactive>
          <div class="feature-icon">
            <span class="material-icons">auto_awesome</span>
          </div>
          <BaseText variant="h4" class="mb-2">DECORATOR-BASED API</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Simplifies hooking into update loops, event handling, and dependency injection.
          </BaseText>
        </Card>
        
        <Card variant="outlined" interactive>
          <div class="feature-icon">
            <span class="material-icons">folder</span>
          </div>
          <BaseText variant="h4" class="mb-2">RESOURCE MANAGEMENT</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            System for loading, compiling, and managing assets like meshes, materials, and shaders.
          </BaseText>
        </Card>
        
        <Card variant="outlined" interactive>
          <div class="feature-icon">
            <span class="material-icons">graphic_eq</span>
          </div>
          <BaseText variant="h4" class="mb-2">WEBGPU RENDERING</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            High-performance rendering using the modern WebGPU API and RenderGraph.
          </BaseText>
        </Card>
        
        <Card variant="outlined" interactive>
          <div class="feature-icon">
            <span class="material-icons">view_module</span>
          </div>
          <BaseText variant="h4" class="mb-2">MODULAR DESIGN</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Core logic is separate from rendering engine, promoting flexibility.
          </BaseText>
        </Card>
      </div>
    </section>

    <!-- Getting Started -->
    <section class="getting-started">
      <BaseText variant="h2" class="mb-4">GETTING STARTED</BaseText>
      <BaseText variant="body" color="secondary" class="mb-6">
        Quick overview of the basic workflow:
      </BaseText>
      
      <div class="steps">
        <div class="step">
          <BaseText variant="label" color="accent">01</BaseText>
          <BaseText variant="h4" class="mb-2">INITIALIZE CORE SYSTEMS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Set up ResourceManager, ServiceRegistry, WebGPUProcessor, and Scene.
          </BaseText>
        </div>
        
        <div class="step">
          <BaseText variant="label" color="accent">02</BaseText>
          <BaseText variant="h4" class="mb-2">LOAD RESOURCES</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Use ResourceManager to load/create ShaderResource, MeshResource, MaterialResource.
          </BaseText>
        </div>
        
        <div class="step">
          <BaseText variant="label" color="accent">03</BaseText>
          <BaseText variant="h4" class="mb-2">CREATE ACTORS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Instantiate Actor and add TransformComponent, MeshRendererComponent, and custom Components.
          </BaseText>
        </div>
        
        <div class="step">
          <BaseText variant="label" color="accent">04</BaseText>
          <BaseText variant="h4" class="mb-2">SET UP CAMERA</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Create an Actor with CameraComponent and TransformComponent.
          </BaseText>
        </div>
        
        <div class="step">
          <BaseText variant="label" color="accent">05</BaseText>
          <BaseText variant="h4" class="mb-2">START PROCESSORS</BaseText>
          <BaseText variant="body" size="sm" color="secondary">
            Call .start() on your registered processors (e.g., WebGPUProcessor).
          </BaseText>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BaseText from '../components/base/BaseText.vue'
import Button from '../components/base/Button.vue'
import Card from '../components/base/Card.vue'
import Status from '../components/base/Status.vue'
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-12);
  align-items: start;
}

.hero-content {
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-2);
}

.hero-actions a {
  color: inherit;
  text-decoration: none;
}

.hero-status {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-end;
}

/* Philosophy Section */
.philosophy {
  max-width: var(--content-max-width);
}

/* Features Section */
.features .feature-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-accent-light);
  border-radius: var(--border-radius-base);
  margin-bottom: var(--space-4);
}

.features .feature-icon .material-icons {
  font-size: 24px;
  color: var(--color-accent);
}

/* Getting Started */
.getting-started {
  max-width: var(--content-max-width);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.step {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-left: var(--border-width-thick) solid var(--color-accent);
  background-color: var(--color-surface-secondary);
  border-radius: 0 var(--border-radius-base) var(--border-radius-base) 0;
}

/* Responsive */
@media (max-width: 768px) {
  .home {
    gap: var(--space-12);
  }
  
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .hero-status {
    align-items: center;
  }
  
  .hero-actions {
    justify-content: center;
    flex-direction: column;
  }
  
  .grid-3 {
    grid-template-columns: 1fr;
  }
  
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-actions {
    gap: var(--space-2);
  }
}
</style>