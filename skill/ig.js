#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---------- HTTP helpers ---------- */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchJson(url) {
  return fetchText(url).then((t) => JSON.parse(t));
}

/* ---------- Chinese keyword map (shared with web UI) ---------- */
const ZH_MAP = (() => {
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(__dirname, "zh-index.json"), "utf8"));
    const out = {};
    for (const [k, v] of Object.entries(idx)) {
      if (!k.startsWith("_")) out[k] = v;
    }
    return out;
  } catch (e) {
    console.error("Warning: zh-index.json not loaded, Chinese search disabled: " + e.message);
    return {};
  }
})();

/* ---------- Online translation fallback (MyMemory, free, no key) ---------- */
const ZH_TRANS_CACHE = new Map();
async function translateZh2En(q) {
  if (ZH_TRANS_CACHE.has(q)) return ZH_TRANS_CACHE.get(q);
  let result = '';
  try {
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=zh|en";
    const data = JSON.parse(await fetchText(url));
    const t = data && data.responseData && data.responseData.translatedText;
    if (t && !/^[A-Zs-]+ERROR/i.test(t)) result = String(t).toLowerCase().trim();
  } catch (e) { /* network failure: silent fallback to dictionary-only */ }
  ZH_TRANS_CACHE.set(q, result);
  return result;
}

/* ---------- Library loaders ---------- */
const cache = {};

