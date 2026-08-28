<script setup>
import { useFeedbackStore } from '@/stores/feedback.js'

const feedbackStore = useFeedbackStore()

function toastClass(type) {
  return {
    'toast-success': type === 'success',
    'toast-error': type === 'error',
    'toast-warning': type === 'warning',
    'toast-info': type === 'info'
  }
}
</script>

<template>
  <teleport to="body">
    <div v-if="feedbackStore.toasts.length" class="toast-stack" aria-live="polite" aria-atomic="true">
      <div
        v-for="toast in feedbackStore.toasts"
        :key="toast.id"
        class="toast-card"
        :class="toastClass(toast.type)"
      >
        <div class="toast-copy">
          <strong v-if="toast.title">{{ toast.title }}</strong>
          <span>{{ toast.message }}</span>
        </div>
        <button class="toast-close" @click="feedbackStore.dismissToast(toast.id)">×</button>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast-card {
  min-width: 280px;
  max-width: 360px;
  padding: 14px 14px 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  background: var(--color-surface);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  pointer-events: auto;
}

.toast-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toast-copy strong {
  font-size: 13px;
  color: var(--color-text);
}

.toast-copy span {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.toast-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 18px;
}

.toast-close:hover {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.toast-success {
  border-color: var(--color-success-border-soft);
  background: linear-gradient(180deg, var(--color-success-light), var(--color-surface));
}

.toast-error {
  border-color: var(--color-danger-border-soft);
  background: linear-gradient(180deg, var(--color-danger-light), var(--color-surface));
}

.toast-warning {
  border-color: var(--color-warning-border-soft);
  background: linear-gradient(180deg, var(--color-warning-light), var(--color-surface));
}

.toast-info {
  border-color: var(--color-accent-soft);
  background: linear-gradient(180deg, var(--color-accent-light), var(--color-surface));
}

@media (max-width: 900px) {
  .toast-stack {
    top: auto;
    right: 16px;
    left: 16px;
    bottom: 16px;
  }

  .toast-card {
    min-width: 0;
    max-width: none;
  }
}
</style>
