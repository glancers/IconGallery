---
name: "icon-gallery"
description: "Search and retrieve icons from 11 major icon libraries. Invoke when user needs icons, asks to find an icon, or requests SVG/CDN usage for a specific icon."
---

# IconGallery Skill

You have access to a CLI tool for searching and retrieving icons from 11 major libraries.

## How to Use

Use the `ig` command from this directory (`/Users/wmgu/CodeProject/Drafts/UI-Demo/icon/`) to interact with the skill.

### 1. List Available Libraries
```bash
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js list
```

### 2. Search for Icons
Supports both English and Chinese (中文) queries.

```bash
# English search
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js search "delete"

# Chinese search with automatic keyword expansion
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js search "删除"
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js search "天气"
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js search "用户"
```

**Options:**
- `--lib <library-id>`: Filter to a specific library (e.g., `lucide`, `tabler`, `phosphor`)
- `--limit <N>`: Limit results (default: 20)
- `--json`: Output raw JSON

### 3. Get Icon SVG Code
Retrieves the raw SVG source and usage code for a specific icon.

```bash
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js get "trash"
```

This returns:
- SVG Source (inline code)
- CDN CSS link
- Usage code (HTML / React component / Web Component)

### 4. Interactive Mode
```bash
cd /Users/wmgu/CodeProject/Drafts/UI-Demo/icon && node skill/ig.js search "save" --limit 5
```
When you see icons you like, you can immediately fetch the SVG using the `get` command.

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

## Examples

**User**: "I need an icon for a save button"
**Action**: Run search → `node skill/ig.js search "save"` → Present results → Run `get` for selected icon

**User**: "帮我找个天气图标"
**Action**: Run search → `node skill/ig.js search "天气"` → Present weather-related icons

**User**: "What's the SVG for lucide 'home'?"
**Action**: Run get → `node skill/ig.js get "home" --lib lucide`
