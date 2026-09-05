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

test('将图案居中映射到网格', () => {
  assert.deepEqual(PixelGrid.mapFrame(['111', '010'], 5, 4), [6, 7, 8, 12]);
});

test('窄网格裁切后不产生越界索引', () => {
  const indexes = PixelGrid.mapFrame(['11111', '11111'], 3, 1);

  assert.deepEqual(indexes, [0, 1, 2]);
});

test('内置心跳和小恐龙都有多个动画帧', () => {
  assert.ok(PixelGrid.PATTERNS.heartbeat.length >= 2);
  assert.ok(PixelGrid.PATTERNS.dinosaur.length >= 2);
});

test('随机选择只返回已定义图案', () => {
  assert.equal(PixelGrid.pickPattern(() => 0), 'heartbeat');
  assert.equal(PixelGrid.pickPattern(() => 0.999), 'dinosaur');
});

test('每个网格位置只生成一个像素骨架卡片', () => {
  const html = PixelGrid.renderSkeleton(4, new Set([1, 3]));

  assert.equal((html.match(/pixel-card/g) || []).length, 4);
  assert.equal((html.match(/pixel-card is-active/g) || []).length, 2);
});
