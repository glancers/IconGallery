# 像素网格加载动效实施计划

> **执行要求：** 使用 `executing-plans` 按任务执行；每个行为先写失败测试，再写最小实现。

**目标：** 图标库加载时让整片固定卡片网格组成心跳或小恐龙像素动画，加载成功后从左上到右下原位替换为真实图标。

**架构：** 新增无 DOM 依赖的 `js/pixel-grid.js`，负责骨架数量、图案帧和二维矩阵映射，可直接用 Node 内置测试运行。`js/app.js` 只负责 DOM 生命周期、帧调度、取消旧任务和真实卡片揭示；`css/style.css` 负责骨架像素与替换过渡。

**技术栈：** 原生 HTML/CSS/JavaScript、Node.js 内置 `node:test`，无新增依赖和构建步骤。

---

### 任务 1：建立可测试的像素矩阵模块

**文件：**
- 新增：`js/pixel-grid.js`
- 新增：`tests/pixel-grid.test.js`
- 修改：`index.html:312`

- [ ] **步骤 1：先写失败测试**

测试覆盖：根据容器宽高计算列行数；图案在矩阵中居中；窄网格裁切后索引不越界；心跳和小恐龙均包含多帧；随机选择只返回已定义图案。

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const PixelGrid = require('../js/pixel-grid.js');

test('按真实卡片尺寸计算覆盖可视区的矩阵', () => {
  assert.deepEqual(PixelGrid.measureGrid(530, 350, 96, 76, 10), {
    columns: 5,
    rows: 5,
    count: 25,
  });
});

test('将图案居中映射且不产生越界索引', () => {
  const indexes = PixelGrid.mapFrame(['111', '010'], 5, 4);
  assert.deepEqual(indexes, [6, 7, 8, 12]);
  assert.ok(indexes.every(index => index >= 0 && index < 20));
});

