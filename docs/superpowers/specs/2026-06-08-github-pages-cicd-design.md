# GitHub Pages CI/CD 自动部署 — 设计规格

## 概述

为 WordClash 项目配置 GitHub Actions 自动部署流水线，实现 tag 推送时自动构建并部署到 GitHub Pages。

## 背景

- 代码托管：GitHub
- 项目类型：Vue 3 + Vite 纯前端 SPA
- 路由模式：Hash 模式（`createWebHashHistory`），天然兼容 GitHub Pages
- 部署目标：GitHub Pages

## 触发条件

- **仅 `v*` 格式的 tag 推送时触发**（如 `v0.1.0`、`v1.0.0`）
- main 分支的普通推送不触发部署
- 开发者手动打 tag 并推送来控制部署节奏

## 架构

```
Git tag 推送 (v*)
    │
    ▼
┌─────────────────────────────┐
│  workflow: deploy.yml       │
│  on: push tags: ['v*']     │
└─────────────────────────────┘
    │
    ▼
  Checkout → Setup Node → npm ci → npm run build → deploy to gh-pages
    │
    ▼
  GitHub Pages 自动刷新 (gh-pages 分支)
```

## 实现方案

选择 `peaceiris/actions-gh-pages@v4`，社区最成熟的 GitHub Pages 部署 Action。

## 涉及文件

### 1. 新增：`.github/workflows/deploy.yml`

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

### 2. 修改：`vite.config.js`

添加 `base` 配置以适配 GitHub Pages 子路径：

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
  base: '/WordClash/'   // GitHub Pages 子路径
})
```

> 如果仓库重命名为 `<用户名>.github.io`，`base` 改为 `'/'`。

### 3. 仓库设置（一次性手动操作）

`Settings → Pages → Build and deployment`：
- Source: `Deploy from a branch`
- Branch: `gh-pages` / `(root)`

## 首次部署步骤

1. 创建 `deploy.yml` 文件
2. 修改 `vite.config.js`
3. commit + push 到 main
4. 确保 GitHub Pages 在仓库 Settings 中已启用
5. 打 tag 并推送：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
6. 在 GitHub Actions 页面观察构建进度
7. 构建完成后访问 `https://<用户名>.github.io/WordClash/`

## 关键决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 部署触发 | Tag only | 用户不希望每次推送都部署，有版本感 |
| 部署方案 | peaceiris/actions-gh-pages | 社区最成熟，配置最简 |
| 包管理器 | npm ci | CI 环境推荐，更快更稳定 |
| Node 版本 | 20 (LTS) | 当前 LTS，稳定 |
| 发布目录 | ./dist | Vite 默认输出 |

## 非目标（本期不做）

- PR 预览部署
- 多环境（staging/production）部署
- 自动化版本号管理
- 部署通知（Slack/邮件等）
