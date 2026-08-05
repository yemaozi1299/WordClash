<script setup>
import { ref, computed } from 'vue'
import { useArticlesStore } from '@/stores/articles.js'
import { useWordsStore } from '@/stores/words.js'
import {
  analyzeArticle,
  translateParagraph,
  breakdownSentence,
  generateQuiz,
  parseWord
} from '@/services/deepseek.js'

const articlesStore = useArticlesStore()
const wordsStore = useWordsStore()

articlesStore.init()
wordsStore.init()

// 导入
const inputTitle = ref('')
const inputContent = ref('')
const importing = ref(false)
const importError = ref(null)

// 当前文章
const currentId = ref(null)
const current = computed(() => articlesStore.getArticleById(currentId.value))

// 全量解析状态：analyzingId 绑定正在解析的文章，切换/删除时自动取消
const analyzingId = ref(null)
const analyzing = computed(() => analyzingId.value !== null && analyzingId.value === currentId.value)
const analysisProgress = ref('')

// 生词勾选
const selectedWords = ref([])

// 批量入库
const importingWords = ref(false)
const importWordsMsg = ref(null)

// 点词查义
const wordCache = ref({})
const activeWord = ref(null)

// 理解题
const generatingQuiz = ref(false)
const quizAnswers = ref({})
const quizSubmitted = ref(false)

const paragraphs = computed(() => {
  if (!current.value?.content) return []
  return current.value.content.split(/\n+/).filter(p => p.trim())
})

const quizResult = computed(() => {
  if (!current.value?.quiz?.questions) return { correct: 0, total: 0 }
  const qs = current.value.quiz.questions
  let correct = 0
  qs.forEach((q, i) => {
    if (quizAnswers.value[i] === q.answer) correct++
  })
  return { correct, total: qs.length }
})

// 并发控制：分批并行，避免 API 限流
async function mapWithConcurrency(items, fn, concurrency = 6) {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    await Promise.all(batch.map((item, idx) => fn(item, i + idx)))
  }
}

// ---- 生词高亮 ----

function isRawWord(word) {
  const lower = word.toLowerCase()
  return !!(current.value?.wordDetails?.[lower])
}

function rawWordTitle(word) {
  const lower = word.toLowerCase()
  const d = current.value?.wordDetails?.[lower]
  if (!d) return ''
  const pos = d.meanings?.[0]?.pos || ''
  const meaning = d.meanings?.[0]?.meaning || ''
  const phonetic = d.phonetic ? ` ${d.phonetic}` : ''
  return `${pos ? pos + ' ' : ''}${meaning}${phonetic}`
}

// ---- 逐句拆解 + 兼容旧数据 ----

function sentenceBreakdownsForPara(idx) {
  const sb = current.value?.sentenceBreakdowns
  if (sb) {
    // 新文章：逐句显示
    const sents = paragraphs.value[idx]?.split(/[.!?]+/).filter(s => s.trim()) || []
    return sents
      .map((text, si) => {
        const key = `${idx}-${si}`
        return sb[key] ? { key, text, breakdown: sb[key] } : null
      })
      .filter(Boolean)
  }
  // 旧文章兼容：段落级拆解
  if (current.value?.breakdowns?.[idx]) {
    return [{ key: `old-${idx}`, text: '', breakdown: current.value.breakdowns[idx] }]
  }
  return []
}

// ---- 导入 ----

async function handleFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const text = await file.text()
  inputContent.value = text
  if (!inputTitle.value) inputTitle.value = file.name.replace(/\.txt$/i, '')
}

function resetViewState() {
  selectedWords.value = []
  quizAnswers.value = {}
  quizSubmitted.value = false
  activeWord.value = null
  importWordsMsg.value = null
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
  } catch (e) {
    importError.value = `导入失败: ${e.message}`
  } finally {
    importing.value = false
  }
}

// ---- 全量解析（4 步：概要 → 预解析生词 → 段落翻译 → 逐句拆解） ----

