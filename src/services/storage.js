const DB_PATH = '/data/words.json'

let db = null

async function ensureDir() {
  // In browser context, we use fetch to read and the File System Access API or localStorage
  // For this project, we use Pinia + localStorage as the persistence layer,
  // but words.json serves as the canonical export/backup.
}

export async function loadWords() {
  try {
    const res = await fetch(DB_PATH)
    if (!res.ok) return { words: [] }
    return await res.json()
  } catch {
    return { words: [] }
  }
}

export async function saveWords(data) {
  // In dev mode, Vite serves files statically — we can't write to disk.
  // The real persistence goes through localStorage in the Pinia store.
  // This module is the disk-read entry point; writes go via store to localStorage
  // and optionally exported as JSON download.
  localStorage.setItem('wordmatch-words', JSON.stringify(data))
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('wordmatch-words')
    if (!raw) return null
    const data = JSON.parse(raw)
    return data
  } catch {
    return null
  }
}

export function exportToFile(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `words-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ========== 文章阅读持久化 ==========

export function loadArticles() {
  try {
    const raw = localStorage.getItem('wordclash-articles')
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveArticles(articles) {
  try {
    localStorage.setItem('wordclash-articles', JSON.stringify(articles))
  } catch (e) {
    // 配额溢出（QuotaExceededError）不应中断解析流程：内存仍更新，仅持久化失败
    console.warn('文章持久化失败（localStorage 可能已满）:', e)
  }
}
