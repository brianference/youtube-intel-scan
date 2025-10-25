# YouTube Intel Scan - Design Guidelines

## Design Approach

**Selected System:** shadcn-ui Foundation with Productivity Enhancement Pattern
**Justification:** Building on the existing shadcn-ui component library, we'll enhance it with data-visualization patterns inspired by Linear's clarity and Notion's content organization, optimized for analytical workflows.

**Core Design Principles:**
1. **Clarity First:** Information hierarchy drives every layout decision
2. **Scan-Optimized:** Users should quickly parse video lists, channel data, and insights
3. **Progressive Disclosure:** Complex data revealed through intentional interaction patterns
4. **Action-Oriented:** Clear CTAs for scanning, analyzing, and managing channels

---

## Typography System

**Font Stack:**
- **Primary:** Inter (via Google Fonts) - body text, UI elements, data labels
- **Monospace:** JetBrains Mono - video IDs, timestamps, URLs, code snippets

**Type Scale:**
- **Hero/Page Titles:** text-4xl (36px) font-bold
- **Section Headers:** text-2xl (24px) font-semibold
- **Card Titles:** text-lg (18px) font-medium
- **Body Text:** text-base (16px) font-normal
- **Metadata/Labels:** text-sm (14px) font-medium
- **Micro Copy:** text-xs (12px) font-normal

**Line Height:** Use default Tailwind line-height values (leading-tight for headings, leading-normal for body)

---

## Layout System

**Spacing Primitives:** We will use Tailwind units of **2, 4, 6, and 12** consistently
- Micro spacing: p-2, gap-2 (8px) - tight component padding
- Standard spacing: p-4, gap-4 (16px) - card padding, button spacing
- Section spacing: p-6, gap-6 (24px) - card sections, form groups  
- Major spacing: p-12, gap-12 (48px) - page sections, large separations

**Container Strategy:**
- **Max Width:** max-w-7xl for main content areas
- **Page Padding:** px-4 md:px-6 lg:px-12
- **Grid Layouts:** grid gap-4 for card grids, gap-6 for major sections

**Responsive Breakpoints:**
- Mobile: base (full-width stacking)
- Tablet: md: (2-column where appropriate)
- Desktop: lg: (3-column maximum for cards, optimal reading width for content)

---

## Component Library

### Navigation
**Sidebar Navigation (Desktop):**
- Fixed left sidebar, w-64
- Navigation items: py-2 px-4, rounded-md
- Active state: font-semibold with subtle background treatment
- Icons: lucide-react, size 20px, mr-3

**Top Bar:**
- h-16, border-b
- Logo/branding left-aligned
- User actions/settings right-aligned
- Mobile: Hamburger menu trigger

### Dashboard Components

**Stats Cards:**
- Grid layout: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Card structure: rounded-lg border p-6
- Stat value: text-3xl font-bold
- Label: text-sm text-muted-foreground
- Icon: Positioned top-right, size 24px

**Video Cards:**
- Horizontal layout on desktop (flex items-start gap-4)
- Thumbnail: w-48 aspect-video, rounded-md
- Content area: flex-1
- Title: text-lg font-semibold, line-clamp-2
- Metadata row: flex items-center gap-4 text-sm
- Status badge: inline-flex items-center px-2 py-1 rounded-full text-xs

**Channel Cards:**
- Vertical card layout: rounded-lg border p-6
- Avatar: w-20 h-20 rounded-full, centered
- Channel name: text-xl font-semibold, text-center, mt-4
- Subscriber count: text-sm, text-center
- Action buttons: w-full mt-6, gap-2

### Forms & Inputs

**Channel URL Input:**
- Large prominent input: h-12 text-lg
- Full-width on mobile, max-w-2xl on desktop
- Accompanying "Scan Channel" button: h-12, px-8
- Helper text below: text-sm, mt-2

**Form Sections:**
- Label: text-sm font-medium mb-2
- Input spacing: space-y-4 for form groups
- Error messages: text-sm text-red-600 mt-1

