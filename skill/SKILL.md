---
name: "icon-gallery"
description: "Search, compare, and retrieve icons from 28 major icon libraries. Invoke when the user needs icons, asks to find similar options, or requests SVG/CDN/framework usage for a specific icon."
---

# IconGallery Skill

You have access to a zero-dependency CLI tool for searching and retrieving icons from 28 major libraries.

## How to Use

Use the `ig` command from the repo root (where `skill/ig.js` lives) to interact with the skill.

### 1. List Available Libraries
```bash
cd <repo-root> && node skill/ig.js list
```

### 2. Search for Icons
Supports English (with synonym expansion), Chinese (中文), and pinyin queries.

```bash
# English search (synonym expansion: trash also recalls delete / bin)
cd <repo-root> && node skill/ig.js search "delete"

# Chinese search (dictionary -> pinyin -> online translation fallback)
cd <repo-root> && node skill/ig.js search "删除"
cd <repo-root> && node skill/ig.js search "天气"

# Pinyin search (full / initials)
cd <repo-root> && node skill/ig.js search "feiji"
cd <repo-root> && node skill/ig.js search "fj"
```

**Options:**
- `--lib <library-id>`: Filter to a specific library (e.g., `lucide`, `tabler`, `phosphor`, `antd`, `octicons`)
- `--limit <N>`: Limit results (default: 20)
- `--json`: Output raw JSON

### 3. Random Icons (Inspiration)
```bash
cd <repo-root> && node skill/ig.js random
cd <repo-root> && node skill/ig.js random --lib lucide --limit 8
```

### 4. Similar Icons (cross-library recall)
Finds icons similar to a reference icon (token + synonym matching across all libraries).
```bash
cd <repo-root> && node skill/ig.js similar "trash"
cd <repo-root> && node skill/ig.js similar "user" --lib lucide --limit 10
```

### 5. Get Icon SVG Code
Retrieves the raw SVG source and usage code for a specific icon.

```bash
cd <repo-root> && node skill/ig.js get "trash"
cd <repo-root> && node skill/ig.js get "home" --lib lucide
```

This returns:
- SVG Source (inline code)
- CDN CSS link
- Usage code (HTML / React component / Vue component)

## Trigger Conditions

Invoke this skill when the user:
- Asks to "find an icon" or "search for an icon"
- Needs icons for a UI project
- Requests SVG code or CDN usage for an icon name
- Mentions an icon by name (e.g., "I need a delete icon", "find a home icon")
- Wants to browse or select from multiple icon libraries
- Uses Chinese to describe an icon requirement (e.g., "我需要一个删除图标", "找个保存的图标")

## Libraries Supported

- Lucide, Tabler, Remix, Phosphor, Bootstrap, Material Symbols
- Font Awesome, MDI, Heroicons, Ionicons, Boxicons
- Octicons, Ant Design Icons, Feather, MingCute, Iconoir, Flowbite, Devicons, IconPark
- Hugeicons, Solar Icons, Carbon Icons, Radix Icons, Circle Flags
- Game Icons, Simple Icons, CSS.gg, Weather Icons

## Examples

**User**: "I need an icon for a save button"
**Action**: Run search → `node skill/ig.js search "save"` → Present results → Run `get` for selected icon

**User**: "帮我找个天气图标"
**Action**: Run search → `node skill/ig.js search "天气"` → Present weather-related icons

**User**: "What's the SVG for lucide 'home'?"
**Action**: Run get → `node skill/ig.js get "home" --lib lucide`

**User**: "给我几个和 trash 类似的图标"
**Action**: Run similar → `node skill/ig.js similar "trash"` → Present cross-library alternatives
