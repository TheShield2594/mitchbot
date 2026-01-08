# Mitchbot Dashboard Modernization Plan

## Executive Summary

This plan outlines the complete modernization of the Mitchbot dashboard from vanilla JavaScript/CSS to a modern stack using **React + TypeScript + Vite + Tailwind CSS**.

**Current State:**
- Vanilla JavaScript (no framework)
- Custom CSS (2,357 lines)
- No build system
- No type safety
- Manual DOM manipulation

**Target State:**
- React 19 with TypeScript
- Vite for blazing-fast builds
- Tailwind CSS for utility-first styling
- Shadcn/ui component library
- TanStack Query for data fetching
- React Router for navigation
- Modern developer experience

---

## Tech Stack Decision

### Frontend Framework: **React 19**
**Why React?**
- You're already familiar with it (your other project uses Vite)
- Largest ecosystem and community
- Excellent TypeScript support
- Best-in-class devtools
- Most job-relevant skill

**Alternatives considered:**
- Vue 3: Easier learning curve but smaller ecosystem
- Svelte: Smallest bundle but less mature ecosystem

### Build Tool: **Vite**
- ✅ You already use it
- 10-100x faster than Webpack
- Hot Module Replacement (HMR) in <50ms
- Native ESM support
- Optimized production builds

### Styling: **Tailwind CSS**
- ✅ You already use it
- Utility-first approach (faster development)
- Tiny production bundle with purge
- Excellent mobile-first responsive design
- Great documentation

### Component Library: **Shadcn/ui**
**Why Shadcn?**
- Copy/paste components (you own the code)
- Built on Radix UI (accessibility-first)
- Styled with Tailwind
- TypeScript native
- Highly customizable
- Modern, beautiful design

**Alternatives considered:**
- Material-UI: Heavy bundle, opinionated
- Chakra UI: Good but less modern
- DaisyUI: Tailwind plugin but less flexible

### State Management: **TanStack Query + Zustand**
- **TanStack Query (React Query)**: Server state (API data)
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Perfect for dashboard data

- **Zustand**: Client state (UI state)
  - Minimal boilerplate
  - No providers needed
  - DevTools support
  - TypeScript-first

### Routing: **React Router v6**
- Industry standard
- Type-safe routes
- Nested layouts
- Code splitting support

### Form Handling: **React Hook Form + Zod**
- **React Hook Form**: Performant, minimal re-renders
- **Zod**: TypeScript-first schema validation
- Perfect for complex forms (guild settings)

### Data Visualization: **Recharts**
**Why Recharts?**
- Built for React (not a wrapper)
- Composable charts
- Responsive by default
- Replaces Chart.js (currently used)

### HTTP Client: **Axios**
- Better error handling than fetch
- Request/response interceptors
- Automatic JSON parsing
- Works great with TanStack Query

---

## Project Structure

```
web-dashboard/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
│
├── src/
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Root component with router
│   ├── vite-env.d.ts              # Vite types
│   │
│   ├── components/                 # Shared components
│   │   ├── ui/                     # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── PageLayout.tsx
│   │   │
│   │   ├── features/               # Feature-specific components
│   │   │   ├── ServerCard.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── ...
│   │   │
│   │   └── charts/                 # Chart components
│   │       ├── MemberGrowthChart.tsx
│   │       ├── CommandUsageChart.tsx
│   │       └── ViolationsChart.tsx
│   │
│   ├── pages/                      # Page components
│   │   ├── Home.tsx                # Landing page
│   │   ├── Dashboard.tsx           # Server list
│   │   ├── Guild/                  # Guild management
│   │   │   ├── GuildLayout.tsx     # Guild layout with sidebar
│   │   │   ├── Overview.tsx
│   │   │   ├── Automod.tsx
│   │   │   ├── WordFilter.tsx
│   │   │   ├── InviteFilter.tsx
│   │   │   ├── LinkFilter.tsx
│   │   │   ├── SpamDetection.tsx
│   │   │   ├── AntiRaid.tsx
│   │   │   ├── Logging.tsx
│   │   │   ├── Birthdays.tsx
│   │   │   ├── Economy.tsx
│   │   │   ├── Shop.tsx
│   │   │   ├── XPLevels.tsx
│   │   │   ├── ReactionRoles.tsx
│   │   │   └── Welcome.tsx
│   │   │
│   │   ├── Analytics.tsx           # Analytics page
│   │   └── NotFound.tsx
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts              # Authentication state
│   │   ├── useGuild.ts             # Guild data fetching
│   │   ├── useGuildConfig.ts       # Guild config with mutations
│   │   ├── useTheme.ts             # Dark mode toggle
│   │   ├── useDebounce.ts          # Debounce input
│   │   └── useToast.ts             # Toast notifications
│   │
│   ├── lib/                        # Utilities and configs
│   │   ├── api.ts                  # Axios instance + interceptors
│   │   ├── queryClient.ts          # TanStack Query config
│   │   ├── utils.ts                # Helper functions (cn, etc.)
│   │   └── constants.ts            # App constants
│   │
│   ├── services/                   # API service layer
│   │   ├── auth.service.ts
│   │   ├── guild.service.ts
│   │   ├── automod.service.ts
│   │   ├── economy.service.ts
│   │   ├── xp.service.ts
│   │   ├── analytics.service.ts
│   │   └── ...
│   │
│   ├── store/                      # Zustand stores (client state)
│   │   ├── authStore.ts            # User authentication state
│   │   ├── uiStore.ts              # UI state (sidebar open, etc.)
│   │   └── guildStore.ts           # Selected guild
│   │
│   ├── types/                      # TypeScript types
│   │   ├── api.types.ts            # API response types
│   │   ├── guild.types.ts          # Guild-related types
│   │   ├── user.types.ts           # User types
│   │   └── index.ts                # Type exports
│   │
│   └── styles/
│       ├── globals.css             # Global styles + Tailwind imports
│       └── animations.css          # Custom animations
│
├── public/                         # Static assets
│   ├── logo.svg
│   └── favicon.ico
│
└── server/                         # Keep existing Express server
    └── (existing web/ folder contents)
```

