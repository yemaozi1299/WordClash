<script setup>
import { ref, computed } from 'vue'
import { useArticlesStore } from '@/stores/articles.js'
import { useWordsStore } from '@/stores/words.js'
import { useFeedbackStore } from '@/stores/feedback.js'
import {
  splitParagraphs,
  splitSentences,
  tokenizeArticleText,
  mapWithConcurrency,
  findReusableWordData
} from '@/services/article-reader.js'
import {
  analyzeArticle,
  translateParagraph,
  breakdownSentence,
  generateQuiz,
  parseWord
} from '@/services/deepseek.js'

const ANALYSIS_CONCURRENCY = 3
const PREPARSE_SYNC_INTERVAL = 3
const TRANSLATION_SYNC_INTERVAL = 2
const BREAKDOWN_SYNC_INTERVAL = 4

const articlesStore = useArticlesStore()
const wordsStore = useWordsStore()
const feedbackStore = useFeedbackStore()

// 导入区
const inputTitle = ref('')
const inputContent = ref('')
const importing = ref(false)
const importError = ref(null)

// 当前文章
const currentId = ref(null)
const current = computed(() => articlesStore.getArticleById(currentId.value))

// 解析状态
const analyzingId = ref(null)
const analyzing = computed(() => analyzingId.value !== null && analyzingId.value === currentId.value)
const analysisProgress = ref('')

// 生词与点词
const selectedWords = ref([])
const importingWords = ref(false)
const importWordsMsg = ref(null)
const wordCache = ref({})
const activeWord = ref(null)

// 理解题
const generatingQuiz = ref(false)
const quizAnswers = ref({})
const quizSubmitted = ref(false)

const paragraphs = computed(() => splitParagraphs(current.value?.content || ''))
const selectedCount = computed(() => selectedWords.value.length)
const translatedCount = computed(() => Object.keys(current.value?.translations || {}).length)
const breakdownCount = computed(() => Object.keys(current.value?.sentenceBreakdowns || {}).length)

const quizResult = computed(() => {
  if (!current.value?.quiz?.questions) return { correct: 0, total: 0 }

  let correct = 0
  current.value.quiz.questions.forEach((question, index) => {
    if (quizAnswers.value[index] === question.answer) {
      correct++
    }
  })

  return { correct, total: current.value.quiz.questions.length }
})

function resetViewState() {
  selectedWords.value = []
  quizAnswers.value = {}
  quizSubmitted.value = false
  activeWord.value = null
  importWordsMsg.value = null
}

function syncSelectionFromArticle(article) {
  selectedWords.value = (article?.analysis?.rawWords || []).map(item => item.word)
}

function persistStage(id, patch) {
  articlesStore.updateArticle(id, patch, { persist: false })
  articlesStore.persistNow()
}

function shouldSyncProgress(progressCount, totalCount, interval) {
  return progressCount % interval === 0 || progressCount >= totalCount
}

function getReusableWordData(word, article = current.value) {
  return findReusableWordData(word, {
    article,
    wordCache: wordCache.value,
    words: wordsStore.words
  })
}

async function handleFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const text = await file.text()
  inputContent.value = text
  if (!inputTitle.value) {
    inputTitle.value = file.name.replace(/\.txt$/i, '')
  }
}

async function startReading() {
  const content = inputContent.value.trim()
  if (!content || importing.value) return

  importing.value = true
  importError.value = null

  try {
    const article = articlesStore.addArticle({ title: inputTitle.value.trim(), content })
    currentId.value = article.id
    resetViewState()
    await runAnalysis(article.id)
    inputTitle.value = ''
    inputContent.value = ''
  } catch (error) {
    importError.value = `导入失败：${error.message}`
  } finally {
    importing.value = false
  }
}

