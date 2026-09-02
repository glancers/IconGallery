#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---------- HTTP helpers ---------- */
function fetchText(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, (res) => {
      /* 跟随重定向（unpkg @latest 等场景） */
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        fetchText(new URL(res.headers.location, url).toString(), redirects - 1).then(resolve, reject);
        return;
      }
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

/* ---------- Pinyin index (feiji / fj / shanchu / sc ...) ---------- */
const ZH_PINYIN = (() => {
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(__dirname, "zh-index.json"), "utf8"));
    return idx._pinyin || {};
  } catch (e) {
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

/* jsDelivr 工具：解析 latest 版本号 + 拉平文件树 */
async function jsdelivrLatest(pkg) {
  const meta = await fetchJson(`https://data.jsdelivr.com/v1/packages/npm/${pkg}`);
  return (meta.tags && meta.tags.latest) || meta.versions[meta.versions.length - 1];
}
async function flatTree(pkg, ver) {
  let tree;
  try {
    tree = await fetchJson(`https://data.jsdelivr.com/v1/packages/npm/${pkg}@${ver}?structure=flat`);
  } catch (_) {
    tree = await fetchJson(`https://data.jsdelivr.com/v1/packages/npm/${pkg}@${ver}`);
  }
  return tree.files || [];
}

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
    svgUrl: (name, data) =>
      `https://cdn.jsdelivr.net/npm/lucide-static@${data.version}/icons/${name}.svg`,
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
    usage: (name, set) => `<i class="ri ri-${name}-${set || 'line'}"></i>`,
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
    /* FA7 CSS 改用 .fa-xxx{--fa:".."} 定义，旧正则失配；改用官方 metadata（与 Web 端一致） */
    load: async () => {
      const meta = await fetchJson(
        'https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.x/metadata/icons.json'
      );
      const sets = { solid: [], regular: [], brands: [] };
      Object.keys(meta).forEach((name) => {
        (meta[name].styles || []).forEach((s) => {
          if (sets[s]) sets[s].push(name);
        });
      });
      Object.values(sets).forEach((a) => a.sort());
      if (!sets.solid.length) throw new Error('parse failed');
      return {
        names: [...new Set([...sets.solid, ...sets.regular, ...sets.brands])].sort(),
        tags: {},
        sets,
      };
    },
    usage: (name, set) => {
      const base = { solid: 'fa-solid', regular: 'fa-regular', brands: 'fa-brands' };
      return `<i class="${base[set] || 'fa-solid'} fa-${name}"></i>`;
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
    svgUrl: (name, data) =>
      `https://cdn.jsdelivr.net/npm/@heroicons/react@${data.version}/24/outline/${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon.js`,
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
      /* dist/svg 下是 filled.svg / xxx-outline.svg / xxx-sharp.svg，去掉风格后缀取基础名 */
      const s = new Set();
      for (const f of files) {
        const m = f.name && f.name.match(/^\/dist\/svg\/([a-z0-9-]+)\.svg$/);
        if (!m) continue;
        const n = m[1];
        s.add(n.endsWith('-outline') ? n.slice(0, -9) : n.endsWith('-sharp') ? n.slice(0, -6) : n);
      }
      const names = [...s].sort();
      return { names, tags: {}, version: ver };
    },
    svgUrl: (name, data) =>
      `https://cdn.jsdelivr.net/npm/ionicons@${data.version}/dist/svg/${name}.svg`,
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

  octicons: {
    name: 'Octicons',
    site: 'https://primer.style/foundations/icons',
    css: '',
    load: async () => {
      const ver = await jsdelivrLatest('@primer/octicons');
      const data = await fetchJson(`https://cdn.jsdelivr.net/npm/@primer/octicons@${ver}/build/data.json`);
      const names = Object.keys(data).sort();
      const tags = {}, heights = {};
      names.forEach((n) => {
        if (data[n].keywords && data[n].keywords.length)
          tags[n] = data[n].keywords.map((k) => String(k).toLowerCase());
        /* heights 是 {'16':{...},'24':{...}} 对象，转成数字数组 */
        heights[n] = data[n].heights ? Object.keys(data[n].heights).map(Number) : [24];
      });
      return { names, tags, heights, version: ver };
    },
    svgUrl: (name, data) => {
      const hs = (data.heights && data.heights[name]) || [24];
      const h = hs.includes(24) ? 24 : hs.includes(16) ? 16 : hs[hs.length - 1] || 24;
      return `https://cdn.jsdelivr.net/npm/@primer/octicons@${data.version}/build/svg/${name}-${h}.svg`;
    },
    react: (name) => `import { ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Icon } from '@primer/octicons-react';`,
  },

  antd: {
    name: 'Ant Design Icons',
    site: 'https://ant.design/components/icon',
    css: '',
    load: async () => {
      const ver = await jsdelivrLatest('@ant-design/icons-svg');
      const files = await flatTree('@ant-design/icons-svg', ver);
      const sets = { outlined: new Set(), filled: new Set(), twotone: new Set() };
      files.forEach((f) => {
        const m = f.name.match(/^\/inline-svg\/(outlined|filled|twotone)\/([a-z0-9-]+)\.svg$/);
        if (m) sets[m[1]].add(m[2]);
      });
      const out = {};
      Object.keys(sets).forEach((k) => (out[k] = [...sets[k]].sort()));
      return { names: [...new Set(Object.values(sets).reduce((a, s) => a.concat([...s]), []))].sort(), tags: {}, sets: out };
    },
    svgUrl: (name) =>
      `https://cdn.jsdelivr.net/npm/@ant-design/icons-svg@latest/inline-svg/outlined/${name}.svg`,
    react: (name) => `import { ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Outlined } from '@ant-design/icons';`,
  },

  feather: {
    name: 'Feather Icons',
    site: 'https://feathericons.com',
    css: '',
    load: async () => {
      const files = await flatTree('feather-icons', await jsdelivrLatest('feather-icons'));
      const names = files
        .filter((f) => /^\/dist\/icons\/[a-z0-9-]+\.svg$/.test(f.name))
        .map((f) => f.name.slice(12, -4))
        .sort();
      return { names, tags: {} };
    },
    svgUrl: (name) =>
      `https://cdn.jsdelivr.net/npm/feather-icons@latest/dist/icons/${name}.svg`,
    usage: (name) => `<i data-feather="${name}"></i>`,
  },

  mingcute: {
    name: 'MingCute Icon',
    site: 'https://www.mingcute.com',
    css: '',
    load: async () => {
      const files = await flatTree('mingcute_icon', await jsdelivrLatest('mingcute_icon'));
      const fill = new Set(), line = new Set(), cat = {};
      files.forEach((f) => {
        const m = f.name.match(/^\/svg\/([^/]+)\/([a-z0-9-]+)_(fill|line)\.svg$/);
        if (!m) return;
        (m[3] === 'fill' ? fill : line).add(m[2]);
        cat[m[2]] = m[1];
      });
      return {
        names: [...new Set([...line, ...fill])].sort(),
        tags: {},
        sets: { line: [...line].sort(), fill: [...fill].sort() },
        cat,
      };
    },
    svgUrl: (name, data) =>
      `https://cdn.jsdelivr.net/npm/mingcute_icon@latest/svg/${((data.cat && data.cat[name]) || 'others')}/${name}_line.svg`,
  },

  iconoir: {
    name: 'Iconoir',
    site: 'https://iconoir.com',
    css: '',
    load: async () => {
      const files = await flatTree('iconoir', await jsdelivrLatest('iconoir'));
      const regular = new Set(), solid = new Set();
      files.forEach((f) => {
        const m = f.name.match(/^\/icons\/(regular|solid)\/([a-z0-9-]+)\.svg$/);
        if (m) (m[1] === 'solid' ? solid : regular).add(m[2]);
      });
      return {
        names: [...new Set([...regular, ...solid])].sort(),
        tags: {},
        sets: { regular: [...regular].sort(), solid: [...solid].sort() },
      };
    },
    svgUrl: (name) =>
      `https://cdn.jsdelivr.net/npm/iconoir@latest/icons/regular/${name}.svg`,
    react: (name) => `import { ${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} } from '@iconoir/react';`,
  },

  flowbite: {
    name: 'Flowbite Icons',
    site: 'https://flowbite.com/icons',
    css: '',
    load: async () => {
      const files = await flatTree('flowbite-icons', await jsdelivrLatest('flowbite-icons'));
      const outline = new Set(), solid = new Set(), cat = {};
      files.forEach((f) => {
        const m = f.name.match(/^\/src\/(outline|solid)\/([^/]+)\/([a-z0-9-]+)\.svg$/);
        if (!m) return;
        (m[1] === 'solid' ? solid : outline).add(m[3]);
        cat[m[3]] = m[2];
      });
      return {
        names: [...new Set([...outline, ...solid])].sort(),
        tags: {},
        sets: { outline: [...outline].sort(), solid: [...solid].sort() },
        cat,
      };
    },
    svgUrl: (name, data) =>
      `https://cdn.jsdelivr.net/npm/flowbite-icons@latest/src/outline/${((data.cat && data.cat[name]) || 'others')}/${name}.svg`,
  },

  devicons: {
    name: 'Devicons',
    site: 'https://devicon.dev',
    css: '',
    load: async () => {
      const arr = await fetchJson('https://cdn.jsdelivr.net/npm/devicon@latest/devicon.json');
      const names = [], tags = {}, vers = {};
      arr.forEach((d) => {
        names.push(d.name);
        if (d.tags && d.tags.length) tags[d.name] = d.tags.map((t) => String(t).toLowerCase());
        /* versions 是 {svg:[...], font:[...]}，部分品牌只有 plain 无 original */
        const vs = (d.versions && d.versions.svg) || [];
        vers[d.name] = vs.includes('original')
          ? 'original'
          : vs.includes('plain')
            ? 'plain'
            : vs[vs.length - 1] || 'original';
      });
      return { names: names.sort(), tags, vers };
    },
    svgUrl: (name, data) =>
      `https://cdn.jsdelivr.net/npm/devicon@latest/icons/${name}/${name}-${((data.vers && data.vers[name]) || 'original')}.svg`,
    usage: (name, _set, data) =>
      `<img src="https://cdn.jsdelivr.net/npm/devicon@latest/icons/${name}/${name}-${((data && data.vers && data.vers[name]) || 'original')}.svg" width="24" alt="${name}">`,
  },

  iconpark: {
    name: 'IconPark',
    site: 'https://iconpark.oceanengine.com',
    css: '',
    load: async () => {
      /* Iconify 全量 JSON（字节跳动官方图形，SVG body 内嵌） */
      const d = await fetchJson('https://unpkg.com/@iconify/json@latest/json/icon-park.json');
      const icons = d.icons || {};
      const names = Object.keys(icons).sort();
      if (!names.length) throw new Error('empty icon-park');
      const bodies = {};
      names.forEach((n) => { bodies[n] = icons[n].body || ''; });
      return { names, bodies };
    },
    svgOf: (name, data) => {
      const body = (data.bodies && data.bodies[name]) || '';
      if (!body) return '';
      /* #000 描边跟随主题色，保留 IconPark 特色品牌蓝 #2F88FF */
      return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">${body.replace(/stroke="#000"/g, 'stroke="currentColor"')}</svg>`;
    },
    react: (name) => `import { ${pascal(name)} } from '@icon-park/react';\n\n<${pascal(name)} />`,
  },
};

