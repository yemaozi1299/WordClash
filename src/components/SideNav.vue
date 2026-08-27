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
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background:
    linear-gradient(180deg, rgba(14, 26, 46, 0.96), rgba(18, 33, 58, 0.98));
  color: #fff;
  z-index: 20;
  box-shadow: 18px 0 36px rgba(10, 18, 34, 0.18);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 8px;
}

.brand-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #5d8cff, #7ea2ff);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.06em;
  box-shadow: 0 10px 22px rgba(125, 162, 255, 0.25);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text {
  font-size: 19px;
  font-weight: 700;
}

.brand-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
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
  color: rgba(255, 255, 255, 0.46);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 14px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.summary-value {
  display: block;
  font-size: 22px;
  font-weight: 700;
}

.summary-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
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
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  transition: all 0.18s ease;
  border: 1px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(61, 110, 232, 0.26), rgba(93, 140, 255, 0.18));
  color: #fff;
  border-color: rgba(126, 162, 255, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.nav-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
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
  color: rgba(255, 255, 255, 0.58);
}

.sidebar-bottom {
  margin-top: auto;
}

.sync-card {
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.sync-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.68);
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.sync-btn {
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.sync-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.sync-btn-primary {
  background: linear-gradient(135deg, #3d6ee8, #5d8cff);
  border-color: transparent;
}

.sync-message {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

@media (max-width: 900px) {
  .sidebar {
    position: relative;
    width: 100%;
    height: auto;
  }
}
</style>
