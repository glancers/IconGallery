# IconGallery

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-6366f1?logo=githubpages&logoColor=white)](https://glancers.github.io/IconGallery/)
[![Libraries](https://img.shields.io/badge/Libraries-19-blue)](#收录图标库)
[![Icons](https://img.shields.io/badge/Icons-30%2C000%2B-22c55e)](#收录图标库)
[![Zero Build](https://img.shields.io/badge/Build-None-f59e0b)](#技术说明)
[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6)](#技术说明)
[![Chinese Search](https://img.shields.io/badge/搜索-中文%20%2F%20拼音%20%2F%20同义词-ec4899)](#功能)

图标选型工作台 —— 单个 HTML 文件，聚合 19 个主流图标库，为项目选型图标用。同时是一个可安装到 AI Agent（Trae、Codex、ClaudeCode、OpenClaw、Hermes 等）的 Skill，Agent 可通过 CLI 直接搜索和获取图标，无需打开浏览器。

> **English** | [中文](#中文说明)

An icon selection workbench in a **single HTML file** — 19 major icon libraries aggregated for project icon picking. Also installable as an AI **Agent Skill** (Trae, Codex, ClaudeCode, OpenClaw, Hermes...): agents search and fetch icons via a zero-dependency Node.js CLI, no browser needed.

**Highlights**: Chinese/pinyin/synonym search · React/Vue component code · favorites with cross-library compare · shareable URL state · dark mode · lazy rendering of 30,000+ icons.

```bash
node skill/ig.js search "delete"     # synonym-aware English search
node skill/ig.js search "删除"        # Chinese search
node skill/ig.js random --lib lucide  # random icons for inspiration
node skill/ig.js similar "trash"      # similar icons across libraries
```

[→ Full usage](#agent-skill-模式) · [→ Try it live](https://glancers.github.io/IconGallery/)

---

<a name="中文说明"></a>

## 使用方法

**在线使用**（GitHub Pages）：

> https://glancers.github.io/IconGallery/

**本地运行**（`file://` 直开部分浏览器会拦截 CDN 数据请求，需走 http）：

```bash
python3 -m http.server 8123
# 打开 http://localhost:8123/index.html
```

也可以把 `index.html` 部署到任意静态服务器，无任何构建依赖。

## 界面预览

| 明亮模式 | 黑暗模式 |
|---|---|
| ![light](screenshots/light.png) | ![dark](screenshots/dark.png) |

## 收录图标库

| 图标库 | 数量 | 特色 |
|---|---|---|
| Lucide | 2000+ | 线性风格，描边粗细可调 |
| Tabler Icons | 5000+ | 线性 + 填充 |
| Remix Icon | 1500+ | 线条 / 填充双风格 |
| Phosphor | 1500+ × 6 字重 | 细 / 轻 / 常规 / 粗 / 填充 / 双色 |
| Bootstrap Icons | 2000+ | 经典通用 |
| Material Symbols | 4200+ | 可变字体，填充开关 + 字重滑杆 |
| Font Awesome | 1895（免费版） | 实心 / 常规 / 品牌三风格 |
| MDI | 7400+ | Material Design 社区版 |
| Heroicons | 324 × 3 | Tailwind 官方，线条 / 实心 / 迷你 |
| Ionicons | 921 × 3 | 填充 / 线条 / 棱角 |
| Boxicons | 1100+ | 常规 / 实心 / 品牌 Logo |
| Octicons | 384 | GitHub 官方，自动匹配 16/24px |
| Ant Design Icons | 447 × 3 | 蚂蚁出品，线条 / 填充 / 双色 |
| Feather Icons | 287 | Lucide 前身，极简线性 |
| MingCute Icon | 684 | 国人出品，精致线条 / 填充 |
| Iconoir | 1383 | 手工线性，线条 / 实心 |
| Flowbite Icons | 442 | Tailwind 生态，线条 / 实心 |
| Devicons | 578 | 技术品牌 Logo（彩色） |
| IconPark | 2658 | 字节跳动，多彩双色 |

图标数据实时从各库官方 CDN 拉取，数量以页面显示为准，与官网同步。

## 功能

- **中文搜索**：三级解析（980+ 条共享词典 → 拼音全拼/首字母 → MyMemory 免费翻译兜底），如「删除」「feiji」「fj」「挖掘机」均可命中
- **英文语义搜索**：从词典反向构建同义词表（共现过滤），搜 `trash` 召回 delete / bin，搜 `user` 召回 person / shield
- **评分排序**：图标名按词元切分（`-`/`_`/camelCase），精确命中 > 前缀 > tags > 子串；多概念组合查询（如「用户删除」）要求各概念同时命中（组间 AND、组内 OR），结果按相关性排序而非字母序
- **收藏对比**：心形收藏（本地持久化）→ 右下角收藏栏 → 跨库横向对比弹窗，选型不用靠脑子记
- **链接分享**：当前库 / 搜索词 / 风格自动编码进 URL，复制地址栏链接即可分享同款视图
- **预览调节**：尺寸 16–96px、10 种颜色 + 自定义取色、描边 / 字重 / 填充样式；侧栏库列表独立滚动，预览设置常驻底部不遮挡
- **点击图标**：大图预览 + 16/24/32/48/64 多尺寸对照，一键复制名称、CSS 类名、HTML 用法、React / Vue 组件代码、CDN 引入语句、SVG 源码
- **深浅主题**：右上角切换，所有偏好（库 / 尺寸 / 颜色 / 风格）自动记忆
- **懒加载**：分块渲染，数千图标滚动流畅
- **快捷键**：`/` 聚焦搜索，`Enter` 打开第一个结果，`Esc` 关闭弹窗

## Agent Skill 模式

IconGallery 同时是一个可安装到 AI Agent（Codex、ClaudeCode、OpenClaw、Hermes 等）的 Skill。Agent 可以通过 CLI 命令搜索和获取图标，无需打开浏览器。

### 安装

1. 将仓库克隆到本地（确保 `skill/ig.js` 可用，仅需 Node.js，零依赖）：

```bash
git clone https://github.com/glancers/IconGallery.git
```

2. 把下面这段话复制给你的 Agent 即可启用：

```text
请阅读并遵循 IconGallery/skill/SKILL.md 中的 IconGallery Skill 定义。
之后我提到找图标 / 需要 SVG / 推荐图标时，按其中的 CLI 协议调用 node IconGallery/skill/ig.js 执行。
```

### CLI 使用

```bash
# 列出所有支持的图标库
node skill/ig.js list

# 搜索图标（支持中英文 / 拼音 / 同义词）
node skill/ig.js search "delete"
node skill/ig.js search "删除"
node skill/ig.js search "天气"

# 限定图标库
node skill/ig.js search "save" --lib lucide

# 限制结果数量 / 输出 JSON
node skill/ig.js search "home" --limit 10 --json

# 随机图标（找灵感）
node skill/ig.js random
node skill/ig.js random --lib lucide --limit 8

# 找同类图标（跨库召回）
node skill/ig.js similar "trash"
node skill/ig.js similar "user" --lib lucide --limit 10

# 获取 SVG 代码和用法（HTML / React / Vue）
node skill/ig.js get "trash"
node skill/ig.js get "home" --lib lucide
```

### 目录结构

```
IconGallery/
├── AGENTS.md               # 通用 Agent Skill 定义
├── skill/
│   ├── ig.js               # CLI 核心脚本（纯 Node.js，零依赖）
│   ├── SKILL.md            # 可移植 Skill 定义（相对路径）
│   └── zh-index.json       # 共享中文词典（980+ 条，兼作英文同义词源）
├── index.html              # Web 界面（单文件）
├── screenshots/            # 截图
└── README.md               # 本文件
```

## 技术说明

纯原生 HTML + CSS + JS，无构建、无依赖、单文件。图标列表解析各库官方 CDN 的 CSS / metadata / 文件树，SVG 类库（Lucide / Heroicons / Ionicons）按需内联渲染。仅供预览选型，图标版权归各库所有。
