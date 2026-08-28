<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game.js'
import { useWordsStore } from '@/stores/words.js'
import { analyzeGameSession } from '@/services/deepseek.js'

const gameStore = useGameStore()
const wordsStore = useWordsStore()
const lastAnalysis = ref(null)
const analyzing = ref(false)
const startNotice = ref('')

const canStart = computed(() => wordsStore.wordCount >= 2)

function handleStart() {
  const ok = gameStore.startSession()
  if (!ok) {
    startNotice.value = '至少需要 2 个单词才能开始游戏，请先去单词录入页补充词库。'
    return
  }
  startNotice.value = ''
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
      gameStore.resetSelection()
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
  if (wordsStore.wordCount <= gameStore.leftCards.length) {
    return '当前词库不足时不再补牌'
  }

  const remaining = 2 - gameStore.pendingReplenishPairs.length
  return remaining <= 0 ? '正在补入 2 对新词' : `再答对 ${remaining} 对补入新词`
})
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-group">
        <span class="page-eyebrow">Practice</span>
        <h1 class="page-title">对对碰</h1>
        <p class="page-desc">
          通过英文和中文释义的快速匹配，强化你对单词的第一反应。系统会根据练习结果自动调整下一轮的出题优先级。
        </p>
      </div>
    </header>

    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">词库总量</span>
        <span class="stat-value">{{ wordsStore.wordCount }}</span>
        <span class="stat-hint">至少需要 2 个单词才可以开始游戏</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">本轮正确</span>
        <span class="stat-value">{{ sessionCorrect }}</span>
        <span class="stat-hint">匹配成功后会计入学习记录</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">本轮错误</span>
        <span class="stat-value">{{ sessionWrong }}</span>
        <span class="stat-hint">错误结果会影响后续权重抽样</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">牌面刷新</span>
        <span class="stat-value">{{ refreshHint }}</span>
        <span class="stat-hint">累计答对 2 对后补入 2 对新词，其余未配对牌面保持不动</span>
      </div>
    </section>

    <section v-if="!gameStore.sessionActive" class="panel panel-soft game-start-card">
      <div class="start-copy">
        <h2 class="section-title">开始一轮快速巩固</h2>
        <p class="section-desc">
          推荐在录入一批新词后马上来玩一轮，让新词尽快进入记忆回路。
        </p>
      </div>
      <div class="start-actions">
        <button class="btn btn-primary btn-large" :disabled="!canStart" @click="handleStart">
          {{ canStart ? '开始游戏' : '单词不足，请先录入' }}
        </button>
        <p class="muted">当前词库：{{ wordsStore.wordCount }} 个单词</p>
      </div>
      <p v-if="startNotice" class="notice notice-info">{{ startNotice }}</p>
    </section>

    <section v-else class="panel stack-layout game-panel">
      <div class="game-toolbar">
        <div class="toolbar-pill-group">
          <span class="tag">{{ sessionCorrect }} 次正确</span>
          <span class="tag tag-danger">{{ sessionWrong }} 次错误</span>
          <span class="tag tag-warning">{{ refreshHint }}</span>
        </div>
        <button class="btn btn-secondary" @click="handleEndSession">结束本轮</button>
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
    </section>

    <div v-if="analyzing" class="panel analysis-loading">
      正在分析学习情况...
    </div>

    <div v-if="lastAnalysis" class="panel analysis-card">
      <h3 class="section-title">本轮学习分析</h3>
      <div class="analysis-score">
        <span class="score-number">{{ lastAnalysis.score }}</span>
        <span class="score-label">分</span>
      </div>
      <p class="analysis-text">{{ lastAnalysis.overallAssessment }}</p>
      <div v-if="lastAnalysis.weakWords?.length" class="analysis-section">
        <h4>需要加强</h4>
        <span v-for="w in lastAnalysis.weakWords" :key="w" class="tag tag-danger">{{ w }}</span>
      </div>
      <div v-if="lastAnalysis.masteredWords?.length" class="analysis-section">
        <h4>已掌握</h4>
        <span v-for="w in lastAnalysis.masteredWords" :key="w" class="tag tag-success">{{ w }}</span>
      </div>
      <p v-if="lastAnalysis.reviewSuggestions" class="analysis-text">{{ lastAnalysis.reviewSuggestions }}</p>
    </div>
  </div>
</template>

<style scoped>
.game-start-card,
.game-panel {
  gap: 20px;
}

.start-copy,
.start-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-large {
  min-height: 52px;
  padding: 0 28px;
}

.game-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-pill-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.board {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: stretch;
  padding: 8px 0;
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
  border-radius: 18px;
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
  background: var(--color-success-light);
  animation: matchPop 0.3s ease;
}

.match-card.wrong {
  border-color: var(--color-danger);
  background: var(--color-danger-light);
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
  gap: 0;
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

@media (max-width: 900px) {
  .board {
    flex-direction: column;
  }

  .column-divider {
    display: none;
  }
}
</style>
