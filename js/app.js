(function(){
'use strict';

/* ================= 工具 ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
async function fetchText(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error('HTTP ' + r.status + ' · ' + url);
  return r.text();
}

/* ================= 各图标库加载器（解析官方 CDN） ================= */

async function loadLucide(){
  const meta = await (await fetch('https://data.jsdelivr.com/v1/packages/npm/lucide-static')).json();
  const ver = (meta.tags && meta.tags.latest) || meta.versions[meta.versions.length - 1];
  const tree = await (await fetch('https://data.jsdelivr.com/v1/packages/npm/lucide-static@' + ver + '?structure=flat')).json();
  const names = tree.files
    .filter(f => f.name.startsWith('/icons/') && f.name.endsWith('.svg'))
    .map(f => f.name.slice(7, -4))
    .sort();
  if(!names.length) throw new Error('empty lucide list');
  /* 官方 tags（英文关键词）增强中文搜索命中 */
  let tags = {};
  try{
    const t = await (await fetch('https://cdn.jsdelivr.net/npm/lucide-static@' + ver + '/tags.json')).json();
    Object.keys(t).forEach(k => { if(t[k] && t[k].tags) tags[k] = t[k].tags; });
  }catch(e){}
  return { names, tags };
}

const TI_SKIP = new Set(['xs','sm','md','lg','xl','1x','2x','3x','4x','5x','6x','7x','8x','9x','10x','rotate','rotate-45','rotate-90','rotate-180','rotate-270','rotate-2','flip','flip-horizontal','flip-vertical','flip-both','spin','pulse','pulse-outline','border','fw']);
async function loadTabler(){
  const css = await fetchText('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
  const s = new Set();
  for(const m of css.matchAll(/\.ti-([a-z0-9-]+)::?before/g)) if(!TI_SKIP.has(m[1])) s.add(m[1]);
  if(!s.size) throw new Error('parse failed');
  return { names: [...s].sort() };
}

async function loadRemix(){
  const css = await fetchText('https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.css');
  const line = new Set(), fill = new Set();
  for(const m of css.matchAll(/\.ri-([a-z0-9-]+)-line::?before/g)) line.add(m[1]);
  for(const m of css.matchAll(/\.ri-([a-z0-9-]+)-fill::?before/g)) fill.add(m[1]);
  if(!line.size && !fill.size) throw new Error('parse failed');
  return { sets: { line: [...line].sort(), fill: [...fill].sort() } };
}

async function loadPhosphor(){
  const css = await fetchText('https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css');
  const s = new Set();
  for(const m of css.matchAll(/\.ph-([a-z0-9-]+)::?before/g)) s.add(m[1]);
  if(!s.size) throw new Error('parse failed');
  return { names: [...s].sort() };
}

async function loadBootstrap(){
  const css = await fetchText('https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css');
  const s = new Set();
  for(const m of css.matchAll(/\.bi-([a-z0-9-]+)::?before/g)) s.add(m[1]);
  if(!s.size) throw new Error('parse failed');
  return { names: [...s].sort() };
}

const MS_CP = 'variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';
async function loadMaterial(){
  /* 2025 年仓库重构后文件改名，多源依次回退 */
  const sources = [
    'https://cdn.jsdelivr.net/gh/google/material-design-icons@master/' + MS_CP,
    'https://raw.githubusercontent.com/google/material-design-icons/master/' + MS_CP,
  ];
  let txt = '', lastErr = null;
  for(const url of sources){
    try{ txt = await fetchText(url); if(txt.trim()) break; }catch(e){ lastErr = e; }
  }
  if(!txt.trim()) throw lastErr || new Error('all sources failed');
  const names = txt.split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean).sort();
  if(!names.length) throw new Error('parse failed');
  return { names };
}

/* Font Awesome：官方 metadata（含每个图标支持的 styles） */
async function loadFontAwesome(){
  const meta = await (await fetch('https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.x/metadata/icons.json')).json();
  const sets = { solid:[], regular:[], brands:[] };
  Object.keys(meta).forEach(name => {
    (meta[name].styles || []).forEach(s => { if(sets[s]) sets[s].push(name); });
  });
  Object.values(sets).forEach(a => a.sort());
  if(!sets.solid.length) throw new Error('parse failed');
  return { sets };
}

/* MDI：css 里 ::before 规则即图标（功能类不带 ::before，无需排除） */
async function loadMDI(){
  const css = await fetchText('https://cdn.jsdelivr.net/npm/@mdi/font@latest/css/materialdesignicons.min.css');
  const s = new Set();
  for(const m of css.matchAll(/\.mdi-([a-z0-9-]+)::?before/g)) s.add(m[1]);
  if(!s.size) throw new Error('parse failed');
  return { names: [...s].sort() };
}

/* Boxicons：bx-/bxs-/bxl- 三套（功能类不带 :before） */
async function loadBoxicons(){
  const css = await fetchText('https://cdn.jsdelivr.net/npm/boxicons@latest/css/boxicons.min.css');
  const sets = { regular:new Set(), solid:new Set(), logos:new Set() };
  for(const m of css.matchAll(/\.bx-([a-z0-9-]+)::?before/g)) sets.regular.add(m[1]);
  for(const m of css.matchAll(/\.bxs-([a-z0-9-]+)::?before/g)) sets.solid.add(m[1]);
  for(const m of css.matchAll(/\.bxl-([a-z0-9-]+)::?before/g)) sets.logos.add(m[1]);
  const out = {};
  Object.keys(sets).forEach(k => out[k] = [...sets[k]].sort());
  if(!out.regular.length && !out.solid.length) throw new Error('parse failed');
  return { sets: out };
}

/* jsDelivr npm 工具：解析 latest 版本号 + 拉平文件树 */
async function jsdelivrLatest(pkg){
  const meta = await (await fetch('https://data.jsdelivr.com/v1/packages/npm/' + pkg)).json();
  return (meta.tags && meta.tags.latest) || meta.versions[meta.versions.length - 1];
}
async function flatTree(pkg, ver){
  const t = await (await fetch('https://data.jsdelivr.com/v1/packages/npm/' + pkg + '@' + ver + '?structure=flat')).json();
  return t.files || [];
}

/* Heroicons：SVG 文件树（24 线条 / 24 实心 / 20 迷你） */
let HI_VER = 'latest';
async function loadHeroicons(){
  const ver = await jsdelivrLatest('heroicons');
  const files = await flatTree('heroicons', ver);
  const sets = { outline:[], solid:[], mini:[] };
  files.forEach(f => {
    let m = f.name.match(/^\/24\/outline\/([a-z0-9-]+)\.svg$/); if(m) return sets.outline.push(m[1]);
    m = f.name.match(/^\/24\/solid\/([a-z0-9-]+)\.svg$/);       if(m) return sets.solid.push(m[1]);
    m = f.name.match(/^\/20\/solid\/([a-z0-9-]+)\.svg$/);       if(m) return sets.mini.push(m[1]);
  });
  Object.values(sets).forEach(a => a.sort());
  if(!sets.outline.length) throw new Error('empty heroicons');
  HI_VER = ver;
  return { sets };
}
function heroiconsUrl(name){
  const dir = sv('hi') === 'mini' ? '20/solid' : '24/' + sv('hi');
  return 'https://cdn.jsdelivr.net/npm/heroicons@' + HI_VER + '/' + dir + '/' + encodeURIComponent(name) + '.svg';
}

/* Ionicons：SVG 文件树（填充 / 线条 / 棱角） */
let ION_VER = 'latest';
async function loadIonicons(){
  const ver = await jsdelivrLatest('ionicons');
  const files = await flatTree('ionicons', ver);
  const sets = { filled:new Set(), outline:new Set(), sharp:new Set() };
  files.forEach(f => {
    const m = f.name.match(/^\/dist\/svg\/([a-z0-9-]+)\.svg$/);
    if(!m) return;
    const n = m[1];
    if(n.endsWith('-outline')) sets.outline.add(n.slice(0, -9));
    else if(n.endsWith('-sharp')) sets.sharp.add(n.slice(0, -6));
    else sets.filled.add(n);
  });
  const out = {};
  Object.keys(sets).forEach(k => out[k] = [...sets[k]].sort());
  if(!out.filled.length) throw new Error('parse failed');
  ION_VER = ver;
  return { sets: out };
}
function ioniconsUrl(name){
  const suffix = sv('ion') === 'filled' ? '' : '-' + sv('ion');
  return 'https://cdn.jsdelivr.net/npm/ionicons@' + ION_VER + '/dist/svg/' + encodeURIComponent(name + suffix) + '.svg';
}

/* Octicons：官方 metadata（name + keywords + heights，部分图标只有 16px） */
async function loadOcticons(){
  const ver = await jsdelivrLatest('@primer/octicons');
  const data = await (await fetch('https://cdn.jsdelivr.net/npm/@primer/octicons@' + ver + '/build/data.json')).json();
  const names = Object.keys(data).sort();
  if(!names.length) throw new Error('empty octicons');
  const tags = {}, heights = {};
  names.forEach(n => {
    if(data[n].keywords && data[n].keywords.length) tags[n] = data[n].keywords.map(k => String(k).toLowerCase());
    /* heights 是 {'16':{...},'24':{...}} 对象，转成数字数组 */
    heights[n] = data[n].heights ? Object.keys(data[n].heights).map(Number) : [24];
  });
  return { names, tags, heights };
}
function octiconsHeight(name){
  const st = store.octicons || {};
  const hs = (st.heights && st.heights[name]) || [24];
  return hs.includes(24) ? 24 : (hs.includes(16) ? 16 : (hs[hs.length - 1] || 24));
}
function octiconsUrl(name){
  return 'https://cdn.jsdelivr.net/npm/@primer/octicons@latest/build/svg/' + encodeURIComponent(name) + '-' + octiconsHeight(name) + '.svg';
}

/* Devicons：官方 metadata（开发技术品牌图标，original 版本带品牌色） */
async function loadDevicons(){
  const arr = await (await fetch('https://cdn.jsdelivr.net/npm/devicon@latest/devicon.json')).json();
  const names = [], tags = {}, vers = {};
  arr.forEach(d => {
    names.push(d.name);
    if(d.tags && d.tags.length) tags[d.name] = d.tags.map(t => String(t).toLowerCase());
    /* versions 是 {svg:[...], font:[...]}，部分品牌只有 plain 无 original */
    const vs = (d.versions && d.versions.svg) || [];
    vers[d.name] = vs.includes('original') ? 'original' : (vs.includes('plain') ? 'plain' : (vs[vs.length - 1] || 'original'));
  });
  if(!names.length) throw new Error('empty devicon');
  return { names: names.sort(), tags, vers };
}
function deviconsUrl(name){
  const st = store.devicons || {};
  const v = (st.vers && st.vers[name]) || 'original';
  return 'https://cdn.jsdelivr.net/npm/devicon@latest/icons/' + encodeURIComponent(name) + '/' + encodeURIComponent(name) + '-' + v + '.svg';
}

/* Feather Icons：SVG 文件树 */
async function loadFeather(){
  const files = await flatTree('feather-icons', await jsdelivrLatest('feather-icons'));
  const names = files.filter(f => /^\/dist\/icons\/[a-z0-9-]+\.svg$/.test(f.name)).map(f => f.name.slice(12, -4)).sort();
  if(!names.length) throw new Error('empty feather');
  return { names };
}
function featherUrl(name){
  return 'https://cdn.jsdelivr.net/npm/feather-icons@latest/dist/icons/' + encodeURIComponent(name) + '.svg';
}

/* Ant Design Icons：SVG 文件树（outlined / filled / twotone） */
async function loadAntDesign(){
  const files = await flatTree('@ant-design/icons-svg', await jsdelivrLatest('@ant-design/icons-svg'));
  const sets = { outlined:new Set(), filled:new Set(), twotone:new Set() };
  files.forEach(f => {
    const m = f.name.match(/^\/inline-svg\/(outlined|filled|twotone)\/([a-z0-9-]+)\.svg$/);
    if(m) sets[m[1]].add(m[2]);
  });
  const out = {};
  Object.keys(sets).forEach(k => out[k] = [...sets[k]].sort());
  if(!out.outlined.length) throw new Error('empty antd');
  return { sets: out };
}
function antdUrl(name){
  return 'https://cdn.jsdelivr.net/npm/@ant-design/icons-svg@latest/inline-svg/' + sv('antd') + '/' + encodeURIComponent(name) + '.svg';
}

/* MingCute：SVG 文件树（fill / line，按分类子目录） */
async function loadMingCute(){
  const files = await flatTree('mingcute_icon', await jsdelivrLatest('mingcute_icon'));
  const fill = new Set(), line = new Set(), cat = {};
  files.forEach(f => {
    const m = f.name.match(/^\/svg\/([^/]+)\/([a-z0-9-]+)_(fill|line)\.svg$/);
    if(!m) return;
    (m[3] === 'fill' ? fill : line).add(m[2]);
    cat[m[2]] = m[1];
  });
  if(!line.size) throw new Error('empty mingcute');
  return { sets: { fill:[...fill].sort(), line:[...line].sort() }, cat };
}
function mingcuteUrl(name){
  const st = store.mingcute || {};
  return 'https://cdn.jsdelivr.net/npm/mingcute_icon@latest/svg/' + encodeURIComponent((st.cat && st.cat[name]) || 'others') + '/' + encodeURIComponent(name) + '_' + (sv('ming') === 'fill' ? 'fill' : 'line') + '.svg';
}

/* Iconoir：SVG 文件树（regular / solid） */
async function loadIconoir(){
  const files = await flatTree('iconoir', await jsdelivrLatest('iconoir'));
  const regular = new Set(), solid = new Set();
  files.forEach(f => {
    const m = f.name.match(/^\/icons\/(regular|solid)\/([a-z0-9-]+)\.svg$/);
    if(m) (m[1] === 'solid' ? solid : regular).add(m[2]);
  });
  if(!regular.size) throw new Error('empty iconoir');
  return { sets: { regular:[...regular].sort(), solid:[...solid].sort() } };
}
function iconoirUrl(name){
  return 'https://cdn.jsdelivr.net/npm/iconoir@latest/icons/' + sv('iconoir') + '/' + encodeURIComponent(name) + '.svg';
}

/* Flowbite Icons：SVG 文件树（outline / solid，分类目录名含冒号需编码） */
async function loadFlowbite(){
  const files = await flatTree('flowbite-icons', await jsdelivrLatest('flowbite-icons'));
  const outline = new Set(), solid = new Set(), cat = {};
  files.forEach(f => {
    const m = f.name.match(/^\/src\/(outline|solid)\/([^/]+)\/([a-z0-9-]+)\.svg$/);
    if(!m) return;
    (m[1] === 'solid' ? solid : outline).add(m[3]);
    cat[m[3]] = m[2];
  });
  if(!outline.size) throw new Error('empty flowbite');
  return { sets: { outline:[...outline].sort(), solid:[...solid].sort() }, cat };
}
function flowbiteUrl(name){
  const st = store.flowbite || {};
  return 'https://cdn.jsdelivr.net/npm/flowbite-icons@latest/src/' + (sv('flow') === 'solid' ? 'solid' : 'outline') + '/' + encodeURIComponent((st.cat && st.cat[name]) || 'others') + '/' + encodeURIComponent(name) + '.svg';
}

/* IconPark：Iconify 全量 JSON（字节跳动，2,600+ 双色图标，SVG body 内嵌数据直接渲染） */
async function loadIconPark(){
  const d = await (await fetch('https://unpkg.com/@iconify/json@latest/json/icon-park.json')).json();
  const icons = d.icons || {};
  const names = Object.keys(icons).sort();
  if(!names.length) throw new Error('empty icon-park');
  const bodies = {};
  names.forEach(n => { bodies[n] = icons[n].body || ''; });
  return { names, bodies };
}
function iconparkSVG(name){
  const st = store.iconpark;
  const body = (st && st.bodies && st.bodies[name]) || '';
  if(!body) return '';
  /* #000 描边跟随主题色，保留 IconPark 特色品牌蓝 #2F88FF */
  const b = body.replace(/stroke="#000"/g, 'stroke="currentColor"');
  return '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' + b + '</svg>';
}

/* Iconify 全集 JSON 通用加载器：Hugeicons / Solar / Carbon / Radix / Circle Flags / Game Icons / Simple Icons */
async function loadIconify(prefix){
  const d = await (await fetch('https://unpkg.com/@iconify/json@latest/json/' + prefix + '.json')).json();
  const icons = d.icons || {};
  const names = Object.keys(icons).sort();
  if(!names.length) throw new Error('empty ' + prefix);
  const bodies = {}, dims = {};
  const dw = d.width || 24, dh = d.height || 24;
  names.forEach(n => { bodies[n] = icons[n].body || ''; dims[n] = (icons[n].width || dw) + 'x' + (icons[n].height || dh); });
  return { names, bodies, dims };
}
/* 从内嵌 body 组装内联 SVG（单色集已是 currentColor 跟随主题；彩色集如国旗保留原色） */
function iconifyInline(id, key){
  const st = store[id] || {};
  const body = (st.bodies && st.bodies[key]) || '';
  if(!body) return '';
  const wh = ((st.dims && st.dims[key]) || '24x24').split('x');
  return '<svg viewBox="0 0 ' + wh[0] + ' ' + wh[1] + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">' + body + '</svg>';
}
const loadHugeicons = () => loadIconify('hugeicons');
const loadCarbon = () => loadIconify('carbon');
const loadRadix = () => loadIconify('radix-icons');
const loadFlags = () => loadIconify('circle-flags');
const loadGameIcons = () => loadIconify('game-icons');
const loadSimpleIcons = () => loadIconify('simple-icons');

/* Solar：6 种风格后缀拆成 base + sets（与 remix 的 line/fill 同模式） */
const SOLAR_STYLES = ['bold-duotone','line-duotone','broken','linear','outline','bold'];
async function loadSolar(){
  const d = await loadIconify('solar');
  const sets = {}; SOLAR_STYLES.forEach(s => { sets[s] = []; });
  const bases = new Set();
  d.names.forEach(n => {
    const s = SOLAR_STYLES.find(x => n.endsWith('-' + x));
    if(s){ sets[s].push(n.slice(0, -(s.length + 1))); bases.add(n.slice(0, -(s.length + 1))); }
  });
  return { names: [...bases].sort(), bodies: d.bodies, dims: d.dims, sets };
}
function solarSVG(name){
  const bodies = (store.solar && store.solar.bodies) || {};
  const cur = name + '-' + sv('solar');
  if(bodies[cur]) return iconifyInline('solar', cur);
  /* 当前风格缺失 → 回退到第一个可用风格 */
  const alt = SOLAR_STYLES.map(s => name + '-' + s).find(k => bodies[k]);
  return alt ? iconifyInline('solar', alt) : '';
}

/* CSS.gg：名单取自官方 all.css，网格渲染走 SVG URL（注入 currentColor 跟随主题） */
async function loadCssgg(){
  const css = await (await fetch('https://cdn.jsdelivr.net/npm/css.gg@latest/icons/all.css')).text();
  const s = new Set();
  for(const m of css.matchAll(/\.gg-([a-z0-9-]+)::?before/g)) s.add(m[1]);
  return { names: [...s].sort() };
}
function cssggUrl(name){
  return 'https://cdn.jsdelivr.net/npm/css.gg@latest/icons/svg/' + encodeURIComponent(name) + '.svg';
}

/* Weather Icons：官方字库 CSS 解析出类名（font 渲染，同 Tabler / Bootstrap 模式） */
async function loadWeather(){
  const css = await (await fetch('https://cdn.jsdelivr.net/npm/weather-icons@latest/css/weather-icons.min.css')).text();
  const s = new Set();
  for(const m of css.matchAll(/\.wi-([a-z0-9-]+)::?before/g)) s.add(m[1]);
  return { names: [...s].sort() };
}

/* ================= 配置 ================= */
const PH_BASE = { thin:'ph-thin', light:'ph-light', regular:'ph', bold:'ph-bold', fill:'ph-fill', duotone:'ph-duotone' };
const PH_CSS = ['regular','thin','light','bold','fill','duotone'].map(w => 'https://unpkg.com/@phosphor-icons/web@2.1.1/src/' + w + '/style.css');
const GOOGLE_MS_CSS = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';

const LIBS = [
  { id:'lucide',    label:'Lucide',           desc:'线性 · 描边可调',   site:'https://lucide.dev',          accent:'#6366f1', css:[], svgFetch:true, load:loadLucide },
  { id:'tabler',    label:'Tabler Icons',     desc:'线性 + 填充',       site:'https://tabler.io/icons',      accent:'#0ea5e9', css:['https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css'], load:loadTabler },
  { id:'remix',     label:'Remix Icon',       desc:'线条 / 填充',       site:'https://remixicon.com',        accent:'#8b5cf6', css:['https://cdn.jsdelivr.net/npm/remixicon@latest/fonts/remixicon.css'], load:loadRemix },
  { id:'phosphor',  label:'Phosphor',         desc:'六种字重',          site:'https://phosphoricons.com',    accent:'#22c55e', css:PH_CSS, load:loadPhosphor },
  { id:'bootstrap', label:'Bootstrap Icons',   desc:'经典通用',          site:'https://icons.getbootstrap.com', accent:'#7c3aed', css:['https://cdn.jsdelivr.net/npm/bootstrap-icons@latest/font/bootstrap-icons.min.css'], load:loadBootstrap },
  { id:'material',  label:'Material Symbols', desc:'可变字体 · 圆角',    site:'https://fonts.google.com/icons', accent:'#f59e0b', css:[GOOGLE_MS_CSS], load:loadMaterial },
  { id:'fontawesome', label:'Font Awesome',   desc:'免费版 · 三种风格',  site:'https://fontawesome.com/icons', accent:'#339af0', css:['https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@latest/css/all.min.css'], load:loadFontAwesome },
  { id:'mdi',       label:'MDI',              desc:'7000+ · 社区版填充', site:'https://pictogrammers.com/library/mdi/', accent:'#2196f3', css:['https://cdn.jsdelivr.net/npm/@mdi/font@latest/css/materialdesignicons.min.css'], load:loadMDI },
  { id:'heroicons', label:'Heroicons',         desc:'Tailwind 官方',     site:'https://heroicons.com',        accent:'#38bdf8', css:[], svgFetch:true, load:loadHeroicons },
  { id:'ionicons',  label:'Ionicons',          desc:'Ionic 团队 · 三风格', site:'https://ionic.io/ionicons', accent:'#4f8df7', css:[], svgFetch:true, load:loadIonicons },
  { id:'boxicons',  label:'Boxicons',          desc:'常规 / 实心 / Logo', site:'https://boxicons.com',        accent:'#0d9488', css:['https://cdn.jsdelivr.net/npm/boxicons@latest/css/boxicons.min.css'], load:loadBoxicons },
  { id:'octicons',  label:'Octicons',          desc:'GitHub 官方',       site:'https://primer.style/foundations/icons', accent:'#8a919f', css:[], svgFetch:true, load:loadOcticons },
  { id:'antd',      label:'Ant Design Icons',  desc:'蚂蚁 · 三风格',      site:'https://ant.design/components/icon', accent:'#1677ff', css:[], svgFetch:true, load:loadAntDesign },
  { id:'feather',   label:'Feather Icons',     desc:'Lucide 前身 · 极简', site:'https://feathericons.com',     accent:'#a3e635', css:[], svgFetch:true, load:loadFeather },
  { id:'mingcute',  label:'MingCute Icon',    desc:'国人出品 · 精致',    site:'https://www.mingcute.com',      accent:'#ffcd00', css:[], svgFetch:true, load:loadMingCute },
  { id:'iconoir',   label:'Iconoir',           desc:'1300+ 手工线性',    site:'https://iconoir.com',          accent:'#d946ef', css:[], svgFetch:true, load:loadIconoir },
  { id:'flowbite',  label:'Flowbite Icons',    desc:'Tailwind 生态',     site:'https://flowbite.com/icons',   accent:'#1c64f2', css:[], svgFetch:true, load:loadFlowbite },
  { id:'devicons',  label:'Devicons',          desc:'技术品牌 Logo',     site:'https://devicon.dev',          accent:'#f06595', css:[], svgFetch:true, load:loadDevicons },
  { id:'iconpark', label:'IconPark',          desc:'字节跳动 · 多彩双色', site:'https://iconpark.oceanengine.com', accent:'#2F88FF', css:[], load:loadIconPark },
  { id:'hugeicons', label:'Hugeicons',        desc:'6000+ · 描边新锐',   site:'https://hugeicons.com',          accent:'#10b981', css:[], load:loadHugeicons },
  { id:'solar',    label:'Solar Icons',       desc:'1300+ · 六种风格',   site:'https://icon-sets.iconify.design/solar/', accent:'#f97316', css:[], load:loadSolar },
  { id:'carbon',   label:'Carbon Icons',      desc:'IBM 设计系统',       site:'https://carbondesignsystem.com/guidelines/icons/library/', accent:'#4589ff', css:[], load:loadCarbon },
  { id:'radix',    label:'Radix Icons',       desc:'精致小巧 · 15px',    site:'https://www.radix-ui.com/icons', accent:'#6e56cf', css:[], load:loadRadix },
  { id:'flags',    label:'Circle Flags',      desc:'圆形国旗 · 700+',    site:'https://github.com/HatScripts/circle-flags', accent:'#e11d48', css:[], load:loadFlags },
  { id:'gameicons', label:'Game Icons',       desc:'4000+ · 游戏向',     site:'https://game-icons.net',         accent:'#78716c', css:[], load:loadGameIcons },
  { id:'simpleicons', label:'Simple Icons',   desc:'3700+ 品牌 Logo',    site:'https://simpleicons.org',        accent:'#71717a', css:[], load:loadSimpleIcons },
  { id:'cssgg',    label:'CSS.gg',            desc:'纯 CSS 图标',        site:'https://css.gg',                 accent:'#dc2626', css:[], svgFetch:true, load:loadCssgg },
  { id:'weather',  label:'Weather Icons',     desc:'天气专用字库',       site:'https://erikflowers.github.io/weather-icons/', accent:'#60a5fa', css:['https://cdn.jsdelivr.net/npm/weather-icons@latest/css/weather-icons.min.css'], load:loadWeather },
];
const LIB_MAP = Object.fromEntries(LIBS.map(l => [l.id, l]));

const FA_BASE = { solid:'fa-solid', regular:'fa-regular', brands:'fa-brands' };

const SAMPLE = {
  lucide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  tabler: '<i class="ti ti-star"></i>',
  remix: '<i class="ri ri-star-line"></i>',
  phosphor: '<i class="ph ph-star"></i>',
  bootstrap: '<i class="bi bi-star"></i>',
  material: '<span class="material-symbols-rounded" style="font-size:16px;line-height:1">star</span>',
  fontawesome: '<i class="fa-solid fa-star"></i>',
  mdi: '<i class="mdi mdi-star"></i>',
  heroicons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>',
  ionicons: '<svg viewBox="0 0 512 512" fill="currentColor" class="w-4 h-4"><path d="M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-18.08L153 310.35 23 221.2a16 16 0 019-29.2h160.38l48.4-148.95a16 16 0 0130.44 0l48.4 149H480a16 16 0 019.05 29.2L359 310.35l50.13 148.53A16 16 0 01394 480z"/></svg>',
  boxicons: '<i class="bx bx-star"></i>',
  octicons: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>',
  antd: '<svg viewBox="0 0 1024 1024" fill="currentColor" class="w-4 h-4"><path d="M858.9 409L530.5 174.6a38.7 38.7 0 0 0-42.5-0.2L160.6 408.3c-12.5 8.4-19.3 22.7-19.3 37v168.8c0 15.5 8.2 29.8 21.6 37.7l328.4 191.4a44.3 44.3 0 0 0 44.6-0.1l322.9-190.6a44.7 44.7 0 0 0 21.7-38.5V446.9c0-15.1-7.7-29.1-20.6-37.9z"/></svg>',
  feather: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  mingcute: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M12 2c.3 0 .6.14.8.4l3 4.2 4.9 1.4c.6.2.9.9.5 1.5l-3 4.4.6 5.2c.1.6-.4 1.2-1 1.2-.1 0-.3 0-.4-.1L12 18.6l-4.9 1.9c-.6.2-1.2-.2-1.3-.8l-.1-.4.6-5.2-3-4.4c-.4-.6-.1-1.3.5-1.5l4.9-1.4 3-4.2c.2-.26.5-.4.8-.4Z"/></svg>',
  iconoir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  flowbite: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M13 2a1 1 0 1 0-2 0v1.5a.5.5 0 0 1-.5.5H9a1 1 0 0 0 0 2h1.5a.5.5 0 0 1 .5.5V10a1 1 0 1 0 2 0V6.5a.5.5 0 0 1 .5-.5H15a1 1 0 1 0 0-2h-1.5a.5.5 0 0 1-.5-.5V2ZM7 11a1 1 0 0 1 1 1v.5a.5.5 0 0 0 .5.5H9a1 1 0 1 1 0 2h-.5a.5.5 0 0 0-.5.5V16a1 1 0 1 1-2 0v-.5a.5.5 0 0 0-.5-.5H5a1 1 0 1 1 0-2h.5a.5.5 0 0 0 .5-.5V12a1 1 0 0 1 1-1Zm9 2a1 1 0 0 1 1 1v.5a.5.5 0 0 0 .5.5h.5a1 1 0 1 1 0 2h-.5a.5.5 0 0 0-.5.5v.5a1 1 0 1 1-2 0v-.5a.5.5 0 0 0-.5-.5H14a1 1 0 1 1 0-2h.5a.5.5 0 0 0 .5-.5V14a1 1 0 0 1 1-1Z" clip-rule="evenodd"/></svg>',
  devicons: '<svg viewBox="0 0 24 24" class="w-4 h-4"><path fill="#61dafb" d="M12 2l2.4 6.3 6.7.3-5.2 4.2 1.8 6.5L12 15.8l-5.7 3.5 1.8-6.5L2.9 8.6l6.7-.3L12 2z"/></svg>',
  iconpark: '<svg viewBox="0 0 48 48" class="w-4 h-4"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path fill="#2F88FF" d="M24 4l6 12 13 2-9.5 9L36 40l-12-6-12 6 2.5-13L4 18l13-2z"/></g></svg>',
  hugeicons: '<svg viewBox="0 0 24 24" class="w-4 h-4"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m13.728 3.444l1.76 3.549c.24.494.88.968 1.42 1.058l3.189.535c2.04.343 2.52 1.835 1.05 3.307l-2.48 2.5c-.42.423-.65 1.24-.52 1.825l.71 3.095c.56 2.45-.73 3.397-2.88 2.117l-2.99-1.785c-.54-.322-1.43-.322-1.98 0L8.019 21.43c-2.14 1.28-3.44.322-2.88-2.117l.71-3.095c.13-.585-.1-1.402-.52-1.825l-2.48-2.5C1.39 10.42 1.86 8.929 3.899 8.586l3.19-.535c.53-.09 1.17-.564 1.41-1.058l1.76-3.549c.96-1.925 2.52-1.925 3.47 0"/></svg>',
  solar: '<svg viewBox="0 0 24 24" class="w-4 h-4"><path fill="currentColor" d="M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"/></svg>',
  carbon: '<svg viewBox="0 0 32 32" class="w-4 h-4"><path fill="currentColor" d="m16 6.52l2.76 5.58l.46 1l1 .15l6.16.89l-4.38 4.3l-.75.73l.18 1l1.05 6.13l-5.51-2.89L16 23l-.93.49l-5.51 2.85l1-6.13l.18-1l-.74-.77l-4.42-4.35l6.16-.89l1-.15l.46-1zM16 2l-4.55 9.22l-10.17 1.47l7.36 7.18L6.9 30l9.1-4.78L25.1 30l-1.74-10.13l7.36-7.17l-10.17-1.48Z"/></svg>',
  radix: '<svg viewBox="0 0 15 15" class="w-4 h-4"><path fill="currentColor" d="M7.223.666a.3.3 0 0 1 .554 0L9.413 4.6a.3.3 0 0 0 .253.184l4.248.34a.3.3 0 0 1 .171.527l-.23.195l-3.006 2.578a.3.3 0 0 0-.097.296l.919 3.852l.07.294a.3.3 0 0 1-.361.362l-.087-.037l-.258-.158l-3.379-2.062a.3.3 0 0 0-.312 0l-3.637 2.22l-.087.037a.3.3 0 0 1-.361-.362l.07-.294l.92-3.852a.3.3 0 0 0-.043-.235l-.055-.061L.915 5.65a.3.3 0 0 1 .171-.526l.3-.025l3.948-.316a.3.3 0 0 0 .211-.112l.042-.072zM6.51 4.984a1.3 1.3 0 0 1-.917.77l-.18.027l-2.57.205l1.959 1.678l.129.127c.237.269.353.626.319.983l-.03.179l-.598 2.507l2.2-1.343l.161-.083a1.3 1.3 0 0 1 1.034 0l.16.083l2.2 1.343l-.598-2.507a1.3 1.3 0 0 1 .42-1.29l1.957-1.677l-2.569-.205a1.3 1.3 0 0 1-1.016-.635l-.08-.162l-.99-2.38z"/></svg>',
  flags: '<svg viewBox="0 0 512 512" class="w-4 h-4"><mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#d80027" d="M0 0h512v512H0z"/><path fill="#ffda44" d="m140.1 155.8l22.1 68h71.5l-57.8 42.1l22.1 68l-57.9-42l-57.9 42l22.2-68l-57.9-42.1H118zm163.4 240.7l-16.9-20.8l-25 9.7l14.5-22.5l-16.9-20.9l25.9 6.9l14.6-22.5l1.4 26.8l26 6.9l-25.1 9.6zm33.6-61l8-25.6l-21.9-15.5l26.8-.4l7.9-25.6l8.7 25.4l26.8-.3l-21.5 16l8.6 25.4l-21.9-15.5zm45.3-147.6L370.6 212l19.2 18.7l-26.5-3.8l-11.8 24l-4.6-26.4l-26.6-3.8l23.8-12.5l-4.6-26.5l19.2 18.7zm-78.2-73l-2 26.7l24.9 10.1l-26.1 6.4l-1.9 26.8l-14.1-22.8l-26.1 6.4l17.3-20.5l-14.2-22.7l24.9 10.1z"/></g></svg>',
  gameicons: '<svg viewBox="0 0 512 512" class="w-4 h-4"><path fill="currentColor" d="M256 26C129.17 26 26 129.17 26 256s103.192 230 230 230s230-103.192 230-230S382.83 26 256 26m168.813 174.7H298.258L257.442 78.36c78.035.628 144.206 51.81 167.37 122.34zM254.558 78.36L213.786 200.7H87.23c23.123-70.53 89.294-121.71 167.33-122.34zM78.328 256a177 177 0 0 1 7.637-51.49l101.728 75.932l-37.34 118.345A177.52 177.52 0 0 1 78.33 256zm76.66 146.045L256 330.03l101.013 72.015a177.18 177.18 0 0 1-202.026 0zm206.614-3.302l-37.295-118.345l101.728-75.933a177.46 177.46 0 0 1-64.39 194.322z"/></svg>',
  simpleicons: '<svg viewBox="0 0 24 24" class="w-4 h-4"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  cssgg: '<svg viewBox="0 0 24 24" class="w-4 h-4"><path d="M3 4H15V8H3V4Z" fill="currentColor"/><path d="M21 8H17V4H21V8Z" fill="currentColor"/><path d="M3 10H21V14H3V10Z" fill="currentColor"/><path d="M11 16H3V20H11V16Z" fill="currentColor"/><path d="M13 16V20H21V16H13Z" fill="currentColor"/></svg>',
  weather: '<i class="wi wi-day-sunny"></i>',
};

const COLORS = ['#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6','#0ea5e9','#6366f1','#8b5cf6','#ec4899','#64748b'];

const I_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const I_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M20 6 9 17l-5-5"/></svg>';
const I_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="w-10 h-10"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const I_EMPTY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" class="w-10 h-10"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="m8 8 6 6M14 8l-6 6"/></svg>';
const I_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
const I_HEART_ON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';

/* ================= 状态 ================= */
let state = { lib:'lucide', query:'', tagFilter:'', size:40, color:'', stroke:2, remix:'line', ph:'regular', msFill:0, msWght:400, fa:'solid', bx:'regular', hi:'outline', ion:'filled', antd:'outlined', ming:'line', iconoir:'regular', flow:'outline', solar:'linear' };
try{
  const s = JSON.parse(localStorage.getItem('ig:state') || '{}');
  if(LIB_MAP[s.lib]) state.lib = s.lib;
  ['size','stroke','remix','ph','msFill','msWght','color','fa','bx','hi','ion','antd','ming','iconoir','flow','solar'].forEach(k => { if(s[k] !== undefined) state[k] = s[k]; });
}catch(e){}
/* URL hash 状态分享：#lib=lucide&q=star&size=40&color=%23f00&remix=line...
   带 hash 打开时优先于 localStorage；hash 里只写非默认值保持短链 */
const STATE_KEYS = ['size','stroke','remix','ph','msFill','msWght','color','fa','bx','hi','ion','antd','ming','iconoir','flow','solar'];
const STATE_DEFAULTS = { lib:'lucide', query:'', tagFilter:'', size:40, color:'', stroke:2, remix:'line', ph:'regular', msFill:0, msWght:400, fa:'solid', bx:'regular', hi:'outline', ion:'filled', antd:'outlined', ming:'line', iconoir:'regular', flow:'outline', solar:'linear' };
(function applyHashState(){
  if(!location.hash || location.hash.length < 2) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const lib = p.get('lib');
  if(lib && LIB_MAP[lib]) state.lib = lib;
  const q = p.get('q');
  if(q !== null) state.query = q;
  STATE_KEYS.forEach(k => {
    const v = p.get(k);
    if(v === null) return;
    /* 数字项转回数字 */
    if(['size','stroke','msFill','msWght'].includes(k)){
      const n = Number(v);
      if(!Number.isNaN(n)) state[k] = n;
    }else state[k] = v;
  });
})();
function writeHash(){
  const p = new URLSearchParams();
  if(state.lib !== STATE_DEFAULTS.lib) p.set('lib', state.lib);
  if(state.query) p.set('q', state.query);
  STATE_KEYS.forEach(k => {
    if(state[k] !== STATE_DEFAULTS[k]) p.set(k, String(state[k]));
  });
  const h = p.toString();
  /* replaceState 不污染历史记录 */
  history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
}
function saveState(){ try{ localStorage.setItem('ig:state', JSON.stringify(state)); }catch(e){} writeHash(); }

/* ================= DOM ================= */
const grid = $('#grid'), sentinel = $('#sentinel'), endNote = $('#end-note');
const statePanel = $('#state-panel'), panelIcon = $('#panel-icon'), panelMsg = $('#panel-msg'), reloadBtn = $('#reload-btn');
const searchEl = $('#search'), clearBtn = $('#clear-search'), kbdHint = $('#kbd-hint');
const contentEl = $('#content'), libList = $('#lib-list'), chipBar = $('#chip-bar'), otherLibsEl = $('#other-libs');
const headTitle = $('#lib-title'), headDesc = $('#lib-desc'), headLink = $('#lib-site');
const modal = $('#modal'), mDialog = $('#m-dialog'), mName = $('#m-name'), mLib = $('#m-lib'), mSizes = $('#m-sizes');
const toasts = $('#toasts');
const sidebar = $('#sidebar'), drawerMask = $('#drawer-mask');

/* ================= SVG 缓存与内联（Lucide / Heroicons / Ionicons） ================= */
const svgCache = new Map();
function lucideUrl(name){
  return 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/' + encodeURIComponent(name) + '.svg';
}
async function getSvg(url, injectFill, stripFill){
  const key = url + (injectFill ? '#f' : '') + (stripFill ? '#s' : '');
  if(svgCache.has(key)) return svgCache.get(key);
  let t = (await fetchText(url)).replace(/<\?xml[^>]*>/, '').trim();
  /* ionicons 的 svg 默认无颜色，需补 currentColor 才能跟随主题 */
  if(injectFill) t = t.replace('<svg ', '<svg fill="currentColor" ');
  /* 部分库（如 MingCute）内嵌写死的品牌色，清洗为 currentColor */
  if(stripFill) t = t.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"');
  svgCache.set(key, t);
  return t;
}
function fillSlots(root){
  root.querySelectorAll('[data-svgurl]:not([data-loaded])').forEach(async h => {
    h.dataset.loaded = '1';
    try{ h.innerHTML = await getSvg(h.dataset.svgurl, h.dataset.svgfill === '1', h.dataset.svgstrip === '1'); }catch(e){}
  });
}

/* ================= 库数据加载 ================= */
const store = {};
const injectedCss = new Set();
function injectCss(id){
  LIB_MAP[id].css.forEach(href => {
    if(injectedCss.has(href)) return;
    injectedCss.add(href);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  });
}
async function ensureLib(id){
  let st = store[id];
  if(st && st.status === 'ok'){ if(state.lib === id) renderGrid(); return; }
  if(st && st.status === 'loading') return;
  injectCss(id);
  store[id] = { status: 'loading' };
  updateLibUI();
  if(state.lib === id) renderGrid();
  try{
    const data = await LIB_MAP[id].load();
    store[id] = Object.assign({ status: 'ok' }, data);
  }catch(err){
    store[id] = { status: 'error', error: err };
  }
  updateLibUI();
  renderOtherLibs();                                /* 跨库搜索分区渐进出现 */
  if(state.lib === id) renderGrid();
}
function updateLibUI(){
  LIBS.forEach(lib => {
    const st = store[lib.id];
    const sub = document.querySelector('[data-sub="' + lib.id + '"]');
    const gl = document.querySelector('[data-glyph="' + lib.id + '"]');
    if(sub){
      if(st && st.status === 'ok'){
        const n = st.names ? st.names.length : new Set(Object.values(st.sets).flat()).size;
        sub.textContent = n.toLocaleString() + ' 个图标';
      }else if(st && st.status === 'error'){
        sub.textContent = '加载失败 · 点击重试';
      }
    }
    if(gl && st && st.status === 'ok' && !gl.dataset.filled){
      gl.innerHTML = SAMPLE[lib.id];
      gl.dataset.filled = '1';
    }
  });
}

/* ================= 中文语义词典（中文词 → 英文关键词） ================= */
const ZH_MAP = {
  /* 导航与页面 */
  '首页':['home','house','landing'],'主页':['home','house'],'返回':['back','arrow-left','return','undo'],
  '前进':['forward','arrow-right'],'刷新':['refresh','reload','rotate'],'菜单':['menu','list','nav','sidebar'],
  '导航':['nav','navigation','compass','route'],'侧栏':['sidebar','panel','column'],'布局':['layout','grid','columns'],
  '置顶':['pin','top','up'],'置底':['bottom'],'标签页':['tab'],'面包屑':['breadcrumb'],'锚点':['anchor','hash'],
  /* 动作操作 */
  '添加':['add','plus','new','create'],'新增':['add','plus','create'],'新建':['new','create','file-plus'],
  '删除':['delete','trash','remove','x','close','bin'],'移除':['remove','close','x','minus'],
  '编辑':['edit','pencil','pen','write'],'修改':['edit','pencil','modify'],'保存':['save','download','floppy'],
  '取消':['cancel','x','close','ban'],'确认':['check','confirm','done','yes'],'提交':['submit','send','upload'],
  '关闭':['close','x','exit'],'打开':['open','external','expand'],'复制':['copy','clone','duplicate'],
  '剪切':['cut','scissors','crop'],'粘贴':['paste','clipboard'],'撤销':['undo','rotate-ccw','arrow-counterclockwise'],
  '重做':['redo','rotate-cw','arrow-clockwise'],'搜索':['search','find','magnifier','zoom'],
  '查找':['search','find','locate'],'筛选':['filter','funnel','sieve'],'排序':['sort','order','arrange','arrow-up-down'],
  '上传':['upload','cloud-upload','arrow-up'],'下载':['download','cloud-download','arrow-down'],
  '分享':['share','send','network','social'],'导出':['export','download','share'],'导入':['import','upload'],
  '打印':['printer','print'],'登录':['log-in','login','sign-in','door-open'],'登出':['logout','log-out','sign-out','door-open'],
  '注册':['user-plus','sign-up','register'],'验证':['check','verify','shield','badge'],'扫码':['scan','qr','barcode'],
  '点击':['pointer','cursor','tap','hand'],'拖拽':['drag','grip','move'],'缩放':['zoom','maximize','minimize','expand'],
  '预览':['eye','preview','visible'],'安装':['download','package','wrench'],'发送':['send','paper-plane','mail'],
  '转发':['forward','share','send'],'回复':['reply','message','undo'],'点赞':['thumbs-up','like','heart','hand'],
  '评论':['message','comment','chat','bubble'],'收藏':['star','bookmark','heart','favorite'],
  '关注':['user-plus','bell','eye'],'购买':['shopping-cart','cart','buy','credit-card'],
  '折叠':['chevron-down','fold','collapse','minimize'],'展开':['chevron-up','unfold','expand','maximize'],
  /* 文件与对象 */
  '文件':['file','document','doc','folder'],'文件夹':['folder','directory','archive'],
  '图片':['image','photo','picture','img'],'照片':['photo','camera','image'],'相册':['image','photos','album','gallery'],
  '视频':['video','film','play','camera'],'音频':['audio','music','sound','volume'],'音乐':['music','note','headphones','song'],
  '文档':['file-text','document','book'],'表格':['table','grid','sheet'],'图表':['chart','bar-chart','graph','pie'],
  '链接':['link','chain','url','external'],'书签':['bookmark','tag','ribbon'],'标签':['tag','label','price','bookmark'],
  '附件':['paperclip','attachment','clip'],'回收站':['trash','bin','recycle','delete'],
  '归档':['archive','box','package'],'草稿':['file-text','edit','pencil','note'],
  '笔记':['note','pencil','edit','sticky'],'代码':['code','terminal','brackets','developer'],
  '日历':['calendar','date','schedule'],'时钟':['clock','time','watch','timer'],
  '钱包':['wallet','credit-card','money','cash'],'信封':['mail','envelope','send'],
  '礼物':['gift','present','box','birthday'],'钥匙':['key','lock','password','unlock'],
  '购物车':['shopping-cart','cart','trolley'],'订单':['receipt','list','clipboard','order'],
  /* 人物角色 */
  '用户':['user','person','account','profile'],'人群':['users','group','people','team'],
  '头像':['user','circle-user','person','avatar'],'角色':['user','users','shield','crown'],
  '团队':['users','team','group'],'成员':['user','users','people','member'],
  '管理员':['shield','user-cog','crown','admin'],'联系人':['contact','user','phone','address-book'],
  '作者':['pen-tool','user','edit','write'],'访客':['user','eye','ghost','external'],
  /* 通信交流 */
  '消息':['message','chat','bubble','mail'],'通知':['bell','notification','alarm'],
  '提醒':['bell','alarm','clock','notification'],'邮件':['mail','envelope','inbox','at-sign'],
  '电话':['phone','call','telephone','contact'],'聊天':['message','chat','bubble','send'],
  '公告':['megaphone','speaker','volume','announcement'],'反馈':['message','thumbs-up','bug','feedback'],
  /* 状态 */
  '成功':['check','circle-check','done','success'],'失败':['x','circle-x','error','alert'],
  '警告':['alert','triangle','warning','exclamation'],'错误':['x-circle','alert-octagon','error','bug'],
  '加载':['loader','spinner','loading','hourglass'],'等待':['hourglass','clock','loader','wait'],
  '进行中':['loader','progress','spinner','circle'],'完成':['check','check-done','circle-check','flag'],
  '在线':['wifi','signal','globe','dot'],'离线':['wifi-off','plug','zap-off','cloud-off'],
  '启用':['power','toggle-right','check','play'],'禁用':['ban','toggle-left','x','forbidden'],
  '锁定':['lock','lock-closed','shield','key'],'解锁':['unlock','lock-open','key','shield-off'],
  '隐私':['eye-off','shield','lock','user'],'安全':['shield','lock','security','verified'],
  '密码':['key','lock','asterisk','password'],'帮助':['help','circle-help','question','life-buoy'],
  '信息':['info','circle-i','information','about'],'危险':['alert','skull','flame','warning'],
  /* 媒体控制 */
  '播放':['play','start','triangle','media'],'暂停':['pause','two-bars','stop','hold'],
  '停止':['square','stop','circle-stop','power'],'快进':['fast-forward','skip-forward','forward'],
  '后退':['rewind','skip-back','backward','play-back'],'上一首':['skip-back','chevron-left','previous'],
  '下一首':['skip-forward','chevron-right','next'],'循环':['repeat','loop','refresh-cw','rotate'],
  '音量':['volume','speaker','sound','audio-volume'],'静音':['volume-x','mute','speaker-off','volume-off'],
  '全屏':['maximize','expand','fullscreen','corners'],'录制':['circle','record','video','dot'],
  '截图':['camera','image','crop','scissors'],'直播':['radio','video','broadcast','live'],
  /* 天气自然 */
  '天气':['cloud-sun','sun','cloud','weather'],'晴':['sun','clear','day','bright'],
  '晴天':['sun','clear','day','bright'],'多云':['cloud','cloudy','partly'],'阴天':['cloud','overcast','gloomy'],
  '雨天':['cloud-rain','rain','umbrella','drizzle'],'雪':['snowflake','snow','cloud-snow','winter'],
  '风':['wind','air','feather','waves'],'雾':['cloud-fog','fog','mist','haze'],
  '雷':['zap','cloud-lightning','thunder','bolt'],'彩虹':['rainbow','colors','arc','palette'],
  '温度':['thermometer','temperature','temp','gauge'],'月亮':['moon','night','dark','sleep'],
  '太阳':['sun','solar','day','bright'],'星星':['star','sparkle','favorite','rate'],
  '闪电':['zap','bolt','lightning','flash'],'火':['flame','fire','hot','burn'],
  '水':['droplet','water','waves','glass'],'山':['mountain','hill','peak','landscape'],
  '树':['tree','leaf','plant','forest'],'花':['flower','blossom','plant','petal'],
  /* 方向 */
  '上':['arrow-up','chevron-up','up','top'],'下':['arrow-down','chevron-down','down','bottom'],
  '左':['arrow-left','chevron-left','left'],'右':['arrow-right','chevron-right','right'],
  '旋转':['rotate','refresh','spin','turn'],'翻转':['flip','mirror','rotate','swap'],
  /* 情感 */
  '喜欢':['heart','thumbs-up','smile','love'],'收藏夹':['star','bookmark','heart','folder-heart'],
  '哭':['frown','sad','cry','tear'],'笑':['smile','laugh','happy','grin'],
  '生气':['angry','flame','mad','furious'],'惊讶':['surprised','exclamation','wow','alert'],
  '心':['heart','love','like','favorite'],'伤心':['frown','heart-crack','sad','blue'],
  '开心':['smile','happy','laugh','grin'],'评分':['star','rate','review','rank'],
  /* 设备 */
  '电脑':['monitor','computer','screen','desktop'],'笔记本':['laptop','notebook','computer','mac'],
  '手机':['smartphone','phone','mobile','device'],'平板':['tablet','ipad','device','screen'],
  '键盘':['keyboard','key','command','type'],'鼠标':['mouse','pointer','cursor','click'],
  '耳机':['headphones','audio','music','earbuds'],'相机':['camera','photo','aperture','image'],
  '电视':['tv','television','monitor','screen'],'打印机':['printer','print','paper'],
  '硬盘':['hard-drive','disk','storage','database'],'电源':['power','plug','zap','on'],
  '网络':['wifi','network','globe','signal'],'蓝牙':['bluetooth','wireless','connection','signal'],
  '电池':['battery','power','charge','energy'],'服务器':['server','database','cpu','cloud'],
  '数据库':['database','storage','server','disk'],'云':['cloud','cloud-upload','weather','storage'],
  /* 场所 */
  '公司':['building','briefcase','office','business'],'学校':['school','book','graduation','education'],
  '医院':['hospital','cross','medical','health'],'银行':['bank','building','money','landmark'],
  '地图':['map','location','pin','navigation'],'定位':['map-pin','locate','crosshair','gps'],
  '位置':['map-pin','location','place','pin'],'地址':['map-pin','home','location','mail'],
  '商店':['store','shop','shopping','bag'],'家':['home','house','family','heart'],
  /* 购物 */
  '支付':['credit-card','payment','wallet','cash'],'优惠券':['ticket','tag','percent','discount'],
  '折扣':['percent','tag','sale','discount'],'价格':['tag','dollar','money','price'],
  '商品':['package','box','shopping-bag','product'],'货币':['dollar','coins','cash','currency'],
  '美元':['dollar','usd','money','cash'],'人民币':['yen','currency','money','cash'],
  /* 通用概念 */
  '设置':['settings','cog','gear','sliders'],'配置':['settings','sliders','config','adjust'],
  '主题':['palette','moon','sun','brush'],'颜色':['palette','droplet','color','paint'],
  '外观':['palette','eye','brush','theme'],'语言':['globe','languages','translate','message'],
  '权限':['shield','lock','key','user-check'],'版本':['tag','git','branch','history'],
  '历史':['history','clock','time','rewind'],'同步':['refresh','cloud','rotate','sync'],
  '备份':['database','save','archive','cloud'],'监控':['activity','gauge','chart','eye'],
  '日志':['file-text','list','terminal','scroll'],'分析':['chart','bar-chart','trending','analytics'],
  '报告':['file-text','clipboard','chart','book'],'测试':['flask','check','bug','beaker'],
  '部署':['rocket','cloud','upload','server'],'性能':['gauge','zap','activity','speed'],
  '终端':['terminal','console','command','code'],'接口':['plug','link','api','cable'],
  '组件':['box','package','layers','puzzle'],'图层':['layers','stack','copy','square'],
  '游戏':['gamepad','joystick','play','toy'],'奖杯':['trophy','award','medal','win'],
  '奖牌':['medal','award','badge','star'],'目标':['target','bullseye','crosshair','flag'],
  '任务':['check','list','clipboard','todo'],'清单':['list','check','clipboard','menu'],
  '问题':['help','question','circle-help','issue'],'想法':['lightbulb','idea','brain','sparkle'],
  '灵感':['lightbulb','sparkle','zap','star'],'知识':['book','brain','graduation','library'],
  '书':['book','library','read','text'],'阅读':['book-open','read','eye','text'],
  '写作':['pen-tool','edit','pencil','write'],'学习':['graduation','book','school','brain'],
  '工作':['briefcase','work','office','business'],'会议':['users','presentation','calendar','mic'],
  '时间':['clock','time','hourglass','watch'],'日期':['calendar','date','day','schedule'],
  '快进键':['fast-forward'],'生产力':['zap','rocket','check','trending'],
  '人工智能':['brain','bot','sparkle','cpu'],'机器人':['bot','robot','android','message'],
  '闪电般':['zap','bolt','flash','fast'],'趋势':['trending','trending-up','chart','growth'],
  '上升':['trending-up','arrow-up','growth','chart'],'下降':['trending-down','arrow-down','decline','chart'],
  '飞机':['airplane','aircraft','plane','flight'],'航空':['airplane','aircraft','plane'],
  '直升':['helicopter'],'船':['ship','boat','vessel','anchor'],
  '汽车':['car','truck','vehicle','automobile'],'自行车':['bike','bicycle','cycle'],
  '火车':['train','locomotive','rail'],'地铁':['subway','metro','train'],
  '出租车':['taxi','car','truck'],'驾驶':['car','truck','steering-wheel'],
  '交通':['car','bus','truck','traffic-light'],'火箭':['rocket','missile','launch'],
  '无人机':['drone','quadcopter'],'护照':['passport','bookmark'],
  '行李':['luggage','suitcase','bag'],
};
/* 拼音索引（zh-index.json 的 _pinyin 字段），支持 feiji / fj / shanchu / sc */
const ZH_PINYIN = {};
/* 英文同义词表：从 ZH_MAP 反向构建（同组词互为同义，共现>=2 过滤噪音）。
   语义搜索：搜 trash 也能召回 delete / bin 相关图标 */
const EN_SYN = {};
function buildEnSyn(){
  const pair = {};
  for(const kws of Object.values(ZH_MAP)){
    const valid = kws.filter(k => k.length >= 3);
    for(const a of valid){
      if(!pair[a]) pair[a] = {};
      for(const b of valid){
        if(a !== b) pair[a][b] = (pair[a][b] || 0) + 1;
      }
    }
  }
  Object.keys(EN_SYN).forEach(k => delete EN_SYN[k]);
  for(const [a, m] of Object.entries(pair)){
    const syn = Object.keys(m).filter(b => m[b] >= 2);
    if(syn.length) EN_SYN[a] = syn;
  }
}
buildEnSyn();
/* 加载共享词典（skill/zh-index.json，920+ 条），与 CLI 共用同一份数据 */
fetch('skill/zh-index.json').then(r => r.ok ? r.json() : null).then(idx => {
  if(!idx) return;
  for(const [k, v] of Object.entries(idx)){
    if(k === '_pinyin') continue;
    if(!k.startsWith('_')) ZH_MAP[k] = v;
  }
  if(idx._pinyin) Object.assign(ZH_PINYIN, idx._pinyin);
  buildEnSyn();
  renderKwBar();
  renderGrid();
}).catch(() => {/* file:// 等场景静默降级为内置词典 */});
/* 在线翻译兜底（MyMemory，免费无 Key，支持 CORS） */
const ZH_TRANS = {}, ZH_TRANS_REQ = {};
function translateZh2En(q){
  if(q in ZH_TRANS) return Promise.resolve(ZH_TRANS[q]);
  if(ZH_TRANS_REQ[q]) return ZH_TRANS_REQ[q];
  ZH_TRANS_REQ[q] = fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=zh|en')
    .then(r => r.json())
    .then(d => {
      const t = (d && d.responseData && d.responseData.translatedText) || '';
      const en = (t && !/^[A-Z\s-]+ERROR/i.test(t)) ? t.toLowerCase().trim() : '';
      ZH_TRANS[q] = en;
      return en;
    })
    .catch(() => { ZH_TRANS[q] = ''; return ''; });
  return ZH_TRANS_REQ[q];
}
function translatedKws(q){
  const en = ZH_TRANS[q] || '';
  return en ? en.split(/[^a-z0-9]+/).filter(w => w.length > 1) : [];
}
/* 中文词最大匹配分词 + 展开英文关键词分组（每个命中的词条 = 一组同义关键词） */
function expandGroups(q){
  const groups = [];
  const seen = new Set();
  let i = 0;
  while(i < q.length){
    let matched = '';
    /* 贪心：优先长词（词典最长 5 字） */
    for(let len = 5; len >= 1; len--){
      if(i + len > q.length) continue;
      const seg = q.slice(i, i + len);
      if(ZH_MAP[seg]){ matched = seg; break; }
    }
    if(matched){
      if(!seen.has(matched)){ seen.add(matched); groups.push(ZH_MAP[matched]); }
      i += matched.length;
    }else{
      i++;
    }
  }
  return groups;
}
/* 兼容旧调用：拍平 */
function expandQuery(q){
  const kws = new Set();
  expandGroups(q).forEach(g => g.forEach(k => kws.add(k)));
  return [...kws];
}
/* 拼音查询：返回分组（每个拼音词 = 一组） */
function expandPinyinGroups(q){
  const parts = q.toLowerCase().split(/\s+/).filter(Boolean);
  if(!parts.length || !Object.keys(ZH_PINYIN).length) return [];
  const groups = [], seen = new Set();
  for(const p of parts){
    const hit = ZH_PINYIN[p];
    if(hit && !seen.has(p)){ seen.add(p); groups.push(hit); }
  }
  return groups;
}
function expandPinyin(q){
  const kws = new Set();
  expandPinyinGroups(q).forEach(g => g.forEach(k => kws.add(k)));
  return [...kws];
}
const isCJK = q => /[\u4e00-\u9fff]/.test(q);
function activeNamesFor(libId){
  const st = store[libId];
  if(!st || st.status !== 'ok') return [];
  if(libId === 'remix') return st.sets[state.remix] || [];
  if(libId === 'fontawesome') return st.sets[state.fa] || [];
  if(libId === 'boxicons') return st.sets[state.bx] || [];
  if(libId === 'heroicons') return st.sets[state.hi] || [];
  if(libId === 'ionicons') return st.sets[state.ion] || [];
  if(libId === 'antd') return st.sets[state.antd] || [];
  if(libId === 'mingcute') return st.sets[state.ming] || [];
  if(libId === 'iconoir') return st.sets[state.iconoir] || [];
  if(libId === 'flowbite') return st.sets[state.flow] || [];
  if(libId === 'solar') return st.sets[state.solar] || [];
  return st.names;
}
function activeNames(){ return activeNamesFor(state.lib); }
/* 图标名切词元：按 - _ . 空格切，camelCase 也要拆开 */
function tokenize(n){
  const parts = n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[-_.\s]+/).filter(Boolean);
  return parts;
}
/* 单个关键词对单个图标名的得分；0 = 不命中 */
const TOKEN_CACHE = new Map();
function scoreName(kw, tokens){
  if(!kw) return 0;
  if(tokens.includes(kw)) return 100;              /* 词元精确命中 */
  const kwToks = kw.split('-').filter(Boolean);
  /* 复合关键词（如 arrow-left）全部词元命中 */
  if(kwToks.length > 1 && kwToks.every(t => tokens.includes(t))) return 85;
  let best = 0;
  for(const t of tokens){
    if(t.startsWith(kw)) best = Math.max(best, 70);  /* 词元前缀命中 */
    else if(kw.length >= 3 && t.includes(kw)) best = Math.max(best, 40); /* 长关键词子串 */
  }
  return best;
}
function tokensOf(name){
  if(!TOKEN_CACHE.has(name)) TOKEN_CACHE.set(name, tokenize(name));
  return TOKEN_CACHE.get(name);
}
/* 评分过滤 + 排序（分组语义）：
   组内关键词 OR（同义词任一命中即得分，取最高）；
   组间 AND（每个概念组都命中才保留）；多组全命中额外加成 */
function rankMatch(names, kws, tags){
  return rankMatchGroups(names, [kws], tags);
}
function rankMatchGroups(names, groups, tags){
  if(!groups.length) return [];
  const out = [];
  for(const n of names){
    const tokens = tokensOf(n);
    const t = tags[n];
    let total = 0, groupHits = 0;
    for(const g of groups){
      let best = 0;
      for(let ki = 0; ki < g.length; ki++){
        let s = scoreName(g[ki], tokens);
        if(!s && t && t.some(x => x.includes(g[ki]))) s = 40;
        s -= ki * 0.01; /* 关键词顺序 = 意图优先级（词典把最贴切的词排前面） */
        if(s > best) best = s;
      }
      if(best > 0){ total += best; groupHits++; }
    }
    if(groupHits === groups.length){
      /* 多概念同时命中 = 强相关 */
      if(groups.length > 1) total += 50 * (groups.length - 1);
      total -= tokens.length * 0.5; /* 名称更短 = 更通用，微弱优先 */
      out.push([n, total]);
    }
  }
  out.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return out.map(x => x[0]);
}
/* 查询 → 关键词分组（中文词典 / 拼音 / 翻译 / 英文同义词）；null = 无查询，[] = 暂无可匹配词 */
function queryGroups(){
  const q = state.query.trim().toLowerCase();
  if(!q) return null;
  /* 中文 / 拼音 / 翻译关键词统一走分组评分排序 */
  const pyGroups = isCJK(q) ? [] : expandPinyinGroups(q);
  if(isCJK(q) || pyGroups.length){
    let groups = expandGroups(q);
    if(!groups.length) groups = pyGroups;             /* 拼音：feiji / fj */
    if(!groups.length){
      const tk = translatedKws(q);                   /* 翻译兜底 */
      if(tk.length) groups = [tk];
    }
    return groups;
  }
  /* 纯英文查询：同义词扩展（原词优先，共现强同义补召回）+ 多词组间 AND */
  const words = q.split(/\s+/).filter(Boolean);
  return words.map(w => [w].concat(EN_SYN[w] || []));
}
/* 指定库的搜索结果（分组评分排序），当前库网格与跨库分区共用 */
function filterLib(libId, groups){
  const st = store[libId];
  if(!st || st.status !== 'ok') return [];
  const list = activeNamesFor(libId);
  const tags = st.tags || {};
  if(state.tagFilter) return rankMatch(list, [state.tagFilter], tags);
  return rankMatchGroups(list, groups, tags);
}
function filtered(){
  const groups = queryGroups();
  if(groups === null) return activeNames();
  return filterLib(state.lib, groups);
}

/* ================= 搜索：其他图标库结果 ================= */
/* 搜索时在当前库结果下方追加其他图标库的匹配：每库最多展示 12 个，点「查看全部」切换到该库看完整结果 */
const OL_LIMIT = 12;
let olKey = null;
function olSig(){
  /* 缓存键：查询 / 当前库 / 风格 / 关键词分组任一变化才整体重建 */
  const q = state.query.trim().toLowerCase();
  if(!q) return null;
  return JSON.stringify([q, state.tagFilter, state.lib, state.remix, state.ph, state.fa, state.bx, state.hi, state.ion, state.antd, state.ming, state.iconoir, state.flow, state.solar, queryGroups()]);
}
function fillOlSection(sec, libId){
  sec.dataset.filled = '1';
  const st = store[libId];
  if(!st || st.status !== 'ok') return;              /* 加载失败的库不展示分区 */
  const groups = queryGroups();
  if(!groups || !groups.length) return;              /* 中文未命中词典（翻译中）→ 暂不展示 */
  const hits = filterLib(libId, groups);
  if(!hits.length) return;
  const lib = LIB_MAP[libId];
  sec.innerHTML =
    '<div class="ol-head">' +
      '<div class="ol-label"><span class="inline-block w-2 h-2 rounded-full" style="background:' + lib.accent + '"></span>' + lib.label + '<span class="ol-count">' + hits.length.toLocaleString() + ' 个匹配</span></div>' +
      '<button class="ol-more" data-gol="' + libId + '">查看全部<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="m9 18 6-6-6-6"/></svg></button>' +
    '</div>' +
    '<div class="ig-grid">' + hits.slice(0, OL_LIMIT).map(n => cardHTML(libId, n)).join('') + '</div>';
  sec.classList.remove('ig-hide');
  fillSlots(sec);
}
function renderOtherLibs(){
  const sig = olSig();
  if(sig !== olKey){
    /* 查询 / 当前库 / 风格任一变化 → 重建骨架（保持 LIBS 顺序），各库数据后台加载、分区渐进出现 */
    olKey = sig;
    otherLibsEl.innerHTML = '';
    if(!sig) return;
    otherLibsEl.innerHTML = '<div class="ol-caption">其他图标库的搜索结果</div>' +
      LIBS.filter(l => l.id !== state.lib).map(l => '<section class="ol-sec ig-hide" data-lib="' + l.id + '"></section>').join('') +
      '<div class="ol-hint" id="ol-hint"><div class="spinner"></div><span>正在搜索其他图标库…</span></div>';
    LIBS.forEach(l => { if(l.id !== state.lib) ensureLib(l.id); });
  }
  if(!sig) return;
  let pending = false, visible = false;
  otherLibsEl.querySelectorAll('.ol-sec').forEach(sec => {
    if(sec.dataset.filled){
      if(!sec.classList.contains('ig-hide')) visible = true;
      return;
    }
    const st = store[sec.dataset.lib];
    if(!st || st.status === 'loading'){ pending = true; return; }
    fillOlSection(sec, sec.dataset.lib);
    if(!sec.classList.contains('ig-hide')) visible = true;
  });
  const hint = otherLibsEl.querySelector('#ol-hint');
  if(hint) hint.classList.toggle('ig-hide', !pending);
  /* 全部加载完成但其他库都没有匹配 → 收起整个区块 */
  if(!pending && !visible) otherLibsEl.innerHTML = '';
  /* 收藏状态可能被收藏栏清空 → 就地刷新心形 */
  otherLibsEl.querySelectorAll('.card').forEach(c => {
    const fb = c.querySelector('.fav-btn');
    if(!fb) return;
    const on = isFav(c.dataset.lib, fb.dataset.fav);
    fb.classList.toggle('on', on);
    fb.innerHTML = on ? I_HEART_ON : I_HEART;
  });
}

/* ================= 收藏 ================= */
let favs = [];
try{ favs = JSON.parse(localStorage.getItem('ig:favs') || '[]'); }catch(e){}
function saveFavs(){ try{ localStorage.setItem('ig:favs', JSON.stringify(favs)); }catch(e){} }
function isFav(libId, name){ return favs.some(f => f.lib === libId && f.name === name); }
function toggleFav(libId, name){
  const i = favs.findIndex(f => f.lib === libId && f.name === name);
  if(i >= 0) favs.splice(i, 1); else favs.push({ lib: libId, name });
  saveFavs();
  renderFavBar();
}
/* 收藏栏：有收藏时右下角浮出 */
const favBar = $('#fav-bar'), cmpModal = $('#compare'), cmpGrid = $('#cmp-grid'), cmpCount = $('#cmp-count'), cmpEmpty = $('#cmp-empty');
let clearArmed = null;
function renderFavBar(){
  if(!favs.length){ favBar.classList.add('ig-hide'); favBar.innerHTML = ''; return; }
  favBar.classList.remove('ig-hide');
  favBar.innerHTML =
    '<span class="fb-txt" style="display:flex;align-items:center;gap:5px;color:#e11d48">' + I_HEART_ON + favs.length + '</span>' +
    '<button id="fb-cmp" class="primary">对比</button>' +
    '<button id="fb-clear"' + (clearArmed ? ' class="danger-armed"' : '') + '>' + (clearArmed ? '确认清空？' : '清空') + '</button>';
  $('#fb-cmp').addEventListener('click', openCompare);
  $('#fb-clear').addEventListener('click', () => {
    /* 两段式确认，避免误触 */
    if(clearArmed){
      clearTimeout(clearArmed);
      clearArmed = null;
      favs = [];
      saveFavs();
      renderGrid();
    }else{
      clearArmed = setTimeout(() => { clearArmed = null; renderFavBar(); }, 3000);
    }
    renderFavBar();
  });
}
function openCompare(){
  cmpCount.textContent = favs.length + ' 个图标';
  cmpGrid.innerHTML = '';
  cmpEmpty.classList.toggle('ig-hide', favs.length > 0);
  cmpGrid.classList.toggle('ig-hide', favs.length === 0);
  favs.forEach(f => {
    /* svgFetch 库的 URL 需要库数据（分类/尺寸映射），确保已加载 */
    if(LIB_MAP[f.lib] && LIB_MAP[f.lib].svgFetch) ensureLib(f.lib);
    const cell = document.createElement('button');
    cell.className = 'cmp-cell';
    cell.dataset.lib = f.lib;
    cell.dataset.name = f.name;
    cell.innerHTML = slotHTML(f.lib, f.name, null) +
      '<span class="cname">' + f.name + '</span>' +
      '<span class="text-[10px] text-zinc-400 flex items-center gap-1"><span class="inline-block w-1.5 h-1.5 rounded-full" style="background:' + LIB_MAP[f.lib].accent + '"></span>' + LIB_MAP[f.lib].label + '</span>';
    cmpGrid.appendChild(cell);
  });
  fillSlots(cmpGrid);
  cmpModal.style.display = 'flex';
}
function closeCompare(){ cmpModal.style.display = 'none'; }
cmpModal.addEventListener('click', e => {
  if(e.target.closest('[data-cclose]')){ closeCompare(); return; }
  const cell = e.target.closest('.cmp-cell');
  if(cell){
    closeCompare();
    selectLib(cell.dataset.lib);
    openDetail(cell.dataset.name, cell.dataset.lib);
  }
});

/* ================= 渲染管线 ================= */
let gen = 0, rendered = 0;
let pixelTimer = null, pixelResizeTimer = null, pixelPattern = null, pixelFrame = 0;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function stopPixelLoading(){
  clearInterval(pixelTimer);
  clearTimeout(pixelResizeTimer);
  pixelTimer = null;
  pixelResizeTimer = null;
}
function pixelGridMetrics(){
  const style = getComputedStyle(grid);
  const width = grid.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const gridTop = grid.getBoundingClientRect().top;
  const height = Math.max(260, contentEl.getBoundingClientRect().bottom - gridTop - 16);
  return PixelGrid.measureGrid(width, height, 96, 85, 10);
}
function paintPixelFrame(generation){
  if(generation !== gen || !pixelPattern) return;
  const cards = [...grid.querySelectorAll('.pixel-card')];
  if(!cards.length) return;
  const metrics = pixelGridMetrics();
  const frames = PixelGrid.PATTERNS[pixelPattern];
  const active = new Set(PixelGrid.mapFrame(frames[pixelFrame % frames.length], metrics.columns, metrics.rows));
  cards.forEach((card, index) => card.classList.toggle('is-active', active.has(index)));
  pixelFrame++;
}
function startPixelLoading(generation){
  stopPixelLoading();
  pixelPattern = PixelGrid.pickPattern();
  pixelFrame = 0;
  hidePanel();
  grid.setAttribute('aria-busy', 'true');
  grid.setAttribute('aria-label', '正在加载图标库');
  const metrics = pixelGridMetrics();
  const firstFrame = PixelGrid.PATTERNS[pixelPattern][0];
  grid.innerHTML = PixelGrid.renderSkeleton(metrics.count, new Set(PixelGrid.mapFrame(firstFrame, metrics.columns, metrics.rows)));
  sentinel.classList.add('ig-hide');
  endNote.classList.add('ig-hide');
  if(!reduceMotion.matches) pixelTimer = setInterval(() => paintPixelFrame(generation), 280);
}
function clearPixelLoading(){
  stopPixelLoading();
  grid.removeAttribute('aria-busy');
  grid.removeAttribute('aria-label');
}
function glyphHTML(lib, name){
  switch(lib){
    case 'lucide':      return '<span class="lucide-holder" data-svgurl="' + lucideUrl(name) + '"><span class="sk"></span></span>';
    case 'tabler':      return '<i class="glyph ti ti-' + name + '"></i>';
    case 'remix':       return '<i class="glyph ri ri-' + name + '-' + sv('remix') + '"></i>';
    case 'bootstrap':   return '<i class="glyph bi bi-' + name + '"></i>';
    case 'phosphor':    return '<i class="glyph ' + PH_BASE[sv('ph')] + ' ph-' + name + '"></i>';
    case 'material':    return '<span class="glyph material-symbols-rounded">' + name + '</span>';
    case 'fontawesome': return '<i class="glyph ' + FA_BASE[sv('fa')] + ' fa-' + name + '"></i>';
    case 'mdi':         return '<i class="glyph mdi mdi-' + name + '"></i>';
    case 'boxicons': {
      const p = { regular:'bx', solid:'bxs', logos:'bxl' }[sv('bx')];
      return '<i class="glyph ' + p + ' ' + p + '-' + name + '"></i>';
    }
    case 'heroicons':   return '<span class="lucide-holder" data-svgurl="' + heroiconsUrl(name) + '"><span class="sk"></span></span>';
    case 'ionicons':    return '<span class="lucide-holder" data-svgurl="' + ioniconsUrl(name) + '" data-svgfill="1"><span class="sk"></span></span>';
    case 'octicons':    return '<span class="lucide-holder" data-svgurl="' + octiconsUrl(name) + '" data-svgfill="1"><span class="sk"></span></span>';
    case 'devicons':    return '<span class="lucide-holder" data-svgurl="' + deviconsUrl(name) + '"><span class="sk"></span></span>';
    case 'feather':     return '<span class="lucide-holder" data-svgurl="' + featherUrl(name) + '"><span class="sk"></span></span>';
    case 'antd':        return '<span class="lucide-holder" data-svgurl="' + antdUrl(name) + '" data-svgfill="1"><span class="sk"></span></span>';
    case 'mingcute':     return '<span class="lucide-holder" data-svgurl="' + mingcuteUrl(name) + '" data-svgfill="1" data-svgstrip="1"><span class="sk"></span></span>';
    case 'iconoir':     return '<span class="lucide-holder" data-svgurl="' + iconoirUrl(name) + '"><span class="sk"></span></span>';
    case 'flowbite':    return '<span class="lucide-holder" data-svgurl="' + flowbiteUrl(name) + '" data-svgfill="1"><span class="sk"></span></span>';
    case 'iconpark':   return iconparkSVG(name);
    case 'hugeicons':   return iconifyInline('hugeicons', name);
    case 'solar':       return solarSVG(name);
    case 'carbon':      return iconifyInline('carbon', name);
    case 'radix':       return iconifyInline('radix', name);
    case 'flags':       return iconifyInline('flags', name);
    case 'gameicons':   return iconifyInline('gameicons', name);
    case 'simpleicons': return iconifyInline('simpleicons', name);
    case 'cssgg':       return '<span class="lucide-holder" data-svgurl="' + cssggUrl(name) + '" data-svgfill="1"><span class="sk"></span></span>';
    case 'weather':     return '<i class="glyph wi wi-' + name + '"></i>';
  }
  return '';
}
function slotHTML(lib, name, size){
  const st = size ? ' style="width:' + size + 'px;height:' + size + 'px;font-size:' + size + 'px"' : '';
  return '<span class="slot"' + st + '>' + glyphHTML(lib, name) + '</span>';
}
function cardHTML(libId, name){
  const on = isFav(libId, name);
  return '<button class="card" data-lib="' + libId + '" data-name="' + name + '" title="' + name + '">' +
    '<span class="fav-btn' + (on ? ' on' : '') + '" data-fav="' + name + '" role="button" aria-label="收藏">' + (on ? I_HEART_ON : I_HEART) + '</span>' +
    slotHTML(libId, name, null) + '<span class="cname">' + name + '</span></button>';
}
function renderGrid(){
  gen++; rendered = 0;
  const generation = gen;
  updateHead(); updateCountUI();
  renderOtherLibs();
  const st = store[state.lib];
  if(!st || st.status === 'loading'){ startPixelLoading(generation); return; }
  if(st.status === 'error'){ stopPixelLoading(); grid.innerHTML = ''; showPanel('error'); return; }
  if(!filtered().length){ showPanel('empty'); return; }
  hidePanel();
  clearPixelLoading();
  grid.innerHTML = '';
  appendChunk();
  requestAnimationFrame(pump);
}
function appendChunk(){
  const list = filtered();
  if(rendered >= list.length){ updateEnd(); return; }
  const CHUNK = LIB_MAP[state.lib].svgFetch ? 120 : 240;
  const slice = list.slice(rendered, rendered + CHUNK);
  grid.insertAdjacentHTML('beforeend', slice.map(n => cardHTML(state.lib, n)).join(''));
  rendered += slice.length;
  if(LIB_MAP[state.lib].svgFetch) fillSlots(grid);
  updateCountUI(); updateEnd();
}
function updateEnd(){
  const total = filtered().length;
  if(rendered >= total){
    sentinel.classList.add('ig-hide');
    endNote.classList.remove('ig-hide');
    endNote.textContent = state.query.trim()
      ? '当前库已全部展示 · ' + total.toLocaleString() + ' 个匹配'
      : '已全部加载 · 共 ' + total.toLocaleString() + ' 个图标';
  }else{
    sentinel.classList.remove('ig-hide');
    endNote.classList.add('ig-hide');
  }
}
function updateCountUI(){}
function updateHead(){
  const lib = LIB_MAP[state.lib], st = store[state.lib];
  headTitle.innerHTML = '<span class="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style="background:' + lib.accent + '"></span>' + lib.label;
  headLink.href = lib.site;
  const prefix = (st && st.status === 'ok') ? activeNames().length.toLocaleString() + ' 个图标 · ' : '';
  headDesc.textContent = prefix + lib.desc + ' · 点击图标可查看代码并复制';
}
function showPanel(kind){
  if(kind !== 'loading') stopPixelLoading();
  grid.removeAttribute('aria-busy');
  grid.removeAttribute('aria-label');
  grid.classList.add('ig-hide');
  sentinel.classList.add('ig-hide');
  endNote.classList.add('ig-hide');
  statePanel.classList.remove('ig-hide');
  const lib = LIB_MAP[state.lib];
  if(kind === 'loading'){
    panelIcon.innerHTML = '<div class="spinner"></div>';
    panelMsg.textContent = '正在加载 ' + lib.label + ' 图标库…';
    reloadBtn.classList.add('ig-hide');
  }else if(kind === 'error'){
    panelIcon.innerHTML = I_ALERT;
    panelMsg.textContent = lib.label + ' 图标库加载失败（网络或 CDN 异常）';
    reloadBtn.classList.remove('ig-hide');
  }else{
    panelIcon.innerHTML = I_EMPTY;
    panelMsg.textContent = state.query.trim() ? '没有找到与「' + state.query.trim() + '」匹配的图标' : '当前图标库为空';
    reloadBtn.classList.add('ig-hide');
  }
}
function hidePanel(){
  statePanel.classList.add('ig-hide');
  grid.classList.remove('ig-hide');
}
window.addEventListener('resize', () => {
  if(!grid.querySelector('.pixel-card')) return;
  clearTimeout(pixelResizeTimer);
  const generation = gen;
  pixelResizeTimer = setTimeout(() => {
    const st = store[state.lib];
    if(generation === gen && st && st.status === 'loading') startPixelLoading(generation);
  }, 120);
});
/* 懒加载泵：sentinel 进入预加载区就追加，若追加后仍在视口内则继续（IO 不会重复触发） */
let pumping = false;
function pump(){
  if(pumping) return;
  const st = store[state.lib];
  if(!st || st.status !== 'ok') return;
  if(rendered >= filtered().length){ updateEnd(); return; }
  const cr = sentinel.getBoundingClientRect();
  const vr = contentEl.getBoundingClientRect();
  if(cr.top > vr.bottom + 700) return;
  pumping = true;
  const g = gen;
  appendChunk();
  requestAnimationFrame(() => {
    pumping = false;
    /* 本轮未完成且没有切换/重渲染时继续补齐视口 */
    if(g === gen && rendered < filtered().length) pump();
  });
}
const io = new IntersectionObserver(es => {
  if(es.some(e => e.isIntersecting)) pump();
}, { root: contentEl, rootMargin: '700px 0px' });
io.observe(sentinel);

/* ================= 复制与提示 ================= */
function toast(msg){
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = I_CHECK + '<span></span>';
  t.lastChild.textContent = msg;
  toasts.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 220); }, 1800);
}
function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  ta.remove();
}
function copyText(text){
  const done = () => toast('已经复制到粘贴板');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, () => { fallbackCopy(text); done(); });
  }else{
    fallbackCopy(text);
    done();
  }
}