---

## Implementation Phases

### Phase 0: Project Setup (Day 1)
**Goal:** Set up new React project alongside existing dashboard

**Tasks:**
1. Create new `web-dashboard/` directory
2. Initialize Vite + React + TypeScript project
3. Install dependencies:
   ```bash
   npm create vite@latest web-dashboard -- --template react-ts
   cd web-dashboard
   npm install
   npm install -D @tailwindcss/postcss tailwindcss postcss autoprefixer
   npm install @tanstack/react-query @tanstack/react-router
   npm install zustand axios react-hook-form zod @hookform/resolvers
   npm install recharts lucide-react
   npm install clsx tailwind-merge
   ```
4. Configure Tailwind CSS
5. Set up Shadcn/ui
6. Configure Vite to proxy API requests to Express backend
7. Set up ESLint + Prettier

**Deliverable:** Empty React app with routing structure

---

### Phase 1: Core Infrastructure (Day 2-3)
**Goal:** Authentication, API layer, and layout

**Tasks:**
1. **API Layer**
   - Create Axios instance with interceptors
   - Set up TanStack Query client
   - Create base API service

2. **Authentication**
   - Implement auth store (Zustand)
   - Create auth hooks (useAuth)
   - Handle Discord OAuth flow
   - Protected route wrapper

3. **Layout Components**
   - Navbar with user menu
   - Sidebar navigation
   - Footer
   - Page layout wrapper
   - Theme toggle (dark/light)

4. **Routing**
   - Set up React Router
   - Define all routes
   - Protected route handling
   - 404 page

**Deliverable:** Functional auth + navigation skeleton

---

### Phase 2: Landing Page (Day 4)
**Goal:** Recreate modern landing page

**Tasks:**
1. Hero section with gradient background
2. Features grid with cards
3. Stats display
4. CTA section
5. Footer
6. Mobile responsive design
7. Animations (fade-in on scroll)

**Deliverable:** Production-ready landing page

---

### Phase 3: Dashboard Page (Day 5)
**Goal:** Server list and stats

**Tasks:**
1. **Server List**
   - Fetch user's guilds
   - Display server cards with icons
   - Search/filter functionality
   - "Manageable" vs "All servers" tabs

2. **Stats Cards**
   - Total servers
   - Active configurations
   - Protected servers
   - Manageable servers

3. **Refresh functionality**

**Deliverable:** Functional dashboard with server selection

---

### Phase 4: Guild Layout (Day 6)
**Goal:** Guild page structure and navigation

**Tasks:**
1. Guild sidebar with sections:
   - Overview
   - Moderation (Automod, filters, spam, anti-raid)
   - Logging
   - Features (birthdays, economy, XP, reaction roles, welcome)

2. Guild header with server info
3. Save indicator
4. Mobile-responsive sidebar (drawer)

**Deliverable:** Guild layout ready for content

---

### Phase 5: Automod Features (Day 7-9)
**Goal:** All automod configuration pages

**Tasks:**
1. **Automod Overview**
   - Enable/disable toggle
   - Feature cards with status badges

2. **Word Filter**
   - Enable toggle
   - Add/remove words (tags)
   - Action dropdown
   - Warning threshold