/* ---------- Library definitions ---------- */
const LIBS = {
  lucide: {
    name: 'Lucide',
    site: 'https://lucide.dev',
    load: async () => {
      const meta = await fetchJson(
        'https://data.jsdelivr.com/v1/packages/npm/lucide-static'
      );
      const ver = (meta.tags && meta.tags.latest) || meta.versions[meta.versions.length - 1];
      let tree;
      try {
        tree = await fetchJson(
          `https://data.jsdelivr.com/v1/packages/npm/lucide-static@${ver}?structure=flat`
        );
      } catch (_) {
        tree = await fetchJson(
          `https://data.jsdelivr.com/v1/packages/npm/lucide-static@${ver}`
        );
      }
      const names = tree.files
        .filter((f) => f.name.startsWith('/icons/') && f.name.endsWith('.svg'))
        .map((f) => f.name.slice(7, -4))
        .sort();
      let tags = {};
      try {
        const t = await fetchJson(
          `https://cdn.jsdelivr.net/npm/lucide-static@${ver}/tags.json`
        );
        Object.keys(t).forEach((k) => {
          if (t[k] && t[k].tags) tags[k] = t[k].tags;
        });
      } catch (_) {}
      return { names, tags, version: ver };
    },
    svgUrl: (name, ver) =>
      `https://cdn.jsdelivr.net/npm/lucide-static@${ver}/icons/${name}.svg`,
    css: 'https://cdn.jsdelivr.net/npm/lucide-static@latest/dist/fonts/lucide.css',
    usage: (name) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M..."/></svg>`,
    react: (name) => `import { ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} } from 'lucide-react';\n\n<${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} />`,
  },

  tabler: {
    name: 'Tabler Icons',
    site: 'https://tabler.io/icons',
    css: 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css',
    load: async () => {
      const css = await fetchText(
        'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css'
      );
      const skip = new Set([
        'xs', 'sm', 'md', 'lg', 'xl', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x',
        'rotate', 'rotate-45', 'rotate-90', 'rotate-180', 'rotate-270', 'rotate-2',
        'flip', 'flip-horizontal', 'flip-vertical', 'flip-both', 'spin', 'pulse',
        'pulse-outline', 'border', 'fw',
      ]);
      const s = new Set();
      for (const m of css.matchAll(/\.ti-([a-z0-9-]+)::?before/g)) {
        if (!skip.has(m[1])) s.add(m[1]);
      }
      return { names: [...s].sort(), tags: {} };
    },
    usage: (name) => `<i class="ti ti-${name}"></i>`,
  },

  remix: {
    name: 'Remix Icon',
    site: 'https://remixicon.com',
    css: 'https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.css',
    load: async () => {
      const css = await fetchText(
        'https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.css'
      );
      const line = new Set();
      const fill = new Set();
      for (const m of css.matchAll(/\.ri-([a-z0-9-]+)-line::?before/g)) line.add(m[1]);
      for (const m of css.matchAll(/\.ri-([a-z0-9-]+)-fill::?before/g)) fill.add(m[1]);
      return {
        names: [...new Set([...line, ...fill])].sort(),
        tags: {},
        sets: { line: [...line].sort(), fill: [...fill].sort() },
      };
    },
    usage: (name, set = 'line') => `<i class="ri ri-${name}-${set}"></i>`,
  },

  phosphor: {
    name: 'Phosphor',
    site: 'https://phosphoricons.com',
    css: 'https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css',
    load: async () => {
      const css = await fetchText(
        'https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css'
      );
      const s = new Set();
      for (const m of css.matchAll(/\.ph-([a-z0-9-]+)::?before/g)) s.add(m[1]);
      return { names: [...s].sort(), tags: {} };
    },
    usage: (name) => `<i class="ph ph-${name}"></i>`,
  },

  bootstrap: {
    name: 'Bootstrap Icons',
    site: 'https://icons.getbootstrap.com',
    css: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css',
    load: async () => {
      const css = await fetchText(
        'https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css'
      );
      const s = new Set();
      for (const m of css.matchAll(/\.bi-([a-z0-9-]+)::?before/g)) s.add(m[1]);
      return { names: [...s].sort(), tags: {} };
    },
    usage: (name) => `<i class="bi bi-${name}"></i>`,
  },

  material: {
    name: 'Material Symbols',
    site: 'https://fonts.google.com/icons',
    css: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    load: async () => {
      const cp = 'variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';
      const sources = [
        `https://cdn.jsdelivr.net/gh/google/material-design-icons@master/${cp}`,
        `https://raw.githubusercontent.com/google/material-design-icons/master/${cp}`,
      ];
      let txt = '';
      for (const url of sources) {
        try {
          txt = await fetchText(url);
          if (txt) break;
        } catch (_) {}
      }
      if (!txt) throw new Error('failed to load Material Symbols codepoints');
      const names = txt
        .split('\n')
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.split(' ')[0])
        .filter(Boolean)
        .sort();
      return { names, tags: {} };
    },
    usage: (name) => `<span class="material-symbols-rounded" style="font-size:24px;line-height:1">${name}</span>`,
  },

  fontawesome: {
    name: 'Font Awesome',
    site: 'https://fontawesome.com/icons',
    css: 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@latest/css/all.min.css',
    load: async () => {
      const css = await fetchText(
        'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@latest/css/all.min.css'
      );
      const skip = new Set([
        'xs', 'sm', 'md', 'lg', 'xl', '1x', '2x', '3x', '4x', '5x', '6x', '7x', '8x', '9x', '10x',
        'spin', 'spin-reverse', 'spin-pulse', 'pulse', 'bounce', 'shake', 'beat', 'fade', 'fade-in',
        'fade-out', 'flip', 'flip-horizontal', 'flip-vertical', 'fw', 'fixed-width', 'li', 'border',
        'pull', 'pull-left', 'pull-right', 'stack', 'add', 'corner', 'primary', 'secondary',
      ]);
      const solid = new Set();
      const regular = new Set();
      const brands = new Set();
      for (const m of css.matchAll(/fa-solid\s+fa-([a-z0-9-]+)/g)) {
        if (!skip.has(m[1])) solid.add(m[1]);
      }
      for (const m of css.matchAll(/fa-regular\s+fa-([a-z0-9-]+)/g)) {
        if (!skip.has(m[1])) regular.add(m[1]);
      }
      for (const m of css.matchAll(/fa-brands\s+fa-([a-z0-9-]+)/g)) {
        if (!skip.has(m[1])) brands.add(m[1]);
      }
      // Fallback: also try matching just .fa- classes
      if (solid.size === 0 && regular.size === 0 && brands.size === 0) {
        for (const m of css.matchAll(/\.fa-([a-z0-9-]+)::?before/g)) {
          if (!skip.has(m[1])) solid.add(m[1]);
        }
      }
      return {
        names: [...new Set([...solid, ...regular, ...brands])].sort(),
        tags: {},
        sets: {
          solid: [...solid].sort(),
          regular: [...regular].sort(),
          brands: [...brands].sort(),
        },
      };
    },
    usage: (name, set = 'solid') => {
      const base = { solid: 'fa-solid', regular: 'fa-regular', brands: 'fa-brands' };
      return `<i class="${base[set]} fa-${name}"></i>`;
    },
  },

  mdi: {
    name: 'MDI',
    site: 'https://pictogrammers.com/library/mdi/',
    css: 'https://cdn.jsdelivr.net/npm/@mdi/font@latest/css/materialdesignicons.min.css',
    load: async () => {
      const css = await fetchText(
        'https://cdn.jsdelivr.net/npm/@mdi/font@latest/css/materialdesignicons.min.css'
      );
      const s = new Set();
      for (const m of css.matchAll(/\.mdi-([a-z0-9-]+)::?before/g)) s.add(m[1]);
      return { names: [...s].sort(), tags: {} };
    },
    usage: (name) => `<i class="mdi mdi-${name}"></i>`,
  },

  heroicons: {
    name: 'Heroicons',
    site: 'https://heroicons.com',
    css: '',
    load: async () => {
      const meta = await fetchJson(
        'https://data.jsdelivr.com/v1/packages/npm/@heroicons/react'
      );
      const ver = (meta.tags && meta.tags.latest) || meta.versions[meta.versions.length - 1];
      const dts = await fetchText(
        `https://cdn.jsdelivr.net/npm/@heroicons/react@${ver}/24/outline/index.d.ts`
      );
      const names = [...new Set(
        dts
          .matchAll(/export \{ default as (\w+) \} from/g)
          .map((m) => m[1].replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''))
      )].sort();
      return { names, tags: {}, version: ver };
    },
    svgUrl: (name, ver) =>
      `https://cdn.jsdelivr.net/npm/@heroicons/react@${ver}/24/outline/${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon.js`,
    react: (name) => `import { ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon } from '@heroicons/react/24/outline';\n\n<${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon />`,
  },

  ionicons: {
    name: 'Ionicons',
    site: 'https://ionic.io/ionicons',
    css: '',
    load: async () => {
      const meta = await fetchJson(
        'https://data.jsdelivr.com/v1/packages/npm/ionicons'
      );
      const ver = (meta.tags && meta.tags.latest) || meta.versions[meta.versions.length - 1];
      let tree;
      try {
        tree = await fetchJson(
          `https://data.jsdelivr.com/v1/packages/npm/ionicons@${ver}?structure=flat`
        );
      } catch (_) {
        tree = await fetchJson(
          `https://data.jsdelivr.com/v1/packages/npm/ionicons@${ver}`
        );
      }
      const files = tree.files || [];
      const svgFiles = files.filter(
        (f) => f.name && f.name.startsWith('/dist/collection/components/icon/assets/') && f.name.endsWith('.svg')
      );
      const names = svgFiles
        .map((f) => f.name.split('/').pop().slice(0, -4))
        .sort();
      return { names, tags: {}, version: ver };
    },
    svgUrl: (name, ver) =>
      `https://cdn.jsdelivr.net/npm/ionicons@${ver}/dist/collection/components/icon/assets/${name}.svg`,
    usage: (name) => `<ion-icon name="${name}"></ion-icon>`,
  },

  boxicons: {
    name: 'Boxicons',
    site: 'https://boxicons.com',
    css: 'https://cdn.jsdelivr.net/npm/boxicons@latest/css/boxicons.min.css',
    load: async () => {
      const css = await fetchText(
        'https://cdn.jsdelivr.net/npm/boxicons@latest/css/boxicons.min.css'
      );
      const s = new Set();
      for (const m of css.matchAll(/\.bx-([a-z0-9-]+)::?before/g)) s.add(m[1]);
      return { names: [...s].sort(), tags: {} };
    },
    usage: (name) => `<i class="bx bx-${name}"></i>`,
  },
};