/* ================= 详情弹窗 ================= */
function pascal(n){ return n.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(''); }
/* 各库 React/Vue 组件代码（按库官方 npm 包名生成 import + 用法） */
function reactCode(lib, name){
  const P = pascal(name);
  switch(lib){
    case 'lucide':    return "import { " + P + " } from 'lucide-react';\n\n<" + P + " size={24} />";
    case 'heroicons': return "import { " + P + "Icon } from '@heroicons/react/" + (sv('hi') === 'mini' ? '20/solid' : '24/' + sv('hi')) + "';\n\n<" + P + "Icon className=\"h-6 w-6\" />";
    case 'octicons':  return "import { " + P + "Icon } from '@primer/octicons-react';\n\n<" + P + "Icon size={24} />";
    case 'antd':      return "import { " + P + ({ outlined:'Outlined', filled:'Filled', twotone:'TwoTone' }[sv('antd')]) + " } from '@ant-design/icons';\n\n<" + P + ({ outlined:'Outlined', filled:'Filled', twotone:'TwoTone' }[sv('antd')]) + " />";
    case 'iconoir':   return "import { " + P + " } from '@iconoir/react';\n\n<" + P + " width=\"24\" height=\"24\" />";
    case 'phosphor':  return "import { " + P + " } from '@phosphor-icons/react';\n\n<" + P + " size={24} />";
    case 'iconpark': return "import { " + P + " } from '@icon-park/react';\n\n<" + P + " />";
  }
  /* 无官方 React 包的库：@iconify/react 统一兜底 */
  const ify = DETAIL_CONF[lib] && DETAIL_CONF[lib].iconify;
  return ify ? "import { Icon } from '@iconify/react';\n\n<Icon icon=\"" + ify(name) + "\" width=\"24\" />" : '';
}
function vueCode(lib, name){
  const P = pascal(name);
  switch(lib){
    case 'lucide':    return "import { " + P + " } from 'lucide-vue-next';\n\n<" + P + " :size=\"24\" />";
    case 'feather':   return "import { " + P + " } from 'feather-icons-vue';\n\n<" + P + " width=\"24\" height=\"24\" />";
    case 'ionicons':  return "import { IonIcon } from '@ionic/vue';\n\n<ion-icon name=\"" + name + "\"></ion-icon>";
    case 'antd':      return "import { " + P + ({ outlined:'Outlined', filled:'Filled', twotone:'TwoTone' }[sv('antd')]) + " } from '@ant-design/icons-vue';\n\n<" + P + ({ outlined:'Outlined', filled:'Filled', twotone:'TwoTone' }[sv('antd')]) + " />";
    case 'phosphor':  return "import { " + P + " } from '@phosphor-icons/vue';\n\n<" + P + " :size=\"24\" />";
    case 'remix':     return "import { Ri" + P + ({ line:'Line', fill:'Fill' }[sv('remix')]) + " } from '@remixicon/vue';\n\n<Ri" + P + ({ line:'Line', fill:'Fill' }[sv('remix')]) + " />";
  }
  /* 无官方 Vue 包的库：@iconify/vue 统一兜底 */
  const ify = DETAIL_CONF[lib] && DETAIL_CONF[lib].iconify;
  return ify ? "import { Icon } from '@iconify/vue';\n\n<Icon icon=\"" + ify(name) + "\" width=\"24\" />" : '';
}
/* 单个代码块面板：多行或超长用 textarea，单行用 input */
function codePanel(value){
  const wrap = document.createElement('div');
  wrap.className = 'flex gap-2';
  const lines = value.split('\n').length;
  let field;
  if(lines > 1 || value.length > 90){
    field = document.createElement('textarea');
    field.rows = Math.min(Math.max(lines, 2), 8);
  }else{
    field = document.createElement('input');
  }
  field.readOnly = true;
  field.className = 'code-box';
  field.value = value;
  field.addEventListener('focus', e => e.target.select());
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.title = '复制';
  btn.innerHTML = I_COPY;
  btn.addEventListener('click', () => copyText(field.value));
  wrap.appendChild(field);
  wrap.appendChild(btn);
  return wrap;
}
/* 基础信息行（名称 / CSS 类名）：标签 + 代码框 + 复制按钮 */
function codeRow(label, value){
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<div class="text-xs text-zinc-500 mb-1.5">' + label + '</div>' +
    '<div class="flex gap-2">' +
      '<input readonly class="code-box">' +
      '<button class="copy-btn" title="复制">' + I_COPY + '</button>' +
    '</div>';
  const field = wrap.querySelector('input');
  field.value = value;
  field.addEventListener('focus', e => e.target.select());
  wrap.querySelector('.copy-btn').addEventListener('click', () => copyText(field.value));
  return wrap;
}
/* 代码区 TAB：每个用法一个 TAB，只渲染当前库有的 */
function renderModalTabs(items){
  const bar = $('#m-tabs'), panel = $('#m-tab-panel');
  bar.innerHTML = '';
  panel.innerHTML = '';
  if(!items.length){ bar.classList.add('ig-hide'); return; }
  bar.classList.remove('ig-hide');
  items.forEach((r, i) => {
    const b = document.createElement('button');
    b.textContent = r[0];
    b.addEventListener('click', () => {
      bar.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      panel.innerHTML = '';
      panel.appendChild(codePanel(r[1]));
    });
    bar.appendChild(b);
    if(i === 0){
      b.classList.add('active');
      panel.appendChild(codePanel(r[1]));
    }
  });
}
/* ================= 发给 AI 提示词 ================= */
/* 两种写法：skilled = 装了 icon-gallery skill 的简洁版；plain = 没装 Skill 也能用的自带代码版 */
let aiPrompts = null;
function buildAiPrompts(lib, name, items){
  const conf = LIB_MAP[lib];
  const get = k => { const it = items.find(x => x[0] === k); return it ? it[1] : ''; };
  const styleConf = MODAL_STYLE_LIBS[lib];
  const style = styleConf && styleConf.opts.find(x => x[0] === String(sv(styleConf.key)));
  const displayName = '「' + name + '」' + (style ? style[1] : '') + '图标';
  const skilled = '请使用 icon-gallery Skill 获取 ' + conf.label + ' 的' + displayName + '，并在我指定的位置完成新增或替换。请遵循当前项目已有的技术栈、图标引入方式和样式规范。';
  const svg = get('SVG'), html = get('HTML'), cdn = get('CDN');
  const refs = ['- 图标库：' + conf.label, '- 图标名称：' + name];
  const dc = DETAIL_CONF[lib];
  if(style) refs.push('- 图标风格：' + style[1]);
  if(dc.cssClass) refs.push('- CSS 类名：' + dc.cssClass(name));
  if(html) refs.push('- HTML 参考：' + html);
  if(cdn) refs.push('- 资源参考：' + cdn);
  if(svg) refs.push('- SVG 参考：' + svg);
  const plain = '请在我指定的位置新增或替换为 ' + conf.label + ' 的' + displayName + '。\n\n参考信息：\n' + refs.join('\n') + '\n\n请先检查当前项目已有的技术栈和图标使用方式，再完成实现。以上信息仅供参考，不必照搬；如果项目已经引入相关图标库或已有统一图标方案，请复用现有实现，不要重复引入。';
  return { skilled, plain };
}
function renderAiPanel(kind){
  const panel = $('#m-ai-panel');
  if(!panel || !aiPrompts) return;
  panel.innerHTML = '';
  panel.appendChild(codePanel(aiPrompts[kind]));
  $$('#m-ai-seg button').forEach(b => b.classList.toggle('active', b.dataset.v === kind));
}
$('#m-ai-seg').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]');
  if(b) renderAiPanel(b.dataset.v);
});
/* 弹窗局部配置：打开弹窗时从全局 state 拷贝，修改只作用于弹窗内预览与代码 */
let modalOv = null;                              /* 风格覆盖（remix/fa/hi…），sv() 读取 */
let mCfg = { color:'', stroke:2, msFill:0, msWght:400 };
function sv(key){ return (modalOv && modalOv[key] !== undefined) ? modalOv[key] : state[key]; }
/* 颜色 / 描边 / 字重通过弹窗容器上的 CSS 变量覆盖，仅弹窗内生效 */
function applyModalVars(){
  const st = mDialog.style;
  /* 「跟随主题」也要显式覆盖：根节点上可能仍有全局 --icon-color，需压回主题默认色 */
  st.setProperty('--icon-color', mCfg.color || 'var(--icon-fg)');
  st.setProperty('--stroke-w', String(mCfg.stroke));
  st.setProperty('--ms-fill', String(mCfg.msFill));
  st.setProperty('--ms-wght', String(mCfg.msWght));
}
const MODAL_STYLE_LIBS = {
  remix:      { key:'remix',   label:'风格',     opts:[['line','线条'],['fill','填充']] },
  phosphor:   { key:'ph',      label:'字重风格', opts:[['thin','细'],['light','轻'],['regular','常规'],['bold','粗'],['fill','填充'],['duotone','双色']] },
  fontawesome:{ key:'fa',      label:'风格',     opts:[['solid','实心'],['regular','常规'],['brands','品牌']] },
  boxicons:   { key:'bx',      label:'风格',     opts:[['regular','常规'],['solid','实心'],['logos','Logo']] },
  heroicons:  { key:'hi',      label:'风格',     opts:[['outline','线条'],['solid','实心'],['mini','迷你']] },
  ionicons:   { key:'ion',     label:'风格',     opts:[['filled','填充'],['outline','线条'],['sharp','棱角']] },
  antd:       { key:'antd',    label:'风格',     opts:[['outlined','线条'],['filled','填充'],['twotone','双色']] },
  mingcute:   { key:'ming',    label:'风格',     opts:[['line','线条'],['fill','填充']] },
  iconoir:    { key:'iconoir', label:'风格',     opts:[['regular','线条'],['solid','实心']] },
  flowbite:   { key:'flow',    label:'风格',     opts:[['outline','线条'],['solid','实心']] },
  solar:      { key:'solar',   label:'风格',     opts:[['linear','线条'],['outline','轮廓'],['broken','断裂'],['line-duotone','线双色'],['bold','填充'],['bold-duotone','双色']] },
};
function cfgRow(label, ctrl, showVal){
  const d = document.createElement('div');
  d.innerHTML = '<div class="flex items-center justify-between mb-1.5"><span class="text-xs text-zinc-500">' + label + '</span>' + (showVal ? '<span class="cfg-val text-xs font-mono text-zinc-400"></span>' : '') + '</div>';
  d.appendChild(ctrl);
  return d;
}
function rangeCtrl(min, max, step, val){
  const s = document.createElement('input');
  s.type = 'range'; s.min = min; s.max = max; s.step = step; s.value = val;
  s.className = 'w-full accent-indigo-500 cursor-pointer';
  return s;
}
function buildModalSwatches(){
  buildSwatches($('#m-swatches'), () => mCfg.color, c => {
    mCfg.color = c;
    applyModalVars();
    buildModalSwatches();
  });
}
function buildModalConfig(lib){
  const box = $('#m-config');
  box.innerHTML = '';
  /* 图标颜色（所有库都有） */
  const sw = document.createElement('div');
  sw.id = 'm-swatches';
  sw.className = 'flex flex-wrap gap-2';
  box.appendChild(cfgRow('图标颜色', sw));
  buildModalSwatches();
  /* Lucide 描边粗细：走弹窗局部 CSS 变量，实时生效 */
  if(lib === 'lucide'){
    const s = rangeCtrl(1, 3, 0.1, mCfg.stroke);
    const row = cfgRow('描边粗细', s, true);
    const val = row.querySelector('.cfg-val');
    val.textContent = String(Math.round(mCfg.stroke * 10) / 10);
    s.addEventListener('input', () => {
      mCfg.stroke = +s.value;
      val.textContent = String(Math.round(mCfg.stroke * 10) / 10);
      applyModalVars();
    });
    box.appendChild(row);
  }
  /* 各库风格分段选择：只刷新弹窗内预览与代码 */
  const sc = MODAL_STYLE_LIBS[lib];
  if(sc){
    const seg = document.createElement('div');
    seg.className = 'seg' + (sc.opts.length > 3 ? ' seg-wrap' : '');
    sc.opts.forEach(o => {
      const b = document.createElement('button');
      b.dataset.v = o[0];
      b.textContent = o[1];
      b.classList.toggle('active', String(sv(sc.key)) === o[0]);
      seg.appendChild(b);
    });
    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-v]');
      if(!b) return;
      modalOv[sc.key] = b.dataset.v;
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      renderModalBody(currentIcon);
    });
    box.appendChild(cfgRow(sc.label, seg));
  }
  /* Material Symbols：填充开关 + 字重（弹窗局部 CSS 变量实时生效） */
  if(lib === 'material'){
    const row1 = document.createElement('div');
    row1.className = 'flex items-center justify-between';
    row1.innerHTML = '<span class="text-xs text-zinc-500">填充样式</span>';
    const swBtn = document.createElement('button');
    swBtn.className = 'switch' + (mCfg.msFill ? ' on' : '');
    swBtn.setAttribute('role', 'switch');
    swBtn.setAttribute('aria-checked', String(!!mCfg.msFill));
    swBtn.innerHTML = '<span class="knob"></span>';
    swBtn.addEventListener('click', () => {
      mCfg.msFill = mCfg.msFill ? 0 : 1;
      swBtn.classList.toggle('on', !!mCfg.msFill);
      swBtn.setAttribute('aria-checked', String(!!mCfg.msFill));
      applyModalVars();
    });
    row1.appendChild(swBtn);
    box.appendChild(row1);
    const wg = rangeCtrl(100, 700, 100, mCfg.msWght);
    const row2 = cfgRow('字重', wg, true);
    const wv = row2.querySelector('.cfg-val');
    wv.textContent = mCfg.msWght;
    wg.addEventListener('input', () => {
      mCfg.msWght = +wg.value;
      wv.textContent = mCfg.msWght;
      applyModalVars();
    });
    box.appendChild(row2);
  }
}

