# 57Facets Digital Platform - Frontend UI/UX Guide

## Tech Stack

| Layer         | Technology                                      |
|---------------|------------------------------------------------|
| Framework     | React 18 + TypeScript                           |
| Build Tool    | Vite 6                                          |
| Styling       | Tailwind CSS 4 + CSS Variables                  |
| UI Components | Radix UI Primitives + Custom `src/app/components/ui/` |
| Animations    | Framer Motion + CSS Keyframes (`animations.css`) |
| Icons         | Lucide React + MUI Icons                        |
| 3D            | Three.js + React Three Fiber                    |
| Routing       | React Router v7                                 |

---

## Project Structure

```
src/
├── app/
│   ├── App.tsx                    # Root component - all pages/sections here
│   └── components/
│       ├── ui/                    # Reusable UI primitives (Button, Dialog, Card, etc.)
│       ├── figma/                 # Figma-specific helpers
│       ├── Navbar.tsx             # Navigation bar
│       ├── HeroSection.tsx        # Hero section
│       ├── AboutSection.tsx       # About section
│       ├── StoneCategories.tsx    # Stone categories
│       ├── ManagementSection.tsx  # Management section
│       ├── WhyPartnerSection.tsx  # Why partner section
│       ├── ContactSection.tsx     # Contact form
│       ├── Footer.tsx             # Footer
│       └── LoadingScreen.tsx      # Loading screen
├── assets/
│   ├── Images/                    # All images (.jpg, .png, .avif)
│   ├── Videos/                    # All videos (.mp4)
│   └── 3D assets/                 # 3D model files
├── styles/
│   ├── theme.css                  # Design tokens & CSS variables
│   ├── animations.css             # All keyframe animations & utilities
│   ├── fonts.css                  # Font imports
│   ├── index.css                  # Global entry styles
│   └── tailwind.css               # Tailwind directives
└── main.tsx                       # App entry point
```

---

## Rules - Follow Every Time You Create a New UI Page/Component

### 1. File & Folder Rules

- Create new **page sections** in `src/app/components/` (e.g., `RetailerLogin.tsx`)
- Create new **reusable UI primitives** in `src/app/components/ui/`
- Keep each component in its own file - one component per file
- Use **PascalCase** for component file names (e.g., `StoneCategories.tsx`)
- Export components as **named exports**: `export function MyComponent() {}`

### 2. Design Tokens - Use CSS Variables

Always use the 57Facets brand tokens defined in `src/styles/theme.css`:

| Token                  | Value     | Usage                    |
|------------------------|-----------|--------------------------|
| `--sf-bg-base`         | `#080A0D` | Page background          |
| `--sf-bg-surface-1`    | `#0D1118` | Card / section background|
| `--sf-bg-surface-2`    | `#131A25` | Elevated surface         |
| `--sf-bg-surface-3`    | `#1A2235` | Highest surface          |
| `--sf-blue-primary`    | `#2660A0` | Primary actions / CTA    |
| `--sf-blue-secondary`  | `#3880BE` | Secondary actions        |
| `--sf-teal`            | `#30B8BF` | Accent / highlight       |
| `--sf-text-primary`    | `#FFFFFF` | Main text                |
| `--sf-text-secondary`  | `#A8B0BF` | Subtext / descriptions   |
| `--sf-text-muted`      | `#8A929F` | Muted / hint text        |
| `--sf-divider`         | `#1C2535` | Borders / dividers       |

**Never hardcode colors.** Use these tokens or Tailwind's mapped values.

### 3. Typography

- **Headings** (h1-h6): `'Melodrama', 'Georgia', serif`
- **Body text**: `'General Sans', 'Inter', sans-serif`
- Base font size: `16px`
- Use Tailwind text utilities (`text-sm`, `text-lg`, `text-2xl`, etc.)

### 4. Styling Rules

- Use **Tailwind CSS utility classes** as the primary styling method
- Use `@` alias for imports: `import { Button } from '@/app/components/ui/button'`
- Use existing **Radix UI + ui/** components before creating new ones
- Dark theme is default - the entire app uses a dark palette
- Mobile-first: always design for mobile, then scale up
- Use `flexbox` and `grid` for layout - avoid `position: absolute` unless necessary

### 5. Animation Rules

- Use **Framer Motion** for component-level animations (mount, hover, scroll)
- Use **CSS keyframes** from `animations.css` for global/reusable effects
- Available CSS animation utilities:
  - `.animate-reveal-up` - Scroll reveal upward
  - `.gradient-text` - Gradient text effect (white to teal)
  - `.card-shimmer-wrap` - Hover shimmer + lift on cards
- Keep animations subtle and performant (60fps)
- Respect `prefers-reduced-motion`

### 6. Responsive Breakpoints

| Breakpoint | Width     | Target        |
|------------|-----------|---------------|
| Default    | 0px+      | Mobile        |
| `sm`       | 640px+    | Large mobile  |
| `md`       | 768px+    | Tablet        |
| `lg`       | 1024px+   | Desktop       |
| `xl`       | 1280px+   | Large desktop |

### 7. Component Pattern

Every new component should follow this structure:

```tsx
import { motion } from "framer-motion";

export function SectionName() {
  return (
    <section
      style={{ backgroundColor: "var(--sf-bg-base)" }}
      className="relative px-6 py-20 md:px-16 lg:px-24"
    >
      {/* Section content */}
    </section>
  );
}
```

### 8. Adding a New Page/Section

1. Create the component file in `src/app/components/`
2. Use design tokens from `theme.css` for all colors
3. Use existing `ui/` components (Button, Card, Dialog, etc.)
4. Add Framer Motion scroll animations where appropriate
5. Make it fully responsive (mobile-first)
6. Import and add it to `src/app/App.tsx` in the correct order

### 9. Assets

- Images go in `src/assets/Images/`
- Videos go in `src/assets/Videos/`
- 3D models go in `src/assets/3D assets/` or `public/models/`
- Use descriptive file names (e.g., `diamond-ring-closeup.jpg`)

### 10. Do NOT

- Do not hardcode colors - use CSS variables
- Do not use inline `<style>` tags - use Tailwind or CSS files
- Do not install new UI libraries without checking if `ui/` already has the component
- Do not skip mobile responsiveness
- Do not add heavy animations that affect performance
- Do not put business logic inside UI components - keep them presentational

---

## Available UI Components (`src/app/components/ui/`)

Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, InputOTP, Input, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner (Toast), Switch, Table, Tabs, Textarea, ToggleGroup, Toggle, Tooltip

---

## Quick Start

```bash
npm install
npm run dev
```
