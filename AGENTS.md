<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.Codex/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Codex / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->

---

# WordClash — 项目文档

## 项目概述
英文单词学习工具，核心功能链：手动录入 → AI 解析 → 对对碰游戏 → 学习分析。文章辅助阅读作为「读 → 学 → 练」闭环的扩展入口。
当前 MVP 已完成并可经 GitHub Pages 部署；文章辅助阅读功能已上线，单词默写游戏为规划中的下一阶段功能。

## 技术栈
- Vue 3 (Composition API) + Vite
- Pinia 状态管理
- Vue Router 4 (Hash 模式)
- DeepSeek API (单词解析 + 学习分析)
- 本地 localStorage 持久化
- 纯 CSS (简洁极简风)
- pnpm 包管理 + GitHub Actions 自动部署到 GitHub Pages

## 路由
- `/input` — 单词录入
- `/matching` — 对对碰游戏
- `/analysis` — 学习分析
- `/bank` — 单词库
- `/article` — 文章辅助阅读
- `/dictation` — 单词默写游戏（规划中）

## 数据模型
每个单词包含：id, word, phonetic, meanings, exampleSentences, synonyms, etymology, memoryTip, createdAt, stats.

stats 包含：totalAttempts, correctAttempts, lastSeen, lastResult, consecutiveCorrect.

## 数据同步机制
- 运行时数据仍保存在浏览器本地，但统一导出为一个标准数据文件：`data/user-data.json` 对应的 JSON 结构。
- 页面内提供「导出数据 / 导入数据」入口，导出后的文件可手动覆盖项目中的 `data/user-data.json`。
- **个人多端同步流程**：在设备 A 导出数据 → 覆盖项目里的 `data/user-data.json` → 提交 git → 设备 B 拉取代码后导入该文件。
- **定位说明**：这是个人自用场景下的轻量同步方案，不依赖后端，不尝试让浏览器直接写仓库文件。

## API KEY 机制
- API Key 不再由用户在页面输入，改为构建时从环境变量注入。
- **开发环境**：在项目根目录创建 `.env.local`，写入 `VITE_DEEPSEEK_API_KEY=sk-xxx`（该文件被 gitignore，不提交）。模板见 `.env.example`。
- **线上部署**：在 GitHub 仓库 Settings → Secrets → Actions 添加 secret `VITE_DEEPSEEK_API_KEY`，CI 构建时由 Vite 静态注入产物，线上测试人员免填。
- **安全权衡**：`VITE_` 前缀变量在构建时会被写死进前端 JS，理论上线上源码可见。本项目为内部测试用途、API Key 后续会作废，故接受此风险；正式产品应改由后端代理调用。

## 对对碰选词算法
- 新单词 / 答错单词优先出现（高分加权）
- 答对单词降权（连续答对扣分），5 轮后重新加入候选池
- 加权随机选取保证多样性（取评分前 20 的候选池）
- 批刷新机制：每匹配清除 2 对后，从词库补充新词并重排右列，保证牌面连续

## 文章辅助阅读
导入英文文章，AI 辅助逐层理解，生词可一键入库形成学习闭环。
- **导入**：粘贴文本或上传 `.txt`，支持标题。
- **全量解析**（导入后一次性完成）：首屏 `analyzeArticle`（摘要 / 难度 / 重点 / 生词清单）+ 对所有段落并行 `translateParagraph`（翻译）+ `breakdownSentence`（结构 / 语法拆解），并发 3、逐段渐进更新；结果缓存进 article，再次打开免重新解析。
- **正文单词可点击查义**：本地单词库优先，未命中再调 `parseWord`，支持直接入库（单词级按需，避免全量预解析所有词的过高成本）。
- **生词入库**：勾选生词清单 → 批量解析入库到 `wordsStore`，自动进入对对碰 / 默写候选池。
- **读后理解题**：AI 生成 3 道选择题，提交后判分并显示解析。
- **持久化**：单词与文章统一写入 `wordclash-user-data` 结构，并支持导入 / 导出为标准 JSON 数据文件。
- **AI 服务**：`deepseek.js` 新增 `analyzeArticle` / `translateParagraph` / `breakdownSentence` / `generateQuiz`。

## 开发命令
```bash
pnpm install      # 安装依赖
pnpm run dev      # 启动开发服务器
pnpm run build    # 生产构建
```

## 规划中功能

### 单词默写游戏
- **玩法**：看中文写英文。显示中文释义（+词性），音标默认隐藏，用户在输入框输入英文单词。
- **判定**：忽略大小写与首尾空格比对。答对 → 更新 stats；答错 → 显示正确答案 + 记 wrong + 进入下一题。无生命机制，答错不结束，一轮 10 题后结算。
- **选词**：复用对对碰的加权选词逻辑（新词 / 错词优先），与对对碰共享 `words.stats`。
- **入口**：路由 `/dictation`，侧边栏加入口。

## Change Log
- 2026-06-07: 项目初始化，完成 4 个页面骨架
- 2026-08-03: 同步现有功能至文档；API Key 迁移到 .env 环境变量注入；新增默写游戏规划；CI 部署改用 pnpm
- 2026-08-04: 新增文章辅助阅读功能（导入 / 首屏解析 / 分层精读 / 生词入库 / 读后理解题），打通「读 → 学 → 练」闭环

## 界面风格基线（持续生效）

- 当前项目后续所有 UI 改动、新页面设计、现有页面改版，统一以 `docs/research/wordclash-editorial-quiet.html` 为最高视觉基准。
- 风格决策说明以 `docs/research/direction-approved.md` 为准；若两者存在理解分歧，以 `wordclash-editorial-quiet.html` 的实际视觉表达优先。
- 后续默认不得擅自偏回纯 `Radix Quiet`、纯 `Editorial Light` 或 `Soft Tech Workspace`；除非用户明确要求重新换方向。
- 视觉继承原则：
  - 配色继承 `Editorial Quiet` 的暖中性色背景、柔和棕色强调、克制蓝绿色辅助。
  - 排版继承 `Editorial Quiet` 的标题字气与正文阅读节奏，但必须保证界面可读性和操作清晰度。
  - 布局、卡片层级、间距、圆角、组件秩序继承 `Editorial Quiet` 中沿自 `Radix Quiet` 的骨架与 spacing 纪律。
  - 文章阅读、单词详情类页面可以更强调阅读感；录入、游戏、操作型页面必须保留明确的交互反馈，不得做得过轻。
- 在进行任何中大型 UI 修改前，先读取这两个文件：
  - `docs/research/wordclash-editorial-quiet.html`
  - `docs/research/direction-approved.md`
- 若新增页面或新增组件缺少明确视觉说明，默认按 `Editorial Quiet` 延展，而不是重新发明一套新风格。