/* ---------- Core API ---------- */
async function loadLib(id) {
  if (cache[id]) return cache[id];
  const lib = LIBS[id];
  if (!lib) throw new Error(`Unknown library: ${id}`);
  console.error(`Loading ${lib.name}...`);
  const data = await lib.load();
  cache[id] = { ...lib, ...data };
  console.error(`Loaded ${lib.name}: ${data.names.length} icons`);
  return cache[id];
}

function isCJK(q) {
  return /[\u4e00-\u9fff]/.test(q);
}

function expandQuery(q) {
  const kws = new Set();
  let i = 0;
  while (i < q.length) {
    let matched = '';
    for (let len = 4; len >= 1; len--) {
      if (i + len > q.length) continue;
      const seg = q.slice(i, i + len);
      if (ZH_MAP[seg]) {
        matched = seg;
        break;
      }
    }
    if (matched) {
      ZH_MAP[matched].forEach((k) => kws.add(k));
      i += matched.length;
    } else {
      i++;
    }
  }
  return [...kws];
}

function filterNames(names, tags, query, tagFilter, kwsOverride) {
  const q = query.trim().toLowerCase();
  if (!q) return names;
  if (isCJK(q)) {
    const kws = kwsOverride || expandQuery(q);
    if (!kws.length) return [];
    const tagList = tagFilter ? [tagFilter] : kws;
    return names.filter((n) => {
      if (tagList.some((k) => n.includes(k))) return true;
      const t = tags[n];
      return t && t.length && tagList.some((k) => t.some((x) => x.includes(k)));
    });
  }
  if (tagFilter) return names.filter((n) => n.includes(tagFilter));
  return names.filter(
    (n) => n.includes(q) || (tags[n] && tags[n].some((x) => x.includes(q)))
  );
}

