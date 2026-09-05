(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.PixelGrid = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const PATTERNS = {
    heartbeat: [
      [
        '01100110',
        '11111111',
        '11111111',
        '01111110',
        '00111100',
        '00011000',
      ],
      [
        '00000000',
        '01100110',
        '11111111',
        '01111110',
        '00111100',
        '00011000',
      ],
      [
        '01100110',
        '11111111',
        '11111111',
        '01111110',
        '00111100',
        '00011000',
      ],
    ],
    dinosaur: [
      [
        '000011110',
        '000111011',
        '110111110',
        '111111000',
        '011111000',
        '001010000',
        '001001000',
      ],
      [
        '000011110',
        '000111011',
        '110111110',
        '111111000',
        '011111000',
        '001010000',
        '000101000',
      ],
    ],
  };

  function measureGrid(width, height, cardWidth = 96, cardHeight = 76, gap = 10){
    const columns = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)));
    const rows = Math.max(1, Math.ceil((height + gap) / (cardHeight + gap)));
    return { columns, rows, count: columns * rows };
  }

  function mapFrame(frame, columns, rows){
    const sourceRows = frame.length;
    const sourceColumns = frame.reduce((max, line) => Math.max(max, line.length), 0);
    const offsetX = Math.floor((columns - sourceColumns) / 2);
    const offsetY = Math.floor((rows - sourceRows) / 2);
    const indexes = [];

    frame.forEach((line, sourceY) => {
      [...line].forEach((pixel, sourceX) => {
        const x = sourceX + offsetX;
        const y = sourceY + offsetY;
        if(pixel === '1' && x >= 0 && x < columns && y >= 0 && y < rows){
          indexes.push(y * columns + x);
        }
      });
    });

    return indexes;
  }

  function pickPattern(random = Math.random){
    const names = Object.keys(PATTERNS);
    return names[Math.min(names.length - 1, Math.floor(random() * names.length))];
  }

  function renderSkeleton(count, activeIndexes = new Set()){
    return Array.from({ length: count }, (_, index) =>
      '<div class="card pixel-card' + (activeIndexes.has(index) ? ' is-active' : '') + '" aria-hidden="true"></div>'
    ).join('');
  }

  return { PATTERNS, measureGrid, mapFrame, pickPattern, renderSkeleton };
});