/* ===== 详情弹窗配置：每库声明分发形态，统一行序 ===== */
function cssLinkTag(lib){ return '<link rel="stylesheet" href="' + LIB_MAP[lib].css[0] + '">'; }
function imgTag(urlFn){ return n => '<img src="' + urlFn(n) + '" width="24" height="24" alt="' + n + '">'; }
function bxPrefix(){ return ({ regular:'bx', solid:'bxs', logos:'bxl' })[sv('bx')]; }
const DETAIL_CONF = {
  lucide: {
    html: n => '<i data-lucide="' + n + '"></i>',
    cdn: () => '<script src="https://unpkg.com/lucide@latest"><\/script>',
    svgText: n => getSvg(lucideUrl(n)),
  },
  tabler: {
    cssClass: n => 'ti ti-' + n,
    html: n => '<i class="ti ti-' + n + '"></i>',
    cdn: () => cssLinkTag('tabler'),
    iconify: n => 'tabler:' + n,
  },
  remix: {
    cssClass: n => 'ri ri-' + n + '-' + sv('remix'),
    html: n => '<i class="ri ri-' + n + '-' + sv('remix') + '"></i>',
    cdn: () => cssLinkTag('remix'),
    iconify: n => 'ri:' + n + '-' + sv('remix'),
  },
  phosphor: {
    cssClass: n => PH_BASE[sv('ph')] + ' ph-' + n,
    html: n => '<i class="' + PH_BASE[sv('ph')] + ' ph-' + n + '"></i>',
    cdn: () => cssLinkTag('phosphor'),
  },
  bootstrap: {
    cssClass: n => 'bi bi-' + n,
    html: n => '<i class="bi bi-' + n + '"></i>',
    cdn: () => cssLinkTag('bootstrap'),
    iconify: n => 'bi:' + n,
  },
  material: {
    html: n => '<span class="material-symbols-rounded">' + n + '</span>',
    cdn: () => cssLinkTag('material'),
    iconify: n => 'material-symbols:' + n.replace(/_/g, '-') + '-rounded',
  },
  fontawesome: {
    cssClass: n => FA_BASE[sv('fa')] + ' fa-' + n,
    html: n => '<i class="' + FA_BASE[sv('fa')] + ' fa-' + n + '"></i>',
    cdn: () => cssLinkTag('fontawesome'),
    iconify: n => ({ solid:'fa6-solid', regular:'fa6-regular', brands:'fa6-brands' })[sv('fa')] + ':' + n,
  },
  mdi: {
    cssClass: n => 'mdi mdi-' + n,
    html: n => '<i class="mdi mdi-' + n + '"></i>',
    cdn: () => cssLinkTag('mdi'),
    iconify: n => 'mdi:' + n,
  },
  heroicons: {
    html: imgTag(heroiconsUrl),
    cdn: heroiconsUrl,
    svgText: n => getSvg(heroiconsUrl(n)),
    iconify: n => 'heroicons:' + n + (({ solid:'-solid', mini:'-20-solid' })[sv('hi')] || ''),
  },
  ionicons: {
    html: n => '<ion-icon name="' + n + (sv('ion') === 'filled' ? '' : '-' + sv('ion')) + '"></ion-icon>',
    cdn: () => '<script type="module" src="https://cdn.jsdelivr.net/npm/ionicons@latest/dist/ionicons/ionicons.esm.js"><\/script>',
    svgText: n => getSvg(ioniconsUrl(n), true),
    iconify: n => 'ion:' + n + (sv('ion') === 'filled' ? '' : '-' + sv('ion')),
  },
  boxicons: {
    cssClass: n => bxPrefix() + ' ' + bxPrefix() + '-' + n,
    html: n => '<i class="' + bxPrefix() + ' ' + bxPrefix() + '-' + n + '"></i>',
    cdn: () => cssLinkTag('boxicons'),
    iconify: n => bxPrefix() + ':' + n,
  },
  octicons: {
    html: imgTag(octiconsUrl),
    cdn: octiconsUrl,
    svgText: n => getSvg(octiconsUrl(n), true),
    iconify: n => 'octicon:' + n + '-' + octiconsHeight(n),
  },
  antd: {
    html: imgTag(antdUrl),
    cdn: antdUrl,
    svgText: n => getSvg(antdUrl(n), true),
  },
  feather: {
    html: n => '<i data-feather="' + n + '"></i>',
    cdn: () => '<script src="https://cdn.jsdelivr.net/npm/feather-icons"><\/script>',
    svgText: n => getSvg(featherUrl(n)),
    iconify: n => 'feather:' + n,
  },
  mingcute: {
    html: imgTag(mingcuteUrl),
    cdn: mingcuteUrl,
    svgText: n => getSvg(mingcuteUrl(n), true, true),
    iconify: n => 'mingcute:' + n + '-' + (sv('ming') === 'fill' ? 'fill' : 'line'),
  },
  iconoir: {
    html: imgTag(iconoirUrl),
    cdn: iconoirUrl,
    svgText: n => getSvg(iconoirUrl(n)),
    iconify: n => 'iconoir:' + n + (sv('iconoir') === 'solid' ? '-solid' : ''),
  },
  flowbite: {
    html: imgTag(flowbiteUrl),
    cdn: flowbiteUrl,
    svgText: n => getSvg(flowbiteUrl(n), true),
    iconify: n => 'flowbite:' + n + '-' + (sv('flow') === 'solid' ? 'solid' : 'outline'),
  },
  devicons: {
    html: imgTag(deviconsUrl),
    cdn: deviconsUrl,
    svgText: n => getSvg(deviconsUrl(n)),
    iconify: n => 'devicon:' + n,
  },
  iconpark: {
    svgText: iconparkSVG,
    iconify: n => 'icon-park:' + n,
  },
  hugeicons: {
    svgText: n => iconifyInline('hugeicons', n),
    iconify: n => 'hugeicons:' + n,
  },
  solar: {
    svgText: n => solarSVG(n),
    iconify: n => 'solar:' + n + '-' + sv('solar'),
  },
  carbon: {
    svgText: n => iconifyInline('carbon', n),
    iconify: n => 'carbon:' + n,
  },
  radix: {
    svgText: n => iconifyInline('radix', n),
    iconify: n => 'radix-icons:' + n,
  },
  flags: {
    svgText: n => iconifyInline('flags', n),
    iconify: n => 'circle-flags:' + n,
  },
  gameicons: {
    svgText: n => iconifyInline('gameicons', n),
    iconify: n => 'game-icons:' + n,
  },
  simpleicons: {
    svgText: n => iconifyInline('simpleicons', n),
    iconify: n => 'simple-icons:' + n,
  },
  cssgg: {
    cssClass: n => 'gg-' + n,
    html: n => '<i class="gg-' + n + '"></i>',
    cdn: () => '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/css.gg@latest/icons/all.css">',
    svgText: n => getSvg(cssggUrl(n), true),
    iconify: n => 'gg:' + n,
  },
  weather: {
    cssClass: n => 'wi wi-' + n,
    html: n => '<i class="wi wi-' + n + '"></i>',
    cdn: () => cssLinkTag('weather'),
    iconify: n => 'wi:' + n,
  },
};
let currentIcon = '';
async function openDetail(name, libId){
  currentIcon = name;
  const lib = libId || state.lib, conf = LIB_MAP[lib];
  mName.textContent = name;
  mLib.textContent = conf.label;
  /* 初始化弹窗局部配置：从全局预览设置拷贝，之后的修改不影响全局 */
  modalOv = {};
  const sc = MODAL_STYLE_LIBS[lib];
  if(sc) modalOv[sc.key] = state[sc.key];
  mCfg = { color: state.color, stroke: state.stroke, msFill: state.msFill, msWght: state.msWght };
  applyModalVars();
  buildModalConfig(lib);
  await renderModalBody(name, lib);
  modal.style.display = 'flex';
}
/* 弹窗主体：多尺寸预览 + 基础信息行 + 用法 TAB；风格切换时原地重渲染 */
async function renderModalBody(name, lib = state.lib){
  mSizes.innerHTML = [16, 24, 32, 48, 64].map(s =>
    '<div class="size-cell">' + slotHTML(lib, name, s) + '<span>' + s + '</span></div>'
  ).join('');
  const dc = DETAIL_CONF[lib];
  const infoBox = $('#m-info-rows');
  infoBox.innerHTML = '';
  infoBox.appendChild(codeRow('名称', name));
  if(dc.cssClass) infoBox.appendChild(codeRow('CSS 类名', dc.cssClass(name)));
  const items = [];
  if(dc.html) items.push(['HTML', dc.html(name)]);
  if(dc.cdn) items.push(['CDN', dc.cdn(name)]);
  if(dc.svgText){
    let svg = '';
    try{ svg = await dc.svgText(name); }catch(e){}
    if(svg) items.push(['SVG', svg]);
  }
  /* React / Vue 组件代码：官方包优先，无官方包的库走 @iconify 兜底 */
  const rc = reactCode(lib, name), vc = vueCode(lib, name);
  if(rc) items.push(['React', rc]);
  if(vc) items.push(['Vue', vc]);
  aiPrompts = buildAiPrompts(lib, name, items);
  renderAiPanel('skilled');
  renderModalTabs(items);
  fillSlots(modal);
}
function closeModal(){
  modal.style.display = 'none';
  modalOv = null;
  mDialog.removeAttribute('style');
}
modal.addEventListener('click', e => { if(e.target.closest('[data-close]')) closeModal(); });
/* 卡片区点击（当前库网格 + 跨库分区共用）：收藏 / 打开详情均按卡片自身库处理 */
function handleCardAreaClick(e){
  const fb = e.target.closest('.fav-btn');
  if(fb){
    e.preventDefault();
    e.stopPropagation();
    const card = fb.closest('.card');
    const libId = (card && card.dataset.lib) || state.lib;
    const on = isFav(libId, fb.dataset.fav);
    toggleFav(libId, fb.dataset.fav);
    /* 就地更新心形，不重渲染网格 */
    fb.classList.toggle('on', !on);
    fb.innerHTML = !on ? I_HEART_ON : I_HEART;
    return;
  }
  const c = e.target.closest('.card');
  if(c) openDetail(c.dataset.name, c.dataset.lib || state.lib);
}
grid.addEventListener('click', handleCardAreaClick);
otherLibsEl.addEventListener('click', e => {
  const more = e.target.closest('[data-gol]');
  if(more){
    /* 查看全部：切换到该图标库（搜索词保留），回到顶部看完整结果 */
    selectLib(more.dataset.gol);
    contentEl.scrollTo({ top: 0 });
    return;
  }
  handleCardAreaClick(e);
});

