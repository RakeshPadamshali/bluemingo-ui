# Bluemingo MES v2 — UI Style Guide & Design Prompt

Use this prompt when building any new page, component, or application that should match the Bluemingo MES visual identity.

---

## Brand Identity

- **Product Name:** Bluemingo MES v2
- **Industry:** Manufacturing Execution System (Steel/Heavy Industry)
- **Audience:** Plant operators, production managers, QA engineers, system admins
- **Tone:** Professional, clean, industrial. Data-dense but readable. Functional over decorative.

---

## Color System

### Primary (Brand)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#25A9E0` | Primary buttons, links, active states, brand accent |
| `--color-primary-dark` | `#1E8FBF` | Hover/active on primary |
| `--color-primary-light` | `#E1F5FE` | Primary background highlights, active filter bg |
| `--color-primary-disabled` | `#87D3F0` | Disabled primary state |
| `--color-primary-rgb` | `37, 169, 224` | For rgba() usage |

### Status Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#388e3c` | Success, active, approved, completed |
| `--color-success-light` | `#e8f5e9` | Success background |
| `--color-warning` | `#f57c00` | Warning, pending, in-progress |
| `--color-warning-light` | `#fff8e1` | Warning background |
| `--color-danger` | `#d32f2f` | Error, failed, rejected, destructive |
| `--color-danger-light` | `#ffebee` | Error background |
| `--color-info` | `#2196f3` | Information, running |
| `--color-info-light` | `#e3f2fd` | Info background |

### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#f5f5f5` | Page background |
| `--color-bg-alt` | `#fafafa` | Alternate background |
| `--color-surface` | `#ffffff` | Cards, modals, panels |
| `--color-border` | `#e0e0e0` | Default borders |
| `--color-border-light` | `#eeeeee` | Light borders |
| `--color-text-primary` | `#333333` | Main text |
| `--color-text-secondary` | `#555555` | Secondary text |
| `--color-text-muted` | `#666666` | Muted labels |
| `--color-text-hint` | `#888888` | Hints, placeholders |
| `--color-text-disabled` | `#999999` | Disabled text |

### Navigation (Dark Theme)
| Token | Hex | Usage |
|-------|-----|-------|
| Header bg | `#1a1a2e` | Top header bar |
| Header bg dark | `#12121f` | Header gradient end |
| Sidebar bg | `linear-gradient(180deg, #1e1e32, #16213e)` | Sidebar background |
| Sidebar text | `rgba(255,255,255,0.65)` | Menu item text |
| Sidebar active | `rgba(37,169,224,0.2)` | Active menu item bg |
| Sidebar active text | `#E1F5FE` | Active menu item text |
| Sidebar hover | `rgba(255,255,255,0.08)` | Menu hover state |

---

## Typography

| Property | Value |
|----------|-------|
| Font family | `'Roboto', sans-serif` |
| Font size xs | `11px` |
| Font size sm | `12px` |
| Font size base | `14px` |
| Font size md | `16px` |
| Font size lg | `18px` |
| Font size xl | `24px` |
| Font size xxl | `28px` |
| Font weight normal | `400` |
| Font weight medium | `500` |
| Font weight semibold | `600` |
| Font weight bold | `700` |

---

## Spacing (4px grid)

| Token | Value |
|-------|-------|
| space-1 | `4px` |
| space-2 | `8px` |
| space-3 | `12px` |
| space-4 | `16px` |
| space-5 | `20px` |
| space-6 | `24px` |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | `4px` | Inputs, buttons, small elements |
| radius-md | `8px` | Cards, panels |
| radius-lg | `12px` | Large cards, modals |
| radius-pill | `16px` | Badges, chips, pills |
| radius-circle | `50%` | Avatars, status dots |

---

## Shadows

| Token | Value |
|-------|-------|
| shadow-sm | `0 2px 4px rgba(0,0,0,0.1)` |
| shadow-md | `0 4px 12px rgba(0,0,0,0.1)` |
| shadow-lg | `0 4px 20px rgba(0,0,0,0.15)` |

---

## Z-Index Layers

| Layer | Value |
|-------|-------|
| Dropdown | `100` |
| Sticky | `500` |
| Modal | `1000` |
| Dropdown menu | `1001` |
| Chatbot | `1050` |
| Toast | `1100` |

---

## Component Patterns

### Buttons
```
.btn — padding: 10px 20px, border-radius: 4px, font: 14px/500
.btn-primary — bg: #25A9E0, color: #fff, hover: #1E8FBF
.btn-secondary — bg: #757575, hover: #616161
.btn-success — bg: #388e3c, hover: #2e7d32
.btn-danger — bg: #d32f2f, hover: #c62828
.btn-outline — transparent, border: 1px #25A9E0, hover fills primary
.btn-sm — padding: 4px 10px, font: 12px
Disabled — opacity: 0.6, cursor: not-allowed
```

### Form Inputs
```
Input/Select/Textarea — padding: 8px 12px, border: 1px solid #ddd, radius: 4px, font: 14px
Focus — border: #25A9E0, box-shadow: 0 0 0 3px rgba(37,169,224,0.15)
Error — border: #d32f2f
Error message — color: #d32f2f, font: 12px, margin-top: 4px
Label — font-weight: 500, color: #555, margin-bottom: 6px
```

### Cards
```
.bm-card — bg: #fff, border: 1px #e0e0e0, radius: 12px
.bm-card-header — padding: 12px 16px, bg: #fafafa, border-bottom: 1px #f0f0f0, font: 14px/600
.bm-card-body — padding: 16px
.bm-card-footer — padding: 12px 16px, border-top: 1px #f0f0f0
```

