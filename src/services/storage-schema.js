export const LEGACY_WORDS_KEY = 'wordmatch-words'
export const LEGACY_ARTICLES_KEY = 'wordclash-articles'
export const APP_DATA_KEY = 'wordclash-user-data'
export const APP_DATA_VERSION = 2

function buildFallbackId(prefix, seed, index) {
  const normalizedSeed = String(seed || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'item'
  return `${prefix}-${normalizedSeed}-${index}`
}

function normalizeIsoDate(value) {
  if (typeof value !== 'string') {
    return new Date().toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeMeaningItem(item) {
  if (!item || typeof item !== 'object') {
    return { pos: '', meaning: '' }
  }

  return {
    pos: typeof item.pos === 'string' ? item.pos : '',
    meaning: typeof item.meaning === 'string' ? item.meaning : ''
  }
}

function normalizeBreakdownItem(item) {
  if (!item || typeof item !== 'object') {
    return { translation: '', structure: '', grammar: [] }
  }

  return {
    translation: typeof item.translation === 'string' ? item.translation : '',
    structure: typeof item.structure === 'string' ? item.structure : '',
    grammar: Array.isArray(item.grammar) ? item.grammar.filter(Boolean) : []
  }
}

function normalizeQuizQuestion(question) {
  if (!question || typeof question !== 'object') {
    return null
  }

  return {
    question: typeof question.question === 'string' ? question.question : '',
    options: Array.isArray(question.options) ? question.options.filter(Boolean) : [],
    answer: typeof question.answer === 'string' ? question.answer : '',
    explanation: typeof question.explanation === 'string' ? question.explanation : ''
  }
}

function normalizeWordStats(stats) {
  return {
    totalAttempts: Number.isFinite(stats?.totalAttempts) ? stats.totalAttempts : 0,
    correctAttempts: Number.isFinite(stats?.correctAttempts) ? stats.correctAttempts : 0,
    lastSeen: typeof stats?.lastSeen === 'string' ? stats.lastSeen : null,
    lastResult: typeof stats?.lastResult === 'string' ? stats.lastResult : null,
    consecutiveCorrect: Number.isFinite(stats?.consecutiveCorrect) ? stats.consecutiveCorrect : 0
  }
}

export function normalizeWordDetail(wordData) {
  if (!wordData || typeof wordData !== 'object') return null

  return {
    word: typeof wordData.word === 'string' ? wordData.word : '',
    phonetic: typeof wordData.phonetic === 'string' ? wordData.phonetic : '',
    meanings: Array.isArray(wordData.meanings) ? wordData.meanings.map(normalizeMeaningItem) : [],
    exampleSentences: Array.isArray(wordData.exampleSentences) ? wordData.exampleSentences.filter(Boolean) : [],
    synonyms: Array.isArray(wordData.synonyms) ? wordData.synonyms.filter(Boolean) : [],
    etymology: typeof wordData.etymology === 'string' ? wordData.etymology : '',
    memoryTip: typeof wordData.memoryTip === 'string' ? wordData.memoryTip : ''
  }
}

export function normalizeWordEntry(word, index = 0) {
  const normalized = normalizeWordDetail(word) || normalizeWordDetail({})

  return {
    id: typeof word?.id === 'string' && word.id ? word.id : buildFallbackId('word', normalized?.word, index),
    ...normalized,
    createdAt: normalizeIsoDate(word?.createdAt),
    stats: normalizeWordStats(word?.stats)
  }
}

function articleLikeObjectToStringMap(value) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => typeof item === 'string' && item)
  )
}

export function normalizeArticleEntry(article, index = 0) {
  const rawWordDetails = article?.wordDetails && typeof article.wordDetails === 'object' ? article.wordDetails : {}
  const rawSentenceBreakdowns = (
    article?.sentenceBreakdowns && typeof article.sentenceBreakdowns === 'object'
      ? article.sentenceBreakdowns
      : article?.breakdowns && typeof article.breakdowns === 'object'
        ? article.breakdowns
        : {}
  )

  const normalizedWordDetails = Object.fromEntries(
    Object.entries(rawWordDetails)
      .map(([key, value]) => [key, normalizeWordDetail(value)])
      .filter(([, value]) => value)
  )

  const normalizedSentenceBreakdowns = Object.fromEntries(
    Object.entries(rawSentenceBreakdowns)
      .map(([key, value]) => [key, normalizeBreakdownItem(value)])
  )

  return {
    id: typeof article?.id === 'string' && article.id ? article.id : buildFallbackId('article', article?.title, index),
    title: typeof article?.title === 'string' && article.title.trim() ? article.title.trim() : '未命名文章',
    content: typeof article?.content === 'string' ? article.content : '',
    createdAt: normalizeIsoDate(article?.createdAt),
    analysis: article?.analysis && typeof article.analysis === 'object'
      ? {
          summary: typeof article.analysis.summary === 'string' ? article.analysis.summary : '',
          difficulty: typeof article.analysis.difficulty === 'string' ? article.analysis.difficulty : '',
          keyPoints: Array.isArray(article.analysis.keyPoints) ? article.analysis.keyPoints.filter(Boolean) : [],
          rawWords: Array.isArray(article.analysis.rawWords)
            ? article.analysis.rawWords
              .filter(Boolean)
              .map(item => ({
                word: typeof item.word === 'string' ? item.word : '',
                reason: typeof item.reason === 'string' ? item.reason : ''
              }))
            : []
        }
      : null,
    translations: articleLikeObjectToStringMap(article?.translations),
    addedWordIds: Array.isArray(article?.addedWordIds) ? article.addedWordIds.filter(Boolean) : [],
    wordDetails: normalizedWordDetails,
    sentenceBreakdowns: normalizedSentenceBreakdowns,
    quiz: article?.quiz && typeof article.quiz === 'object'
      ? {
          questions: Array.isArray(article.quiz.questions)
            ? article.quiz.questions.map(normalizeQuizQuestion).filter(Boolean)
            : []
        }
      : null
  }
}

export function createEmptyAppData() {
  return {
    version: APP_DATA_VERSION,
    exportedAt: null,
    words: [],
    articles: []
  }
}

export function normalizeAppData(data) {
  if (!data || typeof data !== 'object') {
    return createEmptyAppData()
  }

  return {
    version: APP_DATA_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
    words: Array.isArray(data.words) ? data.words.map(normalizeWordEntry) : [],
    articles: Array.isArray(data.articles) ? data.articles.map(normalizeArticleEntry) : []
  }
}
