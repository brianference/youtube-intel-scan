# YouTube Intel Scan - PM Insights Analyzer

## Overview

YouTube Intel Scan is a full-stack web application that extracts actionable product management insights from YouTube video transcripts using AI. The application fetches videos from YouTube channels, downloads transcripts, and uses Claude AI to analyze them for product management frameworks, strategies, and best practices.

## Purpose & Goals

- **Primary Goal:** Extract and organize product management insights from YouTube content
- **Target Users:** Product managers, aspiring PMs, product teams
- **Value Proposition:** Learn PM frameworks and best practices from industry leaders at scale

## Current State

**Status:** MVP Complete - Ready for testing
**Last Updated:** October 25, 2025

### Implemented Features

1. **Channel Management**
   - Add YouTube channels by URL (supports @username, /channel/, /c/ formats)
   - Automatic channel metadata fetching (name, subscribers, video count)
   - Scan channels for new videos
   - Track last scan timestamp

2. **Video Processing**
   - Automatic video discovery from channels
   - Transcript downloading using youtube-transcript-api (no API key required)
   - Multi-language transcript support
   - Track processing status (pending, has transcript, analyzed)
   - Actionable video cards on Dashboard and Videos pages
   - Download, analyze, and export directly from video cards

3. **AI-Powered Analysis (Elite Framework)**
   - Extract PM insights using Claude 3.5 Sonnet with elite 5-stage framework
   - Generates 5-10 comprehensive insights per video (vs 3-7 basic)
   - Each insight includes:
     - **Transcript Nugget**: Direct quote from video with timestamp context
     - **Why It Matters**: Business/career impact explanation
     - **Actionable Steps**: 3-5 concrete implementation steps
     - **RICE Score**: Reach, Impact, Confidence, Effort metrics (1-10 each) with calculated total
     - **Tools Needed**: Specific frameworks/tools mentioned (e.g., Claude, Notion, Figma)
     - **Example Prompt**: Copy-paste ready template when applicable
     - **Week Tie-In**: When to apply the insight (Week 1, Week 2-4, etc.)
   - Automatic categorization (Product Strategy, User Research, Metrics & KPIs, AI/Technical Skills, etc.)
   - Priority calculation: Critical (≥400), High (≥200), Medium (≥100), Low (<100)
   - Token usage tracking (8192 tokens per analysis)

4. **Transcript Management**
   - Dedicated Transcripts page to browse all downloaded transcripts
   - Search transcripts by title
   - Export individual transcripts as markdown
   - Statistics dashboard (total, analyzed, ready to analyze)

5. **Insights Management**
   - Browse all extracted insights
   - Search by keyword, video title, or channel
   - Filter by category
   - View source video for each insight

6. **Export Functionality**
   - Export channel insights as formatted markdown (executive summary)
   - Export individual transcripts as markdown (full text)
   - Insights grouped by video and category
   - Direct download as .md files

## Project Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for state management
- shadcn/ui components with Tailwind CSS
- Vite for build tooling

**Backend:**
- Node.js with Express
- TypeScript
- PostgreSQL database with Drizzle ORM (persistent storage)
- Python integration for external services

**External Services:**
- YouTube Data API v3 (channel/video metadata)
- youtube-transcript-api (Python library for transcripts)
- Anthropic Claude API (insight extraction)

### Data Model

```typescript
Channels → Videos → Transcripts → Insights

- Channel: YouTube channel metadata
- Video: Individual video metadata
- Transcript: Full transcript with timestamps
- Insight: Extracted PM insight with category
```

### API Integration Flow

1. User adds channel URL → Express API
2. Express spawns Python script → YouTube Data API
3. Python returns channel + videos → Express saves to storage
4. User triggers transcript download → Python youtube-transcript-api
5. Transcript saved → User triggers analysis
6. Express sends transcript to Claude → Insights extracted and saved

## File Structure

### Backend
- `server/routes.ts` - All Express API endpoints
- `server/db.ts` - Drizzle database client configuration
- `server/storage.ts` - Storage interface and DbStorage implementation
- `server/python/fetch_channel_videos.py` - YouTube Data API integration (channel scanning)
- `server/python/fetch_single_video.py` - YouTube Data API integration (single video)
- `server/python/fetch_transcripts.py` - Transcript downloading
- `server/python/analyze_insights.py` - Claude AI analysis

### Frontend
- `client/src/pages/Dashboard.tsx` - Main overview with actionable video cards and single video input
- `client/src/pages/Channels.tsx` - Channel management
- `client/src/pages/Videos.tsx` - Video processing with single video input (pull/analyze/export)
- `client/src/pages/Transcripts.tsx` - Browse and export transcripts
- `client/src/pages/Insights.tsx` - Browse extracted insights
- `client/src/pages/History.tsx` - Insights browsing and export
- `client/src/components/VideoInput.tsx` - Single video URL input component
- `client/src/components/` - Other reusable UI components

### Shared
- `shared/schema.ts` - TypeScript types and Zod schemas for all data models

## Environment Variables

Required secrets (configured via Replit Secrets):
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude
- `SESSION_SECRET` - Express session secret (auto-generated)

## Development Guidelines

### API Routes

**Channels:**
- `GET /api/channels` - List all channels
- `POST /api/channels` - Add new channel (body: { url })
- `POST /api/channels/:id/scan` - Scan for new videos

**Videos:**
- `GET /api/videos` - List all videos (optional: ?channelId=...)
- `POST /api/videos/:id/transcript` - Download transcript
- `POST /api/videos/:id/analyze` - Extract insights

**Insights:**
- `GET /api/insights` - List all insights (optional: ?videoId=...)

