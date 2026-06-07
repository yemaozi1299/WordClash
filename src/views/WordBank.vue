<script setup>
import { ref, computed } from 'vue'
import { useWordsStore } from '@/stores/words.js'
import WordCard from '@/components/WordCard.vue'

const wordsStore = useWordsStore()
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

function removeWord(id, e) {
  e.stopPropagation()
  if (confirm('确认删除这个单词？')) {
    wordsStore.removeWord(id)
    if (selectedWord.value?.id === id) selectedWord.value = null
  }
}

wordsStore.init()
</script>

<template>
  <div class="page">
    <h1 class="page-title">单词库</h1>
    <p class="page-desc">共 {{ wordsStore.wordCount }} 个单词</p>

    <div class="toolbar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索单词或释义..."
        class="search-input"
      />
      <select v-model="sortBy" class="sort-select">
        <option value="recent">最近录入</option>
        <option value="alphabetical">字母顺序</option>
        <option value="accuracy">正确率</option>
      </select>
    </div>

    <div v-if="filteredWords.length === 0" class="empty-state">
      没有匹配的单词
    </div>

    <div class="word-list">
      <div
        v-for="w in filteredWords"
        :key="w.id"
        class="word-row"
        :class="{ expanded: selectedWord?.id === w.id }"
        @click="selectedWord = selectedWord?.id === w.id ? null : w"
      >
        <div class="word-summary">
          <span class="ws-word">{{ w.word }}</span>
          <span class="ws-meaning">{{ w.meanings[0]?.meaning }}</span>
          <span class="ws-accuracy">{{ accuracy(w) }}</span>
          <button class="btn-delete" @click="removeWord(w.id, $event)" title="删除">×</button>
        </div>
        <div v-if="selectedWord?.id === w.id" class="word-detail">
          <WordCard :word="w" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}

.page-desc {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: var(--color-primary);
}

.sort-select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  background: var(--color-surface);
  cursor: pointer;
}

.word-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.word-row {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s;
}

.word-row:hover {
  border-color: var(--color-primary);
}

.word-row.expanded {
  border-color: var(--color-primary);
}

.word-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
}

.ws-word {
  font-weight: 600;
  font-size: 15px;
  min-width: 120px;
}

.ws-meaning {
  flex: 1;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.ws-accuracy {
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 500;
}

.word-detail {
  padding: 0 16px 16px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.btn-delete {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.word-summary:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: var(--color-danger);
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 60px 0;
  font-size: 15px;
}
</style>