/* ---------- 组件代码模板（React/Vue，与 Web 端同逻辑） ---------- */
function pascal(n) {
  return n.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}
function reactCode(lib, name, style) {
  const P = pascal(name);
  switch (lib) {
    case 'lucide':    return `import { ${P} } from 'lucide-react';\n\n<${P} size={24} />`;
    case 'heroicons': return `import { ${P}Icon } from '@heroicons/react/${(style && style.hi) === 'mini' ? '20/solid' : '24/outline'}';\n\n<${P}Icon className="h-6 w-6" />`;
    case 'octicons':  return `import { ${P}Icon } from '@primer/octicons-react';\n\n<${P}Icon size={24} />`;
    case 'antd':      return `import { ${P}Outlined } from '@ant-design/icons';\n\n<${P}Outlined />`;
    case 'iconoir':   return `import { ${P} } from '@iconoir/react';\n\n<${P} width="24" height="24" />`;
    case 'phosphor':  return `import { ${P} } from '@phosphor-icons/react';\n\n<${P} size={24} />`;
    default: return '';
  }
}
function vueCode(lib, name, style) {
  const P = pascal(name);
  switch (lib) {
    case 'lucide':    return `import { ${P} } from 'lucide-vue-next';\n\n<${P} :size="24" />`;
    case 'feather':   return `import { ${P} } from 'feather-icons-vue';\n\n<${P} width="24" height="24" />`;
    case 'ionicons':  return `import { IonIcon } from '@ionic/vue';\n\n<ion-icon name="${name}"></ion-icon>`;
    case 'antd':      return `import { ${P}Outlined } from '@ant-design/icons-vue';\n\n<${P}Outlined />`;
    case 'phosphor':  return `import { ${P} } from '@phosphor-icons/vue';\n\n<${P} :size="24" />`;
    case 'remix':     return `import { Ri${P}${(style && style.remix) === 'fill' ? 'Fill' : 'Line'} } from '@remixicon/vue';\n\n<Ri${P}${(style && style.remix) === 'fill' ? 'Fill' : 'Line'} />`;
    default: return '';
  }
}

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
  expandGroups(q).forEach((g) => g.forEach((k) => kws.add(k)));
  return [...kws];
}