async function runAnalysis(id) {
  analyzingId.value = id
  analysisProgress.value = '正在解析文章概览...'
  importError.value = null

  try {
    const article = articlesStore.getArticleById(id)
    if (!article) return

    const rawParagraphs = splitParagraphs(article.content)
    let analysis = article.analysis || null
    let wordDetails = article.wordDetails || {}
    let preparedWords = 0

    try {
      analysis = await analyzeArticle(article.content)
      syncSelectionFromArticle({ analysis })

      if (analysis.rawWords?.length) {
        analysisProgress.value = '正在预解析重点生词...'
        await mapWithConcurrency(analysis.rawWords, async (item) => {
          if (analyzingId.value !== id) return

          try {
            const cached = getReusableWordData(item.word, article)
            const data = cached || await parseWord(item.word)
            wordDetails = {
              ...wordDetails,
              [item.word.toLowerCase()]: data
            }
            preparedWords++
            if (shouldSyncProgress(preparedWords, analysis.rawWords.length, PREPARSE_SYNC_INTERVAL)) {
              articlesStore.updateArticle(id, { analysis, wordDetails }, { persist: false })
            }
          } catch {
            // 单个生词失败时保留整体流程
          }
        }, ANALYSIS_CONCURRENCY)
      }

      persistStage(id, { analysis, wordDetails })
    } catch (error) {
      importError.value = `概要解析失败：${error.message}。下面仍会继续做翻译和拆解。`
    }

    if (analyzingId.value !== id) return

    const translations = { ...(article.translations || {}) }
    let translated = Object.keys(translations).length

    analysisProgress.value = '正在翻译段落...'
    await mapWithConcurrency(rawParagraphs, async (paragraph, index) => {
      if (analyzingId.value !== id || translations[index]) return

      try {
        const result = await translateParagraph(paragraph)
        translations[index] = result.translation
      } catch {
        // 保持渐进式容错
      }

      translated++
      analysisProgress.value = `正在翻译段落 ${Math.min(translated, rawParagraphs.length)}/${rawParagraphs.length}...`
      if (shouldSyncProgress(translated, rawParagraphs.length, TRANSLATION_SYNC_INTERVAL)) {
        articlesStore.updateArticle(id, { translations }, { persist: false })
      }
    }, ANALYSIS_CONCURRENCY)
    persistStage(id, { translations })

    if (analyzingId.value !== id) return

    const sentenceBreakdowns = { ...(article.sentenceBreakdowns || {}) }
    const allSentences = rawParagraphs.flatMap((paragraph, paragraphIndex) =>
      splitSentences(paragraph).map((text, sentenceIndex) => ({
        key: `${paragraphIndex}-${sentenceIndex}`,
        text
      }))
    )

    let parsedSentences = Object.keys(sentenceBreakdowns).length
    analysisProgress.value = '正在逐句拆解...'

    await mapWithConcurrency(allSentences, async ({ key, text }) => {
      if (analyzingId.value !== id || sentenceBreakdowns[key]) return

      try {
        const result = await breakdownSentence(text)
        sentenceBreakdowns[key] = result
      } catch {
        // 某一句失败时保持整体可用
      }

      parsedSentences++
      analysisProgress.value = `正在逐句拆解 ${Math.min(parsedSentences, allSentences.length)}/${allSentences.length}...`
      if (shouldSyncProgress(parsedSentences, allSentences.length, BREAKDOWN_SYNC_INTERVAL)) {
        articlesStore.updateArticle(id, { sentenceBreakdowns }, { persist: false })
      }
    }, ANALYSIS_CONCURRENCY)
    persistStage(id, { sentenceBreakdowns })
  } catch (error) {
    importError.value = `解析失败：${error.message}`
  } finally {
    if (analyzingId.value === id) {
      analyzingId.value = null
      analysisProgress.value = ''
    }
  }
}

function selectArticle(id) {
  if (analyzingId.value && analyzingId.value !== id) {
    analyzingId.value = null
  }

  currentId.value = id
  resetViewState()

  const article = articlesStore.getArticleById(id)
  syncSelectionFromArticle(article)
}

