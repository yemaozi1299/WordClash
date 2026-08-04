<script setup>
import { ref, nextTick } from 'vue'
import { useWordsStore } from '@/stores/words.js'
import { parseWord } from '@/services/deepseek.js'

const wordsStore = useWordsStore()
const inputText = ref('')
const inputEl = ref(null)
const parsing = ref(false)
const parseError = ref(null)
const lastAdded = ref(null)

async function submitWord() {
  const word = inputText.value.trim()
  if (!word || parsing.value) return

  parsing.value = true
  parseError.value = null
  lastAdded.value = null

  try {
    const parsed = await parseWord(word)
    const result = wordsStore.addWord(parsed)
    if (result.existed) {
      parseError.value = `"${word}" 已存在，已跳过`
    } else {
      lastAdded.value = result.word
    }
    inputText.value = ''
  } catch (e) {
    if (e.message === 'API_KEY_MISSING') {
      parseError.value = '未配置 API Key，请在 .env 中设置 VITE_DEEPSEEK_API_KEY'
    } else {
      parseError.value = `解析失败: ${e.message}`
    }
  } finally {
    parsing.value = false
    nextTick(() => inputEl.value?.focus())
  }
}

function removeWord(id, e) {
  e.stopPropagation()
  wordsStore.removeWord(id)
}

wordsStore.init()
</script>

<template>
  <div class="page">
    <h1 class="page-title">单词录入</h1>
    <p class="page-desc">输入英文单词，回车即可由 AI 自动解析并保存</p>

    <div class="input-area">
      <input
        ref="inputEl"
        v-model="inputText"
        type="text"
        placeholder="输入英文单词，按回车录入..."
        class="word-input"
        :disabled="parsing"
        @keyup.enter="submitWord"
      />
      <button
        class="btn btn-primary"
        :disabled="!inputText.trim() || parsing"
        @click="submitWord"
      >
        {{ parsing ? '解析中...' : '录入' }}
      </button>
    </div>

    <p v-if="parseError" class="error-msg">{{ parseError }}</p>

    <div v-if="lastAdded" class="last-added">
      <h3>已录入</h3>
      <div class="added-card">
        <span class="added-word">{{ lastAdded.word }}</span>
        <span class="added-phonetic">{{ lastAdded.phonetic }}</span>
        <span class="added-meaning">{{ lastAdded.meanings[0]?.meaning }}</span>
      </div>
    </div>

    <div v-if="wordsStore.wordCount > 0" class="recent-list">
      <h3>最近录入 ({{ wordsStore.wordCount }} 个单词)</h3>
      <div v-for="w in wordsStore.sortedByRecent.slice(0, 20)" :key="w.id" class="recent-item">
        <span class="recent-word">{{ w.word }}</span>
        <span class="recent-meaning">{{ w.meanings[0]?.meaning }}</span>
        <button class="btn-delete" @click="removeWord(w.id, $event)" title="删除">×</button>
      </div>
    </div>

    <div v-if="wordsStore.wordCount === 0" class="empty-state">
      还没有单词，开始录入吧
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
  margin-bottom: 28px;
}

.input-area {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.word-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 16px;
  outline: none;
  transition: border-color 0.15s;
}

.word-input:focus {
  border-color: var(--color-primary);
}

.word-input:disabled {
  opacity: 0.6;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: var(--color-danger);
  font-size: 14px;
  margin-bottom: 12px;
}

.last-added {
  margin-bottom: 28px;
}

.last-added h3,
.recent-list h3 {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.added-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #e8f8f0;
  border: 1px solid #c3e6d7;
  border-radius: var(--radius);
  padding: 14px 18px;
}

.added-word {
  font-size: 18px;
  font-weight: 600;
}

.added-phonetic {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.added-meaning {
  color: var(--color-success);
  font-size: 14px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.recent-word {
  font-weight: 500;
  font-size: 15px;
  min-width: 120px;
}

.recent-meaning {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.btn-delete {
  margin-left: auto;
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

.recent-item:hover .btn-delete {
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
