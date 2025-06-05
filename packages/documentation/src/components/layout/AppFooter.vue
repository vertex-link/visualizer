<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-info">
          <span class="footer-title">VERTEX LINK</span>
          <span class="footer-version">v0.1.0</span>
        </div>
        
        <div class="footer-status">
          <div class="status status-active">
            SYSTEM OPERATIONAL
          </div>
        </div>
        
        <div class="footer-copyright">
          <span class="mono text-tertiary">© 2024 VERTEX LINK</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// No reactive data needed for minimal footer
</script>

<style scoped>
.footer {
  background-color: var(--color-surface-secondary);
  border-top: var(--border-width) solid var(--color-border);
  margin-top: auto;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--footer-height);
  gap: var(--space-4);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.footer-title {
  font-family: var(--font-family-display);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  letter-spacing: 0.1em;
}

.footer-version {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-sm);
}

.footer-copyright {
  font-size: var(--font-size-xs);
}

@media (max-width: 640px) {
  .footer-content {
    flex-direction: column;
    height: auto;
    padding: var(--space-4) 0;
    text-align: center;
    gap: var(--space-2);
  }
}
</style>