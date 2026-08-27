<script setup>
import { ref, computed } from 'vue'
import { useWordsStore } from '@/stores/words.js'
import { analyzeGameSession } from '@/services/deepseek.js'

const wordsStore = useWordsStore()
const analyzing = ref(false)
const analysis = ref(null)

const wordsWithData = computed(() =>
  wordsStore.words.filter(w => w.stats.totalAttempts > 0)
)

const wordsWithoutData = computed(() =>
  wordsStore.words.filter(w => w.stats.totalAttempts === 0)
)

const overallAccuracy = computed(() => {
  const total = wordsStore.words.reduce((s, w) => s + w.stats.totalAttempts, 0)
  const correct = wordsStore.words.reduce((s, w) => s + w.stats.correctAttempts, 0)
  if (!total) return 0
  return Math.round(correct / total * 100)
})

async function runAnalysis() {
  analyzing.value = true
  try {
    const stats = wordsStore.words.map(w => ({
      word: w.word,
      totalAttempts: w.stats.totalAttempts,
      correctAttempts: w.stats.correctAttempts,
      consecutiveCorrect: w.stats.consecutiveCorrect,
      lastSeen: w.stats.lastSeen
    }))
    const result = await analyzeGameSession({
      history: [],
      allWordStats: stats,
      overallAccuracy: overallAccuracy.value
    })
    analysis.value = result
  } catch (e) {
    analysis.value = {
      overallAssessment: '无法获取 AI 分析，可能未配置 API Key（请联系管理员检查 .env 配置）',
      masteredWords: [],
      weakWords: wordsWithData.value
        .filter(w => (w.stats.correctAttempts / w.stats.totalAttempts) < 0.5)
        .map(w => w.word),
      reviewSuggestions: '确认 API Key 已正确配置后可获取详细分析',
      score: overallAccuracy.value
    }
  } finally {
    analyzing.value = false
  }
}
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-group">
        <span class="page-eyebrow">Insights</span>
        <h1 class="page-title">学习分析</h1>
        <p class="page-desc">
          从练习结果里看你的掌握趋势。这里会汇总练习覆盖率、总体正确率，以及 AI 给出的复习建议。
        </p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" :disabled="analyzing || wordsWithData.length === 0" @click="runAnalysis">
          {{ analyzing ? '分析中...' : 'AI 深度分析' }}
        </button>
      </div>
    </header>

    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ wordsStore.wordCount }}</span>
        <span class="stat-label">总单词数</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ wordsWithData.length }}</span>
        <span class="stat-label">已练习</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ overallAccuracy }}%</span>
        <span class="stat-label">总正确率</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ wordsWithoutData.length }}</span>
        <span class="stat-label">未练习</span>
      </div>
    </section>

    <section v-if="analysis" class="panel analysis-result">
      <div class="analysis-score">
        <span class="score-num">{{ analysis.score }}</span>
        <span class="score-unit">分</span>
      </div>
      <p class="analysis-text">{{ analysis.overallAssessment }}</p>

      <div v-if="analysis.weakWords?.length" class="ar-section">
        <h4>需要加强的单词</h4>
        <span v-for="w in analysis.weakWords" :key="w" class="tag tag-danger">{{ w }}</span>
      </div>

      <div v-if="analysis.masteredWords?.length" class="ar-section">
        <h4>已掌握的单词</h4>
        <span v-for="w in analysis.masteredWords" :key="w" class="tag tag-success">{{ w }}</span>
      </div>

      <div v-if="analysis.reviewSuggestions" class="ar-section">
        <h4>复习建议</h4>
        <p class="analysis-text">{{ analysis.reviewSuggestions }}</p>
      </div>
    </section>

    <section v-else-if="wordsWithData.length === 0" class="empty-state">
      <strong>还没有练习数据</strong>
      先去对对碰玩一轮，再回来这里看 AI 对你最近学习状态的总结。
    </section>
    <section v-else class="panel analysis-placeholder">
      <span class="chip">等待分析</span>
      <h2 class="section-title">你的练习数据已经准备好了</h2>
      <p class="section-desc">
        点击右上角的「AI 深度分析」，系统会基于当前词库的练习覆盖率、正确率和最近表现生成一份复盘建议。
      </p>
    </section>
  </div>
</template>

<style scoped>
.analysis-result {
  animation: fadeIn 0.3s ease;
}

.analysis-placeholder {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.analysis-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 16px;
}

.score-num {
  font-size: 40px;
  font-weight: 700;
  color: var(--color-primary);
}

.score-unit {
  color: var(--color-text-secondary);
  font-size: 16px;
}

.analysis-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.ar-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.ar-section h4 {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

</style>