/* 中文分词 -> 关键词分组（每个命中的词条 = 一组同义词） */
function expandGroups(q) {
  const groups = [];
  const seen = new Set();
  let i = 0;
  while (i < q.length) {
    let matched = '';
    for (let len = 5; len >= 1; len--) {
      if (i + len > q.length) continue;
      const seg = q.slice(i, i + len);
      if (ZH_MAP[seg]) {
        matched = seg;
        break;
      }
    }
    if (matched) {
      if (!seen.has(matched)) {
        seen.add(matched);
        groups.push(ZH_MAP[matched]);
      }
      i += matched.length;
    } else {
      i++;
    }
  }
  return groups;
}

/* 拼音查询：feiji / fj / shanchu / sc */
function expandPinyin(q) {
  return expandPinyinGroups(q).reduce((a, g) => a.concat(g), []);
}

/* 英文同义词表：从 ZH_MAP 反向构建（同组词互为同义，共现>=2 过滤噪音）。
   语义搜索：搜 trash 也能召回 delete / bin 相关图标 */
const EN_SYN = {};
function buildEnSyn() {
  const pair = {};
  for (const kws of Object.values(ZH_MAP)) {
    const valid = kws.filter((k) => k.length >= 3);
    for (const a of valid) {
      if (!pair[a]) pair[a] = {};
      for (const b of valid) {
        if (a !== b) pair[a][b] = (pair[a][b] || 0) + 1;
      }
    }
  }
  for (const [a, m] of Object.entries(pair)) {
    const syn = Object.keys(m).filter((b) => m[b] >= 2);
    if (syn.length) EN_SYN[a] = syn;
  }
}
buildEnSyn();