### Tables
```
.bm-table — width: 100%, border-collapse: collapse, font: 12px
th — padding: 10px 12px, bg: #f5f5f5, color: #666, font: 11px/600 uppercase, letter-spacing: 0.3px
td — padding: 10px 12px, border-bottom: 1px #f5f5f5, color: #333
tr:hover — bg: #fafafa
```

### Modals
```
Overlay — bg: rgba(0,0,0,0.5), z-index: 1000
Content — bg: #fff, radius: 12px, width: 500px, shadow-lg
Header — padding: 16px 20px, border-bottom: 1px #eee, font: 16px/600
Body — padding: 20px, overflow-y: auto
Footer — padding: 16px 20px, border-top: 1px #eee, flex end, gap: 12px
Sizes: sm=400px, md=500px, lg=700px
```

### Status Badges
```
Base — padding: 2px 8px, radius: 4px, font: 11px/600 uppercase, letter-spacing: 0.3px
Pattern: background: rgba(color, 0.12), text: solid color

Active/Completed/Approved — #4caf50 on rgba(76,175,80,0.12)
Pending/Warning — #ff9800 on rgba(255,152,0,0.12)
Failed/Rejected — #f44336 on rgba(244,67,54,0.12)
Running/In-Progress — #2196f3 on rgba(33,150,243,0.12)
Inactive/Cancelled — #9e9e9e on rgba(158,158,158,0.12)
Created/New — #673ab7 on rgba(103,58,183,0.12)
```

### Sidebar Navigation
```
Width: 240px (collapsed: 60px)
Background: linear-gradient(180deg, #1e1e32 0%, #16213e 100%)
Item — padding: 10px 20px, margin: 1px 8px, radius: 8px, font: 13.5px
Active — bg: rgba(37,169,224,0.2), color: #E1F5FE, left bar: 3px #25A9E0
Module label — font: 15px/700, uppercase, letter-spacing: 1px, color: #fff
```

### Filter/Search
```
Active filter input — border: #25A9E0, bg: #E1F5FE, shadow: 0 0 0 2px rgba(37,169,224,0.2)
Filter chip — padding: 4px 10px, bg: #25A9E0, color: #fff, radius: 16px, font: 12px
Filter indicator badge — bg: #25A9E0, color: #fff, radius: 16px, font: 11px/500
```

### Alerts
```
Success — bg: #e8f5e9, color: #2e7d32, border: 1px #a5d6a7
Error — bg: #ffebee, color: #c62828, border: 1px #ef9a9a
Warning — bg: #fff8e1, color: #f57f17, border: 1px #ffe082
Info — bg: #e3f2fd, color: #1E8FBF, border: 1px #90caf9
Padding: 12px 16px, radius: 4px
```

---

## Layout Structure

```
+------------------------------------------------------+
| HEADER (bg: #1a1a2e, height: 52px)                   |
|  [Logo] [Module Name]              [Search] [Profile] |
+------+-----------------------------------------------+
| SIDE |  CONTENT AREA (bg: #f5f5f5)                   |
| BAR  |                                                |
| 240px|  +------------------------------------------+ |
| dark |  | Page Header (title + actions)             | |
| navy |  +------------------------------------------+ |
|      |  | Cards / Tables / Forms                    | |
|      |  | (bg: #fff, border: #e0e0e0, radius: 12px)| |
|      |  +------------------------------------------+ |
+------+-----------------------------------------------+
```

---

## Design Rules

1. **Data density:** Tables use 12px font. Headers use 11px uppercase. Compact but readable.
2. **Color usage:** Primary (#25A9E0) for interactive elements only. Never for static text or borders.
3. **Status pattern:** Always use `rgba(color, 0.12)` background + solid color text. Never solid color backgrounds.
4. **Spacing:** 4px grid. Common padding: 8px (tight), 12px (normal), 16px (comfortable), 20px (spacious).
5. **Border radius:** 4px for inputs/buttons, 8px for panels, 12px for cards/modals. Never 0px.
6. **Dark navigation:** Header and sidebar are dark (#1a1a2e). Content area is always light (#f5f5f5).
7. **Hover states:** Buttons darken 10-15%. Table rows get #fafafa. Cards get shadow-md.
8. **Focus states:** 3px primary glow ring: `box-shadow: 0 0 0 3px rgba(37,169,224,0.15)`.
9. **Icons:** Font Awesome 6. Size matches font-size of context. Color matches text unless decorative.
10. **No decorative elements:** No gradients on content areas. No patterns. No illustrations. Clean and functional.

---

## Usage Prompt

When asking AI to build a new page/component matching this design:

> Build a [component/page] for the Bluemingo MES application using these design tokens:
> - Primary brand color: #25A9E0 (cyan), hover: #1E8FBF
> - Font: Roboto, base 14px
> - Background: #f5f5f5, cards: white with 1px #e0e0e0 border, radius 12px
> - Header: dark navy #1a1a2e, sidebar: gradient #1e1e32 to #16213e
> - Status badges: rgba background + solid text (success=#388e3c, warning=#f57c00, danger=#d32f2f, info=#2196f3)
> - Tables: 12px font, #f5f5f5 header bg, uppercase 11px headers
> - Buttons: 10px 20px padding, 4px radius, primary=#25A9E0
> - Spacing: 4px grid (8/12/16/20/24px common values)
> - Shadows: sm=2px 4px, md=4px 12px, lg=4px 20px (all rgba 0,0,0 at 0.1-0.15)
> - Forms: 8px 12px padding, 4px radius, focus glow: 3px rgba(37,169,224,0.15)
> - Angular 17 module-based architecture, hash routing, RxJS patterns
> - Font Awesome 6 for icons
> - Industrial/manufacturing context — data-dense, clean, functional
