<script setup>
import { onMounted } from 'vue'
import SideNav from '@/components/SideNav.vue'
import { useWordsStore } from '@/stores/words.js'
import { useArticlesStore } from '@/stores/articles.js'

const wordsStore = useWordsStore()
const articlesStore = useArticlesStore()

onMounted(() => {
  wordsStore.init()
  articlesStore.init()
})
</script>

<template>
  <div class="app-layout">
    <SideNav />
    <main class="main-content">
      <div class="app-shell">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --sidebar-width: 264px;
  --page-max-width: 1280px;
  --color-bg: #f4f7fb;
  --color-bg-soft: #eef3f9;
  --color-surface: #ffffff;
  --color-surface-alt: #f9fbff;
  --color-text: #132238;
  --color-text-secondary: #5f7188;
  --color-text-muted: #8a97aa;
  --color-primary: #3d6ee8;
  --color-primary-dark: #2e57bd;
  --color-primary-light: #edf3ff;
  --color-accent: #5d8cff;
  --color-danger: #d95151;
  --color-danger-light: #fff1f1;
  --color-success: #26996c;
  --color-success-light: #edf9f3;
  --color-warning: #d1a235;
  --color-warning-light: #fff8e8;
  --color-border: #dce4ef;
  --color-border-strong: #cad5e4;
  --radius-sm: 12px;
  --radius: 18px;
  --radius-lg: 24px;
  --shadow-sm: 0 8px 20px rgba(19, 34, 56, 0.06);
  --shadow: 0 18px 40px rgba(19, 34, 56, 0.08);
  --shadow-lg: 0 28px 56px rgba(19, 34, 56, 0.12);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  min-height: 100vh;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-width: 0;
}

.app-shell {
  max-width: var(--page-max-width);
  padding: 36px 40px 48px;
}

.page-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.page-title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  text-transform: uppercase;
}

.page-title {
  font-size: 34px;
  line-height: 1.15;
  font-weight: 700;
  color: var(--color-text);
}

.page-desc {
  max-width: 760px;
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.75;
}

.page-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.panel,
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.panel {
  padding: 24px;
}

.panel-soft {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(249, 251, 255, 0.96));
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.section-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 22px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.stat-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.stat-value {
  display: block;
  font-size: 30px;
  font-weight: 700;
  color: var(--color-text);
}

.stat-hint {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.split-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 20px;
}

.stack-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 12px 22px rgba(61, 110, 232, 0.22);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  background: var(--color-bg-soft);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.input,
.textarea,
.select {
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 14px;
  font-size: 15px;
  transition: all 0.18s ease;
  outline: none;
}

.input,
.select {
  min-height: 46px;
  padding: 0 14px;
}

.textarea {
  padding: 14px;
  resize: vertical;
  line-height: 1.7;
  min-height: 160px;
}

.input:focus,
.textarea:focus,
.select:focus {
  border-color: rgba(61, 110, 232, 0.45);
  box-shadow: 0 0 0 4px rgba(61, 110, 232, 0.1);
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: var(--color-bg-soft);
  color: var(--color-text-secondary);
}

.tag-success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.tag-warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.tag-danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.6);
  color: var(--color-text-secondary);
}

.empty-state strong {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
}

.notice {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
}

.notice-error {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.notice-success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.notice-info {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.muted {
  color: var(--color-text-muted);
}

@media (max-width: 1100px) {
  .app-shell {
    padding: 28px 24px 40px;
  }

  .stats-grid,
  .split-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  :root {
    --sidebar-width: 100%;
  }

  .app-layout {
    flex-direction: column;
  }

  .main-content {
    margin-left: 0;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
