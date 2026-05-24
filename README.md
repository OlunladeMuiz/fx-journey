# FX Journey

FX Journey is a React 19 + Vite learning app for forex traders who want a structured, high-discipline path through candlestick reading, market structure, pattern recognition, journaling, and quiz-based review.

The application combines a 12-week curriculum, trade logging, concept completion tracking, pattern confidence scoring, and an AI-assisted coach experience into a single client-side product.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Application Map](#application-map)
- [Routing](#routing)
- [State and Persistence](#state-and-persistence)
- [AI Features](#ai-features)
- [Project Structure](#project-structure)
- [Responsive Design and Accessibility](#responsive-design-and-accessibility)
- [Deployment Notes](#deployment-notes)
- [Maintenance Notes](#maintenance-notes)

## Overview

FX Journey is designed as a focused study and execution workspace:

- Learn the curriculum week by week.
- Mark concepts complete and track phase progress.
- Log live trades and journal entries.
- Review patterns with confidence ratings.
- Ask the built-in coach for guidance.
- Take quizzes that reinforce the current week.

The app is intentionally client-side and requires no backend for the core experience. Progress, journals, quiz scores, and pattern confidence are stored locally and migrated from older keys when needed.

## Key Features

### Curriculum-driven learning

- 12 weeks of FX content split across two phases:
  - Foundation
  - Pro Patterns
- Each week includes:
  - Mission statement
  - Concept list
  - Live task
  - Progress tracking
  - Trade logging
  - Optional quiz access

### Dashboard and navigation

- Route-based app shell with browser history support.
- Dashboard shows the current phase, streak, progress, and continue-week CTA.
- Bottom navigation provides quick access to the main areas of the app.
- Week detail view supports previous/next navigation and left/right arrow key shortcuts.

### Trade journaling

- Structured trade log with fields for:
  - Week
  - Pair
  - Result
  - Setup
  - Entry
  - Stop loss
  - Take profit
  - Screenshot URL
  - Notes
- Journal page includes:
  - Summary metrics
  - URL-driven filters
  - Search across notes, setup, pair, result, and week label
  - Entry history sorted newest first

### Pattern library

- Confidence scoring for every concept in the curriculum.
- Searchable pattern library grouped by week.
- Useful for backlog review and skill-gap discovery.

### AI-assisted study tools

- AI quiz generation for the active week.
- AI quiz motivation after completion.
- AI coach drawer for contextual trading guidance.
- Local fallback responses are used if AI requests fail.

### Responsive UI

- Mobile-first and tablet-friendly layouts.
- Sticky desktop rail for journal workflows.
- Collapsing week cards, filtered search panels, and adaptive overlays.
- Safe-area-aware spacing for devices with home indicators.

## Tech Stack

- React 19
- Vite 7
- Plain CSS for styling
- Browser History API for routing
- Local storage or `window.storage` for persistence

## Getting Started

### Prerequisites

- Node.js installed locally
- npm installed locally

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL shown by Vite, typically:

```bash
http://localhost:5173
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Builds the app for production into `dist/`. |
| `npm run preview` | Serves the production build locally for validation. |

## Application Map

The app is organized as a route-driven single-page application.

### Main routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard with progress, streak, and continue-week CTA. |
| `/phases` | Phase overview screen. |
| `/phases/:phaseId` | Phase detail view with week cards and phase search. |
| `/weeks/:weekId` | Week detail view with concepts, trade logging, and navigation. |
| `/journal` | Full-page journal with filters and entry history. |
| `/patterns` | Pattern library and confidence rating view. |

### Query params used by the journal page

| Query | Purpose |
| --- | --- |
| `week` | Filter by week. |
| `pair` | Filter by trading pair. |
| `outcome` | Filter by trade outcome. |
| `q` | Search text across journal content. |

## Routing

Routing is handled locally with the History API and a small route helper layer.

- `resolveRoute()` maps the current `pathname` and `search` string into app state.
- `createPath()` and `withQuery()` build internal links without page reloads.
- `navigateHistory()` updates the browser history and emits a `popstate` event.

This means the app behaves like a traditional multi-page product while still being a single-page React app.

## State and Persistence

FX Journey stores user state locally so progress survives reloads.

### Persistent data

- Concept completion state
- Trade journal entries
- Quiz scores
- Pattern confidence ratings
- Streak state

### Storage behavior

- The app first tries `window.storage` when available.
- If that is not available, it falls back to `localStorage`.
- If browser storage is unavailable, it falls back to in-memory storage for the session.

### Storage key prefixes

| Prefix | Purpose |
| --- | --- |
| `progress:` | Completion flags for week concepts. |
| `journal:entry:` | Trade and journal entries. |
| `pattern:confidence:` | Confidence ratings for pattern library items. |
| `quiz:score:` | Quiz completion scores by week. |
| `streak:data` | Streak tracking data. |

### Legacy migration

The app includes migration logic for older storage keys such as:

- `fx-progress`
- `fx-journal`
- `fx-trades`
- `fx-quiz-scores`
- `fx-streaks`

This helps older user data survive app updates.

## AI Features

The AI layer lives in `src/lib/ai.js` and powers:

- Week quiz generation
- Quiz motivation messages
- Coach responses

### Important behavior

- The UI always has a local fallback.
- If an AI request fails, the app still works and uses local quiz or coach content.
- The coach context is derived from the current phase, current week, and recently completed concepts.

### Notes for production hardening

The current implementation calls the AI endpoint from the client. If you plan to harden this for production use, you will likely want to route those requests through a trusted proxy or serverless layer so you can manage authentication and security properly.

## Project Structure

```text
src/
  App.jsx                 # Main app state, routing, persistence, and event handlers
  main.jsx                # React entry point
  components/
    Chrome.jsx            # Splash screen, ticker, search bar, footer
    Header.jsx            # Dashboard hero and summary metrics
    Overlays.jsx          # Coach drawer, quiz modal, journal drawer
    Routes.jsx            # Route-level views and shared route UI
    Sections.jsx          # Dashboard sections and learning strips
    WeekCard.jsx          # Week detail cards and trade log UI
  data/
    curriculum.js         # 12-week curriculum, phases, patterns, and storage keys
  hooks/
    useStorage.js         # Storage abstraction and fallback behavior
    useStreak.js          # Streak state and updates
  lib/
    ai.js                 # AI helpers and local fallbacks
    date.js               # Date formatting helpers
    progress.js           # Progress calculations and completion helpers
    router.js             # Client-side route parsing and URL helpers
    trades.js             # Trade metric calculations and formatting
    ui.js                 # Shared UI helpers
  styles/
    app.css               # Global styling and responsive layout rules
dist/                    # Production build output from Vite
```

## Responsive Design and Accessibility

The interface is built to hold up across desktop, tablet, and phone widths.

### Responsive behavior

- Dashboard, phase, and week layouts collapse to single-column patterns on smaller screens.
- Journal and pattern pages use adaptive grids and stack cleanly on narrow viewports.
- Bottom navigation and coach controls account for safe areas and fixed-position overlap.
- Week cards and trade rows collapse so controls remain tappable on mobile.

### Accessibility considerations

- Semantic landmarks are used throughout the app.
- Dialogs and drawers use ARIA labels and modal semantics.
- Interactive elements maintain clear focus states.
- Keyboard arrow navigation is available on the week detail route.
- Search and filtering updates are reflected in accessible text summaries.

## Deployment Notes

FX Journey is a static SPA, so deployment is straightforward, but you should ensure your host supports client-side routing.

### Important

If you deploy to a static host, configure a rewrite so all non-asset routes serve `index.html`.

Examples:

- Vercel: use SPA rewrites or framework defaults that map to `index.html`.
- Netlify: add a redirect rule for `/*` to `/index.html`.
- GitHub Pages: use a SPA fallback strategy or hash-based routing if needed.

### Build output

The production build is generated in `dist/`.

## Maintenance Notes

- Keep curriculum content centralized in `src/data/curriculum.js`.
- Keep route logic in `src/components/Routes.jsx` and `src/lib/router.js`.
- Keep persistence logic in the storage hook and `src/App.jsx`.
- Avoid editing generated files in `dist/` by hand.
- Prefer running `npm run build` before publishing changes.

## Contributing

If you extend the app, the safest approach is:

1. Update curriculum data first.
2. Adjust route logic if the navigation model changes.
3. Update storage keys carefully if you rename persisted data.
4. Rebuild and verify responsive behavior at desktop and mobile widths.

## License

No explicit license file is included in the repository at the moment.
