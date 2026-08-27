import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWordsStore } from './words.js'

const PAIR_COUNT = 5
const REAPPEAR_AFTER_ROUNDS = 5

export const useGameStore = defineStore('game', () => {
  const sessionActive = ref(false)
  const leftCards = ref([])   // [{ id, text, wordId, slot }]
  const rightCards = ref([])  // [{ id, text, wordId, slot }]
  const selectedLeft = ref(null)
  const selectedRight = ref(null)
  const matchResult = ref(null) // 'correct' | 'wrong' | null
  const sessionHistory = ref([]) // [{ wordId, word, result, timestamp }]
  const roundCount = ref(0)
  const lastRoundUsage = ref({}) // { wordId: roundNumber }
  const pendingRefresh = ref(0)  // 积攒的匹配对数

  function getCandidateWords() {
    const wordsStore = useWordsStore()
    const all = wordsStore.words
    if (all.length === 0) return []

    const now = roundCount.value

    const scored = all.map(w => {
      let score = 0
      const s = w.stats

      // New words get high priority
      if (s.totalAttempts === 0) {
        score += 50
      }

      // Recently wrong words get high priority
      if (s.lastResult === 'wrong') {
        score += 40
      }

      // Words not seen recently
      const lastRound = lastRoundUsage.value[w.id]
      if (lastRound === undefined) {
        score += 30
      } else {
        const roundsSince = now - lastRound
        if (roundsSince >= REAPPEAR_AFTER_ROUNDS) {
          score += 25
        } else {
          score += roundsSince * 5
        }
      }

      // Error rate bonus
      if (s.totalAttempts > 0) {
        const errorRate = 1 - (s.correctAttempts / s.totalAttempts)
        score += errorRate * 30
      }

      // Correct streak penalty (reduce probability, but never to 0)
      score -= s.consecutiveCorrect * 3

      // Minimum score ensures every word has a chance
      return { word: w, score: Math.max(1, score) }
    })

    scored.sort((a, b) => b.score - a.score)

    // Weighted random selection from top candidates
    const pool = scored.slice(0, Math.min(20, scored.length))
    return selectWeighted(pool, PAIR_COUNT)
  }

  function selectWeighted(pool, count) {
    const selected = []
    const remaining = [...pool]

    while (selected.length < count && remaining.length > 0) {
      const totalScore = remaining.reduce((sum, item) => sum + item.score, 0)
      let rand = Math.random() * totalScore
      let i = 0
      while (rand > 0 && i < remaining.length) {
        rand -= remaining[i].score
        i++
      }
      i = Math.max(0, i - 1)
      selected.push(remaining[i].word)
      remaining.splice(i, 1)
    }
    return selected
  }

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function startSession() {
    const words = getCandidateWords()
    if (words.length < 2) return false

    sessionActive.value = true
    roundCount.value++
    sessionHistory.value = []
    matchResult.value = null
    pendingRefresh.value = 0

    // Build left cards (English)
    const picked = words.slice(0, PAIR_COUNT)
    leftCards.value = shuffle(picked).map((w, i) => ({
      id: `l-${i}`,
      text: w.word,
      wordId: w.id,
      slot: i
    }))

    // Build right cards (Chinese meanings, shuffled independently)
    rightCards.value = shuffle(picked).map((w, i) => ({
      id: `r-${i}`,
      text: w.meanings[0]?.meaning || w.word,
      wordId: w.id,
      slot: i
    }))

    // Mark words as used in this round
    picked.forEach(w => {
      lastRoundUsage.value[w.id] = roundCount.value
    })

    return true
  }

  function selectLeft(card) {
    if (matchResult.value === 'correct') return
    resetSelection(card)
  }

  function selectRight(card) {
    if (!selectedLeft.value || matchResult.value === 'correct') return
    selectedRight.value = card

    const isMatch = selectedLeft.value.wordId === card.wordId
    if (isMatch) {
      matchResult.value = 'correct'
      sessionHistory.value.push({
        wordId: card.wordId,
        word: selectedLeft.value.text,
        result: 'correct',
        timestamp: new Date().toISOString()
      })
      const wordsStore = useWordsStore()
      wordsStore.updateStats(card.wordId, 'correct')
    } else {
      matchResult.value = 'wrong'
      sessionHistory.value.push({
        wordId: selectedLeft.value.wordId,
        word: selectedLeft.value.text,
        result: 'wrong',
        timestamp: new Date().toISOString()
      })
      const wordsStore = useWordsStore()
      wordsStore.updateStats(selectedLeft.value.wordId, 'wrong')
    }
  }

  function clearMatchedPair() {
    if (matchResult.value !== 'correct') return
    const leftSlot = selectedLeft.value.slot
    const rightSlot = selectedRight.value.slot

    leftCards.value[leftSlot] = { ...leftCards.value[leftSlot], text: '', wordId: null, cleared: true }
    rightCards.value[rightSlot] = { ...rightCards.value[rightSlot], text: '', wordId: null, cleared: true }

    pendingRefresh.value++
    resetSelection()

    if (pendingRefresh.value >= 2) {
      batchRefresh()
    }
  }

  function batchRefresh() {
    const wordsStore = useWordsStore()
    const allWords = wordsStore.words

    // Active wordIds still on the board (non-cleared left cards)
    const activeIds = leftCards.value
      .filter(c => !c.cleared && c.wordId)
      .map(c => c.wordId)

    const clearedCount = leftCards.value.filter(c => c.cleared).length

    // Pick new words
    const available = allWords.filter(w => !activeIds.includes(w.id))
    const shuffledAvail = shuffle(available)
    const newWords = shuffledAvail.slice(0, clearedCount)

    // Fill cleared left slots with new English words
    let ni = 0
    for (let i = 0; i < leftCards.value.length; i++) {
      if (leftCards.value[i].cleared && ni < newWords.length) {
        const w = newWords[ni]
        ni++
        leftCards.value[i] = {
          id: `l-${i}-${Date.now()}`,
          text: w.word,
          wordId: w.id,
          slot: i
        }
        lastRoundUsage.value[w.id] = roundCount.value
        activeIds.push(w.id)
      }
    }

    // Rebuild right column: collect all active wordIds, shuffle, redistribute
    const allRightCards = activeIds.map(id => {
      const w = wordsStore.getWordById(id)
      return {
        id: `r-${Date.now()}-${Math.random()}`,
        text: w?.meanings[0]?.meaning || '',
        wordId: id,
        slot: -1
      }
    })

    const shuffledRight = shuffle(allRightCards)

    // Assign shuffled cards to all right slots
    for (let i = 0; i < rightCards.value.length; i++) {
      if (i < shuffledRight.length) {
        rightCards.value[i] = { ...shuffledRight[i], slot: i }
      } else {
        // Fewer active words than slots — leave empty
        rightCards.value[i] = { ...rightCards.value[i], text: '', wordId: null, cleared: true }
      }
    }

    pendingRefresh.value = 0
  }

  function endSession() {
    sessionActive.value = false
    return [...sessionHistory.value]
  }

  function resetSelection(nextLeft = null) {
    selectedLeft.value = nextLeft
    selectedRight.value = null
    matchResult.value = null
  }

  const allCleared = computed(() =>
    leftCards.value.every(c => c.cleared) || rightCards.value.every(c => c.cleared)
  )

  return {
    sessionActive,
    leftCards,
    rightCards,
    selectedLeft,
    selectedRight,
    matchResult,
    sessionHistory,
    roundCount,
    pendingRefresh,
    allCleared,
    startSession,
    selectLeft,
    selectRight,
    resetSelection,
    clearMatchedPair,
    batchRefresh,
    endSession
  }
})