/* ================= 侧栏 / 筹码 / 色板 ================= */
function buildSidebar(){
  libList.innerHTML = '';
  LIBS.forEach(lib => {
    const b = document.createElement('button');
    b.className = 'lib-item' + (lib.id === state.lib ? ' active' : '');
    b.dataset.lib = lib.id;
    b.innerHTML =
      '<span class="lib-glyph" data-glyph="' + lib.id + '"><span class="inline-block w-2 h-2 rounded-full bg-current opacity-30"></span></span>' +
      '<span class="flex-1 min-w-0">' +
        '<span class="lib-title"><span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style="background:' + lib.accent + '"></span>' + lib.label + '</span>' +
        '<span class="lib-sub" data-sub="' + lib.id + '">' + lib.desc + '</span>' +
      '</span>';
    b.addEventListener('click', () => { selectLib(lib.id); closeDrawer(); });
    libList.appendChild(b);
  });
}
function buildChips(){
  chipBar.innerHTML = '';
  LIBS.forEach(lib => {
    const b = document.createElement('button');
    b.className = 'chip' + (lib.id === state.lib ? ' active' : '');
    b.dataset.lib = lib.id;
    b.textContent = lib.label;
    b.addEventListener('click', () => selectLib(lib.id));
    chipBar.appendChild(b);
  });
}
/* 通用色板构建：cur() 取当前颜色，onPick(c) 处理选择（侧栏写全局，弹窗写局部） */
function buildSwatches(box, cur, onPick){
  box.innerHTML = '';
  const auto = document.createElement('button');
  auto.className = 'sw auto' + (cur() ? '' : ' active');
  auto.title = '跟随主题';
  auto.addEventListener('click', () => onPick(''));
  box.appendChild(auto);
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'sw';
    b.style.background = c;
    b.title = c;
    if(cur() === c) b.classList.add('active');
    b.addEventListener('click', () => onPick(c));
    box.appendChild(b);
  });
  const custom = document.createElement('label');
  custom.className = 'sw custom';
  if(cur() && COLORS.indexOf(cur()) < 0) custom.classList.add('active');
  custom.title = '自定义颜色';
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = /^#[0-9a-fA-F]{6}$/.test(cur()) ? cur() : '#6366f1';
  inp.className = 'sr-only';
  inp.addEventListener('input', () => onPick(inp.value));
  custom.appendChild(inp);
  box.appendChild(custom);
}
/* 侧栏色板：写全局预览设置 */
function buildSidebarSwatches(){
  buildSwatches($('#swatches'), () => state.color, c => {
    state.color = c;
    saveState();
    applyVars();
    buildSidebarSwatches();
  });
}

