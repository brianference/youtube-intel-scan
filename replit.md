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

3. **AI-Powered Analysis**
   - Extract PM insights using Claude 3.5 Sonnet
   - Automatic categorization (Product Strategy, User Research, Metrics & KPIs, etc.)
   - Context preservation for each insight
   - Token usage tracking

4. **Insights Management**
   - Browse all extracted insights
   - Search by keyword, video title, or channel
   - Filter by category
   - View source video for each insight

5. **Export Functionality**
   - Export channel insights as formatted markdown
   - Executive summary with statistics
   - Insights grouped by video and category
   - Direct download as .md file

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
- In-memory storage (MemStorage)
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
- `server/storage.ts` - Storage interface and MemStorage implementation
- `server/python/fetch_channel_videos.py` - YouTube Data API integration
- `server/python/fetch_transcripts.py` - Transcript downloading
- `server/python/analyze_insights.py` - Claude AI analysis

### Frontend
- `client/src/pages/Dashboard.tsx` - Main overview and channel input
- `client/src/pages/Channels.tsx` - Channel management
- `client/src/pages/Videos.tsx` - Video processing (transcripts & analysis)
- `client/src/pages/History.tsx` - Insights browsing and export
- `client/src/components/` - Reusable UI components

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

### October 25, 2025
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
- TypeScript minor warnings in History.tsx - non-blocking
- No persistent database yet (using in-memory storage)

## Next Steps

1. End-to-end testing with real YouTube channel
2. Add persistent database (PostgreSQL/Drizzle)
3. Implement batch processing for multiple videos
4. Add user authentication
5. Rate limiting for API calls
6. Improved error recovery and retry logic
7. Video thumbnail display
8. Insight bookmarking/favorites
9. Advanced filtering and search
10. Analytics dashboard

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

- The application uses in-memory storage for MVP - data resets on server restart
- Python scripts are executed via Node child_process.spawn
- Claude analysis can be expensive - track token usage
- YouTube API has daily quotas - monitor usage
- Transcript downloading is rate-limited by YouTube (no API key required)
