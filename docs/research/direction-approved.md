# Direction Approved

## 项目

WordClash 界面风格独立探索页

## 已确认方向

- 方向名：`Radix Quiet`
- 用户选择：`1`
- 选择时间：`2026-08-28`

## 本轮方向说明

- 以 Radix Colors 的语义色阶为基础
- 整体气质更安静、更克制、更适合长期迭代
- 重点强调背景、表层、边框、文本、状态色之间的职责分工
- 页面形态不只展示 token，也模拟真实产品界面结构

## 本轮产物

- `docs/research/wordclash-radix-quiet.html`
- `docs/research/wordclash-editorial-light.html`
- `docs/research/wordclash-soft-tech-workspace.html`

## 当前可对比方向

- `Radix Quiet`：更克制、更中性、更适合长期作为整站基线
- `Editorial Light`：更偏阅读工具和内容产品，排版感更强，工具感更弱
- `Soft Tech Workspace`：更偏现代产品工作台，产品感更强，但要注意别重新变得过度装饰
- `Editorial Quiet`：融合方向，保留 `Editorial Light` 的配色与字气，继承 `Radix Quiet` 的布局与间距

## 最新确认方向

- 用户反馈：`Editorial Light` 的配色和字体更好，`Radix Quiet` 的布局排版间距更优
- 当前决定：新增一版融合稿，采用 `Editorial Light` 的视觉温度 + `Radix Quiet` 的骨架与 spacing

## 后续建议

- 优先映射到 `src/App.vue` 的全局令牌
- 再处理 `src/components/SideNav.vue`
- 最后逐页迁移录入、阅读、单词库等页面
- 如果融合稿确认无误，可将其作为后续整站升级的主线基稿