/* ================= 预览设置 ================= */
const sizeSlider = $('#size-slider'), strokeSlider = $('#stroke-slider');
const msFillBtn = $('#ms-fill'), msWghtSlider = $('#ms-wght');
function applyVars(){
  const rs = document.documentElement.style;
  rs.setProperty('--icon-size', state.size + 'px');
  if(state.color) rs.setProperty('--icon-color', state.color); else rs.removeProperty('--icon-color');
  rs.setProperty('--stroke-w', String(state.stroke));
  rs.setProperty('--ms-fill', String(state.msFill));
  rs.setProperty('--ms-wght', String(state.msWght));
  $('#size-val').textContent = state.size + 'px';
  $('#stroke-val').textContent = String(Math.round(state.stroke * 10) / 10);
  $('#ms-wght-val').textContent = state.msWght;
  msFillBtn.classList.toggle('on', !!state.msFill);
  msFillBtn.setAttribute('aria-checked', String(!!state.msFill));
}
sizeSlider.addEventListener('input', () => { state.size = +sizeSlider.value; applyVars(); saveState(); });
strokeSlider.addEventListener('input', () => { state.stroke = +strokeSlider.value; applyVars(); saveState(); });
msWghtSlider.addEventListener('input', () => { state.msWght = +msWghtSlider.value; applyVars(); saveState(); });
msFillBtn.addEventListener('click', () => { state.msFill = state.msFill ? 0 : 1; applyVars(); saveState(); });

