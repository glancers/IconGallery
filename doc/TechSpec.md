# IconGallery 技术架构文档

## 技术栈

- 原生 HTML、CSS、JavaScript。
- Tailwind CSS 浏览器 CDN，用于页面工具类样式。
- 各图标库官方 CDN 或 metadata 接口，用于加载图标数据。
- Node.js 零依赖 CLI，位于 `skill/ig.js`。

## 静态页面结构

```text
index.html       页面结构、主题预初始化和 Tailwind 配置
css/style.css    自定义样式与 CSS 变量
js/app.js        图标加载、搜索、渲染和交互逻辑
js/pixel-grid.js 像素图案、矩阵映射、骨架 HTML 和揭示批次纯函数
tests/           Node.js 内置测试
skill/           Agent Skill 与 CLI
```

`index.html` 使用 `./css/style.css` 和 `./js/app.js` 相对路径，确保部署到 `https://<user>.github.io/<repo>/` 时路径正确。

## 加载顺序

1. 在 `<head>` 中同步读取主题偏好，避免主题闪烁。
2. 加载 Tailwind CDN，并完成 `tailwind.config` 配置。
3. 加载 `css/style.css`。
4. HTML 完成解析后，在 `</body>` 前依次加载 `js/pixel-grid.js` 和 `js/app.js`。

## 像素加载管线

- `js/pixel-grid.js` 不依赖 DOM，提供矩阵测量、同心波纹环划分（`waveRings`）和心跳波纹步进（`mapWave`）。
- `js/app.js` 在图标库进入 `loading` 时根据网格宽度和内容区高度生成骨架卡片，并每 160ms 点亮一环。
- 波纹从网格中心开始逐环向外扩散，到达边缘后逐环向中心收回，乒乓循环；熄灭环缓慢淡出形成拖尾。
- 每张骨架卡片就是一个像素，活动像素直接改变整张卡片的背景与边框。
- 数据成功后立即停止帧动画，清空骨架并一次性渲染首批真实卡片。
- 加载任务复用 `gen` 世代编号；切库、失败、空结果和窗口缩放都会取消或重建旧任务。
- `prefers-reduced-motion` 下不启动循环定时器，骨架显示为静态图案。

## 数据与状态

- 图标数据在浏览器运行时从外部 CDN 加载。
- 主题、预览配置和收藏使用 `localStorage` 保存。
- 当前图标库、查询和风格等可分享状态写入 URL hash。

## 部署

仓库根目录可直接作为 GitHub Pages 发布目录，不需要构建产物。部署时必须保留 `css/`、`js/`、`skill/` 与 `index.html` 的相对目录结构。