function expandPinyinGroups(q) {
  const parts = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length || !Object.keys(ZH_PINYIN).length) return [];
  const groups = [];
  const seen = new Set();
  for (const p of parts) {
    const hit = ZH_PINYIN[p];
    if (hit && !seen.has(p)) {
      seen.add(p);
      groups.push(hit);
    }
  }
  return groups;
}

/* ---------- 评分排序匹配（与 Web 端同逻辑） ---------- */
function tokenize(n) {
  return n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[-_.\s]+/).filter(Boolean);
}

const TOKEN_CACHE = new Map();
function tokensOf(name) {
  if (!TOKEN_CACHE.has(name)) TOKEN_CACHE.set(name, tokenize(name));
  return TOKEN_CACHE.get(name);
}

function scoreName(kw, tokens) {
  if (!kw) return 0;
  if (tokens.includes(kw)) return 100;
  const kwToks = kw.split('-').filter(Boolean);
  if (kwToks.length > 1 && kwToks.every((t) => tokens.includes(t))) return 85;
  let best = 0;
  for (const t of tokens) {
    if (t.startsWith(kw)) best = Math.max(best, 70);
    else if (kw.length >= 3 && t.includes(kw)) best = Math.max(best, 40);
  }
  return best;
}

/* 评分过滤 + 排序（分组语义）：组内 OR，组间 AND */
function rankMatch(names, kws, tags) {
  return rankMatchGroups(names, [kws], tags);
}