function bindSeg(el, key, after){
  el.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if(!b) return;
    el.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    state[key] = b.dataset.v;
    saveState();
    if(after) after();
  });
  el.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.v === String(state[key])));
}
bindSeg($('#remix-seg'), 'remix', renderGrid);
bindSeg($('#ph-seg'), 'ph', renderGrid);
bindSeg($('#fa-seg'), 'fa', renderGrid);
bindSeg($('#hi-seg'), 'hi', renderGrid);
bindSeg($('#ion-seg'), 'ion', renderGrid);
bindSeg($('#bx-seg'), 'bx', renderGrid);
bindSeg($('#antd-seg'), 'antd', renderGrid);
bindSeg($('#ming-seg'), 'ming', renderGrid);
bindSeg($('#iconoir-seg'), 'iconoir', renderGrid);
bindSeg($('#flow-seg'), 'flow', renderGrid);
bindSeg($('#solar-seg'), 'solar', renderGrid);

/* ================= 搜索 / 主题 / 抽屉 / 快捷键 ================= */
const kwBar = $('#kw-bar'), kwChips = $('#kw-chips');
function renderKwBar(){
  const q = state.query.trim();
  let kws = [];
  if(q && isCJK(q)){
    kws = expandQuery(q);
    if(!kws.length) kws = translatedKws(q); /* 翻译兜底词也显示为 chips */
  }else if(q){
    kws = expandPinyin(q); /* 拼音命中也显示为 chips */
  }
  if(!kws.length){
    kwBar.classList.add('ig-hide');
    state.tagFilter = '';
    return;
  }
  kwBar.classList.remove('ig-hide');
  kwChips.innerHTML = '';
  kws.forEach(k => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.tagFilter === k ? ' active' : '');
    b.textContent = k;
    b.addEventListener('click', () => {
      state.tagFilter = state.tagFilter === k ? '' : k;
      renderKwBar();
      renderGrid();
    });
    kwChips.appendChild(b);
  });
}
let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = searchEl.value;
    state.tagFilter = '';
    clearBtn.classList.toggle('hidden', !searchEl.value);
    kbdHint.classList.toggle('hidden', !!searchEl.value);
    writeHash();
    renderKwBar();
    renderGrid();
    /* 词典未命中的中文词 -> 在线翻译兜底，结果回来后自动刷新 */
    const q = state.query.trim();
    if(q && isCJK(q) && !expandQuery(q).length && !translatedKws(q).length){
      translateZh2En(q).then(en => {
        if(en && state.query.trim() === q){
          renderKwBar();
          renderGrid();
        }
      });
    }
  }, 120);
});
clearBtn.addEventListener('click', () => {
  searchEl.value = '';
  state.query = '';
  state.tagFilter = '';
  clearBtn.classList.add('hidden');
  kbdHint.classList.remove('hidden');
  writeHash();
  renderKwBar();
  renderGrid();
  searchEl.focus();
});
searchEl.addEventListener('keydown', e => {
  if(e.key === 'Enter'){
    const list = filtered();
    if(list.length) openDetail(list[0]);
  }
});

