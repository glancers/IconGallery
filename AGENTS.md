# IconGallery Skill (通用 Agent 版本)

这是 IconGallery 的跨 Agent 技能定义文件。它告诉任何 Agent（Codex, ClaudeCode, OpenClaw, Hermes 等）如何使用 CLI 工具搜索和获取图标。

## 核心能力

通过 `ig` 命令行工具搜索、检索来自 18 个主流图标库的图标。支持中文、拼音、英文同义词（语义）搜索。

## 调用方法

### 1. 列出所有支持的图标库
```bash
cd <repo-root> && node skill/ig.js list
```

### 2. 搜索图标（支持中文）
```bash
# 英文搜索（自动扩展同义词：trash 召回 delete / bin）
node skill/ig.js search "delete"

# 中文搜索（词典映射 + 拼音 + 在线翻译三级兜底）
node skill/ig.js search "删除"
node skill/ig.js search "天气"
node skill/ig.js search "用户"

# 拼音搜索（全拼 / 首字母）
node skill/ig.js search "feiji"
node skill/ig.js search "fj"

# 限定图标库
node skill/ig.js search "save" --lib lucide

# 限制结果数量 / 输出 JSON
node skill/ig.js search "home" --limit 10 --json
```

### 3. 获取图标 SVG 代码
```bash
node skill/ig.js get "trash"
node skill/ig.js get "home" --lib lucide
```
返回内容包括：
- SVG 源码
- CDN CSS 链接
- 用法代码（HTML / React 组件 / Vue 组件）

## 触发场景

当用户有以下需求时，Agent 应主动调用此 Skill：
- 询问 "如何找图标"、"推荐个图标"、"有没有 XX 图标"
- 需要为 UI 项目添加图标
- 请求特定图标的 SVG 或 CDN 用法
- 用中文描述图标需求（如 "我要个删除图标"、"天气图标有吗"）

## 支持的图标库

| ID | 名称 |
|---|---|
| lucide | Lucide |
| tabler | Tabler Icons |
| remix | Remix Icon |
| phosphor | Phosphor |
| bootstrap | Bootstrap Icons |
| material | Material Symbols |
| fontawesome | Font Awesome |
| mdi | MDI |
| heroicons | Heroicons |
| ionicons | Ionicons |
| boxicons | Boxicons |
| octicons | Octicons |
| antd | Ant Design Icons |
| feather | Feather Icons |
| mingcute | MingCute Icon |
| iconoir | Iconoir |
| flowbite | Flowbite Icons |
| devicons | Devicons |

## 安装说明

此 Skill 内置在仓库中，结构如下：
```
IconGallery/
├── skill/
│   ├── ig.js            # CLI 核心脚本
│   ├── SKILL.md         # 可移植 Skill 定义
│   └── zh-index.json    # 共享中文词典
├── AGENTS.md            # 通用 Agent 定义 (本文件)
└── README.md            # 项目说明
```

将 `AGENTS.md` 或 `skill/SKILL.md` 的内容配置到 Agent 的系统提示或工具定义中，并确保 `skill/ig.js` 可用（仅需 Node.js，零依赖）。
