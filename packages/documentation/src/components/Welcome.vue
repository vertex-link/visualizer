<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <i class="pi pi-bolt welcome-icon"></i>
      <h1 class="welcome-title">Welcome to Vertex Link</h1>
      <p class="welcome-text">
        Select a feature from the <span class="menu-hint">menu</span> to explore interactive examples and documentation.
      </p>
    </div>
  </div>
</template>

<style scoped>
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 2rem;
  background-color: var(--p-surface-ground);
}

.welcome-content {
  text-align: center;
  max-width: 600px;
}

.welcome-icon {
  font-size: 4rem;
  color: var(--p-primary-color);
  margin-bottom: 1.5rem;
  display: block;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: var(--p-text-color);
  line-height: 1.2;
}

.welcome-text {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
  margin: 0;
}

.menu-hint {
  font-weight: 600;
  color: var(--p-primary-color);
}

/* Mobile responsive */
@media (max-width: 767px) {
  .welcome-container {
    padding: 1.5rem;
  }

  .welcome-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .welcome-title {
    font-size: 1.75rem;
  }

  .welcome-text {
    font-size: 1rem;
  }
}

@media (max-width: 400px) {
  .welcome-container {
    padding: 1rem;
  }

  .welcome-icon {
    font-size: 2.5rem;
  }

  .welcome-title {
    font-size: 1.5rem;
  }

  .welcome-text {
    font-size: 0.9375rem;
  }
}
</style>