async function runAnalysis(id) {
  analyzingId.value = id
  analysisProgress.value = '正在解析文章概要...'
  try {
    const a = articlesStore.getArticleById(id)
    if (!a) return

    // 1. 首屏解析（独立 try/catch：失败不阻止后续）
    let wordDetails = {}
    try {
      const result = await analyzeArticle(a.content)
      articlesStore.updateArticle(id, { analysis: result })
      selectedWords.value = (result.rawWords || []).map(w => w.word)

      // 2. 预解析生词（用于正文高亮 + 悬停释义）
      if (result.rawWords?.length) {
        analysisProgress.value = '正在预解析生词...'
        for (const rw of result.rawWords) {
          if (analyzingId.value !== id) return
          try {
            const data = await parseWord(rw.word)
            wordDetails[rw.word.toLowerCase()] = data
          } catch { /* 单词失败跳过 */ }
        }
      }
    } catch (e) {
      importError.value = `概要解析失败: ${e.message}（段落解析仍将继续）`
    }

    articlesStore.updateArticle(id, { wordDetails })
    if (analyzingId.value !== id) return

    // 3. 全量段落翻译（并发 6）
    const allParas = a.content.split(/\n+/).filter(p => p.trim())
    const translations = {}
    let doneTrans = 0
    const totalParas = allParas.length
    await mapWithConcurrency(allParas, async (para, i) => {
      if (analyzingId.value !== id) return
      try {
        const t = await translateParagraph(para)
        translations[i] = t.translation
      } catch { /* 单段失败跳过 */ }
      doneTrans++
      analysisProgress.value = `正在翻译段落 ${doneTrans}/${totalParas}...`
      articlesStore.updateArticle(id, { translations: { ...translations } })
    }, 6)

    if (analyzingId.value !== id) return

    // 4. 逐句拆解（并发 6）
    const sentenceBreakdowns = {}
    const allSentences = []
    for (let pi = 0; pi < allParas.length; pi++) {
      const sents = allParas[pi].split(/[.!?]+/).filter(s => s.trim())
      for (let si = 0; si < sents.length; si++) {
        allSentences.push({ pi, si, text: sents[si].trim() })
      }
    }
    let doneSent = 0
    const totalSents = allSentences.length
    await mapWithConcurrency(allSentences, async ({ pi, si, text }) => {
      if (analyzingId.value !== id) return
      try {
        const b = await breakdownSentence(text)
        sentenceBreakdowns[`${pi}-${si}`] = b
      } catch { /* 单句失败跳过 */ }
      doneSent++
      analysisProgress.value = `正在逐句拆解 ${doneSent}/${totalSents}...`
      articlesStore.updateArticle(id, { sentenceBreakdowns: { ...sentenceBreakdowns } })
    }, 6)
  } catch (e) {
    importError.value = `解析失败: ${e.message}`
  } finally {
    if (analyzingId.value === id) {
      analyzingId.value = null
      analysisProgress.value = ''
    }
  }
}

// ---- 文章管理 ----

function selectArticle(id) {
  // 切换文章时取消正在进行的解析（避免旧解析污染新文章视图、空耗配额）
  if (analyzingId.value && analyzingId.value !== id) {
    analyzingId.value = null
  }
  currentId.value = id
  resetViewState()
  const a = articlesStore.getArticleById(id)
  if (a?.analysis) {
    selectedWords.value = (a.analysis.rawWords || []).map(w => w.word)
  }
}

function deleteArticle(id, e) {
  e.stopPropagation()
  if (!confirm('确定删除这篇文章？')) return
  if (analyzingId.value === id) {
    analyzingId.value = null  // 取消正在进行的解析
  }
  articlesStore.removeArticle(id)
  if (currentId.value === id) currentId.value = null
}

// ---- 正文渲染 ----

