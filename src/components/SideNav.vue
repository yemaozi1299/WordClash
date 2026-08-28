<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useWordsStore } from '@/stores/words.js'
import { useArticlesStore } from '@/stores/articles.js'
import {
  exportAppData,
  readImportedAppData,
  saveAppData
} from '@/services/storage.js'

const route = useRoute()
const wordsStore = useWordsStore()
const articlesStore = useArticlesStore()
const fileInput = ref(null)
const syncMessage = ref('')

const navItems = [
  { path: '/input', label: '单词录入', caption: '快速收词', icon: '01' },
  { path: '/matching', label: '对对碰', caption: '巩固记忆', icon: '02' },
  { path: '/article', label: '文章阅读', caption: '精读工作台', icon: '03' },
  { path: '/analysis', label: '学习分析', caption: '复盘进度', icon: '04' },
  { path: '/bank', label: '单词库', caption: '统一管理', icon: '05' }
]

const dataSummary = computed(() => [
  { label: '单词', value: wordsStore.wordCount },
  { label: '文章', value: articlesStore.articleCount }
])

function exportData() {
  exportAppData({
    words: wordsStore.snapshot(),
    articles: articlesStore.snapshot()
  })
  syncMessage.value = '已导出数据文件。你可以用它覆盖项目里的 data/user-data.json 后再提交 git。'
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const imported = await readImportedAppData(file)
    wordsStore.replaceWords(imported.words, false)
    articlesStore.replaceArticles(imported.articles, false)
    saveAppData(imported)
    syncMessage.value = `已导入 ${imported.words.length} 个单词、${imported.articles.length} 篇文章。`
  } catch (error) {
    syncMessage.value = `导入失败：${error.message}`
  } finally {
    event.target.value = ''
  }
}
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-badge">WC</div>
      <div class="brand-copy">
        <span class="brand-text">WordClash</span>
        <span class="brand-subtitle">个人英语学习工作台</span>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-label">Workspace</div>
      <div class="summary-grid">
        <div v-for="item in dataSummary" :key="item.label" class="summary-card">
          <span class="summary-value">{{ item.value }}</span>
          <span class="summary-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-label">导航</div>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
        <router-link
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
        >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-copy">
              <span class="nav-label">{{ item.label }}</span>
              <span class="nav-caption">{{ item.caption }}</span>
            </span>
          </router-link>
        </li>
      </ul>
    </div>

    <div class="sidebar-section sidebar-bottom">
      <div class="sync-card">
        <div class="section-label">数据同步</div>
        <p class="sync-desc">
          当前采用“手动导入导出 + git 同步”的方式。导出后可覆盖项目中的 `data/user-data.json`。
        </p>
        <div class="sync-actions">
          <button class="sync-btn sync-btn-primary" @click="exportData">导出数据</button>
          <button class="sync-btn" @click="triggerImport">导入数据</button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          hidden
          @change="handleImport"
        />
        <p v-if="syncMessage" class="sync-message">{{ syncMessage }}</p>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: linear-gradient(180deg, var(--color-sidebar-bg), var(--color-sidebar-bg-alt));
  color: var(--color-sidebar-text);
  z-index: 20;
  border-right: 1px solid var(--color-sidebar-border);
  box-shadow: 18px 0 40px rgba(35, 31, 26, 0.06);
  backdrop-filter: blur(18px);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 8px 10px;
}

.brand-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--color-sidebar-brand);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.12em;
  box-shadow: 0 10px 20px rgba(141, 92, 47, 0.18);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text {
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-family-display);
  letter-spacing: -0.03em;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--color-sidebar-text-muted);
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  padding: 0 8px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-sidebar-label);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 14px 12px;
  border-radius: 18px;
  background: var(--color-sidebar-surface);
  border: 1px solid var(--color-sidebar-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.summary-value {
  display: block;
  font-size: 22px;
  font-weight: 600;
  font-family: var(--font-family-display);
  letter-spacing: -0.03em;
}

.summary-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-sidebar-text-muted);
}

.nav-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 18px;
  text-decoration: none;
  color: var(--color-sidebar-text);
  font-size: 14px;
  transition: all 0.18s ease;
  border: 1px solid var(--color-sidebar-border);
  background: transparent;
}

.nav-item:hover {
  background: var(--color-sidebar-surface-hover);
}

.nav-item.active {
  background: var(--color-sidebar-active);
  border-color: rgba(141, 92, 47, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.nav-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--color-sidebar-surface);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
}

.nav-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-label {
  font-size: 14px;
  font-weight: 600;
}

.nav-caption {
  font-size: 12px;
  color: var(--color-sidebar-text-muted);
}

.nav-item.active .nav-label,
.nav-item.active .nav-icon {
  color: var(--color-primary);
}

.nav-item.active .nav-caption {
  color: var(--color-text-secondary);
}

.sidebar-bottom {
  margin-top: auto;
}

.sync-card {
  padding: 16px;
  border-radius: 22px;
  background: var(--color-sidebar-surface);
  border: 1px solid var(--color-sidebar-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.sync-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-sidebar-text-muted);
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.sync-btn {
  min-height: 42px;
  border: 1px solid var(--color-sidebar-border);
  border-radius: 14px;
  background: rgba(255, 253, 249, 0.84);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.sync-btn:hover {
  background: var(--color-sidebar-surface-hover);
}

.sync-btn-primary {
  background: var(--color-sidebar-brand);
  border-color: transparent;
  color: #fff;
}

.sync-message {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-sidebar-text-muted);
}

@media (max-width: 900px) {
  .sidebar {
    position: relative;
    width: 100%;
    height: auto;
  }
}
</style>
