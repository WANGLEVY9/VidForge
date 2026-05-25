# VidForge Phase 4: Mobile Adaptation Design

> **Design Doc** — 2026-05-25

**Goal:** Adapt VidForge's existing desktop-oriented UI for mobile devices (<768px) without breaking the current desktop experience, using a responsive shell architecture.

**Architecture:** A single `MobileShell` component wraps the existing page content and switches between desktop sidebar navigation and a mobile bottom tab bar + FAB based on viewport width. Each page adapts its layout (grid→stack, side-by-side→vertical, table→horizontal scroll) through CSS container queries and component-level responsive logic.

**Tech Stack:** React 18, Ant Design v5, CSS Container Queries, CSS Custom Properties, React Context + Zustand for shell state.

---

## 1. Navigation Pattern

**Decision:** A+C hybrid — Bottom Tab Bar (primary navigation) + FAB (quick actions).

```
┌──────────────────┐
│   Content Area   │
│                  │
│           [+]    │  ← FAB floating above tab bar
├──────────────────┤
│ 🏠  📁  📝  ▶  ⚙ │  ← Bottom Tab Bar (glassmorphism)
└──────────────────┘
```

**Rationale:**
- Bottom tabs provide single-tap access to all 5 modules — critical for video creation workflow where users switch frequently between素材库, 剧本, and 创作
- FAB adds "quick creation" without committing to a full tab, borrowing the best of option C
- Tab bar auto-hides on scroll-down to reclaim screen space during content consumption

## 2. Responsive Breakpoint Strategy

| Breakpoint | Layout | Navigation | Target |
|---|---|---|---|
| < 768px | Single column, full width | Bottom Tab Bar + FAB | Mobile phones |
| 768–1024px | Collapsible sidebar | Top bar + sidebar toggle | Tablets |
| > 1024px | Fixed sidebar + content | Full sidebar (existing) | Desktop |

**Implementation:**
- Use `window.matchMedia()` listener in a React context provider (`ShellContext`)
- CSS Container Queries (`@container page (width < 768px)`) for component-level adaptation
- No `resize` event listeners — `matchMedia` is more performant

## 3. Shell Architecture

```
<MobileShell>                    // Responsive wrapper (new)
  ├── <TopBar>                   // Search + notifications + user (new)
  ├── <SwipeableView>            // Touch swipe between pages (new)
  │     ├── DashboardPage        // Existing, responsive
  │     ├── MaterialPage         // Existing, responsive
  │     ├── ScriptPage           // Existing, responsive
  │     ├── CreationPage         // Existing, responsive
  │     └── AbComparePage        // Existing, responsive
  ├── <BottomTabBar>             // Glassmorphism tab bar (new)
  └── <FabButton>                // Floating quick actions (new)
```

## 4. Component Specifications

### 4.1 MobileShell

```typescript
interface MobileShellProps {
  children: ReactNode;
  sidebar: ReactNode;    // desktop sidebar
  tabBar: ReactNode;     // mobile tab bar
  topBar: ReactNode;     // mobile top bar
  fab?: ReactNode;       // optional FAB
}
```

**Behavior:**
- Creates a `ShellContext` providing `{ isMobile, isTablet, isDesktop }` to all descendants
- Renders `sidebar` when width >= 768px, `tabBar` + `topBar` when < 768px
- Wraps children in a `.page-container` div with `container-type: inline-size` for CQ

### 4.2 BottomTabBar

```typescript
interface TabConfig {
  key: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  href: string;
}

interface BottomTabBarProps {
  tabs: TabConfig[];
  activeKey: string;
  onChange: (key: string) => void;
  visible: boolean;       // auto-hide control
}
```

**Tabs:** 工作台 | 素材库 | 剧本 | 创作 | AB 对比