function tokenize(text) {
  return text
    .split(/([a-zA-Z][a-zA-Z'-]*)/g)
    .filter(s => s.length > 0)
    .map(s => (/^[a-zA-Z][a-zA-Z'-]*$/.test(s) ? { type: 'word', text: s } : { type: 'text', text: s }))
}

// ---- 点词查义（预解析优先 → 本地库 → 缓存 → API） ----

async function clickWord(word) {
  const clean = word.replace(/[^a-zA-Z'-]/g, '')
  if (!clean) return
  const lower = clean.toLowerCase()

  // 文章预解析缓存（优先）
  if (current.value?.wordDetails?.[lower]) {
    const inBank = wordsStore.words.find(w => w.word.toLowerCase() === lower)
    activeWord.value = { word: clean, loading: false, data: current.value.wordDetails[lower], inBank: !!inBank, error: null }
    return
  }

  // 本地单词库
  const inBank = wordsStore.words.find(w => w.word.toLowerCase() === lower)
  if (inBank) {
    activeWord.value = { word: clean, loading: false, data: inBank, inBank: true, error: null }
    return
  }

  // 组件缓存
  if (wordCache.value[lower]) {
    activeWord.value = { word: clean, loading: false, data: wordCache.value[lower], inBank: false, error: null }
    return
  }

  // 调 API
  activeWord.value = { word: clean, loading: true, data: null, inBank: false, error: null }
  try {
    const data = await parseWord(clean)
    wordCache.value = { ...wordCache.value, [lower]: data }
    activeWord.value = { word: clean, loading: false, data, inBank: false, error: null }
  } catch (e) {
    activeWord.value = { word: clean, loading: false, data: null, inBank: false, error: e.message }
  }
}

async function addWordFromLookup() {
  if (!activeWord.value?.data) return
  const result = wordsStore.addWord(activeWord.value.data)
  activeWord.value = { ...activeWord.value, inBank: true }
  if (!result.existed && current.value) {
    const ids = [...current.value.addedWordIds, result.word.id]
    articlesStore.updateArticle(current.value.id, { addedWordIds: ids })
  }
}

function toggleWordSelect(word) {
  const i = selectedWords.value.indexOf(word)
  if (i >= 0) selectedWords.value = selectedWords.value.filter(w => w !== word)
  else selectedWords.value = [...selectedWords.value, word]
}

async function importSelectedWords() {
  if (importingWords.value || selectedWords.value.length === 0) return
  importingWords.value = true
  importWordsMsg.value = null
  let added = 0
  let skipped = 0
  const newIds = current.value ? [...current.value.addedWordIds] : []
  try {
    for (const word of selectedWords.value) {
      try {
        const data = await parseWord(word)
        const r = wordsStore.addWord(data)
        if (r.existed) skipped++
        else {
          added++
          if (!newIds.includes(r.word.id)) newIds.push(r.word.id)
        }
      } catch {
        skipped++
      }
    }
    if (current.value) {
      articlesStore.updateArticle(current.value.id, { addedWordIds: newIds })
    }
    importWordsMsg.value = `已入库 ${added} 个${skipped ? `，${skipped} 个已存在或失败` : ''}`
  } finally {
    importingWords.value = false
  }
}

// ---- 读后理解题 ----

async function startQuiz() {
  if (generatingQuiz.value || !current.value) return
  generatingQuiz.value = true
  try {
    const result = await generateQuiz(current.value.content)
    articlesStore.updateArticle(current.value.id, { quiz: result })
    quizAnswers.value = {}
    quizSubmitted.value = false
  } catch (e) {
    importError.value = `生成题目失败: ${e.message}`
  } finally {
    generatingQuiz.value = false
  }
}

function submitQuiz() {
  quizSubmitted.value = true
  // TODO: 金币奖励 —— 等 stores/coins.js 实现后在此调用 earn()
}

function quizOptionClass(qi, opt, answer) {
  if (!quizSubmitted.value) return ''
  if (opt === answer) return 'correct'
  if (quizAnswers.value[qi] === opt) return 'wrong'
  return ''
}

function closeWordPopup() {
  activeWord.value = null
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">文章阅读</h1>
    <p class="page-desc">导入英文文章，AI 全量解析（摘要 + 生词 + 段落翻译 + 逐句拆解），生词可一键入库</p>

    <!-- 导入区 -->
    <div class="import-area">
      <input v-model="inputTitle" placeholder="文章标题（可选）" class="title-input" />
      <textarea v-model="inputContent" placeholder="粘贴英文文章..." class="content-input" rows="6"></textarea>
      <div class="import-actions">
        <label class="file-label">
          导入 .txt
          <input type="file" accept=".txt" @change="handleFile" hidden />
        </label>
        <button class="btn btn-primary" :disabled="!inputContent.trim() || importing" @click="startReading">
          {{ importing ? '导入中...' : '开始阅读' }}
        </button>
      </div>
      <p class="hint">导入后将全量解析：摘要、生词高亮、全段翻译、逐句拆解。文章越长耗时越多</p>
    </div>

    <p v-if="importError" class="error-msg">{{ importError }}</p>

    <!-- 历史文章 -->
    <div v-if="articlesStore.articleCount > 0" class="article-list">
      <h3>历史文章 ({{ articlesStore.articleCount }})</h3>
      <div
        v-for="a in articlesStore.sortedByRecent"
        :key="a.id"
        class="article-item"
        :class="{ active: a.id === currentId }"
        @click="selectArticle(a.id)"
      >
        <span class="article-title">{{ a.title }}</span>
        <span class="article-date">{{ a.createdAt.slice(0, 10) }}</span>
        <button class="btn-delete" @click="deleteArticle(a.id, $event)" title="删除">×</button>
      </div>
    </div>

    <!-- 当前文章视图 -->
    <div v-if="current" class="reader">
      <h2 class="reader-title">{{ current.title }}</h2>

      <!-- 概要 + 生词清单 -->
      <div class="analysis-section">
        <div v-if="analyzing && !current.analysis" class="loading-box">AI 正在解析文章概要...</div>
        <template v-else-if="current.analysis">
          <div class="analysis-card">
            <div class="analysis-row">
              <b>摘要</b>
              <p>{{ current.analysis.summary }}</p>
            </div>
            <div class="analysis-row">
              <b>难度</b>
              <span>{{ current.analysis.difficulty }}</span>
            </div>
            <div v-if="current.analysis.keyPoints?.length" class="analysis-row">
              <b>重点</b>
              <div class="tag-list">
                <span v-for="kp in current.analysis.keyPoints" :key="kp" class="tag">{{ kp }}</span>
              </div>
            </div>
          </div>

          <div class="rawwords-box">
            <div class="rawwords-head">
              <h4>生词清单 ({{ current.analysis.rawWords?.length || 0 }})</h4>
              <button
                class="btn btn-primary btn-sm"
                :disabled="importingWords || selectedWords.length === 0"
                @click="importSelectedWords"
              >
                {{ importingWords ? '入库中...' : `入库选中 (${selectedWords.length})` }}
              </button>
            </div>
            <div v-if="current.analysis.rawWords?.length" class="rawwords-list">
              <label
                v-for="rw in current.analysis.rawWords"
                :key="rw.word"
                class="rawword-item"
                :class="{ checked: selectedWords.includes(rw.word) }"
              >
                <input
                  type="checkbox"
                  :checked="selectedWords.includes(rw.word)"
                  @change="toggleWordSelect(rw.word)"
                />
                <span class="rw-word">{{ rw.word }}</span>
                <span class="rw-reason">{{ rw.reason }}</span>
              </label>
            </div>
            <p v-if="importWordsMsg" class="import-msg">{{ importWordsMsg }}</p>
          </div>

          <div v-if="analyzing" class="loading-box small">{{ analysisProgress }}</div>
        </template>
      </div>

      <!-- 正文（原文 + 段落翻译 + 逐句拆解，渐进填充） -->
      <div class="article-body">
        <p v-for="(para, idx) in paragraphs" :key="idx" class="article-para">
          <span class="para-text">
            <span v-for="(tok, ti) in tokenize(para)" :key="ti">
              <span
                v-if="tok.type === 'word'"
                class="word-token"
                :class="{ highlighted: isRawWord(tok.text) }"
                :title="rawWordTitle(tok.text) || undefined"
                @click="clickWord(tok.text)"
              >{{ tok.text }}</span>
              <span v-else>{{ tok.text }}</span>
            </span>
          </span>
          <span v-if="current.translations[idx]" class="para-translation">{{ current.translations[idx] }}</span>
          <span v-if="sentenceBreakdownsForPara(idx).length" class="para-breakdown">
            <div v-for="sb in sentenceBreakdownsForPara(idx)" :key="sb.key" class="sent-breakdown">
              <span v-if="sb.text" class="sent-original">{{ sb.text }}</span>
              <span class="bd-row"><b>译：</b>{{ sb.breakdown.translation }}</span>
              <span class="bd-row"><b>结构：</b>{{ sb.breakdown.structure }}</span>
              <span v-if="sb.breakdown.grammar?.length" class="bd-row"><b>语法：</b>{{ sb.breakdown.grammar.join('；') }}</span>
            </div>
          </span>
          <span v-else-if="analyzing" class="para-pending">解析中...</span>
        </p>
      </div>

      <!-- 读后理解题 -->
      <div class="quiz-section">
        <button class="btn btn-primary" :disabled="generatingQuiz" @click="startQuiz">
          {{ generatingQuiz ? '出题中...' : current.quiz ? '重新出题' : '生成理解题' }}
        </button>
        <div v-if="current.quiz?.questions?.length" class="quiz-box">
          <div v-for="(q, qi) in current.quiz.questions" :key="qi" class="quiz-q">
            <p class="quiz-q-text">{{ qi + 1 }}. {{ q.question }}</p>
            <label
              v-for="opt in q.options"
              :key="opt"
              class="quiz-opt"
              :class="quizOptionClass(qi, opt, q.answer)"
            >
              <input type="radio" :name="`q-${qi}`" :value="opt" v-model="quizAnswers[qi]" :disabled="quizSubmitted" />
              {{ opt }}
            </label>
            <p v-if="quizSubmitted" class="quiz-expl">解析：{{ q.explanation }}</p>
          </div>
          <div class="quiz-foot">
            <button v-if="!quizSubmitted" class="btn btn-primary" @click="submitQuiz">提交</button>
            <span v-else class="quiz-score">得分：{{ quizResult.correct }} / {{ quizResult.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 点词弹窗 -->
    <div v-if="activeWord" class="word-popup-overlay" @click="closeWordPopup">
      <div class="word-popup" @click.stop>
        <button class="popup-close" @click="closeWordPopup">×</button>
        <div v-if="activeWord.loading" class="popup-loading">查询中...</div>
        <div v-else-if="activeWord.error" class="popup-error">查询失败：{{ activeWord.error }}</div>
        <div v-else-if="activeWord.data" class="popup-body">
          <div class="popup-word">{{ activeWord.data.word }}</div>
          <div v-if="activeWord.data.phonetic" class="popup-phonetic">{{ activeWord.data.phonetic }}</div>
          <div v-if="activeWord.data.meanings?.length" class="popup-meanings">
            <div v-for="(m, mi) in activeWord.data.meanings" :key="mi" class="popup-meaning">
              <i>{{ m.pos }}</i> {{ m.meaning }}
            </div>
          </div>
          <div v-if="activeWord.data.memoryTip" class="popup-tip">💡 {{ activeWord.data.memoryTip }}</div>
          <button v-if="!activeWord.inBank" class="btn btn-primary btn-sm" @click="addWordFromLookup">
            加入单词库
          </button>
          <span v-else class="in-bank-tag">✓ 已在单词库</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}

.page-desc {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 28px;
}

/* ---- 导入区 ---- */

.import-area {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 24px;
}

.title-input,
.content-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  margin-bottom: 10px;
}

.title-input:focus,
.content-input:focus {
  border-color: var(--color-primary);
}

.content-input {
  resize: vertical;
  line-height: 1.6;
}

.import-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-label {
  display: inline-block;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s;
}

.file-label:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 10px;
  line-height: 1.5;
}

/* ---- 通用 ---- */

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.error-msg {
  color: var(--color-danger);
  font-size: 14px;
  margin-bottom: 16px;
}

/* ---- 历史文章 ---- */

.article-list {
  margin-bottom: 24px;
}

.article-list h3 {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-surface);
}

.article-item:hover {
  border-color: var(--color-primary);
}

.article-item.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.article-title {
  font-weight: 500;
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-date {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.btn-delete:hover {
  color: var(--color-danger);
}

/* ---- 阅读区 ---- */

.reader {
  margin-top: 8px;
}

.reader-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.loading-box {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
}

.loading-box.small {
  padding: 12px;
  margin-top: 12px;
}

.analysis-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
}

.analysis-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.7;
}

.analysis-row:last-child {
  margin-bottom: 0;
}

.analysis-row b {
  min-width: 48px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 20px;
  font-size: 12px;
}

/* ---- 生词清单 ---- */

.rawwords-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 28px;
}

.rawwords-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rawwords-head h4 {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rawwords-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.rawword-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.rawword-item.checked {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.rawword-item input {
  margin: 0;
}

.rw-word {
  font-weight: 500;
}

.rw-reason {
  color: var(--color-text-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-msg {
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-success);
}

/* ---- 正文 ---- */

.article-body {
  margin-bottom: 32px;
}

.article-para {
  margin-bottom: 16px;
  line-height: 1.9;
  font-size: 15px;
}

.para-text {
  display: inline;
}

.word-token {
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.1s;
}

.word-token:hover {
  background: var(--color-primary-light);
}

.word-token.highlighted {
  background: #fff3cd;
  border-bottom: 2px solid #f5c518;
  border-radius: 2px;
  padding: 0 1px;
}

.word-token.highlighted:hover {
  background: #ffe69c;
}

.para-translation {
  display: block;
  margin-top: 6px;
  padding: 8px 12px;
  background: #fffbe6;
  border-left: 3px solid #f5c518;
  border-radius: 4px;
  font-size: 14px;
  color: var(--color-text);
}

.para-breakdown {
  display: block;
  margin-top: 6px;
  padding: 8px 12px;
  background: #eef6ff;
  border-left: 3px solid var(--color-primary);
  border-radius: 4px;
  font-size: 13px;
}

.sent-breakdown {
  margin-top: 10px;
  padding: 10px 12px;
  background: #f0f4ff;
  border-radius: 6px;
  border: 1px solid #dde4f0;
}

.sent-breakdown:first-child {
  margin-top: 0;
}

.sent-original {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-text);
  font-size: 13px;
  font-style: italic;
}

.bd-row {
  display: block;
  margin-bottom: 4px;
  line-height: 1.6;
}

.para-pending {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* ---- 理解题 ---- */

.quiz-section {
  border-top: 1px solid var(--color-border);
  padding-top: 24px;
}

.quiz-box {
  margin-top: 16px;
}

.quiz-q {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 12px;
}

.quiz-q-text {
  font-weight: 500;
  margin-bottom: 12px;
  font-size: 14px;
}

.quiz-opt {
  display: block;
  padding: 8px 12px;
  margin-bottom: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.quiz-opt:hover {
  background: var(--color-bg);
}

.quiz-opt.correct {
  background: #e8f8f0;
  border-color: var(--color-success);
  color: var(--color-success);
}

.quiz-opt.wrong {
  background: #fef0f0;
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.quiz-opt input {
  margin-right: 8px;
}

.quiz-expl {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.quiz-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}

.quiz-score {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
}

/* ---- 点词弹窗 ---- */

.word-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.word-popup {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 100%;
  position: relative;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.popup-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--color-text-secondary);
  line-height: 1;
}

.popup-loading,
.popup-error {
  text-align: center;
  padding: 20px;
  color: var(--color-text-secondary);
}

.popup-error {
  color: var(--color-danger);
}

.popup-word {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 4px;
}

.popup-phonetic {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 14px;
}

.popup-meanings {
  margin-bottom: 14px;
}

.popup-meaning {
  font-size: 14px;
  line-height: 1.8;
}

.popup-meaning i {
  color: var(--color-primary);
  font-style: normal;
  font-weight: 500;
  margin-right: 6px;
}

.popup-tip {
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 8px 12px;
  border-radius: var(--radius);
  margin-bottom: 16px;
  line-height: 1.6;
}

.in-bank-tag {
  display: inline-block;
  color: var(--color-success);
  font-size: 13px;
  font-weight: 500;
}
</style>
