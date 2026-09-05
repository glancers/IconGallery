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

test('波纹环覆盖全部卡片且互不重叠', () => {
  const rings = PixelGrid.waveRings(5, 4, 4);
  const all = rings.flat();

  assert.equal(all.length, 20);
  assert.equal(new Set(all).size, 20);
});

test('第一环只包含距离中心最近的卡片', () => {
  const rings = PixelGrid.waveRings(5, 4, 4);

  assert.ok(rings[0].includes(7));
  assert.ok(rings[0].includes(12));
});

test('波纹从中心向外推进', () => {
  const ring0 = PixelGrid.mapWave(5, 4, 0, 4);
  const ring1 = PixelGrid.mapWave(5, 4, 1, 4);
  const ring2 = PixelGrid.mapWave(5, 4, 2, 4);

  assert.deepEqual(ring0, PixelGrid.waveRings(5, 4, 4)[0]);
  assert.deepEqual(ring1, PixelGrid.waveRings(5, 4, 4)[1]);
  assert.deepEqual(ring2, PixelGrid.waveRings(5, 4, 4)[2]);
});

test('波纹到达边缘后向中心收回（乒乓循环）', () => {
  const rings = PixelGrid.waveRings(5, 4, 4);
  const last = rings.length - 1;

  assert.deepEqual(PixelGrid.mapWave(5, 4, last, 4), rings[last]);
  assert.deepEqual(PixelGrid.mapWave(5, 4, last + 1, 4), rings[last - 1]);
  assert.deepEqual(PixelGrid.mapWave(5, 4, last + 2, 4), rings[last - 2]);
});

test('每个网格位置只生成一个像素骨架卡片', () => {
  const html = PixelGrid.renderSkeleton(4, new Set([1, 3]));

  assert.equal((html.match(/pixel-card/g) || []).length, 4);
  assert.equal((html.match(/pixel-card is-active/g) || []).length, 2);
});