/* CJK 查询：词典命中 -> 直接用；未命中 -> 在线翻译兜底 */
async function resolveCJKKeywords(query) {
  const kws = expandQuery(query);
  if (kws.length) return { kws, via: 'dictionary' };
  const en = await translateZh2En(query);
  if (en) {
    const tkws = en.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
    if (tkws.length) return { kws: tkws, via: 'translation' };
  }
  return { kws: [], via: 'none' };
}

async function search(query, { lib: libId, limit = 20, json: asJson } = {}) {
  const libsToSearch = libId ? [libId] : Object.keys(LIBS);
  const results = [];

  let kwOverride = null;
  let via = 'dictionary';
  if (isCJK(query)) {
    const r = await resolveCJKKeywords(query);
    kwOverride = r.kws;
    via = r.via;
    if (!kwOverride.length) {
      console.log('No icons found. (词典与翻译均未命中该中文词)');
      return asJson ? [] : undefined;
    }
    if (!asJson && via === 'translation') {
      console.log(`(词典未命中，已通过在线翻译: ${query} -> ${kwOverride.join(' ')})`);
    }
  }

  for (const id of libsToSearch) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set([...(data.sets.line || []), ...(data.sets.fill || []), ...(data.sets.solid || []), ...(data.sets.regular || []), ...(data.sets.brands || [])])].sort()
        : data.names;
      const matched = filterNames(names, data.tags || {}, query, null, kwOverride);
      matched.slice(0, limit).forEach((name) => {
        results.push({ library: id, name });
      });
    } catch (e) {
      console.error(`Warning: failed to load ${id}: ${e.message}`);
    }
  }

  const top = results.slice(0, limit);

  if (asJson) return top;

  if (!top.length) {
    console.log('No icons found.');
    if (isCJK(query)) {
      const kws = expandQuery(query);
      console.log(`  展开关键词: ${kws.join(', ') || '(词典无匹配)'}`);
    }
    return;
  }

  console.log(`Found ${results.length} matches${results.length > limit ? ` (showing ${limit})` : ''}:\n`);
  const grouped = {};
  top.forEach((r) => {
    if (!grouped[r.library]) grouped[r.library] = [];
    grouped[r.library].push(r.name);
  });
  for (const [lib, names] of Object.entries(grouped)) {
    console.log(`  [${LIBS[lib].name}]`);
    names.forEach((n) => console.log(`    ${n}`));
    console.log();
  }
}