3. **Invite Filter**
   - Enable toggle
   - Action configuration
   - Allow own server checkbox

4. **Link Filter**
   - Enable toggle
   - Whitelist/blacklist domains (tags)
   - Action configuration

5. **Spam Detection**
   - Message threshold
   - Time window
   - Duplicate detection
   - Action configuration

6. **Mention Spam**
   - Mention threshold
   - Action configuration

7. **Caps Spam**
   - Caps percentage
   - Minimum length
   - Action configuration

8. **Attachment Spam**
   - Attachment threshold
   - Time window
   - Action configuration

9. **Emoji Spam**
   - Emoji threshold
   - Action configuration

10. **Anti-Raid**
    - Account age filter
    - Join spam detection
    - Verification system
    - Channel/role selects

11. **Automod Whitelist**
    - Whitelisted roles
    - Whitelisted channels

**Deliverable:** Complete automod management

---

### Phase 6: Logging Features (Day 10)
**Goal:** Logging configuration and log viewer

**Tasks:**
1. Log channel selector
2. Recent logs display (table/list)
3. Log filtering
4. Save functionality

**Deliverable:** Functional logging system

---

### Phase 7: Fun Features (Day 11-13)
**Goal:** Birthdays, Economy, Shop, XP, Reaction Roles, Welcome

**Tasks:**
1. **Birthdays**
   - Enable/disable
   - Channel selector
   - Birthday role selector
   - Custom message textarea
   - Add birthday form (user ID + date)
   - Birthday list table
   - Remove birthday

2. **Economy**
   - Enable/disable toggle
   - Currency name/symbol
   - Daily reward settings
   - Work command settings
   - Beg/Crime/Rob settings
   - Starting balance
   - Save button

3. **Shop**
   - Shop items list (cards)
   - Add item modal
   - Edit item modal
   - Delete item confirmation
   - Item types (item/role)
   - Stock management

4. **XP & Levels**
   - Enable/disable
   - XP min/max per message
   - XP cooldown
   - Level-up announcements toggle
   - Level-up channel selector
   - Custom level-up message
   - Level role rewards (add/remove)
   - XP leaderboard table
   - Channel multipliers
   - Role multipliers
   - XP gain/no-XP channels
   - No-XP roles

5. **Reaction Roles**
   - Enable/disable
   - Add reaction role message (message ID + channel)
   - Message list with emoji-role mappings
   - Add/remove emoji-role pairs

6. **Welcome Messages**
   - Welcome messages enable/disable
   - Welcome channel selector
   - Welcome message textarea with placeholders
   - Message preview
   - Leave messages enable/disable
   - Leave channel selector
   - Leave message textarea
   - Leave message preview

**Deliverable:** All fun features functional

---

### Phase 8: Analytics (Day 14)
**Goal:** Analytics dashboard with charts

**Tasks:**
1. Time range filter (7/30/90 days)
2. Stats overview cards
3. Member growth line chart (Recharts)
4. Command usage over time (line chart)
5. Top commands (bar chart)
6. AutoMod violations by type (pie chart)
7. Violation trends (line chart)
8. Top active users leaderboard
9. Top violators leaderboard

**Deliverable:** Full analytics dashboard

---

### Phase 9: Polish & Optimization (Day 15-16)
**Goal:** Production-ready dashboard

**Tasks:**
1. **Performance**
   - Code splitting (React.lazy)
   - Image optimization
   - Bundle size analysis
   - Lazy load charts

2. **UX Improvements**
   - Loading states (skeletons)
   - Error boundaries
   - Empty states
   - Success/error toasts
   - Form validation messages
   - Unsaved changes warning

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader testing

4. **Mobile Testing**
   - Test all pages on mobile
   - Fix responsive issues
   - Touch-friendly targets

5. **Cross-browser Testing**
   - Chrome, Firefox, Safari, Edge
   - Fix any browser-specific bugs

**Deliverable:** Production-ready dashboard

---

### Phase 10: Deployment & Migration (Day 17)
**Goal:** Deploy new dashboard and migrate users

**Tasks:**
1. **Build Configuration**
   - Environment variables setup
   - Production build optimization
   - Configure Vite for Express integration

2. **Express Integration**
   - Update Express to serve Vite build
   - Keep existing API routes
   - Update authentication to work with SPA
   - Handle client-side routing (send index.html for all routes)

3. **Deployment**
   - Build production bundle
   - Deploy to Railway/hosting
   - Test in production

4. **Migration Strategy**
   - Option A: Direct cutover (replace old dashboard)
   - Option B: Beta flag (allow users to opt-in)
   - Option C: Gradual rollout (% of users)

**Deliverable:** New dashboard live in production

---

## Migration Strategy: Backend Integration

