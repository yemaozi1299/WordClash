const LEGACY_WORDS_KEY = 'wordmatch-words'
const LEGACY_ARTICLES_KEY = 'wordclash-articles'
const APP_DATA_KEY = 'wordclash-user-data'
const APP_DATA_VERSION = 1

function createEmptyAppData() {
  return {
    version: APP_DATA_VERSION,
    exportedAt: null,
    words: [],
    articles: []
  }
}

function normalizeAppData(data) {
  if (!data || typeof data !== 'object') {
    return createEmptyAppData()
  }

  const base = createEmptyAppData()
  return {
    ...base,
    ...data,
    version: APP_DATA_VERSION,
    words: Array.isArray(data.words) ? data.words : [],
    articles: Array.isArray(data.articles) ? data.articles : []
  }
}

function loadLegacyData() {
  let words = []
  let articles = []

  try {
    const rawWords = localStorage.getItem(LEGACY_WORDS_KEY)
    if (rawWords) {
      const parsed = JSON.parse(rawWords)
      words = Array.isArray(parsed?.words) ? parsed.words : []
    }
  } catch {
    words = []
  }

  try {
    const rawArticles = localStorage.getItem(LEGACY_ARTICLES_KEY)
    if (rawArticles) {
      const parsed = JSON.parse(rawArticles)
      articles = Array.isArray(parsed) ? parsed : []
    }
  } catch {
    articles = []
  }

  if (words.length === 0 && articles.length === 0) {
    return null
  }

  return normalizeAppData({
    exportedAt: new Date().toISOString(),
    words,
    articles
  })
}

export function loadAppData() {
  try {
    const raw = localStorage.getItem(APP_DATA_KEY)
    if (raw) {
      return normalizeAppData(JSON.parse(raw))
    }
  } catch {
    // 忽略损坏数据，降级到旧结构迁移或空数据
  }

  const legacy = loadLegacyData()
  if (legacy) {
    saveAppData(legacy)
    return legacy
  }

  return createEmptyAppData()
}

export function saveAppData(data) {
  const next = normalizeAppData({
    ...data,
    exportedAt: data?.exportedAt || new Date().toISOString()
  })

  try {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(next))
  } catch (e) {
    // 配额溢出不阻断界面交互，但需要保留告警方便排查
    console.warn('应用数据持久化失败（localStorage 可能已满）:', e)
  }
}

export function updateAppData(patch) {
  const current = loadAppData()
  saveAppData({
    ...current,
    ...patch,
    exportedAt: new Date().toISOString()
  })
}

export function exportAppData(data) {
  const blob = new Blob(
    [JSON.stringify(normalizeAppData({ ...data, exportedAt: new Date().toISOString() }), null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'wordclash-user-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function readImportedAppData(file) {
  const text = await file.text()
  return normalizeAppData(JSON.parse(text))
}
