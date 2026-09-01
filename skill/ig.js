#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');

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

/* ---------- Chinese keyword map (extracted from index.html) ---------- */
const ZH_MAP = {
  '首页': ['home', 'house', 'landing'],
  '主页': ['home', 'house'],
  '返回': ['back', 'arrow-left', 'return', 'undo'],
  '前进': ['forward', 'arrow-right'],
  '刷新': ['refresh', 'reload', 'rotate'],
  '菜单': ['menu', 'list', 'nav', 'sidebar'],
  '导航': ['nav', 'navigation', 'compass', 'route'],
  '侧栏': ['sidebar', 'panel', 'column'],
  '布局': ['layout', 'grid', 'columns'],
  '置顶': ['pin', 'top', 'up'],
  '置底': ['bottom'],
  '标签页': ['tab'],
  '面包屑': ['breadcrumb'],
  '锚点': ['anchor', 'hash'],
  '添加': ['add', 'plus', 'new', 'create'],
  '新增': ['add', 'plus', 'create'],
  '新建': ['new', 'create', 'file-plus'],
  '删除': ['delete', 'trash', 'remove', 'x', 'close', 'bin'],
  '移除': ['remove', 'close', 'x', 'minus'],
  '编辑': ['edit', 'pencil', 'pen', 'write'],
  '修改': ['edit', 'pencil', 'modify'],
  '保存': ['save', 'download', 'floppy'],
  '取消': ['cancel', 'x', 'close', 'ban'],
  '确认': ['check', 'confirm', 'done', 'yes'],
  '提交': ['submit', 'send', 'upload'],
  '关闭': ['close', 'x', 'exit'],
  '打开': ['open', 'external', 'expand'],
  '复制': ['copy', 'clone', 'duplicate'],
  '剪切': ['cut', 'scissors', 'crop'],
  '粘贴': ['paste', 'clipboard'],
  '撤销': ['undo', 'rotate-ccw', 'arrow-counterclockwise'],
  '重做': ['redo', 'rotate-cw', 'arrow-clockwise'],
  '搜索': ['search', 'find', 'magnifier', 'zoom'],
  '查找': ['search', 'find', 'locate'],
  '筛选': ['filter', 'funnel', 'sieve'],
  '排序': ['sort', 'order', 'arrange', 'arrow-up-down'],
  '上传': ['upload', 'cloud-upload', 'arrow-up'],
  '下载': ['download', 'cloud-download', 'arrow-down'],
  '分享': ['share', 'send', 'network', 'social'],
  '导出': ['export', 'download', 'share'],
  '导入': ['import', 'upload'],
  '打印': ['printer', 'print'],
  '登录': ['log-in', 'login', 'sign-in', 'door-open'],
  '登出': ['logout', 'log-out', 'sign-out', 'door-open'],
  '注册': ['user-plus', 'sign-up', 'register'],
  '验证': ['check', 'verify', 'shield', 'badge'],
  '扫码': ['scan', 'qr', 'barcode'],
  '点击': ['pointer', 'cursor', 'tap', 'hand'],
  '拖拽': ['drag', 'grip', 'move'],
  '缩放': ['zoom', 'maximize', 'minimize', 'expand'],
  '预览': ['eye', 'preview', 'visible'],
  '安装': ['download', 'package', 'wrench'],
  '发送': ['send', 'paper-plane', 'mail'],
  '转发': ['forward', 'share', 'send'],
  '回复': ['reply', 'message', 'undo'],
  '点赞': ['thumbs-up', 'like', 'heart', 'hand'],
  '评论': ['message', 'comment', 'chat', 'bubble'],
  '收藏': ['star', 'bookmark', 'heart', 'favorite'],
  '关注': ['user-plus', 'bell', 'eye'],
  '购买': ['shopping-cart', 'cart', 'buy', 'credit-card'],
  '折叠': ['chevron-down', 'fold', 'collapse', 'minimize'],
  '展开': ['chevron-up', 'unfold', 'expand', 'maximize'],
  '文件': ['file', 'document', 'doc', 'folder'],
  '文件夹': ['folder', 'directory', 'archive'],
  '图片': ['image', 'photo', 'picture', 'img'],
  '照片': ['photo', 'camera', 'image'],
  '相册': ['image', 'photos', 'album', 'gallery'],
  '视频': ['video', 'film', 'play', 'camera'],
  '音频': ['audio', 'music', 'sound', 'volume'],
  '音乐': ['music', 'note', 'headphones', 'song'],
  '文档': ['file-text', 'document', 'book'],
  '表格': ['table', 'grid', 'sheet'],
  '图表': ['chart', 'bar-chart', 'graph', 'pie'],
  '链接': ['link', 'chain', 'url', 'external'],
  '书签': ['bookmark', 'tag', 'ribbon'],
  '标签': ['tag', 'label', 'price', 'bookmark'],
  '附件': ['paperclip', 'attachment', 'clip'],
  '回收站': ['trash', 'bin', 'recycle', 'delete'],
  '归档': ['archive', 'box', 'package'],
  '草稿': ['file-text', 'edit', 'pencil', 'note'],
  '笔记': ['note', 'pencil', 'edit', 'sticky'],
  '代码': ['code', 'terminal', 'brackets', 'developer'],
  '日历': ['calendar', 'date', 'schedule'],
  '时钟': ['clock', 'time', 'watch', 'timer'],
  '钱包': ['wallet', 'credit-card', 'money', 'cash'],
  '信封': ['mail', 'envelope', 'send'],
  '礼物': ['gift', 'present', 'box', 'birthday'],
  '钥匙': ['key', 'lock', 'password', 'unlock'],
  '购物车': ['shopping-cart', 'cart', 'trolley'],
  '订单': ['receipt', 'list', 'clipboard', 'order'],
  '用户': ['user', 'person', 'account', 'profile'],
  '人群': ['users', 'group', 'people', 'team'],
  '头像': ['user', 'circle-user', 'person', 'avatar'],
  '角色': ['user', 'users', 'shield', 'crown'],
  '团队': ['users', 'team', 'group'],
  '成员': ['user', 'users', 'people', 'member'],
  '管理员': ['shield', 'user-cog', 'crown', 'admin'],
  '联系人': ['contact', 'user', 'phone', 'address-book'],
  '作者': ['pen-tool', 'user', 'edit', 'write'],
  '访客': ['user', 'eye', 'ghost', 'external'],
  '消息': ['message', 'chat', 'bubble', 'mail'],
  '通知': ['bell', 'notification', 'alarm'],
  '提醒': ['bell', 'alarm', 'clock', 'notification'],
  '邮件': ['mail', 'envelope', 'inbox', 'at-sign'],
  '电话': ['phone', 'call', 'telephone', 'contact'],
  '聊天': ['message', 'chat', 'bubble', 'send'],
  '公告': ['megaphone', 'speaker', 'volume', 'announcement'],
  '反馈': ['message', 'thumbs-up', 'bug', 'feedback'],
  '成功': ['check', 'circle-check', 'done', 'success'],
  '失败': ['x', 'circle-x', 'error', 'alert'],
  '警告': ['alert', 'triangle', 'warning', 'exclamation'],
  '错误': ['x-circle', 'alert-octagon', 'error', 'bug'],
  '加载': ['loader', 'spinner', 'loading', 'hourglass'],
  '等待': ['hourglass', 'clock', 'loader', 'wait'],
  '进行中': ['loader', 'progress', 'spinner', 'circle'],
  '完成': ['check', 'check-done', 'circle-check', 'flag'],
  '在线': ['wifi', 'signal', 'globe', 'dot'],
  '离线': ['wifi-off', 'plug', 'zap-off', 'cloud-off'],
  '启用': ['power', 'toggle-right', 'check', 'play'],
  '禁用': ['ban', 'toggle-left', 'x', 'forbidden'],
  '锁定': ['lock', 'lock-closed', 'shield', 'key'],
  '解锁': ['unlock', 'lock-open', 'key', 'shield-off'],
  '隐私': ['eye-off', 'shield', 'lock', 'user'],
  '安全': ['shield', 'lock', 'security', 'verified'],
  '密码': ['key', 'lock', 'asterisk', 'password'],
  '帮助': ['help', 'circle-help', 'question', 'life-buoy'],
  '信息': ['info', 'circle-i', 'information', 'about'],
  '危险': ['alert', 'skull', 'flame', 'warning'],
  '播放': ['play', 'start', 'triangle', 'media'],
  '暂停': ['pause', 'two-bars', 'stop', 'hold'],
  '停止': ['square', 'stop', 'circle-stop', 'power'],
  '快进': ['fast-forward', 'skip-forward', 'forward'],
  '后退': ['rewind', 'skip-back', 'backward', 'play-back'],
  '上一首': ['skip-back', 'chevron-left', 'previous'],
  '下一首': ['skip-forward', 'chevron-right', 'next'],
  '循环': ['repeat', 'loop', 'refresh-cw', 'rotate'],
  '音量': ['volume', 'speaker', 'sound', 'audio-volume'],
  '静音': ['volume-x', 'mute', 'speaker-off', 'volume-off'],
  '全屏': ['maximize', 'expand', 'fullscreen', 'corners'],
  '录制': ['circle', 'record', 'video', 'dot'],
  '截图': ['camera', 'image', 'crop', 'scissors'],
  '直播': ['radio', 'video', 'broadcast', 'live'],
  '天气': ['cloud-sun', 'sun', 'cloud', 'weather'],
  '晴': ['sun', 'clear', 'day', 'bright'],
  '晴天': ['sun', 'clear', 'day', 'bright'],
  '多云': ['cloud', 'cloudy', 'partly'],
  '阴天': ['cloud', 'overcast', 'gloomy'],
  '雨天': ['cloud-rain', 'rain', 'umbrella', 'drizzle'],
  '雪': ['snowflake', 'snow', 'cloud-snow', 'winter'],
  '风': ['wind', 'air', 'feather', 'waves'],
  '雾': ['cloud-fog', 'fog', 'mist', 'haze'],
  '雷': ['zap', 'cloud-lightning', 'thunder', 'bolt'],
  '彩虹': ['rainbow', 'colors', 'arc', 'palette'],
  '温度': ['thermometer', 'temperature', 'temp', 'gauge'],
  '月亮': ['moon', 'night', 'dark', 'sleep'],
  '太阳': ['sun', 'solar', 'day', 'bright'],
  '星星': ['star', 'sparkle', 'favorite', 'rate'],
  '闪电': ['zap', 'bolt', 'lightning', 'flash'],
  '火': ['flame', 'fire', 'hot', 'burn'],
  '水': ['droplet', 'water', 'waves', 'glass'],
  '山': ['mountain', 'hill', 'peak', 'landscape'],
  '树': ['tree', 'leaf', 'plant', 'forest'],
  '花': ['flower', 'blossom', 'plant', 'petal'],
  '上': ['arrow-up', 'chevron-up', 'up', 'top'],
  '下': ['arrow-down', 'chevron-down', 'down', 'bottom'],
  '左': ['arrow-left', 'chevron-left', 'left'],
  '右': ['arrow-right', 'chevron-right', 'right'],
  '旋转': ['rotate', 'refresh', 'spin', 'turn'],
  '翻转': ['flip', 'mirror', 'rotate', 'swap'],
  '喜欢': ['heart', 'thumbs-up', 'smile', 'love'],
  '收藏夹': ['star', 'bookmark', 'heart', 'folder-heart'],
  '哭': ['frown', 'sad', 'cry', 'tear'],
  '笑': ['smile', 'laugh', 'happy', 'grin'],
  '生气': ['angry', 'flame', 'mad', 'furious'],
  '惊讶': ['surprised', 'exclamation', 'wow', 'alert'],
  '心': ['heart', 'love', 'like', 'favorite'],
  '伤心': ['frown', 'heart-crack', 'sad', 'blue'],
  '开心': ['smile', 'happy', 'laugh', 'grin'],
  '评分': ['star', 'rate', 'review', 'rank'],
  '电脑': ['monitor', 'computer', 'screen', 'desktop'],
  '笔记本': ['laptop', 'notebook', 'computer', 'mac'],
  '手机': ['smartphone', 'phone', 'mobile', 'device'],
  '平板': ['tablet', 'ipad', 'device', 'screen'],
  '键盘': ['keyboard', 'key', 'command', 'type'],
  '鼠标': ['mouse', 'pointer', 'cursor', 'click'],
  '耳机': ['headphones', 'audio', 'music', 'earbuds'],
  '相机': ['camera', 'photo', 'aperture', 'image'],
  '电视': ['tv', 'television', 'monitor', 'screen'],
  '打印机': ['printer', 'print', 'paper'],
  '硬盘': ['hard-drive', 'disk', 'storage', 'database'],
  '电源': ['power', 'plug', 'zap', 'on'],
  '网络': ['wifi', 'network', 'globe', 'signal'],
  '蓝牙': ['bluetooth', 'wireless', 'connection', 'signal'],
  '电池': ['battery', 'power', 'charge', 'energy'],
  '服务器': ['server', 'database', 'cpu', 'cloud'],
  '数据库': ['database', 'storage', 'server', 'disk'],
  '云': ['cloud', 'cloud-upload', 'weather', 'storage'],
  '公司': ['building', 'briefcase', 'office', 'business'],
  '学校': ['school', 'book', 'graduation', 'education'],
  '医院': ['hospital', 'cross', 'medical', 'health'],
  '银行': ['bank', 'building', 'money', 'landmark'],
  '地图': ['map', 'location', 'pin', 'navigation'],
  '定位': ['map-pin', 'locate', 'crosshair', 'gps'],
  '位置': ['map-pin', 'location', 'place', 'pin'],
  '地址': ['map-pin', 'home', 'location', 'mail'],
  '商店': ['store', 'shop', 'shopping', 'bag'],
  '家': ['home', 'house', 'family', 'heart'],
  '支付': ['credit-card', 'payment', 'wallet', 'cash'],
  '优惠券': ['ticket', 'tag', 'percent', 'discount'],
  '折扣': ['percent', 'tag', 'sale', 'discount'],
  '价格': ['tag', 'dollar', 'money', 'price'],
  '商品': ['package', 'box', 'shopping-bag', 'product'],
  '货币': ['dollar', 'coins', 'cash', 'currency'],
  '美元': ['dollar', 'usd', 'money', 'cash'],
  '人民币': ['yen', 'currency', 'money', 'cash'],
  '设置': ['settings', 'cog', 'gear', 'sliders'],
  '配置': ['settings', 'sliders', 'config', 'adjust'],
  '主题': ['palette', 'moon', 'sun', 'brush'],
  '颜色': ['palette', 'droplet', 'color', 'paint'],
  '外观': ['palette', 'eye', 'brush', 'theme'],
  '语言': ['globe', 'languages', 'translate', 'message'],
  '权限': ['shield', 'lock', 'key', 'user-check'],
  '版本': ['tag', 'git', 'branch', 'history'],
  '历史': ['history', 'clock', 'time', 'rewind'],
  '同步': ['refresh', 'cloud', 'rotate', 'sync'],
  '备份': ['database', 'save', 'archive', 'cloud'],
  '监控': ['activity', 'gauge', 'chart', 'eye'],
  '日志': ['file-text', 'list', 'terminal', 'scroll'],
  '分析': ['chart', 'bar-chart', 'trending', 'analytics'],
  '报告': ['file-text', 'clipboard', 'chart', 'book'],
  '测试': ['flask', 'check', 'bug', 'beaker'],
  '部署': ['rocket', 'cloud', 'upload', 'server'],
  '性能': ['gauge', 'zap', 'activity', 'speed'],
  '终端': ['terminal', 'console', 'command', 'code'],
  '接口': ['plug', 'link', 'api', 'cable'],
  '组件': ['box', 'package', 'layers', 'puzzle'],
  '图层': ['layers', 'stack', 'copy', 'square'],
  '游戏': ['gamepad', 'joystick', 'play', 'toy'],
  '奖杯': ['trophy', 'award', 'medal', 'win'],
  '奖牌': ['medal', 'award', 'badge', 'star'],
  '目标': ['target', 'bullseye', 'crosshair', 'flag'],
  '任务': ['check', 'list', 'clipboard', 'todo'],
  '清单': ['list', 'check', 'clipboard', 'menu'],
  '问题': ['help', 'question', 'circle-help', 'issue'],
  '想法': ['lightbulb', 'idea', 'brain', 'sparkle'],
  '灵感': ['lightbulb', 'sparkle', 'zap', 'star'],
  '知识': ['book', 'brain', 'graduation', 'library'],
  '书': ['book', 'library', 'read', 'text'],
  '阅读': ['book-open', 'read', 'eye', 'text'],
  '写作': ['pen-tool', 'edit', 'pencil', 'write'],
  '学习': ['graduation', 'book', 'school', 'brain'],
  '工作': ['briefcase', 'work', 'office', 'business'],
  '会议': ['users', 'presentation', 'calendar', 'mic'],
  '时间': ['clock', 'time', 'hourglass', 'watch'],
  '日期': ['calendar', 'date', 'day', 'schedule'],
  '快进键': ['fast-forward'],
  '生产力': ['zap', 'rocket', 'check', 'trending'],
  '人工智能': ['brain', 'bot', 'sparkle', 'cpu'],
  '机器人': ['bot', 'robot', 'android', 'message'],
  '闪电般': ['zap', 'bolt', 'flash', 'fast'],
  '趋势': ['trending', 'trending-up', 'chart', 'growth'],
  '上升': ['trending-up', 'arrow-up', 'growth', 'chart'],
  '下降': ['trending-down', 'arrow-down', 'decline', 'chart'],
};

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

function filterNames(names, tags, query, tagFilter) {
  const q = query.trim().toLowerCase();
  if (!q) return names;
  if (isCJK(q)) {
    const kws = expandQuery(q);
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

async function search(query, { lib: libId, limit = 20, json: asJson } = {}) {
  const libsToSearch = libId ? [libId] : Object.keys(LIBS);
  const results = [];

  for (const id of libsToSearch) {
    try {
      const data = await loadLib(id);
      const names = data.sets
        ? [...new Set([...(data.sets.line || []), ...(data.sets.fill || []), ...(data.sets.solid || []), ...(data.sets.regular || []), ...(data.sets.brands || [])])].sort()
        : data.names;
      const matched = filterNames(names, data.tags || {}, query, null);
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