### Option 1: Replace Express Static Files (Recommended)
**Approach:** Build React app and serve from Express

```javascript
// server.js
const path = require('path');

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, '../web-dashboard/dist')));

// API routes (keep existing)
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));

// Handle React routing - send index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web-dashboard/dist/index.html'));
});
```

**Vite Config:**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

**Development Workflow:**
- Run Express on port 3000
- Run Vite dev server on port 5173
- Vite proxies API requests to Express
- Full hot reload in development

**Production:**
- Build React: `npm run build`
- Express serves built files from `dist/`
- Single-origin deployment (no CORS issues)

### Option 2: Separate Deployment
**Approach:** Deploy React separately (Vercel/Netlify)

**Pros:**
- Separate scaling
- CDN for static files
- Independent deploys

**Cons:**
- CORS configuration required
- More complex auth flow
- Two deployments to manage

**Not recommended** for this project (Discord OAuth easier with same origin).

---

## Key Dependencies

### package.json (New React Project)
```json
{
  "name": "mitchbot-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.12.0",
    "@tanstack/react-query": "^5.90.16",
    "zustand": "^5.0.9",
    "axios": "^1.13.2",
    "react-hook-form": "^7.70.0",
    "zod": "^4.3.5",
    "@hookform/resolvers": "^5.2.2",
    "recharts": "^3.6.0",
    "lucide-react": "^0.562.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "typescript": "~5.9.3",
    "vite": "^7.2.4",
    "@tailwindcss/postcss": "^4.1.18",
    "tailwindcss": "^4.1.18",
    "autoprefixer": "^10.4.23",
    "postcss": "^8.5.6",
    "eslint": "^8.57.0",
    "prettier": "^3.2.5"
  }
}
```

---

## File Naming Conventions

- **Components:** PascalCase (e.g., `ServerCard.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Services:** camelCase with `.service.ts` suffix (e.g., `guild.service.ts`)
- **Types:** PascalCase with `.types.ts` suffix (e.g., `Guild.types.ts`)
- **Utils:** camelCase (e.g., `formatDate.ts`)
- **Constants:** SCREAMING_SNAKE_CASE in `constants.ts`

---

## Code Standards

### TypeScript
- **Strict mode enabled**
- No `any` types (use `unknown` if needed)
- Use interfaces for objects, types for unions
- Export types alongside components

### React
- Functional components only (no classes)
- Use custom hooks for logic reuse
- Keep components small (<200 lines)
- Colocate related files

### Styling
- Tailwind utility classes
- Use `cn()` helper for conditional classes
- Custom CSS only for animations
- Mobile-first responsive design

### State Management
- Server state → TanStack Query
- Client state → Zustand
- Form state → React Hook Form
- URL state → React Router

---

## Questions to Resolve

1. **Framework choice confirmation:** React, Vue, or Svelte?
   - **Recommended:** React (you know it + largest ecosystem)

2. **UI library preference:**
   - Shadcn/ui (recommended - modern, owns code)
   - Material-UI (heavy but feature-rich)
   - Headless UI + custom (more work)
   - DaisyUI (Tailwind plugin)

3. **TypeScript:** Yes or JavaScript?
   - **Recommended:** TypeScript (better DX, catch bugs early)

4. **Migration strategy:**
   - Full cutover (rip off bandaid)
   - Beta flag (let users opt-in)
   - Gradual rollout

5. **Preserve existing dashboard during development?**
   - **Recommended:** Yes (create new folder, keep old working)

---

## Timeline Estimate

**Total: 15-20 days (assuming 6-8 hours/day)**

- Phase 0: Setup (1 day)
- Phase 1: Core (2 days)
- Phase 2: Landing (1 day)
- Phase 3: Dashboard (1 day)
- Phase 4: Guild Layout (1 day)
- Phase 5: Automod (3 days)
- Phase 6: Logging (1 day)
- Phase 7: Features (3 days)
- Phase 8: Analytics (1 day)
- Phase 9: Polish (2 days)
- Phase 10: Deploy (1 day)

**Buffer:** +3-5 days for unexpected issues

**Total: 3-4 weeks full-time** or **6-8 weeks part-time**

---

## Next Steps

Ready to start? Here's what we'll do:

1. **Confirm decisions:**
   - React + TypeScript? ✓
   - Shadcn/ui components? ✓
   - Full cutover migration? ✓

2. **Initialize project:**
   - Create new `web-dashboard/` folder
   - Set up Vite + React + TypeScript
   - Install all dependencies
   - Configure Tailwind + Shadcn

3. **Start Phase 1:**
   - Build API layer
   - Implement authentication
   - Create layout components

Let's build something amazing! 🚀