async function deleteArticle(id, event) {
  event.stopPropagation()

  const article = articlesStore.getArticleById(id)
  const confirmed = await feedbackStore.requestConfirm({
    title: '删除文章',
    message: `确认删除 “${article?.title || '未命名文章'}” 吗？删除后这篇文章的解析结果也会一起移除。`,
    confirmText: '确认删除',
    cancelText: '保留文章',
    tone: 'danger'
  })

  if (!confirmed) return

  if (analyzingId.value === id) {
    analyzingId.value = null
  }

  articlesStore.removeArticle(id)
  if (currentId.value === id) {
    currentId.value = null
  }

  feedbackStore.success(`已删除文章 “${article?.title || '未命名文章'}”`, '阅读记录已更新')
}

function sentenceBreakdownsForParagraph(index) {
  const breakdowns = current.value?.sentenceBreakdowns
  if (!breakdowns) return []

  return splitSentences(paragraphs.value[index] || '')
    .map((text, sentenceIndex) => {
      const key = `${index}-${sentenceIndex}`
      return breakdowns[key] ? { key, text, breakdown: breakdowns[key] } : null
    })
    .filter(Boolean)
}

function isRawWord(word) {
  return !!current.value?.wordDetails?.[word.toLowerCase()]
}

function rawWordTitle(word) {
  const detail = current.value?.wordDetails?.[word.toLowerCase()]
  if (!detail) return ''

  const pos = detail.meanings?.[0]?.pos || ''
  const meaning = detail.meanings?.[0]?.meaning || ''
  const phonetic = detail.phonetic ? ` ${detail.phonetic}` : ''
  return `${pos ? `${pos} ` : ''}${meaning}${phonetic}`
}

