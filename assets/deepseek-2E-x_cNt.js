const p="https://api.deepseek.com/v1";let n=localStorage.getItem("wordmatch-deepseek-key")||"";function m(t){n=t,localStorage.setItem("wordmatch-deepseek-key",t)}function l(){return n}function d(){return!!n}async function c(t,o=1){var a;if(!n)throw new Error("API_KEY_MISSING");for(let e=0;e<=o;e++)try{const s=await fetch(`${p}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({model:"deepseek-chat",messages:t,temperature:.3,max_tokens:2e3})});if(!s.ok){const i=await s.json().catch(()=>({}));throw new Error(((a=i.error)==null?void 0:a.message)||`API error: ${s.status}`)}return(await s.json()).choices[0].message.content}catch(s){if(e===o)throw s;await new Promise(r=>setTimeout(r,1e3))}}async function y(t){const o=`你是一个英语学习助手。请解析以下英文单词，返回严格的JSON格式（不要包含markdown代码块标记）：
{
  "word": "原词",
  "phonetic": "音标",
  "meanings": [{"pos": "词性缩写如n./v./adj./adv.", "meaning": "中文释义"}],
  "exampleSentences": ["英文例句1", "对应中文翻译1"],
  "synonyms": ["近义词1", "近义词2"],
  "etymology": "词根词缀分析（中文）",
  "memoryTip": "记忆技巧（中文，一句话）"
}

单词: ${t}`;let e=(await c([{role:"system",content:"你是一个专业的英语词典API，只返回JSON格式数据。"},{role:"user",content:o}])).trim();return e=e.replace(/^```json?\s*/i,"").replace(/\s*```$/i,""),JSON.parse(e)}async function h(t){const o=`分析以下英语单词 WordClash 游戏数据，给出学习评估和建议（中文）：

游戏记录:
${JSON.stringify(t,null,2)}

请返回JSON格式（不要包含markdown代码块标记）：
{
  "overallAssessment": "整体掌握程度评估（一段话）",
  "masteredWords": ["已掌握的单词"],
  "weakWords": ["需要加强的单词"],
  "reviewSuggestions": "复习建议（一段话）",
  "score": 0-100的评分
}`;let e=(await c([{role:"system",content:"你是一个专业的英语学习分析助手，只返回JSON格式数据。"},{role:"user",content:o}])).trim();return e=e.replace(/^```json?\s*/i,"").replace(/\s*```$/i,""),JSON.parse(e)}export{h as a,l as g,d as h,y as p,m as s};
