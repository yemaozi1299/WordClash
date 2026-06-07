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
      overallAssessment: '无法获取 AI 分析，请确认 DeepSeek API Key 已配置',
      masteredWords: [],
      weakWords: wordsWithData.value
        .filter(w => (w.stats.correctAttempts / w.stats.totalAttempts) < 0.5)
        .map(w => w.word),
      reviewSuggestions: '配置 API Key 后获取详细分析',
      score: overallAccuracy.value
    }
  } finally {
    analyzing.value = false
  }
}

wordsStore.init()
</script>

<template>
  <div class="page">
    <h1 class="page-title">学习分析</h1>
    <p class="page-desc">基于对对碰数据，AI 分析你的单词掌握情况</p>

    <div class="stats-grid">
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
    </div>

    <button class="btn-analyze" :disabled="analyzing || wordsWithData.length === 0" @click="runAnalysis">
      {{ analyzing ? '分析中...' : 'AI 深度分析' }}
    </button>

    <div v-if="analysis" class="analysis-result">
      <div class="analysis-score">
        <span class="score-num">{{ analysis.score }}</span>
        <span class="score-unit">分</span>
      </div>
      <p class="analysis-text">{{ analysis.overallAssessment }}</p>

      <div v-if="analysis.weakWords?.length" class="ar-section">
        <h4>需要加强的单词</h4>
        <span v-for="w in analysis.weakWords" :key="w" class="tag tag-weak">{{ w }}</span>
      </div>

      <div v-if="analysis.masteredWords?.length" class="ar-section">
        <h4>已掌握的单词</h4>
        <span v-for="w in analysis.masteredWords" :key="w" class="tag tag-mastered">{{ w }}</span>
      </div>

      <div v-if="analysis.reviewSuggestions" class="ar-section">
        <h4>复习建议</h4>
        <p class="analysis-text">{{ analysis.reviewSuggestions }}</p>
      </div>
    </div>

    <div v-if="!analysis && wordsWithData.length === 0" class="empty-state">
      还没有练习数据，先去对对碰玩一轮吧
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
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.btn-analyze {
  display: block;
  width: 100%;
  padding: 12px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  cursor: pointer;
  margin-bottom: 24px;
}

.btn-analyze:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.analysis-result {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  animation: fadeIn 0.3s ease;
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

.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  margin: 0 6px 6px 0;
}

.tag-weak {
  background: #fef0f0;
  color: var(--color-danger);
}

.tag-mastered {
  background: #e8f8f0;
  color: var(--color-success);
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 60px 0;
  font-size: 15px;
}
</style>
