<script setup>
import { computed } from 'vue'
import { useFeedbackStore } from '@/stores/feedback.js'

const feedbackStore = useFeedbackStore()

const confirmButtonClass = computed(() => ({
  'btn-danger': feedbackStore.confirmState.tone === 'danger',
  'btn-primary': feedbackStore.confirmState.tone !== 'danger'
}))
</script>

<template>
  <teleport to="body">
    <div
      v-if="feedbackStore.confirmState.visible"
      class="dialog-overlay"
      @click="feedbackStore.resolveConfirm(false)"
    >
      <div
        class="dialog-card"
        role="dialog"
        aria-modal="true"
        :aria-label="feedbackStore.confirmState.title"
        @click.stop
      >
        <div class="dialog-copy">
          <span class="dialog-eyebrow">确认操作</span>
          <h2>{{ feedbackStore.confirmState.title }}</h2>
          <p>{{ feedbackStore.confirmState.message }}</p>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="feedbackStore.resolveConfirm(false)">
            {{ feedbackStore.confirmState.cancelText }}
          </button>
          <button class="btn" :class="confirmButtonClass" @click="feedbackStore.resolveConfirm(true)">
            {{ feedbackStore.confirmState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-overlay);
}

.dialog-card {
  width: min(440px, 100%);
  padding: 24px;
  border-radius: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  text-transform: uppercase;
}

.dialog-copy h2 {
  font-size: 22px;
  line-height: 1.3;
  color: var(--color-text);
}

.dialog-copy p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .dialog-actions {
    flex-direction: column-reverse;
  }

  .dialog-actions :deep(.btn) {
    width: 100%;
  }
}
</style>