function rankMatchGroups(names, groups, tags, minScore = 1) {
  if (!groups.length) return [];
  const out = [];
  for (const n of names) {
    const tokens = tokensOf(n);
    const t = tags[n];
    let total = 0;
    let groupHits = 0;
    let strong = false;
    for (const g of groups) {
      let best = 0;
      for (let ki = 0; ki < g.length; ki++) {
        let s = scoreName(g[ki], tokens);
        if (!s && t && t.some((x) => x.includes(g[ki]))) s = 40;
        s -= ki * 0.01; /* 关键词顺序 = 意图优先级（词典把最贴切的词排前面） */
        if (s > best) best = s;
      }
      if (best >= 70) strong = true;
      if (best > 0) {
        total += best;
        groupHits++;
      }
    }
    if (groupHits === groups.length && (minScore <= 1 || strong)) {
      if (groups.length > 1) total += 50 * (groups.length - 1);
      total -= tokens.length * 0.5;
      out.push([n, total]);
    }
  }
  out.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return out.map((x) => x[0]);
}

function filterNames(names, tags, query, tagFilter, groupsOverride) {
  const q = query.trim().toLowerCase();
  if (!q) return names;
  /* 中文 / 拼音 / 翻译关键词：分组评分排序 */
  if (isCJK(q) || (groupsOverride && groupsOverride.length)) {
    let groups = groupsOverride;
    if (!groups) {
      groups = expandGroups(q);
      if (!groups.length) groups = expandPinyinGroups(q);
      if (!groups.length) {
        const tk = [];
        /* 翻译兜底词在 search() 里已解析 */
        return [];
      }
    }
    if (tagFilter) return rankMatch(names, [tagFilter], tags);
    return rankMatchGroups(names, groups, tags);
  }
  if (tagFilter) return rankMatch(names, [tagFilter], tags);
  /* 纯英文查询：同义词扩展（原词优先）+ 多词组间 AND */
  const words = q.split(/\s+/).filter(Boolean);
  const groups = words.map((w) => [w].concat(EN_SYN[w] || []));
  return rankMatchGroups(names, groups, tags);
}

/* CJK / 拼音查询：词典 -> 拼音 -> 在线翻译 三级兜底，返回分组 */
async function resolveCJKKeywords(query) {
  const groups = expandGroups(query);
  if (groups.length) return { groups, via: 'dictionary' };
  const py = expandPinyinGroups(query);
  if (py.length) return { groups: py, via: 'pinyin' };
  const en = await translateZh2En(query);
  if (en) {
    const tkws = en.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
    if (tkws.length) return { groups: [tkws], via: 'translation' };
  }
  return { groups: [], via: 'none' };
}

async function search(query, { lib: libId, limit = 20, json: asJson } = {}) {
  const libsToSearch = libId ? [libId] : Object.keys(LIBS);
  const results = [];

  let groupsOverride = null;
  let via = 'dictionary';
  /* 中文或拼音查询：词典 -> 拼音 -> 翻译 三级解析 */
  if (isCJK(query) || expandPinyinGroups(query).length) {
    const r = await resolveCJKKeywords(query);
    groupsOverride = r.groups;
    via = r.via;
    if (!groupsOverride.length) {
      console.log('No icons found. (词典、拼音与翻译均未命中该词)');
      return asJson ? [] : undefined;
    }
    if (!asJson && via !== 'dictionary') {
      const viaLabel = { pinyin: '拼音', translation: '在线翻译' }[via] || via;
      const flat = groupsOverride.reduce((a, g) => a.concat(g), []);
      console.log(`(词典未命中，已通过${viaLabel}: ${query} -> ${flat.join(' ')})`);
    }
  }

  for (const id of libsToSearch) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set(Object.values(data.sets).flat())].sort()
        : data.names;
      const matched = filterNames(names, data.tags || {}, query, null, groupsOverride);
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
        ? [...new Set(Object.values(data.sets).flat())].sort()
        : data.names;
      if (names.includes(name)) {
        const lib = LIBS[id];
        const out = {
          library: id,
          libraryName: lib.name,
          name,
          cdn: lib.css || '(none - inline SVG only)',
        };
        if (data.svgUrl) {
          try {
            out.svg = await fetchText(data.svgUrl(name, data));
          } catch (_) {
            out.svg = '(failed to fetch SVG source)';
          }
        } else if (lib.svgOf) {
          out.svg = lib.svgOf(name, data) || '(no svg body)';
        } else if (lib.usage) {
          out.svg = lib.usage(name, null, data);
        }
        const rc = reactCode(id, name);
        if (rc) out.react = rc;
        else if (lib.react) out.react = lib.react(name);
        else out.html = lib.usage ? lib.usage(name, null, data) : '';
        const vue = vueCode(id, name);
        if (vue) out.vue = vue;
        return out;
      }
    } catch (e) {
      // try next
    }
  }
  return null;
}

