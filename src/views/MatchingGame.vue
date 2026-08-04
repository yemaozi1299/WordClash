<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game.js'
import { useWordsStore } from '@/stores/words.js'
import { analyzeGameSession } from '@/services/deepseek.js'

const gameStore = useGameStore()
const wordsStore = useWordsStore()
const lastAnalysis = ref(null)
const analyzing = ref(false)

const canStart = computed(() => wordsStore.wordCount >= 2)

function handleStart() {
  const ok = gameStore.startSession()
  if (!ok) {
    alert('至少需要 2 个单词才能开始游戏')
  }
}

function handleLeftClick(card) {
  if (!card.wordId) return
  gameStore.selectLeft(card)
}

function handleRightClick(card) {
  if (!card.wordId || !gameStore.selectedLeft) return
  gameStore.selectRight(card)

  if (gameStore.matchResult === 'correct') {
    setTimeout(() => {
      gameStore.clearMatchedPair()
    }, 400)
  } else if (gameStore.matchResult === 'wrong') {
    setTimeout(() => {
      gameStore.selectedLeft = null
      gameStore.selectedRight = null
      gameStore.matchResult = null
    }, 600)
  }
}

async function handleEndSession() {
  const history = gameStore.endSession()
  if (history.length === 0) return

  analyzing.value = true
  try {
    const stats = wordsStore.words.map(w => ({
      word: w.word,
      totalAttempts: w.stats.totalAttempts,
      correctAttempts: w.stats.correctAttempts,
      consecutiveCorrect: w.stats.consecutiveCorrect
    }))
    const result = await analyzeGameSession({ history, allWordStats: stats })
    lastAnalysis.value = result
  } catch (e) {
    lastAnalysis.value = {
      overallAssessment: `本次游戏完成。共 ${history.length} 次匹配，正确 ${history.filter(h => h.result === 'correct').length} 次。`,
      masteredWords: [],
      weakWords: history.filter(h => h.result === 'wrong').map(h => h.word),
      reviewSuggestions: '确认 API Key 已正确配置后可获取 AI 详细分析',
      score: Math.round(history.filter(h => h.result === 'correct').length / history.length * 100)
    }
  } finally {
    analyzing.value = false
  }
}

function leftCardClass(card) {
  return {
    'match-card': true,
    'left-card': true,
    'selected': gameStore.selectedLeft?.id === card.id,
    'matched': gameStore.matchResult === 'correct' && gameStore.selectedLeft?.id === card.id,
    'wrong': gameStore.matchResult === 'wrong' && gameStore.selectedLeft?.id === card.id,
    'cleared': card.cleared
  }
}

function rightCardClass(card) {
  return {
    'match-card': true,
    'right-card': true,
    'selected': gameStore.selectedRight?.id === card.id,
    'matched': gameStore.matchResult === 'correct' && gameStore.selectedRight?.id === card.id,
    'wrong': gameStore.matchResult === 'wrong' && gameStore.selectedRight?.id === card.id,
    'cleared': card.cleared
  }
}

// Correct count in current session
const sessionCorrect = computed(() =>
  gameStore.sessionHistory.filter(h => h.result === 'correct').length
)
const sessionWrong = computed(() =>
  gameStore.sessionHistory.filter(h => h.result === 'wrong').length
)

const refreshHint = computed(() => {
  const n = 2 - gameStore.pendingRefresh
  if (n <= 0) return '刷新中...'
  return `再消除 ${n} 对刷新单词`
})

wordsStore.init()
</script>

<template>
  <div class="page">
    <h1 class="page-title">对对碰</h1>
    <p class="page-desc">点击左边英文，再点击右边对应的中文释义进行匹配</p>

    <div v-if="!gameStore.sessionActive" class="game-start">
      <button class="btn btn-start" :disabled="!canStart" @click="handleStart">
        {{ canStart ? '开始游戏' : '单词不足，请先录入' }}
      </button>
      <p class="word-count">当前词库: {{ wordsStore.wordCount }} 个单词</p>
    </div>

    <div v-else class="game-area">
      <div class="game-header">
        <span class="score">正确 {{ sessionCorrect }} / 错误 {{ sessionWrong }}</span>
        <span class="refresh-hint">{{ refreshHint }}</span>
        <button class="btn btn-end" @click="handleEndSession">结束本轮</button>
      </div>

      <div class="board">
        <div class="column">
          <div
            v-for="card in gameStore.leftCards"
            :key="card.id"
            :class="leftCardClass(card)"
            @click="handleLeftClick(card)"
          >
            {{ card.text || '—' }}
          </div>
        </div>
        <div class="column-divider"></div>
        <div class="column">
          <div
            v-for="card in gameStore.rightCards"
            :key="card.id"
            :class="rightCardClass(card)"
            @click="handleRightClick(card)"
          >
            {{ card.text || '—' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="analyzing" class="analysis-loading">
      正在分析学习情况...
    </div>

    <div v-if="lastAnalysis" class="analysis-card">
      <h3>学习分析</h3>
      <div class="analysis-score">
        <span class="score-number">{{ lastAnalysis.score }}</span>
        <span class="score-label">分</span>
      </div>
      <p class="analysis-text">{{ lastAnalysis.overallAssessment }}</p>
      <div v-if="lastAnalysis.weakWords?.length" class="analysis-section">
        <h4>需要加强</h4>
        <span v-for="w in lastAnalysis.weakWords" :key="w" class="tag tag-weak">{{ w }}</span>
      </div>
      <div v-if="lastAnalysis.masteredWords?.length" class="analysis-section">
        <h4>已掌握</h4>
        <span v-for="w in lastAnalysis.masteredWords" :key="w" class="tag tag-mastered">{{ w }}</span>
      </div>
      <p v-if="lastAnalysis.reviewSuggestions" class="analysis-text">{{ lastAnalysis.reviewSuggestions }}</p>
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

.game-start {
  text-align: center;
  padding: 60px 0;
}

.btn-start {
  padding: 14px 40px;
  font-size: 16px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 500;
}

.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.word-count {
  margin-top: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.game-area {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.score {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.refresh-hint {
  font-size: 12px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 3px 10px;
  border-radius: 12px;
}

.btn-end {
  padding: 8px 16px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 13px;
}

.btn-end:hover {
  background: var(--color-bg);
}

.board {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  max-width: 280px;
}

.column-divider {
  width: 1px;
  background: var(--color-border);
}

.match-card {
  padding: 16px 20px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 15px;
  text-align: center;
  transition: all 0.15s ease;
  user-select: none;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-card:hover:not(.cleared) {
  border-color: var(--color-primary);
}

.match-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: scale(1.02);
}

.match-card.matched {
  border-color: var(--color-success);
  background: #e8f8f0;
  animation: matchPop 0.3s ease;
}

.match-card.wrong {
  border-color: var(--color-danger);
  background: #fef0f0;
  animation: shake 0.4s ease;
}

.match-card.cleared {
  opacity: 0.3;
  pointer-events: none;
}

@keyframes matchPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 0.5; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.analysis-loading {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 24px;
  font-size: 14px;
}

.analysis-card {
  margin-top: 32px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
}

.analysis-card h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.analysis-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 16px;
}

.score-number {
  font-size: 40px;
  font-weight: 700;
  color: var(--color-primary);
}

.score-label {
  color: var(--color-text-secondary);
  font-size: 16px;
}

.analysis-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.analysis-section {
  margin-bottom: 14px;
}

.analysis-section h4 {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
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
</style>
