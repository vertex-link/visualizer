<template>
  <div class="not-found">
    <div class="error-content">
      <div class="error-display">
        <BaseText variant="h1" color="accent" class="error-code">404</BaseText>
        <Status variant="error">RESOURCE NOT FOUND</Status>
      </div>
      
      <Card variant="elevated" class="error-info">
        <BaseText variant="h2" class="mb-4">PAGE NOT FOUND</BaseText>
        <BaseText variant="body" color="secondary" class="mb-6">
          The requested resource could not be located. The page may have been moved, 
          renamed, or does not exist.
        </BaseText>
        
        <div class="error-details">
          <BaseText variant="label" color="tertiary" class="mb-2">REQUESTED PATH</BaseText>
          <BaseText variant="mono" color="primary" class="mb-4">{{ $route.path }}</BaseText>
        </div>
        
        <div class="navigation-options">
          <Button variant="primary" icon="home">
            <router-link to="/">Return Home</router-link>
          </Button>
          <Button variant="secondary" icon="arrow_back" @click="goBack">
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseText from '../components/base/BaseText.vue'
import Button from '../components/base/Button.vue'
import Card from '../components/base/Card.vue'
import Status from '../components/base/Status.vue'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.not-found {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-16) 0;
  text-align: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  align-items: center;
}

.error-display {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
}

.error-code {
  font-size: clamp(4rem, 12vw, 8rem);
  line-height: 0.8;
  font-weight: var(--font-weight-black);
}

.error-details {
  text-align: left;
  width: 100%;
  padding: var(--space-4);
  background-color: var(--color-surface-tertiary);
  border-radius: var(--border-radius-base);
}

.navigation-options {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
}

.navigation-options a {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 640px) {
  .navigation-options {
    flex-direction: column;
  }
}
</style>