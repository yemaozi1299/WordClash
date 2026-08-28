<script setup>
import { onMounted } from 'vue'
import SideNav from '@/components/SideNav.vue'
import AppToast from '@/components/AppToast.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { initializeAppStores } from '@/services/bootstrap.js'

onMounted(() => {
  initializeAppStores()
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
  --sidebar-width: 280px;
  --page-max-width: 1280px;
  --font-family-base: 'PingFang SC', 'Inter', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-family-display: 'Georgia', 'Times New Roman', 'Songti SC', serif;
  --font-family-number: 'Inter', 'Segoe UI', sans-serif;

  /* 基于 Editorial Quiet 重整的全局语义色板 */
  --color-bg: #fcfaf6;
  --color-bg-soft: #f7f2ea;
  --color-bg-muted: #efe7db;
  --color-surface: rgba(255, 253, 249, 0.96);
  --color-surface-alt: rgba(252, 250, 246, 0.9);
  --color-surface-emphasis: #f4ede4;
  --color-text: #231f1a;
  --color-text-secondary: #5c5248;
  --color-text-muted: #867a6d;
  --color-primary: #8d5c2f;
  --color-primary-dark: #744721;
  --color-primary-light: #f5ece2;
  --color-primary-soft: rgba(141, 92, 47, 0.12);
  --color-primary-border-soft: rgba(141, 92, 47, 0.22);
  --color-accent: #335c67;
  --color-accent-light: #edf4f3;
  --color-accent-soft: rgba(51, 92, 103, 0.16);
  --color-success: #48815c;
  --color-success-light: #edf6ef;
  --color-success-soft: rgba(72, 129, 92, 0.14);
  --color-success-border-soft: rgba(72, 129, 92, 0.2);
  --color-warning: #8a5d1f;
  --color-warning-light: #fcf4e8;
  --color-warning-soft: rgba(181, 135, 52, 0.14);
  --color-warning-border-soft: rgba(181, 135, 52, 0.2);
  --color-danger: #9b3838;
  --color-danger-light: #fbefef;
  --color-danger-soft: rgba(176, 74, 74, 0.14);
  --color-danger-border-soft: rgba(176, 74, 74, 0.2);
  --color-border: #e3dbd0;
  --color-border-strong: #d6cabd;
  --color-overlay: rgba(35, 31, 26, 0.38);
  --color-overlay-strong: rgba(35, 31, 26, 0.48);
  --color-on-dark: #fff;

  /* 侧边栏沿用同一套暖色表层语义 */
  --color-sidebar-bg: rgba(252, 250, 246, 0.88);
  --color-sidebar-bg-alt: rgba(247, 242, 234, 0.96);
  --color-sidebar-border: rgba(227, 219, 208, 0.96);
  --color-sidebar-text: #231f1a;
  --color-sidebar-text-muted: #6c6257;
  --color-sidebar-label: #938677;
  --color-sidebar-surface: rgba(255, 253, 249, 0.9);
  --color-sidebar-surface-hover: rgba(244, 237, 228, 0.92);
  --color-sidebar-active: linear-gradient(135deg, rgba(141, 92, 47, 0.12), rgba(141, 92, 47, 0.04));
  --color-sidebar-brand: linear-gradient(135deg, #8d5c2f, #b07a49);

  /* 信息面板色 */
  --color-panel-info-bg: #fcf7ee;
  --color-panel-info-border: #ecdab6;
  --color-panel-accent-bg: #eef4f3;
  --color-panel-accent-border: #d3e1df;
  --color-surface-glass: rgba(255, 253, 249, 0.84);
  --color-surface-raised: rgba(255, 253, 249, 0.92);

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
  --radius-lg: 26px;
  --radius-pill: 999px;

  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-body: 15px;
  --font-size-lg: 18px;
  --font-size-xl: 22px;
  --font-size-2xl: 36px;

  --shadow-sm: 0 12px 28px rgba(35, 31, 26, 0.05);
  --shadow: 0 22px 48px rgba(35, 31, 26, 0.08);
  --shadow-lg: 0 30px 64px rgba(35, 31, 26, 0.12);
  --shadow-focus: 0 0 0 4px rgba(141, 92, 47, 0.1);
}

body {
  font-family: var(--font-family-base);
  background:
    radial-gradient(circle at top left, rgba(141, 92, 47, 0.05), transparent 24%),
    linear-gradient(180deg, #fcfaf6 0%, #f6f0e7 100%);
  color: var(--color-text);
  line-height: 1.7;
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
  padding: 36px 40px 56px;
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
  line-height: 1.08;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.04em;
  font-family: var(--font-family-display);
}

.page-desc {
  max-width: 760px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  line-height: 1.85;
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
  background: linear-gradient(180deg, rgba(255, 253, 249, 0.98), rgba(252, 250, 246, 0.94));
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  font-family: var(--font-family-display);
  color: var(--color-text);
  letter-spacing: -0.03em;
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
  background: var(--color-surface-raised);
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
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-family-display);
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
  color: var(--color-on-dark);
  box-shadow: 0 12px 22px rgba(141, 92, 47, 0.18);
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
  color: var(--color-on-dark);
  box-shadow: 0 12px 22px rgba(155, 56, 56, 0.2);
}

.btn-danger:hover:not(:disabled) {
  background: #842d2d;
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
  border-color: rgba(141, 92, 47, 0.34);
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
  background: var(--color-surface-glass);
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
