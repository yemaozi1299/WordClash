<script setup>
import { ref, computed } from 'vue'
import { useWordsStore } from '@/stores/words.js'
import { useFeedbackStore } from '@/stores/feedback.js'
import WordCard from '@/components/WordCard.vue'

const wordsStore = useWordsStore()
const feedbackStore = useFeedbackStore()
const searchQuery = ref('')
const selectedWord = ref(null)
const sortBy = ref('recent') // 'recent' | 'alphabetical' | 'accuracy'

const filteredWords = computed(() => {
  let list = [...wordsStore.words]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(w =>
      w.word.toLowerCase().includes(q) ||
      w.meanings.some(m => m.meaning.includes(q))
    )
  }
  if (sortBy.value === 'recent') {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (sortBy.value === 'alphabetical') {
    list.sort((a, b) => a.word.localeCompare(b.word))
  } else if (sortBy.value === 'accuracy') {
    list.sort((a, b) => {
      const rateA = a.stats.totalAttempts ? a.stats.correctAttempts / a.stats.totalAttempts : 0
      const rateB = b.stats.totalAttempts ? b.stats.correctAttempts / b.stats.totalAttempts : 0
      return rateA - rateB
    })
  }
  return list
})

function accuracy(w) {
  if (!w.stats.totalAttempts) return '—'
  return Math.round(w.stats.correctAttempts / w.stats.totalAttempts * 100) + '%'
}

async function removeWord(word, e) {
  e.stopPropagation()
  const confirmed = await feedbackStore.requestConfirm({
    title: '删除单词',
    message: `确认删除 “${word.word}” 吗？删除后将从当前词库中移除。`,
    confirmText: '确认删除',
    cancelText: '暂不删除',
    tone: 'danger'
  })

  if (!confirmed) return

  wordsStore.removeWord(word.id)
  if (selectedWord.value?.id === word.id) selectedWord.value = null
  feedbackStore.success(`已删除单词 “${word.word}”`, '词库已更新')
}

const weakCount = computed(() =>
  wordsStore.words.filter(w => w.stats.totalAttempts > 0 && (w.stats.correctAttempts / w.stats.totalAttempts) < 0.6).length
)
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-group">
        <span class="page-eyebrow">Library</span>
        <h1 class="page-title">单词库</h1>
        <p class="page-desc">
          这里汇总你所有已录入的单词。你可以检索、排序、查看详情，也可以快速清理低价值或录错的单词。
        </p>
      </div>
    </header>

    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">总词量</span>
        <span class="stat-value">{{ wordsStore.wordCount }}</span>
        <span class="stat-hint">所有录入词都会在这里统一维护</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">当前筛选结果</span>
        <span class="stat-value">{{ filteredWords.length }}</span>
        <span class="stat-hint">会随着搜索和排序实时更新</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">待加强词</span>
        <span class="stat-value">{{ weakCount }}</span>
        <span class="stat-hint">正确率低于 60% 的单词数量</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">当前排序</span>
        <span class="stat-value">{{ sortBy === 'recent' ? '最近录入' : sortBy === 'alphabetical' ? '字母顺序' : '正确率' }}</span>
        <span class="stat-hint">通过筛选器快速切换查看方式</span>
      </div>
    </section>

    <section class="panel panel-soft stack-layout">
      <div class="toolbar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索单词、释义或记忆线索..."
          class="input"
        />
        <select v-model="sortBy" class="select toolbar-select">
          <option value="recent">最近录入</option>
          <option value="alphabetical">字母顺序</option>
          <option value="accuracy">正确率</option>
        </select>
      </div>

      <div v-if="filteredWords.length === 0" class="empty-state">
        <strong>没有匹配的单词</strong>
        试试换一个关键词，或者切换排序方式看看。
      </div>

      <div v-else class="word-list">
        <div
          v-for="w in filteredWords"
          :key="w.id"
          class="word-row"
          :class="{ expanded: selectedWord?.id === w.id }"
          @click="selectedWord = selectedWord?.id === w.id ? null : w"
        >
          <div class="word-summary">
            <div class="word-main">
              <div class="word-topline">
                <strong class="ws-word">{{ w.word }}</strong>
                <span class="muted">{{ w.phonetic || '暂无音标' }}</span>
              </div>
              <span class="ws-meaning">{{ w.meanings[0]?.meaning }}</span>
            </div>
            <div class="word-side">
              <span class="tag" :class="w.stats.totalAttempts ? 'tag-warning' : ''">{{ accuracy(w) }}</span>
              <button class="icon-btn" @click="removeWord(w, $event)" title="删除">×</button>
            </div>
          </div>
          <div v-if="selectedWord?.id === w.id" class="word-detail">
            <WordCard :word="w" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 14px;
  align-items: center;
}

.word-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-select {
  width: 200px;
}

.word-row {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.18s ease;
  overflow: hidden;
}

.word-row:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.word-row.expanded {
  border-color: var(--color-primary);
}

.word-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.word-main {
  flex: 1;
  min-width: 0;
}

.word-topline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.ws-word {
  font-size: 18px;
}

.ws-meaning {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.word-side {
  display: flex;
  align-items: center;
  gap: 10px;
}

.word-detail {
  padding: 0 20px 20px;
  animation: slideDown 0.22s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--color-danger);
  background: var(--color-danger-light);
}

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
  }

  .toolbar-select {
    width: 100%;
  }

  .word-summary {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
