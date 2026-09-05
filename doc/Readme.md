# IconGallery 产品介绍

IconGallery 是一个面向设计师、开发者和 AI Agent 的图标选型工作台。它聚合 28 个图标库，支持中文、拼音、英文和同义词搜索，并提供跨库结果、收藏比较、样式预览及多种代码用法。

图标库加载期间，右侧固定卡片网格播放从中心向外扩散再收回的心跳波纹。数据就绪后，整片骨架立即替换为真实图标网格，不增加额外等待时间。

## 使用方式

在线版本部署于 GitHub Pages。本地运行：

```bash
python3 -m http.server 8123
```

然后访问 `http://localhost:8123/`。

## 部署特点

- 纯原生 HTML、CSS 和 JavaScript。
- 无包管理依赖，无构建步骤。
- 可将仓库根目录直接发布到 GitHub Pages。
- 页面资源使用相对路径，兼容 GitHub Pages 项目子路径。
- 像素矩阵算法位于 `js/pixel-grid.js`，可通过 Node.js 内置测试验证。

## Agent Skill

Agent 可阅读 `skill/SKILL.md`，并通过 `node skill/ig.js` 搜索、随机选择或获取指定图标的代码。