async function clickWord(word) {
  const clean = word.replace(/[^a-zA-Z'-]/g, '')
  if (!clean) return

  const lower = clean.toLowerCase()
  const inBank = wordsStore.words.find(item => item.word.toLowerCase() === lower)

  if (current.value?.wordDetails?.[lower]) {
    activeWord.value = {
      word: clean,
      loading: false,
      data: current.value.wordDetails[lower],
      inBank: !!inBank,
      error: null
    }
    return
  }

  if (inBank) {
    activeWord.value = {
      word: clean,
      loading: false,
      data: inBank,
      inBank: true,
      error: null
    }
    return
  }

  if (wordCache.value[lower]) {
    activeWord.value = {
      word: clean,
      loading: false,
      data: wordCache.value[lower],
      inBank: false,
      error: null
    }
    return
  }

  activeWord.value = {
    word: clean,
    loading: true,
    data: null,
    inBank: false,
    error: null
  }

  try {
    const data = await parseWord(clean)
    wordCache.value = {
      ...wordCache.value,
      [lower]: data
    }
    activeWord.value = {
      word: clean,
      loading: false,
      data,
      inBank: false,
      error: null
    }
  } catch (error) {
    activeWord.value = {
      word: clean,
      loading: false,
      data: null,
      inBank: false,
      error: error.message
    }
  }
}

async function resolveWordData(word) {
  const lower = word.toLowerCase()
  const cached = getReusableWordData(word)
  if (cached) return cached

  const data = await parseWord(word)
  wordCache.value = {
    ...wordCache.value,
    [lower]: data
  }
  return data
}

async function addWordFromLookup() {
  if (!activeWord.value?.data || !current.value) return

  const result = wordsStore.addWord(activeWord.value.data)
  activeWord.value = { ...activeWord.value, inBank: true }

  if (!result.existed) {
    const nextIds = [...current.value.addedWordIds, result.word.id]
    articlesStore.updateArticle(current.value.id, { addedWordIds: nextIds })
  }
}

function toggleWordSelect(word) {
  const exists = selectedWords.value.includes(word)
  selectedWords.value = exists
    ? selectedWords.value.filter(item => item !== word)
    : [...selectedWords.value, word]
}

async function importSelectedWords() {
  if (importingWords.value || selectedWords.value.length === 0 || !current.value) return

  importingWords.value = true
  importWordsMsg.value = null

  let added = 0
  let skipped = 0
  const addedWordIds = [...current.value.addedWordIds]

  try {
    for (const word of selectedWords.value) {
      try {
        const data = await resolveWordData(word)
        const result = wordsStore.addWord(data)

        if (result.existed) {
          skipped++
        } else {
          added++
          if (!addedWordIds.includes(result.word.id)) {
            addedWordIds.push(result.word.id)
          }
        }
      } catch {
        skipped++
      }
    }

    articlesStore.updateArticle(current.value.id, { addedWordIds })
    importWordsMsg.value = `已入库 ${added} 个${skipped ? `，${skipped} 个已存在或失败` : ''}`
  } finally {
    importingWords.value = false
  }
}

async function startQuiz() {
  if (generatingQuiz.value || !current.value) return

  generatingQuiz.value = true

  try {
    const result = await generateQuiz(current.value.content)
    articlesStore.updateArticle(current.value.id, { quiz: result })
    quizAnswers.value = {}
    quizSubmitted.value = false
  } catch (error) {
    importError.value = `生成题目失败：${error.message}`
  } finally {
    generatingQuiz.value = false
  }
}

function submitQuiz() {
  quizSubmitted.value = true
}

function quizOptionClass(questionIndex, option, answer) {
  if (!quizSubmitted.value) return ''
  if (option === answer) return 'correct'
  if (quizAnswers.value[questionIndex] === option) return 'wrong'
  return ''
}

function closeWordPopup() {
  activeWord.value = null
}
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-group">
        <span class="page-eyebrow">Reading Lab</span>
        <h1 class="page-title">文章阅读</h1>
        <p class="page-desc">
          把英文文章带进来，用一个工作台完成摘要理解、生词筛选、段落翻译、逐句拆解和理解题训练。这里是整个项目里最完整的精读入口。
        </p>
      </div>
    </header>

    <section class="split-layout">
      <div class="panel panel-soft stack-layout">
        <div class="section-head">
          <div>
            <h2 class="section-title">导入文章</h2>
            <p class="section-desc">支持粘贴正文或导入 `.txt`，导入后会自动进入全量解析流程。</p>
          </div>
          <span class="chip">AI 精读</span>
        </div>

        <input v-model="inputTitle" class="input" placeholder="文章标题（可选）" />
        <textarea
          v-model="inputContent"
          class="textarea"
          rows="8"
          placeholder="粘贴英文文章正文..."
        />

        <div class="import-actions">
          <label class="btn btn-secondary file-trigger">
            导入 .txt
            <input type="file" accept=".txt" hidden @change="handleFile" />
          </label>
          <button
            class="btn btn-primary"
            :disabled="!inputContent.trim() || importing"
            @click="startReading"
          >
            {{ importing ? '导入中...' : '开始精读' }}
          </button>
        </div>

        <p class="muted">
          解析会分阶段进行：文章概览 → 生词预解析 → 段落翻译 → 逐句拆解。
        </p>
        <p v-if="importError" class="notice notice-error">{{ importError }}</p>
        <p v-else-if="analyzing" class="notice notice-info">{{ analysisProgress }}</p>
      </div>

      <div class="panel stack-layout">
        <div class="section-head">
          <div>
            <h2 class="section-title">历史文章</h2>
            <p class="section-desc">按最近阅读排序，方便你回到上次的精读现场。</p>
          </div>
          <span class="chip">{{ articlesStore.articleCount }} 篇</span>
        </div>

        <div v-if="articlesStore.articleCount === 0" class="empty-state">
          <strong>还没有文章记录</strong>
          从左侧导入第一篇文章后，这里就会开始累积你的阅读档案。
        </div>

        <div v-else class="history-list">
          <button
            v-for="article in articlesStore.sortedByRecent"
            :key="article.id"
            class="history-item"
            :class="{ active: article.id === currentId }"
            @click="selectArticle(article.id)"
          >
            <div class="history-copy">
              <strong>{{ article.title }}</strong>
              <span class="muted">{{ article.createdAt.slice(0, 10) }}</span>
            </div>
            <span class="history-meta">
              {{ Object.keys(article.translations || {}).length }}/{{ splitParagraphs(article.content).length }} 段
            </span>
            <span class="history-delete" title="删除" @click.stop="deleteArticle(article.id, $event)">×</span>
          </button>
        </div>
      </div>
    </section>

    <section v-if="current" class="stack-layout">
      <div class="panel overview-panel">
        <div class="overview-head">
          <div>
            <span class="page-eyebrow">Current Article</span>
            <h2 class="reader-title">{{ current.title }}</h2>
          </div>
          <div class="overview-chips">
            <span class="tag">{{ paragraphs.length }} 段正文</span>
            <span class="tag">{{ translatedCount }} 段已翻译</span>
            <span class="tag">{{ breakdownCount }} 句已拆解</span>
          </div>
        </div>

        <div v-if="current.analysis" class="overview-grid">
          <div class="overview-card">
            <span class="overview-label">摘要</span>
            <p>{{ current.analysis.summary }}</p>
          </div>
          <div class="overview-card">
            <span class="overview-label">难度</span>
            <p>{{ current.analysis.difficulty }}</p>
          </div>
          <div class="overview-card overview-card-wide">
            <span class="overview-label">学习重点</span>
            <div class="tag-list">
              <span v-for="point in current.analysis.keyPoints" :key="point" class="tag">{{ point }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <strong>文章概览仍在生成中</strong>
          段落翻译和逐句拆解会继续进行，概览生成完成后会自动出现在这里。
        </div>
      </div>

      <div class="reader-layout">
        <div class="panel article-panel">
          <div class="section-head article-head">
            <div>
              <h2 class="section-title">正文精读</h2>
              <p class="section-desc">点击高亮词可直接查义，翻译和拆解会逐步填充。</p>
            </div>
            <span class="chip">点击单词可查义</span>
          </div>

          <div class="article-body">
            <article v-for="(paragraph, index) in paragraphs" :key="index" class="article-block">
              <p class="article-text">
                <span v-for="(token, tokenIndex) in tokenizeArticleText(paragraph)" :key="`${index}-${tokenIndex}`">
                  <span
                    v-if="token.type === 'word'"
                    class="word-token"
                    :class="{ highlighted: isRawWord(token.text) }"
                    :title="rawWordTitle(token.text) || undefined"
                    @click="clickWord(token.text)"
                  >
                    {{ token.text }}
                  </span>
                  <span v-else>{{ token.text }}</span>
                </span>
              </p>

              <div v-if="current.translations?.[index]" class="article-translation">
                <span class="block-label">段落翻译</span>
                <p>{{ current.translations[index] }}</p>
              </div>

              <div v-if="sentenceBreakdownsForParagraph(index).length" class="article-breakdowns">
                <div
                  v-for="item in sentenceBreakdownsForParagraph(index)"
                  :key="item.key"
                  class="breakdown-card"
                >
                  <p class="sentence-original">{{ item.text }}</p>
                  <p><b>译：</b>{{ item.breakdown.translation }}</p>
                  <p><b>结构：</b>{{ item.breakdown.structure }}</p>
                  <p v-if="item.breakdown.grammar?.length"><b>语法：</b>{{ item.breakdown.grammar.join('；') }}</p>
                </div>
              </div>

              <p v-else-if="analyzing" class="muted paragraph-pending">该段仍在解析中...</p>
            </article>
          </div>
        </div>

        <div class="stack-layout">
          <div class="panel sidebar-panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">生词管理</h2>
                <p class="section-desc">先勾选，再批量入库。已预解析的词会优先复用，减少重复请求。</p>
              </div>
              <span class="chip">{{ selectedCount }} 已选</span>
            </div>

            <div v-if="current.analysis?.rawWords?.length" class="word-selection-list">
              <label
                v-for="item in current.analysis.rawWords"
                :key="item.word"
                class="word-selection-item"
                :class="{ checked: selectedWords.includes(item.word) }"
              >
                <input
                  type="checkbox"
                  :checked="selectedWords.includes(item.word)"
                  @change="toggleWordSelect(item.word)"
                />
                <div class="word-selection-copy">
                  <strong>{{ item.word }}</strong>
                  <span>{{ item.reason }}</span>
                </div>
              </label>
            </div>
            <div v-else class="empty-state small-empty">
              <strong>暂时还没有生词清单</strong>
              等文章概览生成完成后，这里会自动出现值得学习的词和短语。
            </div>

            <button
              class="btn btn-primary full-width"
              :disabled="importingWords || selectedWords.length === 0"
              @click="importSelectedWords"
            >
              {{ importingWords ? '入库中...' : `入库选中生词 (${selectedWords.length})` }}
            </button>
            <p v-if="importWordsMsg" class="notice notice-success">{{ importWordsMsg }}</p>
          </div>

          <div class="panel sidebar-panel">
            <div class="section-head">
              <div>
                <h2 class="section-title">理解题训练</h2>
                <p class="section-desc">完成一轮精读后，用 3 道题检查你对主旨、细节和推理的理解。</p>
              </div>
              <button class="btn btn-secondary" :disabled="generatingQuiz" @click="startQuiz">
                {{ generatingQuiz ? '出题中...' : current.quiz ? '重新出题' : '生成理解题' }}
              </button>
            </div>

            <div v-if="current.quiz?.questions?.length" class="quiz-box">
              <div v-for="(question, questionIndex) in current.quiz.questions" :key="questionIndex" class="quiz-card">
                <p class="quiz-question">{{ questionIndex + 1 }}. {{ question.question }}</p>
                <label
                  v-for="option in question.options"
                  :key="option"
                  class="quiz-option"
                  :class="quizOptionClass(questionIndex, option, question.answer)"
                >
                  <input
                    type="radio"
                    :name="`quiz-${questionIndex}`"
                    :value="option"
                    v-model="quizAnswers[questionIndex]"
                    :disabled="quizSubmitted"
                  />
                  {{ option }}
                </label>
                <p v-if="quizSubmitted" class="quiz-explanation">解析：{{ question.explanation }}</p>
              </div>

              <div class="quiz-foot">
                <button v-if="!quizSubmitted" class="btn btn-primary" @click="submitQuiz">提交答案</button>
                <span v-else class="tag tag-success">得分：{{ quizResult.correct }} / {{ quizResult.total }}</span>
              </div>
            </div>
            <div v-else class="empty-state small-empty">
              <strong>还没有理解题</strong>
              需要时点一下「生成理解题」，系统会基于当前文章自动出题。
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="empty-state">
      <strong>还没有选中正在阅读的文章</strong>
      从上方导入新文章，或者在历史列表里选择一篇继续阅读。
    </section>

    <div v-if="activeWord" class="word-popup-overlay" @click="closeWordPopup">
      <div class="word-popup" @click.stop>
        <button class="popup-close" @click="closeWordPopup">×</button>
        <div v-if="activeWord.loading" class="popup-state">查询中...</div>
        <div v-else-if="activeWord.error" class="popup-state popup-error">查询失败：{{ activeWord.error }}</div>
        <div v-else-if="activeWord.data" class="popup-body">
          <div class="popup-head">
            <strong>{{ activeWord.data.word }}</strong>
            <span class="muted">{{ activeWord.data.phonetic || '暂无音标' }}</span>
          </div>
          <div class="popup-meanings">
            <div v-for="(meaning, index) in activeWord.data.meanings" :key="index" class="popup-meaning">
              <span class="chip">{{ meaning.pos }}</span>
              <span>{{ meaning.meaning }}</span>
            </div>
          </div>
          <p v-if="activeWord.data.memoryTip" class="popup-tip">{{ activeWord.data.memoryTip }}</p>
          <button v-if="!activeWord.inBank" class="btn btn-primary full-width" @click="addWordFromLookup">
            加入单词库
          </button>
          <span v-else class="tag tag-success">已在单词库中</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-head,
.overview-head,
.article-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.import-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.file-trigger {
  position: relative;
  overflow: hidden;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  position: relative;
  width: 100%;
  padding: 16px 48px 16px 16px;
  border-radius: 18px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-soft);
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.history-item:hover,
.history-item.active {
  border-color: var(--color-primary-border-soft);
  background: var(--color-primary-light);
}

.history-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-meta {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.history-delete {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--color-text-secondary);
}

.history-delete:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.reader-title {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-family-display);
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.overview-panel,
.sidebar-panel,
.article-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.overview-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.overview-card {
  padding: 18px;
  border-radius: 18px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
}

.overview-card-wide {
  grid-column: span 2;
}

.overview-label,
.block-label {
  display: inline-block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  text-transform: uppercase;
}

.overview-card p,
.article-translation p,
.breakdown-card p,
.popup-tip {
  line-height: 1.8;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.tag-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reader-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 20px;
}

.article-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.article-block {
  padding: 20px;
  border-radius: 22px;
  background: var(--color-surface-glass);
  border: 1px solid var(--color-border);
}

.article-text {
  font-size: 16px;
  line-height: 1.95;
  color: var(--color-text);
}

.word-token {
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.word-token:hover {
  background: var(--color-primary-light);
}

.word-token.highlighted {
  background: var(--color-warning-light);
  border-bottom: 2px solid var(--color-warning);
  padding: 0 1px;
}

.article-translation,
.article-breakdowns {
  margin-top: 14px;
}

.article-translation {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--color-panel-info-bg);
  border: 1px solid var(--color-panel-info-border);
}

.article-breakdowns {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.breakdown-card {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--color-panel-accent-bg);
  border: 1px solid var(--color-panel-accent-border);
}

.sentence-original {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--color-text) !important;
}

.paragraph-pending {
  margin-top: 12px;
}

.word-selection-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.word-selection-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-soft);
  cursor: pointer;
}