async function get(name, { lib: libId } = {}) {
  const libsToTry = libId ? [libId] : Object.keys(LIBS);

  for (const id of libsToTry) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set([...(data.sets.line || []), ...(data.sets.fill || []), ...(data.sets.solid || []), ...(data.sets.regular || []), ...(data.sets.brands || [])])].sort()
        : data.names;
      if (names.includes(name)) {
        const lib = LIBS[id];
        const out = {
          library: id,
          libraryName: lib.name,
          name,
          cdn: lib.css || '(none - inline SVG only)',
        };
        if (data.svgUrl && data.version) {
          try {
            out.svg = await fetchText(data.svgUrl(name, data.version));
          } catch (_) {
            out.svg = '(failed to fetch SVG source)';
          }
        } else if (lib.usage) {
          out.svg = lib.usage(name);
        }
        if (lib.react) out.react = lib.react(name);
        else out.html = lib.usage ? lib.usage(name) : '';
        return out;
      }
    } catch (e) {
      // try next
    }
  }
  return null;
}

/* ---------- CLI ---------- */
function printUsage() {
  console.log(`IconGallery CLI - 11 图标库搜索与检索

Usage:
  node ig.js list                    列出所有支持的图标库
  node ig.js search <query>          搜索图标（支持中文）
  node ig.js get <name>              获取图标 SVG 代码

Options:
  --lib <id>      限定图标库 (e.g., lucide, tabler)
  --limit <N>     搜索结果数量（默认 20）
  --json          以 JSON 格式输出

Examples:
  node ig.js list
  node ig.js search "delete"
  node ig.js search "删除"
  node ig.js search "天气" --lib phosphor
  node ig.js get "trash"
  node ig.js get "home" --lib lucide
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    printUsage();
    return;
  }

  const cmd = args[0];
  const rest = args.slice(1);

  // Parse flags
  const opts = { lib: null, limit: 20, json: false };
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--lib') opts.lib = rest[++i];
    else if (a === '--limit') opts.limit = parseInt(rest[++i], 10);
    else if (a === '--json') opts.json = true;
    else positional.push(a);
  }

  if (cmd === 'list') {
    const rows = Object.entries(LIBS).map(([id, l]) => ({
      id,
      name: l.name,
      site: l.site,
    }));
    if (opts.json) {
      console.log(JSON.stringify(rows, null, 2));
    } else {
      console.log('Supported Libraries:\n');
      rows.forEach((r) => console.log(`  ${r.id.padEnd(14)} ${r.name.padEnd(20)} ${r.site}`));
      console.log('\nUse --lib <id> to narrow search.');
    }
    return;
  }

  if (cmd === 'search') {
    if (!positional.length) {
      console.error('Error: search requires a query');
      process.exit(1);
    }
    const query = positional.join(' ');
    const results = await search(query, opts);
    if (opts.json && results) console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (cmd === 'get') {
    if (!positional.length) {
      console.error('Error: get requires an icon name');
      process.exit(1);
    }
    const name = positional[0];
    const result = await get(name, opts);
    if (!result) {
      console.error(`Icon "${name}" not found${opts.lib ? ` in ${opts.lib}` : ''}.`);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Library: ${result.libraryName} (${result.library})`);
      console.log(`Name:    ${result.name}`);
      console.log(`CDN:     ${result.cdn}`);
      console.log();
      if (result.svg) {
        console.log('--- SVG Source ---');
        console.log(result.svg);
        console.log();
      }
      if (result.html) {
        console.log('--- HTML Usage ---');
        console.log(result.html);
        console.log();
      }
      if (result.react) {
        console.log('--- React Usage ---');
        console.log(result.react);
        console.log();
      }
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printUsage();
  process.exit(1);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