/* ---------- random：随机图标（找灵感） ---------- */
function randomPick(arr, n) {
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
async function random({ lib: libId, limit = 5, json: asJson } = {}) {
  const libsToPick = libId ? [libId] : Object.keys(LIBS);
  const results = [];
  for (const id of libsToPick) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set(Object.values(data.sets).flat())]
        : data.names;
      randomPick(names, Math.max(1, Math.ceil(limit / libsToPick.length))).forEach((name) => {
        results.push({ library: id, name });
      });
    } catch (e) {
      console.error(`Warning: failed to load ${id}: ${e.message}`);
    }
  }
  const top = results.slice(0, limit);
  if (asJson) return top;
  if (!top.length) {
    console.log('No icons available.');
    return;
  }
  console.log(`Random ${top.length} icons:\n`);
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
  console.log('Get details: node ig.js get <name> --lib <library-id>');
}

/* ---------- similar：找同类图标 ----------
   以参考图标的词元为查询组（组内 OR），在各库召回同类 */
async function similar(name, { lib: refLib, limit = 20, json: asJson } = {}) {
  /* 找到参考图标所属库和词元 */
  const libsToTry = refLib ? [refLib] : Object.keys(LIBS);
  let refTokens = null, refLibId = null;
  for (const id of libsToTry) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set(Object.values(data.sets).flat())]
        : data.names;
      if (names.includes(name)) {
        refTokens = tokenize(name);
        refLibId = id;
        break;
      }
    } catch (_) { /* try next */ }
  }
  if (!refTokens) {
    console.error(`Icon "${name}" not found${refLib ? ` in ${refLib}` : ''}.`);
    process.exit(1);
  }
  /* 参考图标的词元 + 各词元的同义词 = 同类关键词组 */
  const group = [...refTokens];
  refTokens.forEach((t) => { if (EN_SYN[t]) group.push(...EN_SYN[t]); });
  const results = [];
  for (const id of Object.keys(LIBS)) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set(Object.values(data.sets).flat())]
        : data.names;
      const matched = rankMatchGroups(names, [group], data.tags || {}, 70);
      matched.slice(0, limit).forEach((n) => {
        if (n !== name) results.push({ library: id, name: n });
      });
    } catch (e) {
      console.error(`Warning: failed to load ${id}: ${e.message}`);
    }
  }
  const top = results.slice(0, limit);
  if (asJson) return top;
  if (!top.length) {
    console.log(`No similar icons found for "${name}".`);
    return;
  }
  console.log(`Similar to "${name}" (${LIBS[refLibId].name}, tokens: ${refTokens.join(' + ')}):\n`);
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

/* ---------- CLI ---------- */
function printUsage() {
  console.log(`IconGallery CLI - 19 图标库搜索与检索

Usage:
  node ig.js list                    列出所有支持的图标库
  node ig.js search <query>          搜索图标（支持中文）
  node ig.js get <name>              获取图标 SVG 代码
  node ig.js random                  随机图标（找灵感）
  node ig.js similar <name>          找同类图标（跨库）

Options:
  --lib <id>      限定图标库 (e.g., lucide, tabler)
  --limit <N>     结果数量（默认 search 20 / random 5）
  --json          以 JSON 格式输出

Examples:
  node ig.js list
  node ig.js search "delete"
  node ig.js search "删除"
  node ig.js search "天气" --lib phosphor
  node ig.js get "trash"
  node ig.js get "home" --lib lucide
  node ig.js random --lib lucide --limit 8
  node ig.js similar "trash"
  node ig.js similar "user" --lib lucide --limit 10
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

  if (cmd === 'random') {
    if (!opts.lib && opts.limit === 20) opts.limit = 5;
    const results = await random(opts);
    if (opts.json && results) console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (cmd === 'similar') {
    if (!positional.length) {
      console.error('Error: similar requires an icon name');
      process.exit(1);
    }
    const results = await similar(positional[0], opts);
    if (opts.json && results) console.log(JSON.stringify(results, null, 2));
    return;
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
      if (result.vue) {
        console.log('--- Vue Usage ---');
        console.log(result.vue);
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