### Data Display

**Video Lists:**
- Divide-y pattern for separated rows
- Each row: py-4 px-0
- Hover state: subtle background on interaction
- Three-column layout: Thumbnail | Details | Actions
- Actions always right-aligned

**Insight Cards:**
- Quote-style presentation for extracted insights
- border-l-4 border-accent pl-4
- Insight text: text-base leading-relaxed
- Source attribution: text-sm text-muted-foreground mt-2
- Timestamp link: underline on hover

**Empty States:**
- Centered content: min-h-64 flex flex-col items-center justify-center
- Icon: size 48px, mb-4
- Message: text-lg font-medium
- Subtext: text-sm text-muted-foreground, max-w-md text-center
- Primary CTA: mt-6

### Progress & Status

**Loading States:**
- Spinner: lucide-react Loader2 icon with animate-spin
- Progress bars: h-2 rounded-full, shadcn Progress component
- Skeleton loaders for card content: animate-pulse pattern

**Status Indicators:**
- Badge components for video analysis status
- "Analyzed" - checkmark icon
- "Processing" - animated spinner
- "Pending" - clock icon
- Badge size: h-6 px-3, inline-flex items-center gap-1.5

### Overlays

**Modals/Dialogs:**
- shadcn Dialog component
- Max width: max-w-2xl
- Padding: p-6
- Header: pb-4 border-b
- Footer: pt-4 border-t, flex justify-end gap-2

**Toast Notifications:**
- Sonner toast system (already integrated)
- Position: bottom-right
- Success/Error states with appropriate icons

---

## Page-Specific Layouts

### Dashboard
**Structure:**
1. Page header with title and "Add Channel" CTA (mb-6)
2. Stats overview grid (mb-8)
3. Recent activity section with video cards
4. "Quick Actions" sidebar on desktop (lg:grid lg:grid-cols-3 lg:gap-8)

### Channels Page
**Structure:**
1. Search/filter bar (mb-6)
2. Channel grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
3. Each channel card shows: avatar, name, video count, last scanned
4. "Add Channel" empty state when no channels exist

### History Page
**Structure:**
1. Filters row: date range, channel selector (mb-6)
2. Insights timeline with grouped entries
3. Expandable video details on click
4. Infinite scroll or pagination for long lists

---

## Animations

**Use Sparingly - Only for:**
- Page transitions: Simple fade-in (duration-200)
- Loading spinners: animate-spin
- Hover states: transition-colors duration-150
- Toast enter/exit: Built into Sonner
- Modal backdrop: fade in/out

**Avoid:** Scroll animations, parallax, elaborate transitions

---

## Images

**Hero Section:** No traditional hero - Dashboard is the landing page
**Channel Avatars:** Circular thumbnails fetched from YouTube API
**Video Thumbnails:** Standard YouTube thumbnail aspect ratio (16:9), sizes: sm:w-32, md:w-48, lg:w-56
**Empty State Illustrations:** Simple line-art style icons from lucide-react, no custom illustrations needed
**Placeholder Images:** Use lucide-react ImageOff icon or gradient backgrounds when images fail to load

---

## Accessibility Standards

- All interactive elements: min h-10 touch targets
- Form inputs: aria-labels on all fields
- Focus indicators: ring-2 ring-offset-2 (shadcn default)
- Status messages announced with aria-live regions
- Keyboard navigation: Tab order matches visual hierarchy
- Video cards: keyboard accessible with Enter to expand

---

## Key Design Differentiators

1. **Insight-First Display:** Unlike generic video managers, insights are visually prominent with quote-style formatting
2. **Scan Progress Transparency:** Real-time feedback during channel analysis with step-by-step status
3. **Data Density Control:** Toggle between compact and comfortable view modes
4. **Contextual Actions:** Actions appear near relevant content (analyze button on video cards, not buried in menus)

This design creates a professional, efficient analysis tool that prioritizes speed and clarity over visual flair, perfectly suited for productivity-focused users extracting PM insights from YouTube content.