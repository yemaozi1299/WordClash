import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadFromLocalStorage, saveWords, exportToFile } from '@/services/storage.js'

export const useWordsStore = defineStore('words', () => {
  const words = ref([])
  const loading = ref(false)
  const error = ref(null)

  const wordCount = computed(() => words.value.length)

  const sortedByRecent = computed(() =>
    [...words.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )

  function init() {
    const saved = loadFromLocalStorage()
    if (saved && saved.words) {
      words.value = saved.words
    }
  }

  function persist() {
    saveWords({ words: words.value })
  }

  function addWord(wordData) {
    const existing = words.value.find(
      w => w.word.toLowerCase() === wordData.word.toLowerCase()
    )
    if (existing) return { existed: true, word: existing }

    const entry = {
      id: crypto.randomUUID(),
      ...wordData,
      createdAt: new Date().toISOString(),
      stats: {
        totalAttempts: 0,
        correctAttempts: 0,
        lastSeen: null,
        lastResult: null,
        consecutiveCorrect: 0
      }
    }
    words.value.push(entry)
    persist()
    return { existed: false, word: entry }
  }

  function updateStats(wordId, result) {
    const w = words.value.find(w => w.id === wordId)
    if (!w) return
    w.stats.totalAttempts++
    w.stats.lastSeen = new Date().toISOString()
    w.stats.lastResult = result
    if (result === 'correct') {
      w.stats.correctAttempts++
      w.stats.consecutiveCorrect++
    } else {
      w.stats.consecutiveCorrect = 0
    }
    persist()
  }

  function getWordById(id) {
    return words.value.find(w => w.id === id)
  }

  function removeWord(id) {
    words.value = words.value.filter(w => w.id !== id)
    persist()
  }

  function exportData() {
    exportToFile({ words: words.value })
  }

  return {
    words,
    loading,
    error,
    wordCount,
    sortedByRecent,
    init,
    addWord,
    updateStats,
    getWordById,
    removeWord,
    exportData
  }
})