test('内置心跳和小恐龙都有多个动画帧', () => {
  assert.ok(PixelGrid.PATTERNS.heartbeat.length >= 2);
  assert.ok(PixelGrid.PATTERNS.dinosaur.length >= 2);
});
```

- [ ] **步骤 2：运行测试并确认按预期失败**

运行：`node --test tests/pixel-grid.test.js`

预期：失败，提示找不到 `../js/pixel-grid.js`。

- [ ] **步骤 3：实现最小纯函数模块**

使用 UMD 形式同时支持浏览器全局变量与 Node `require`：

```js
(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.PixelGrid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const PATTERNS = {
    heartbeat: [/* 二维 0/1 字符串帧 */],
    dinosaur: [/* 二维 0/1 字符串帧 */],
  };

  function measureGrid(width, height, cardWidth = 96, cardHeight = 76, gap = 10){
    const columns = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)));
    const rows = Math.max(1, Math.ceil((height + gap) / (cardHeight + gap)));
    return { columns, rows, count: columns * rows };
  }

  function mapFrame(frame, columns, rows){
    /* 居中并裁切，返回需要点亮的卡片索引。 */
  }

  function pickPattern(random = Math.random){
    const names = Object.keys(PATTERNS);
    return names[Math.floor(random() * names.length)];
  }

  return { PATTERNS, measureGrid, mapFrame, pickPattern };
});
```

- [ ] **步骤 4：加载模块并验证测试通过**

在 `index.html` 中将脚本顺序改为：

```html
<script src="./js/pixel-grid.js"></script>
<script src="./js/app.js"></script>
```

运行：`node --test tests/pixel-grid.test.js && node --check js/pixel-grid.js`

预期：全部通过。

### 任务 2：接入加载骨架生命周期

**文件：**
- 修改：`js/app.js:1070-1185`
- 修改：`css/style.css:31-38`
- 修改：`tests/pixel-grid.test.js`

- [ ] **步骤 1：先补失败测试**

新增用例验证骨架 HTML 数量和活动像素类，期望 API 为 `renderSkeleton(count, activeIndexes)`：

```js
test('每个网格位置只生成一个像素骨架卡片', () => {
  const html = PixelGrid.renderSkeleton(4, new Set([1, 3]));
  assert.equal((html.match(/pixel-card/g) || []).length, 4);
  assert.equal((html.match(/pixel-card is-active/g) || []).length, 2);
});
```

- [ ] **步骤 2：运行测试并确认缺少 API**

运行：`node --test tests/pixel-grid.test.js`

预期：失败，提示 `PixelGrid.renderSkeleton is not a function`。

- [ ] **步骤 3：实现骨架生成与加载控制器**

在 `pixel-grid.js` 实现 `renderSkeleton`。在 `app.js` 增加 `startPixelLoading(renderGeneration)`、`paintPixelFrame()`、`stopPixelLoading()`：

- 从 `grid.clientWidth`、`contentEl.clientHeight` 和真实卡片测量值计算矩阵。
- 骨架节点使用 `.card.pixel-card`，保证尺寸由现有网格规则决定。
- 每 280ms 切换一次图案帧，只切换 `.is-active` 类。
- 使用 `gen` 校验世代；切库、成功、失败和空结果均先停止旧定时器。
- 加载状态隐藏原有居中 spinner，显示网格和无障碍文本 `正在加载…`。
- 仅在仍为 loading 时响应节流后的 `resize` 并重建矩阵。

- [ ] **步骤 4：添加骨架视觉样式**

```css
.pixel-card{min-height:76px;cursor:default;pointer-events:none;animation:none;contain:paint;background:var(--card-bg)}
.pixel-card::before{content:'';width:28%;aspect-ratio:1;border-radius:5px;background:var(--card-bd);opacity:.24;transition:opacity 180ms cubic-bezier(.25,1,.5,1),transform 180ms cubic-bezier(.25,1,.5,1)}
.pixel-card.is-active::before{opacity:.9;transform:scale(1.08);background:#6366f1}
html.dark .pixel-card.is-active::before{background:#818cf8}
```

颜色实施时优先复用现有变量；亮色和深色都保持低饱和度，图案靠明暗而非高强度闪烁识别。

- [ ] **步骤 5：验证模块和语法**

运行：`node --test tests/pixel-grid.test.js && node --check js/pixel-grid.js && node --check js/app.js`

预期：全部通过，无语法错误。

### 任务 3：实现从左上到右下逐格替换

**文件：**
- 修改：`js/pixel-grid.js`
- 修改：`js/app.js:1118-1140`
- 修改：`css/style.css:31-38`
- 修改：`tests/pixel-grid.test.js`

- [ ] **步骤 1：先写失败测试**

```js
test('按阅读顺序生成揭示批次', () => {
  assert.deepEqual(PixelGrid.revealBatches(7, 3), [[0, 1, 2], [3, 4, 5], [6]]);
});
```

- [ ] **步骤 2：运行测试并确认缺少 API**

运行：`node --test tests/pixel-grid.test.js`

预期：失败，提示 `PixelGrid.revealBatches is not a function`。

- [ ] **步骤 3：实现揭示批次与 DOM 替换**

在 `pixel-grid.js` 实现顺序分批函数。在 `app.js` 中：

- 首批真实卡片先生成到 `DocumentFragment`，保留当前骨架网格。
- 每帧替换 4 至 8 个对应位置的骨架节点，保证首项到末项严格递增。
- 数据成功后立即开始，不设置延迟。
- 若真实首批数量少于骨架数量，替换完成后移除多余骨架。
- 若真实首批多于骨架数量，替换完骨架后追加剩余卡片。
- 揭示结束后再执行 `fillSlots(grid)`、`updateEnd()` 和 `pump()`。
- 每批检查 `gen`；切库后旧批次立即退出。

- [ ] **步骤 4：补充揭示样式与减少动态效果**

```css
.card.pixel-reveal{animation:pixelReveal 220ms cubic-bezier(.22,1,.36,1) both}
@keyframes pixelReveal{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
  .pixel-card::before,.card.pixel-reveal{animation:none;transition:none;transform:none}
}
```

减少动态效果模式下使用一个静态图案，并在单个动画帧内完成全部替换。

- [ ] **步骤 5：运行完整静态验证**

运行：

```bash
node --test tests/pixel-grid.test.js
node --check js/pixel-grid.js
node --check js/app.js
node --check skill/ig.js
git diff --check
```

预期：测试全部通过，所有脚本语法正确，diff 无空白错误。

### 任务 4：浏览器验收与文档同步

**文件：**
- 修改：`doc/TechSpec.md`
- 修改：`doc/DesignSysteam.md`
- 修改：`doc/TestCase.md`
- 修改：`doc/Readme.md`
- 修改：`doc/PRD.md`
- 修改：`doc/ChangeLog.md`
- 修改：`README.md`

- [ ] **步骤 1：本地慢网速验证**

通过 Chrome DevTools 将网络设为 Slow 3G 后刷新 `http://localhost:8123/index.html`，验证：整片网格只有一个大型图案；每张卡片是一个像素；卡片尺寸和列数不跳动；成功后从左上到右下立即替换。

- [ ] **步骤 2：验证中断和异常场景**

验证快速切换图标库、加载失败后重试、加载中缩放窗口、深浅主题、窄屏布局和 `prefers-reduced-motion`，确认旧动画不残留且现有功能不回归。

- [ ] **步骤 3：同步项目文档**

在六份 `doc/` 文档和根 `README.md` 中只补充本次功能涉及的产品行为、模块职责、视觉规则和测试用例。`doc/ChangeLog.md` 使用执行时的实际分钟：

```markdown
## 2026-09-06

### 2026-09-06 HH:mm 更新

- 【新增】图标网格加载时由卡片共同组成心跳或小恐龙像素动画。
- 【新增】图标数据加载完成后从左上到右下逐格替换骨架卡片。
- 【新增】像素矩阵计算自动测试和减少动态效果支持。
```

- [ ] **步骤 4：最终验证**

重复运行任务 3 的全部命令，并检查 `git status --short`，确认没有覆盖拆分前后已有的用户改动。
