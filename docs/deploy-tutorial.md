# WordClash GitHub Pages 自动部署教程

## 你刚刚做了什么

为项目配置了 **GitHub Actions 自动部署流水线**：在本地打一个 `v` 开头的 tag 并 push，GitHub 就会自动构建项目并部署到 GitHub Pages。

## 第一步：推送代码到 GitHub

确保本地改动已经推送到 GitHub：

```bash
git push origin main
```

推送时带上你刚刚创建的两个文件：
- `.github/workflows/deploy.yml` — 工作流配置
- `vite.config.js` — 添加了 `base: '/WordClash/'`

## 第二步：启用 GitHub Pages

1. 打开你的 GitHub 仓库页面
2. 点击顶部导航的 **Settings**
3. 左侧菜单找到 **Pages**（在 "Code and automation" 分组下）
4. 在 **Build and deployment** 区域：
   - **Source** 选择 `Deploy from a branch`
   - **Branch** 选择 `gh-pages`，目录选 `/ (root)`
   - 点击 **Save**

> ⚠️ `gh-pages` 分支目前还不存在，第一次部署成功后会自动创建。先选上保存即可。

## 第三步：打 Tag 触发部署

在项目目录执行：

```bash
# 打一个版本 tag
git tag v0.1.0

# 推送 tag 到 GitHub
git push origin v0.1.0
```

Tag 推送后，GitHub Actions 会自动启动构建。

## 第四步：观察构建进度

1. 打开你的 GitHub 仓库页面
2. 点击顶部导航的 **Actions** 标签
3. 你会看到一个名为 `Deploy to GitHub Pages` 的工作流正在运行
4. 点击进去可以看到每个步骤的实时日志：
   - Checkout — 拉取代码
   - Setup Node.js — 安装 Node 环境
   - Install dependencies — `npm ci`
   - Build — `npm run build`
   - Deploy to gh-pages — 推送到部署分支

整个过程大约 **30-60 秒**。

## 第五步：访问你的网站

构建完成后，访问：

```
https://<你的GitHub用户名>.github.io/WordClash/
```

比如你的用户名是 `yemaozi1999`，那就访问：

```
https://yemaozi1999.github.io/WordClash/
```

---

## 以后怎么用

每次想发布新版本时：

```bash
# 改完代码，commit 后...
git add .
git commit -m "feat: 某个新功能"

# 打新 tag
git tag v0.1.1

# 推送代码 + tag
git push origin main
git push origin v0.1.1
```

等 Actions 跑完，网站就更新了。

> 💡 **只推送代码不打 tag，不会触发部署。** 你可以随意 push 到 main 分支，不影响线上版本。

---

## 常见问题

### Q: 页面打开是空白的？

按 F12 打开开发者工具 → Console，看有没有红色的 404 错误。

- **如果 JS/CSS 文件 404**：检查 `vite.config.js` 里的 `base` 是否和仓库名一致。仓库叫 `WordClash`，`base` 就写 `'/WordClash/'`。
- **如果仓库名改过**：相应地改 `base` 的值。

### Q: Actions 构建失败了？

点击失败的 job 查看日志，常见原因：
- `npm ci` 失败 → `package-lock.json` 没提交，执行 `npm install` 后提交 lock 文件
- `npm run build` 失败 → 本地先跑一遍 `npm run build` 看看有没有报错

### Q: 能不能换自定义域名？

可以。在仓库 Settings → Pages 里填上你的域名，然后在项目 `public/` 目录放一个 `CNAME` 文件（内容是域名），最后去域名 DNS 添加 CNAME 记录指向 `<用户名>.github.io`。

### Q: 部署后发现样式乱了？

检查 `vite.config.js` 里的 `base` 是否以 `/` 开头和结尾，正确格式是 `'/仓库名/'`。
