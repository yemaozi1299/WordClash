<script setup>
import { onMounted } from 'vue'
import SideNav from '@/components/SideNav.vue'
import AppToast from '@/components/AppToast.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
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
    <AppToast />
    <AppConfirmDialog />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --sidebar-width: 264px;
  --page-max-width: 1280px;
  --font-family-base: 'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-family-number: 'Inter', 'Segoe UI', sans-serif;

  /* 基于 Radix 气质重新整理的语义色板 */
  --color-bg: #f8fafc;
  --color-bg-soft: #f1f5f9;
  --color-bg-muted: #e8eef5;
  --color-surface: #ffffff;
  --color-surface-alt: #f8fbff;
  --color-surface-emphasis: #eef4fb;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-primary-light: #eff6ff;
  --color-primary-soft: rgba(37, 99, 235, 0.14);
  --color-accent: #4f7df3;
  --color-success: #0f8f66;
  --color-success-light: #ecfdf3;
  --color-success-soft: rgba(15, 143, 102, 0.16);
  --color-warning: #b7791f;
  --color-warning-light: #fff7e6;
  --color-warning-soft: rgba(183, 121, 31, 0.16);
  --color-danger: #dc4c64;
  --color-danger-light: #fff1f4;
  --color-danger-soft: rgba(220, 76, 100, 0.16);
  --color-border: #dbe4ee;
  --color-border-strong: #c2cfdd;
  --color-overlay: rgba(15, 23, 42, 0.46);

  /* 侧边栏专用深色层 */
  --color-sidebar-bg: #0f172a;
  --color-sidebar-bg-alt: #172033;
  --color-sidebar-border: rgba(255, 255, 255, 0.08);
  --color-sidebar-text: rgba(255, 255, 255, 0.9);
  --color-sidebar-text-muted: rgba(255, 255, 255, 0.64);
  --color-sidebar-label: rgba(255, 255, 255, 0.44);
  --color-sidebar-surface: rgba(255, 255, 255, 0.07);
  --color-sidebar-surface-hover: rgba(255, 255, 255, 0.11);
  --color-sidebar-active: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(79, 125, 243, 0.2));
  --color-sidebar-brand: linear-gradient(135deg, #4f7df3, #7ea3ff);

  /* 信息面板色 */
  --color-panel-info-bg: #fffdf6;
  --color-panel-info-border: #f1dfae;
  --color-panel-accent-bg: #f4f8ff;
  --color-panel-accent-border: #d8e5ff;

  /* 尺寸令牌，风格参考 Open Props */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;

  --radius-sm: 12px;
  --radius: 18px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-body: 15px;
  --font-size-lg: 18px;
  --font-size-xl: 22px;
  --font-size-2xl: 34px;

  --shadow-sm: 0 10px 24px rgba(15, 23, 42, 0.06);
  --shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 30px 60px rgba(15, 23, 42, 0.14);
  --shadow-focus: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

body {
  font-family: var(--font-family-base);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  min-height: 100vh;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
  gap: var(--space-6);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
}

.page-title-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.page-eyebrow {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--color-primary);
  text-transform: uppercase;
}

.page-title {
  font-size: var(--font-size-2xl);
  line-height: 1.15;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.03em;
}

.page-desc {
  max-width: 760px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.75;
}

.page-actions {
  display: flex;
  gap: var(--space-3);
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
  padding: var(--space-6);
}

.panel-soft {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.96));
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.section-desc {
  font-size: var(--font-size-md);
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
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
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stat-value {
  display: block;
  font-size: 30px;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-family-number);
  letter-spacing: -0.03em;
}

.stat-hint {
  display: block;
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.split-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: var(--space-5);
}

.stack-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.22);
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

.btn-danger {
  background: var(--color-danger);
  color: #fff;
  box-shadow: 0 12px 22px rgba(220, 76, 100, 0.22);
}

.btn-danger:hover:not(:disabled) {
  background: #c93b55;
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
  font-size: var(--font-size-body);
  transition: all 0.18s ease;
  outline: none;
  font-family: inherit;
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
  border-color: rgba(37, 99, 235, 0.42);
  box-shadow: var(--shadow-focus);
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
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
  background: rgba(255, 255, 255, 0.72);
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
  font-size: var(--font-size-md);
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
