const API_BASE = 'https://api.deepseek.com/v1'

// API Key 通过构建时环境变量注入（本地 .env.local 或 CI Secret），
// 不再由用户在页面输入。详见 CLAUDE.md「API KEY 机制」。
const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || ''

async function callDeepSeek(messages, options = {}) {
  const { retries = 1, maxTokens = 2000 } = options
  if (!apiKey) throw new Error('API_KEY_MISSING')

  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.3,
          max_tokens: maxTokens
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.error?.message || `API error: ${res.status}`
        // 429 限流：尊重 Retry-After，退避后重试
        if (res.status === 429 && attempt < retries) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10)
          await new Promise(r => setTimeout(r, Math.max(1, retryAfter) * 1000))
          continue
        }
        // 4xx 客户端错误（401/403/400 等）：不可重试，直接抛
        const e = new Error(msg)
        e.retryable = false
        throw e
      }

      const data = await res.json()
      return data.choices[0].message.content
    } catch (e) {
      lastError = e
      // 不可重试错误（4xx）：直接抛，不再重试
      if (e.retryable === false) throw e
      // 网络错误 / 超时：指数退避后重试
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  throw lastError || new Error('API 调用失败')
}

function stripJson(text) {
  let s = text.trim()
  // 剥离 markdown 代码围栏（含或不含语言标签，如 ```json / ```）
  s = s.replace(/^```[a-zA-Z]*\s*/i, '').replace(/\s*```$/i, '')
  // 提取第一个 { 到最后一个 } 之间的内容，容忍围栏前后的说明文字
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1)
  }
  return s
}

export async function parseWord(word) {
  const prompt = `你是一个英语学习助手。请解析以下英文单词，返回严格的JSON格式（不要包含markdown代码块标记）：
{
  "word": "原词",
  "phonetic": "音标",
  "meanings": [{"pos": "词性缩写如n./v./adj./adv.", "meaning": "中文释义"}],
  "exampleSentences": ["英文例句1", "对应中文翻译1"],
  "synonyms": ["近义词1", "近义词2"],
  "etymology": "词根词缀分析（中文）",
  "memoryTip": "记忆技巧（中文，一句话）"
}

单词: ${word}`

  const text = await callDeepSeek([
    { role: 'system', content: '你是一个专业的英语词典API，只返回JSON格式数据。' },
    { role: 'user', content: prompt }
  ])
  return JSON.parse(stripJson(text))
}

export async function analyzeGameSession(gameHistory) {
  const prompt = `分析以下英语单词 WordClash 游戏数据，给出学习评估和建议（中文）：

游戏记录:
${JSON.stringify(gameHistory, null, 2)}

请返回JSON格式（不要包含markdown代码块标记）：
{
  "overallAssessment": "整体掌握程度评估（一段话）",
  "masteredWords": ["已掌握的单词"],
  "weakWords": ["需要加强的单词"],
  "reviewSuggestions": "复习建议（一段话）",
  "score": 0-100的评分
}`

  const text = await callDeepSeek([
    { role: 'system', content: '你是一个专业的英语学习分析助手，只返回JSON格式数据。' },
    { role: 'user', content: prompt }
  ])
  return JSON.parse(stripJson(text))
}

// ========== 文章辅助阅读 ==========

export async function analyzeArticle(content) {
  // 长文截断保护：超长时取前部分并提示 AI
  const MAX_CHARS = 8000
  const truncated = content.length > MAX_CHARS
  const text = truncated ? content.slice(0, MAX_CHARS) : content

  const prompt = `你是英语阅读学习助手。分析以下英文文章，返回严格JSON（不要包含markdown代码块标记）：
{
  "summary": "中文摘要（2-3句话）",
  "difficulty": "难度评估（如：词汇量约X级 / CEFR A2-C1 / 简单·中等·偏难）",
  "keyPoints": ["学习重点1", "学习重点2"],
  "rawWords": [{"word": "建议学习的生词或短语", "reason": "推荐理由（中文，简短）"}]
}

要求：
- rawWords 只包含值得学习的生词/短语（5-15个），不含 the/is/and 等常见词
- 生词保持文章中的原形

${truncated ? '注意：文章较长，以下为前部分内容，请据此分析。' : ''}

文章:
${text}`

  const out = await callDeepSeek(
    [
      { role: 'system', content: '你是专业的英语阅读分析助手，只返回JSON格式数据。' },
      { role: 'user', content: prompt }
    ],
    { maxTokens: 2500 }
  )
  return JSON.parse(stripJson(out))
}

export async function translateParagraph(text) {
  const prompt = `将以下英文翻译成自然流畅的中文，返回严格JSON（不要markdown代码块标记）：
{"translation": "中文翻译"}

英文:
${text}`

  const out = await callDeepSeek(
    [
      { role: 'system', content: '你是专业翻译，只返回JSON格式数据。' },
      { role: 'user', content: prompt }
    ],
    { maxTokens: 1200 }
  )
  return JSON.parse(stripJson(out))
}

export async function breakdownSentence(text) {
  const prompt = `拆解以下英文（可为整段或单句），返回严格JSON（不要markdown代码块标记）：
{
  "translation": "中文翻译",
  "structure": "句子结构分析（主句/从句/核心成分，中文）",
  "grammar": ["语法点1", "语法点2"]
}

英文:
${text}`

  const out = await callDeepSeek(
    [
      { role: 'system', content: '你是英语语法分析助手，只返回JSON格式数据。' },
      { role: 'user', content: prompt }
    ],
    { maxTokens: 1500 }
  )
  return JSON.parse(stripJson(out))
}

export async function generateQuiz(content) {
  const MAX_CHARS = 6000
  const text = content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) : content

  const prompt = `基于以下英文文章，生成3道阅读理解选择题，返回严格JSON（不要markdown代码块标记）：
{
  "questions": [
    {
      "question": "题干（中文）",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确选项的完整文本（必须是options之一）",
      "explanation": "解析（中文，简短）"
    }
  ]
}

要求：题目考察文章主旨/细节/推理理解，每题4个选项，answer 必须等于options中某一项。

文章:
${text}`

  const out = await callDeepSeek(
    [
      { role: 'system', content: '你是英语阅读理解出题助手，只返回JSON格式数据。' },
      { role: 'user', content: prompt }
    ],
    { maxTokens: 2500 }
  )
  return JSON.parse(stripJson(out))
}
