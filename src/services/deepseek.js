const API_BASE = 'https://api.deepseek.com/v1'

let apiKey = localStorage.getItem('wordmatch-deepseek-key') || ''

export function setApiKey(key) {
  apiKey = key
  localStorage.setItem('wordmatch-deepseek-key', key)
}

export function getApiKey() {
  return apiKey
}

export function hasApiKey() {
  return !!apiKey
}

async function callDeepSeek(messages, retries = 1) {
  if (!apiKey) throw new Error('API_KEY_MISSING')

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
          max_tokens: 2000
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `API error: ${res.status}`)
      }

      const data = await res.json()
      return data.choices[0].message.content
    } catch (e) {
      if (attempt === retries) throw e
      await new Promise(r => setTimeout(r, 1000))
    }
  }
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

  let json = text.trim()
  json = json.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '')
  return JSON.parse(json)
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

  let json = text.trim()
  json = json.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '')
  return JSON.parse(json)
}
