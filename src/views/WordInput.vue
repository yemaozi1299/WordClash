<script setup>
import { ref, nextTick, computed } from 'vue'
import { useWordsStore } from '@/stores/words.js'
import { parseWord } from '@/services/deepseek.js'

const wordsStore = useWordsStore()
const inputText = ref('')
const inputEl = ref(null)
const parsing = ref(false)
const parseError = ref(null)
const lastAdded = ref(null)

const recentWords = computed(() => wordsStore.sortedByRecent.slice(0, 8))
const practicedCount = computed(() =>
  wordsStore.words.filter(word => word.stats.totalAttempts > 0).length
)

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
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-group">
        <span class="page-eyebrow">Capture</span>
        <h1 class="page-title">单词录入</h1>
        <p class="page-desc">
          输入一个英文单词，系统会调用 AI 自动补齐音标、释义、例句和记忆信息。这里是你的收词入口，也是后续练习的起点。
        </p>
      </div>
    </header>

    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">当前词库</span>
        <span class="stat-value">{{ wordsStore.wordCount }}</span>
        <span class="stat-hint">已沉淀到你的个人学习数据</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">已练习单词</span>
        <span class="stat-value">{{ practicedCount }}</span>
        <span class="stat-hint">进入对对碰后会自动累计统计</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最近录入</span>
        <span class="stat-value">{{ recentWords[0]?.word || '—' }}</span>
        <span class="stat-hint">保持连续录入能更快形成练习池</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">录入方式</span>
        <span class="stat-value">{{ parsing ? '解析中' : '单词直录' }}</span>
        <span class="stat-hint">支持回车提交，适合快速收词</span>
      </div>
    </section>

    <section class="split-layout">
      <div class="panel panel-soft stack-layout">
        <div class="section-head">
          <div>
            <h2 class="section-title">录入工作区</h2>
            <p class="section-desc">建议一词一录，先积累词量，再进入游戏和分析页复习。</p>
          </div>
          <span class="chip">AI 解析</span>
        </div>

        <div class="form-stack">
          <input
            ref="inputEl"
            v-model="inputText"
            type="text"
            placeholder="例如：resilient / concise / obscure"
            class="input input-strong"
            :disabled="parsing"
            @keyup.enter="submitWord"
          />
          <div class="form-actions">
            <button
              class="btn btn-primary"
              :disabled="!inputText.trim() || parsing"
              @click="submitWord"
            >
              {{ parsing ? '正在解析...' : '加入词库' }}
            </button>
            <span class="muted">回车也可以直接提交</span>
          </div>
        </div>

        <p v-if="parseError" class="notice notice-error">{{ parseError }}</p>

        <div v-if="lastAdded" class="success-card">
          <div class="success-head">
            <span class="chip chip-success">已录入</span>
            <strong>{{ lastAdded.word }}</strong>
          </div>
          <div class="success-meta">
            <span>{{ lastAdded.phonetic || '暂无音标' }}</span>
            <span>{{ lastAdded.meanings[0]?.meaning || '暂无释义' }}</span>
          </div>
          <p class="success-tip">{{ lastAdded.memoryTip || '你可以接着录入下一词，或去单词库查看详情。' }}</p>
        </div>

        <div class="tips-grid">
          <div class="tip-card">
            <span class="tip-index">01</span>
            <strong>先收词再练习</strong>
            <p>先把近期遇到的生词收进来，再去游戏页集中强化。</p>
          </div>
          <div class="tip-card">
            <span class="tip-index">02</span>
            <strong>优先录高频词</strong>
            <p>优先录入近期读文章、看资料时反复出现的词，收益最高。</p>
          </div>
        </div>
      </div>

      <div class="panel stack-layout">
        <div class="section-head">
          <div>
            <h2 class="section-title">最近录入</h2>
            <p class="section-desc">你最近加入词库的单词会出现在这里，方便快速回看和清理。</p>
          </div>
          <span class="chip">{{ wordsStore.wordCount }} 词</span>
        </div>

        <div v-if="recentWords.length === 0" class="empty-state">
          <strong>词库还是空的</strong>
          先在左侧录入一个单词，系统会自动补齐词义与记忆信息。
        </div>

        <div v-else class="recent-list">
          <div v-for="w in recentWords" :key="w.id" class="recent-item">
            <div class="recent-main">
              <div class="recent-word-line">
                <strong>{{ w.word }}</strong>
                <span class="muted">{{ w.phonetic || '暂无音标' }}</span>
              </div>
              <span class="recent-meaning">{{ w.meanings[0]?.meaning || '暂无释义' }}</span>
            </div>
            <button class="icon-btn" title="删除" @click="removeWord(w.id, $event)">
              ×
            </button>
          </div>
      </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-strong {
  min-height: 56px;
  font-size: 18px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.chip-success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.success-card {
  padding: 18px;
  border: 1px solid rgba(38, 153, 108, 0.18);
  border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(237, 249, 243, 0.9), rgba(255, 255, 255, 0.95));
}

.success-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.success-head strong {
  font-size: 20px;
}

.success-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.success-tip {
  margin-top: 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.tip-card {
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.tip-index {
  display: inline-block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 0.08em;
}

.tip-card strong {
  display: block;
  margin-bottom: 8px;
}

.tip-card p {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
}

.recent-main {
  flex: 1;
  min-width: 0;
}

.recent-word-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.recent-word-line strong {
  font-size: 16px;
}

.recent-meaning {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 12px;
  background: #fff;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 20px;
}

.icon-btn:hover {
  color: var(--color-danger);
}

@media (max-width: 1100px) {
  .tips-grid {
    grid-template-columns: 1fr;
  }
}
</style>