**Interaction:**
- Glassmorphism style: `backdrop-filter: blur(20px)`, `rgba(15,15,19,0.85)` background
- Active indicator: bottom glow line (indigo→purple gradient), icon scales 1.1x
- Auto-hide: `transform: translateY(100%)` on scroll-down, restore on scroll-up or reach top
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`
- Touch target: minimum 44px height per Apple HIG

### 4.3 FabButton

```typescript
interface FabAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface FabButtonProps {
  actions: FabAction[];   // max 4
  hidden?: boolean;
}
```

**Behavior:**
- Position: fixed bottom, `right: 16px`, above tab bar (`bottom: calc(56px + env(safe-area-inset-bottom) + 16px)`)
- Main button: 56×56px, gradient background (indigo→purple), shadow
- On tap: expand action menu with spring animation (`keyframes fabEnter`), actions fan out in a small arc
- Auto-close: tap outside, route change, or tap main button again
- Hidden during full-screen video playback

### 4.4 SwipeableView

```typescript
interface SwipeableViewProps {
  pages: { key: string; content: ReactNode }[];
  activeKey: string;
  onChange: (key: string) => void;
  threshold?: number;     // default 60px
}
```

**Gesture recognition (pure touch events):**
1. `onTouchStart`: record startX, startY
2. `onTouchMove`: calculate deltaX, deltaY. If `|deltaY| > |deltaX|`, ignore (vertical scroll)
3. `onTouchEnd`: if `|deltaX| > threshold`, animate to adjacent page; else spring back
4. GPU-accelerated: `transform: translate3d()`, `will-change: transform`

## 5. Page-Level Adaptations

### 5.1 Dashboard

| Desktop | Mobile |
|---|---|
| 2-column chart grid | Single-column stack, collapsible panels |
| Sidebar statistics | Horizontal scroll stat cards |
| Segmented period selector | Bottom sheet picker |
| Hover tooltips | Tap-to-show tooltips |

### 5.2 Material Library

| Desktop | Mobile |
|---|---|
| 6-column grid | 2-column grid (`xs={12}`) |
| Drag-upload zone | Upload via FAB or button |
| Hover actions | Long-press multiselect, swipe actions |
| Search bar always visible | Collapsible search (icon→expand) |

### 5.3 Script Studio

| Desktop | Mobile |
|---|---|
| Side-by-side config + result | Config panel collapsible, result full-width |
| 2-column style grid | Horizontal scroll style chips |
| All results visible | Accordion sections (shots, voiceover, BGM) |

### 5.4 Video Creation

| Desktop | Mobile |
|---|---|
| Horizontal Steps indicator | Icon-only step dots |
| Grid storyboard | Horizontal carousel with dot indicators |
| Side-by-side progress | Full-width progress, background generation |
| Inline export panel | Bottom-drawer export Modal |

### 5.5 AB Compare

| Desktop | Mobile |
|---|---|
| Side-by-side players | Stacked vertical players |
| Full metric table | Horizontal scroll metric cards |
| Horizontal action buttons | 2-column vertical action grid |

## 6. Responsive CSS Strategy

### 6.1 New Token Additions (tokens.css)

```css
:root {
  /* Safe areas */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);

  /* Shell dimensions */
  --top-bar-height: 48px;
  --tab-bar-height: 56px;
  --tab-bar-height-total: calc(56px + var(--safe-area-bottom));
  --fab-size: 56px;
  --fab-bottom: calc(var(--tab-bar-height) + 16px);

  /* Touch */
  --touch-target-min: 44px;
}
```

### 6.2 New File: responsive.css

Key rules:
- `.page-container` with `container-type: inline-size` for CQ
- `@container page (width < 768px)` — show tab bar, hide sidebar
- `@container page (width >= 768px)` — show sidebar, hide tab bar
- `@media (hover: none) and (pointer: coarse)` — touch device overrides
- `@media (prefers-reduced-motion)` — disabled complex animations

### 6.3 Animation Additions (animations.css)

- `@keyframes tabIndicator` — tab bar active indicator slide-in
- `@keyframes fabEnter` — FAB menu spring animation
- `.page-slide` — SwipeableView transition class

## 7. File Creation Plan

### New Files
1. `apps/frontend/src/components/layout/MobileShell.tsx` — Responsive shell with ShellContext
2. `apps/frontend/src/components/layout/TopBar.tsx` — Mobile top bar
3. `apps/frontend/src/components/layout/BottomTabBar.tsx` — Glassmorphism tab bar
4. `apps/frontend/src/components/layout/FabButton.tsx` — Floating action button
5. `apps/frontend/src/components/layout/SwipeableView.tsx` — Touch swipe wrapper
6. `apps/frontend/src/components/layout/shell-context.ts` — React context for breakpoint state
7. `apps/frontend/src/styles/responsive.css` — Container queries + mobile utilities

### Modified Files
8. `apps/frontend/src/styles/tokens.css` — Add mobile CSS variables
9. `apps/frontend/src/styles/animations.css` — Add mobile keyframes
10. `apps/frontend/src/styles/glassmorphism.css` — Add `.glass-tab-bar`
11. `apps/frontend/src/index.css` — Import responsive.css
12. `apps/frontend/src/components/layout/BasicLayout.tsx` — Integrate MobileShell
13. `apps/frontend/src/pages/dashboard/index.tsx` — Mobile-responsive chart layout
14. `apps/frontend/src/pages/material/index.tsx` — Mobile-responsive grid + search
15. `apps/frontend/src/pages/script/index.tsx` — Collapsible config + accordion results
16. `apps/frontend/src/pages/creation/index.tsx` — Carousel storyboard + bottom drawer export
17. `apps/frontend/src/pages/ab-compare/index.tsx` — Stacked players + scrollable metrics

## 8. Out of Scope

The following items are Phase 4 priorities but are NOT part of this mobile adaptation spec:
- **Performance (P1):** Code splitting, lazy loading, image optimization
- **Resume (P2):** Session persistence, draft auto-save
- **Observability (P3):** Error tracking, performance monitoring
- **Compliance (P4):** Privacy, data retention

These will be addressed in separate specs.
