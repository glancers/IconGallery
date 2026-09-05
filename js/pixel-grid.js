(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.PixelGrid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  function measureGrid(width, height, cardWidth = 96, cardHeight = 76, gap = 10){
    const columns = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)));
    const rows = Math.max(1, Math.ceil((height + gap) / (cardHeight + gap)));
    return { columns, rows, count: columns * rows };
  }

  /* 按到网格中心的距离把所有卡片切成 ringCount 个同心环（内环在前），环互不重叠且覆盖全部卡片 */
  function waveRings(columns, rows, ringCount = 5){
    const cx = (columns - 1) / 2, cy = (rows - 1) / 2;
    const cells = [];
    for(let y = 0; y < rows; y++){
      for(let x = 0; x < columns; x++){
        cells.push({ index: y * columns + x, d: Math.hypot(x - cx, y - cy) });
      }
    }
    cells.sort((a, b) => a.d - b.d);
    const count = Math.max(1, Math.min(ringCount, cells.length));
    const rings = Array.from({ length: count }, () => []);
    cells.forEach((cell, i) => {
      rings[Math.min(count - 1, Math.floor(i * count / cells.length))].push(cell.index);
    });
    return rings;
  }

  /* 心跳波纹：第 step 步点亮一环，从中心向外推到边缘，再向中心收回，乒乓循环 */
  function mapWave(columns, rows, step, ringCount = 5){
    const rings = waveRings(columns, rows, ringCount);
    const cycle = rings.length > 1 ? rings.length * 2 - 2 : 1;
    const s = ((step % cycle) + cycle) % cycle;
    return rings[s < rings.length ? s : cycle - s];
  }

  function renderSkeleton(count, activeIndexes = new Set()){
    return Array.from({ length: count }, (_, index) =>
      '<div class="card pixel-card' + (activeIndexes.has(index) ? ' is-active' : '') + '" aria-hidden="true"></div>'
    ).join('');
  }

  return { measureGrid, waveRings, mapWave, renderSkeleton };
});