.word-selection-item.checked {
  border-color: var(--color-primary-border-soft);
  background: var(--color-primary-light);
}

.word-selection-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.word-selection-copy span {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.full-width {
  width: 100%;
}

.quiz-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-card {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-soft);
}

.quiz-question {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.7;
}

.quiz-option {
  display: block;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 14px;
}

.quiz-option.correct {
  background: var(--color-success-light);
  border-color: var(--color-success-border-soft);
  color: var(--color-success);
}

.quiz-option.wrong {
  background: var(--color-danger-light);
  border-color: var(--color-danger-border-soft);
  color: var(--color-danger);
}

.quiz-option input {
  margin-right: 8px;
}

.quiz-explanation {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.quiz-foot {
  display: flex;
  justify-content: flex-start;
}

.small-empty {
  padding: 28px 18px;
}

.word-popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-overlay-strong);
}

.word-popup {
  width: min(460px, 100%);
  padding: 22px;
  border-radius: 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  position: relative;
}

.popup-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 12px;
  background: var(--color-bg-soft);
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
}

.popup-state {
  padding: 30px 0;
  text-align: center;
  color: var(--color-text-secondary);
}

.popup-error {
  color: var(--color-danger);
}

.popup-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.popup-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.popup-head strong {
  font-size: 24px;
}

.popup-meanings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popup-meaning {
  display: flex;
  align-items: center;
  gap: 10px;
}

.popup-tip {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--color-bg-soft);
}

@media (max-width: 1100px) {
  .reader-layout,
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .overview-card-wide {
    grid-column: span 1;
  }
}

@media (max-width: 900px) {
  .section-head,
  .overview-head {
    flex-direction: column;
  }
}
</style>
