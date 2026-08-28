import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadAppData, updateAppData } from '@/services/storage.js'

// 容量保护：localStorage 有限，最多保留最近 MAX_ARTICLES 篇
const MAX_ARTICLES = 20

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref([])
  const loading = ref(false)
  const initialized = ref(false)

  const articleCount = computed(() => articles.value.length)
  const sortedByRecent = computed(() =>
    [...articles.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )

  function init(force = false) {
    if (initialized.value && !force) return

    hydrate(loadAppData().articles, { force: true })
  }

  function persistArticles() {
    updateAppData({ articles: articles.value })
  }

  function hydrate(nextArticles, options = {}) {
    const { force = false, persist = false } = options
    if (initialized.value && !force) return

    articles.value = Array.isArray(nextArticles) ? nextArticles : []
    initialized.value = true

    if (persist) {
      persistArticles()
    }
  }

  function addArticle({ title, content }) {
    const entry = {
      id: crypto.randomUUID(),
      title: title || '未命名文章',
      content,
      createdAt: new Date().toISOString(),
      analysis: null,        // 首屏解析：{ summary, difficulty, keyPoints, rawWords }
      translations: {},      // 段落翻译缓存：{ [paraIndex]: "中文翻译" }
      breakdowns: {},        // 段落拆解缓存：{ [paraIndex]: { translation, structure, grammar } }
      addedWordIds: [],      // 已从本文入库的生词 id
      wordDetails: null,           // 预解析生词: { [lowercase]: parseResult }
      sentenceBreakdowns: null,    // 逐句拆解: { [`${paraIdx}-${sentIdx}`]: { translation, structure, grammar } }
      quiz: null             // 读后理解题：{ questions: [...] }
    }
    articles.value.unshift(entry)
    // 超出上限时清理最旧的
    if (articles.value.length > MAX_ARTICLES) {
      articles.value = articles.value.slice(0, MAX_ARTICLES)
    }
    persistArticles()
    return entry
  }

  function getArticleById(id) {
    return articles.value.find(a => a.id === id)
  }

  function updateArticle(id, patch, options = {}) {
    const a = getArticleById(id)
    if (!a) return
    Object.assign(a, patch)
    if (options.persist !== false) {
      persistArticles()
    }
  }

  function removeArticle(id) {
    articles.value = articles.value.filter(a => a.id !== id)
    persistArticles()
  }

  function replaceArticles(nextArticles, persistNow = true) {
    articles.value = Array.isArray(nextArticles) ? nextArticles : []
    initialized.value = true
    if (persistNow) {
      persistArticles()
    }
  }

  function snapshot() {
    return [...articles.value]
  }

  function persistNow() {
    persistArticles()
  }

  return {
    articles,
    loading,
    initialized,
    articleCount,
    sortedByRecent,
    init,
    hydrate,
    addArticle,
    getArticleById,
    updateArticle,
    removeArticle,
    replaceArticles,
    snapshot,
    persistNow
  }
})
