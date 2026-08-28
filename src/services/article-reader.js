function normalizeMeaningItem(item) {
  if (!item || typeof item !== 'object') {
    return { pos: '', meaning: '' }
  }

  return {
    pos: typeof item.pos === 'string' ? item.pos : '',
    meaning: typeof item.meaning === 'string' ? item.meaning : ''
  }
}

export function splitParagraphs(content = '') {
  return content.split(/\n+/).map(item => item.trim()).filter(Boolean)
}

export function splitSentences(text = '') {
  if (!text) return []

  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc)\./g, '$1<prd>')
    .replace(/\b(e\.g|i\.e)\./g, match => match.replace(/\./g, '<prd>'))
    .replace(/(\d)\.(\d)/g, '$1<prd>$2')

  return protectedText
    .split(/(?<=[.!?])\s+/)
    .map(item => item.replace(/<prd>/g, '.').trim())
    .filter(Boolean)
}

export function tokenizeArticleText(text = '') {
  return text
    .split(/([a-zA-Z][a-zA-Z'-]*)/g)
    .filter(Boolean)
    .map(part => (/^[a-zA-Z][a-zA-Z'-]*$/.test(part)
      ? { type: 'word', text: part }
      : { type: 'text', text: part }))
}

export async function mapWithConcurrency(items, fn, concurrency = 3) {
  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency)
    await Promise.all(batch.map((item, batchIndex) => fn(item, index + batchIndex)))
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

export function findReusableWordData(word, { article = null, wordCache = {}, words = [] } = {}) {
  const lower = word.toLowerCase()

  if (article?.wordDetails?.[lower]) {
    return article.wordDetails[lower]
  }

  if (wordCache[lower]) {
    return wordCache[lower]
  }

  const existingWord = words.find(item => item.word.toLowerCase() === lower)
  if (existingWord) {
    return normalizeWordDetail(existingWord)
  }

  return null
}
