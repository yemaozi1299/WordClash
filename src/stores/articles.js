import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadArticles, saveArticles } from '@/services/storage.js'

// 容量保护：localStorage 有限，最多保留最近 MAX_ARTICLES 篇
const MAX_ARTICLES = 20

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref([])
  const loading = ref(false)

  const articleCount = computed(() => articles.value.length)
  const sortedByRecent = computed(() =>
    [...articles.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )

  function init() {
    articles.value = loadArticles()
  }

  function persist() {
    saveArticles(articles.value)
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
      quiz: null             // 读后理解题：{ questions: [...] }
    }
    articles.value.unshift(entry)
    // 超出上限时清理最旧的
    if (articles.value.length > MAX_ARTICLES) {
      articles.value = articles.value.slice(0, MAX_ARTICLES)
    }
    persist()
    return entry
  }

  function getArticleById(id) {
    return articles.value.find(a => a.id === id)
  }

  function updateArticle(id, patch) {
    const a = getArticleById(id)
    if (!a) return
    Object.assign(a, patch)
    persist()
  }

  function removeArticle(id) {
    articles.value = articles.value.filter(a => a.id !== id)
    persist()
  }

  return {
    articles,
    loading,
    articleCount,
    sortedByRecent,
    init,
    addArticle,
    getArticleById,
    updateArticle,
    removeArticle
  }
})