function updateThemeIcon(){
  const dark = document.documentElement.classList.contains('dark');
  $('#icon-sun').classList.toggle('hidden', dark);
  const moon = $('#icon-moon');
  moon.classList.toggle('hidden', !dark);
  moon.classList.toggle('inline-flex', dark);
  moon.classList.toggle('items-center', dark);
  moon.classList.toggle('gap-1', dark);
}
$('#theme-btn').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  try{ localStorage.setItem('ig:theme', dark ? 'dark' : 'light'); }catch(e){}
  updateThemeIcon();
});

function closeDrawer(){
  sidebar.classList.remove('open');
  drawerMask.classList.add('ig-hide');
}
$('#menu-btn').addEventListener('click', () => {
  sidebar.classList.add('open');
  drawerMask.classList.remove('ig-hide');
});
$('#drawer-close').addEventListener('click', closeDrawer);
drawerMask.addEventListener('click', closeDrawer);

reloadBtn.addEventListener('click', () => { delete store[state.lib]; ensureLib(state.lib); });

document.addEventListener('keydown', e => {
  const t = e.target;
  const typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  /* 输入框 Cmd/Ctrl+A 全选（预览环境兜底） */
  if((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A') && typing){
    e.preventDefault();
    t.select();
    return;
  }
  if(e.key === '/' && !typing){
    e.preventDefault();
    searchEl.focus();
    searchEl.select();
  }else if(e.key === 'Escape'){
    if(cmpModal.style.display !== 'none') closeCompare();
    else if(modal.style.display !== 'none') closeModal();
  }
});

/* ================= 库切换与启动 ================= */
function selectLib(id){
  state.lib = id;
  saveState();
  $$('.lib-item').forEach(b => b.classList.toggle('active', b.dataset.lib === id));
  $$('.chip').forEach(b => b.classList.toggle('active', b.dataset.lib === id));
  $$('[data-ctl]').forEach(el => el.classList.toggle('on', el.dataset.ctl === id));
  updateHead();
  ensureLib(id);
}

sizeSlider.value = state.size;
strokeSlider.value = state.stroke;
msWghtSlider.value = state.msWght;
/* URL hash 带搜索词时回填输入框 */
if(state.query){
  searchEl.value = state.query;
  clearBtn.classList.remove('hidden');
  kbdHint.classList.add('hidden');
}
buildSidebar();
buildChips();
buildSidebarSwatches();
applyVars();
updateThemeIcon();
renderFavBar();

/* 侧栏星形预览：立即填充字形并预注入全部 CSS，字体在后台并行下载，不等待库数据加载 */
LIBS.forEach(lib => injectCss(lib.id));
LIBS.forEach(lib => {
  const gl = document.querySelector('[data-glyph="' + lib.id + '"]');
  if(gl && !gl.dataset.filled){ gl.innerHTML = SAMPLE[lib.id]; gl.dataset.filled = '1'; }
});

selectLib(state.lib);

})();