**Export:**
- `POST /api/export/channel/:id` - Download markdown summary

### Error Handling

- Python script errors are caught and returned as JSON
- API validates input using Zod schemas
- Frontend displays user-friendly error messages via toasts
- Loading states prevent multiple concurrent operations

### Testing Strategy

End-to-end flow:
1. Add a PM-focused YouTube channel
2. Verify videos are fetched
3. Download transcript for a video
4. Analyze the transcript
5. View extracted insights
6. Export as markdown

## Recent Changes

### October 25, 2025 (Session 5 - Elite Insights Framework)
- **Upgraded insight extraction from basic to elite 5-stage analysis framework**
  - Expanded database schema with 7 new insight fields: transcriptNugget, whyItMatters, actionableSteps, riceScore, toolsNeeded, examplePrompt, weekTieIn
  - Replaced basic prompt with comprehensive multi-stage analysis in analyze_insights.py
  - Elite framework generates 5-10 structured insights per video vs 3-7 basic one-liners
  - Each insight now includes direct transcript quotes, business impact explanations, 3-5 actionable steps, RICE scores, tool recommendations, and example prompts
  - Increased token limit from 4096 to 8192 for richer analysis
  - Implemented RICE scoring system (Reach × Impact × Confidence / Effort) with automatic priority calculation
- **Redesigned InsightCard component with expandable accordion UI**
  - Collapsed view shows category, priority badge, week tie-in, and insight summary
  - Expanded view displays RICE score grid, transcript nuggets, "why it matters" explanation, numbered actionable steps, tool badges, and copy-to-clipboard prompt templates
  - Color-coded RICE metrics (green/yellow/red) for visual priority indication
  - Backwards compatible with legacy basic insights
- **Updated backend routes to persist all elite fields**
  - Modified POST /api/videos/:id/analyze to map all 7 new fields from Python to database
  - Maintains compatibility with existing analysis flow
- **Validated end-to-end with playwright tests**
  - Confirmed elite insights generate successfully with rich structured content
  - Verified UI properly displays expandable insights with all framework fields
  - Quality dramatically improved from simple one-liners to comprehensive actionable frameworks

### October 25, 2025 (Session 4 - Database Migration)
- **Migrated from in-memory to PostgreSQL database for persistent storage**
  - Created database using Replit's built-in PostgreSQL
  - Set up Drizzle ORM with neon-http driver for serverless compatibility
  - Created `server/db.ts` with database client configuration
  - Implemented DbStorage class to replace MemStorage
  - Ran database migrations with `npm run db:push`
  - Data now persists across server restarts
- **Fixed single video upload schema validation**
  - Removed invalid `url` field from channel creation
  - Properly convert publishedAt to Date object
  - Explicit field mapping for video insertion
- **Fixed per-video button loading state bug**
  - Moved state updates from `mutationFn` to `onMutate` callback
  - Loading states now update synchronously when buttons are clicked
  - Each video's buttons are properly isolated (no cross-contamination)
  - Verified with end-to-end playwright tests

### October 25, 2025 (Session 3)
- Fixed text truncation on video cards - now shows full titles with smaller font (text-sm)
- Fixed button state bug - only the clicked button shows "downloading/analyzing" state
- Added video filtering - excludes YouTube Shorts (only fetches videos 2+ minutes long)
- Implemented ISO 8601 duration parsing in Python script
- Per-video state tracking for download/analyze mutations

### October 25, 2025 (Session 2)
- Made Dashboard video cards fully actionable with download/analyze/export buttons
- Created dedicated Transcripts page for browsing and exporting downloaded transcripts
- Implemented transcript export functionality (download as markdown)
- Added `/api/videos/:id/transcript/export` backend route
- Added export transcript buttons to both Dashboard and Videos pages
- Updated navigation to include Transcripts page between Videos and Insights
- Export buttons appear after transcript download (both in Ready and Completed states)
- Transcripts page includes search, stats, and export functionality

### October 25, 2025 (Session 1)
- Completed full MVP implementation
- Created data schemas for all entities
- Implemented Python integration for YouTube and Claude
- Built all Express API routes with error handling
- Connected frontend to real APIs
- Added Videos page for transcript/analysis management
- Implemented markdown export functionality
- Fixed TypeScript type issues in storage layer
- Fixed icon import issue in Layout component

## Known Issues

- Python LSP warnings (type hints) - non-blocking
- TypeScript minor warnings in storage.ts related to transcript snippets type - non-blocking

## Next Steps

1. Implement batch processing for multiple videos
2. Add user authentication
3. Rate limiting for API calls
4. Improved error recovery and retry logic
5. Video thumbnail display
6. Insight bookmarking/favorites
7. Advanced filtering and search
8. Analytics dashboard

## Dependencies

### Python (via uv)
- youtube-transcript-api v1.2.3
- google-api-python-client v2.185.0
- anthropic v0.71.0

### Node.js
- Express ecosystem (express, express-session, etc.)
- React ecosystem (@tanstack/react-query, wouter, etc.)
- shadcn/ui components
- Tailwind CSS
- TypeScript
- Vite

## Notes

- The application uses PostgreSQL database for persistent storage - data survives server restarts
- Python scripts are executed via Node child_process.spawn
- Claude analysis uses elite framework (8192 tokens per analysis) - significantly more expensive than basic analysis but produces much richer insights
- Elite analysis takes 30-60 seconds vs 10-20 seconds for basic analysis due to comprehensive 5-stage framework
- YouTube API has daily quotas - monitor usage
- Transcript downloading is rate-limited by YouTube (no API key required)
- Architect recommends monitoring Anthropic token usage/latency in production and adding automated regression tests for legacy vs elite insight rendering
