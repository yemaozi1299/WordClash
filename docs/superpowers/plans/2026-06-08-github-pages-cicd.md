# GitHub Pages CI/CD 自动部署 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 配置 GitHub Actions，实现 tag 推送时自动部署到 GitHub Pages

**架构：** 新增 deploy.yml 工作流文件，修改 vite.config.js 的 base 路径

**技术栈：** GitHub Actions、peaceiris/actions-gh-pages@v4、Vite

---

### 任务 1：创建工作流文件

**文件：**
- 创建：`.github/workflows/deploy.yml`

- [ ] **步骤 1：创建 `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          commit_message: 'deploy: ${{ github.ref_name }}'
```

- [ ] **步骤 2：Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: 添加 GitHub Pages 自动部署工作流"
```

---

### 任务 2：修改 Vite 配置

**文件：**
- 修改：`vite.config.js`

- [ ] **步骤 1：添加 `base` 配置**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/WordClash/'
})
```

- [ ] **步骤 2：Commit**

```bash
git add vite.config.js
git commit -m "feat: 配置 Vite base 路径适配 GitHub Pages"
```

---

### 任务 3：编写部署教程

**文件：**
- 创建：`docs/deploy-tutorial.md`

内容覆盖：仓库设置、tag 操作、观察构建、访问验证。

- [ ] **步骤 1：Commit**

```bash
git add docs/deploy-tutorial.md
git commit -m "docs: 添加 GitHub Pages 部署教程"
```
