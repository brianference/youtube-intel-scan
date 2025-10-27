# YouTube Intel Scan - PM Insights Analyzer

## Overview
YouTube Intel Scan is a full-stack web application designed to extract actionable product management insights from YouTube video transcripts using AI. It fetches videos from YouTube channels, downloads their transcripts, and leverages Claude AI to analyze them for product management frameworks, strategies, and best practices. The primary goal is to organize and present these insights to product managers, aspiring PMs, and product teams, enabling them to learn PM frameworks and best practices from industry leaders at scale. The project aims to provide an MVP that is production-ready.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `server/python/`.

## GitHub Deployment

### How to Push to GitHub

This Replit project is connected to GitHub repository: `brianference/youtube-intel-scan`

**Important:** Use the `$GIT_URL` secret (already configured) instead of standard git remotes.

**Quick Commands:**

```bash
# 1. Add your changes
git add .

# 2. Commit with a message
git commit -m "Your commit message here"

# 3. Push to GitHub (uses stored token)
git push $GIT_URL
```

**Why $GIT_URL?**
- Standard `git push origin main` won't work (authentication fails)
- The `GIT_URL` secret contains your GitHub Personal Access Token
- Format: `https://username:token@github.com/brianference/youtube-intel-scan`
- This is the ONLY way to push from Replit to GitHub for this project

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, Wouter for routing, and TanStack Query for state management. It uses shadcn/ui components with Tailwind CSS for styling and Vite for build tooling. The UI emphasizes actionable video cards, dedicated pages for channels, videos, transcripts, and insights, and an expandable accordion UI for displaying detailed insights. AlertDialog confirmations prevent accidental deletions.

### Technical Implementations
The backend uses Node.js with Express and TypeScript, connecting to a PostgreSQL database via Drizzle ORM for persistent storage. Python integration handles external services like YouTube Data API, `youtube-transcript-api` for transcript downloading, and Anthropic Claude API for AI analysis. The application follows a data model where `Channels → Videos → Transcripts → Insights`. Python scripts are executed via Node's `child_process.spawn`.

### Feature Specifications
- **Channel Management:** Add/delete channels by URL, automatic metadata fetching, scan for new videos, track last scan.
- **Video Processing:** Automatic video discovery, multi-language transcript downloading, processing status tracking, actionable video cards.
- **AI-Powered Analysis (Elite Framework):** Extracts 5-10 comprehensive PM insights per video using Claude 3.5 Sonnet. Each insight includes a Transcript Nugget, Why It Matters, Actionable Steps (3-5), RICE Score (Reach, Impact, Confidence, Effort), Tools Needed, Example Prompt, and Week Tie-In. Insights are automatically categorized (e.g., Product Strategy, User Research, Metrics & KPIs, AI/Technical Skills, Career Development, Communication & Writing, Design Thinking) and assigned a priority (Critical, High, Medium, Low) based on RICE score. Token usage is tracked (8192 tokens per analysis).
- **Transcript Management:** Browse, search, and export individual transcripts as markdown.
- **Insights Management:** Browse all extracted insights, search by keyword, video title, or channel, and filter by category.
- **Export Functionality:** Export channel insights as formatted markdown (executive summary), export all insights across all channels as a single markdown file, and export individual transcripts as markdown.

### System Design Choices
The application uses a PostgreSQL database for persistent storage, ensuring data survives server restarts. Python scripts are utilized for computationally intensive or specialized tasks, integrated seamlessly with the Node.js backend. Error handling includes catching Python script errors, Zod schema validation for API input, and user-friendly error messages on the frontend. Loading states prevent concurrent operations. The system uses a comprehensive 5-stage Elite Insights Framework for AI analysis, providing richer and more structured insights at a higher token cost. Video filtering excludes YouTube Shorts.

## External Dependencies

- **YouTube Data API v3:** For fetching channel and video metadata.
- **`youtube-transcript-api` (Python library):** For downloading video transcripts (no API key required).
- **Anthropic Claude API:** For AI-powered insight extraction using Claude 3.5 Sonnet.
- **PostgreSQL:** As the persistent database.
- **Node.js Ecosystem:** Express, Express-session.
- **React Ecosystem:** @tanstack/react-query, wouter.
- **Shadcn/ui:** UI component library.
- **Tailwind CSS:** Styling framework.
- **Vite:** Build tool.
## Recent Changes

### October 27, 2025 (Session 9 - Netlify Function Proxy for Production)
- **Implemented Netlify Function proxy to bypass YouTube IP blocking**
  - YouTube blocks cloud provider IPs (Replit, AWS, GCP) from accessing transcripts
  - Created `netlify/functions/fetch-transcript.js` using `youtube-transcript` npm package (Node.js)
  - Converted from Edge Functions (Deno) to regular Functions (Node.js) for better library compatibility
  - Function includes 3 automatic retries with exponential backoff (3s → 6s delays)
  - Full CORS support for direct API access
  - Proper error handling for all YouTube error types (disabled, private, unavailable videos)
- **Smart routing with automatic fallback**
  - Updated `server/routes.ts` to try Netlify Function first
  - Automatically falls back to local Python script if Netlify fails
  - Uses `NETLIFY_FUNCTION_URL` environment variable (optional - graceful degradation)
  - Detailed logging for debugging (shows which method succeeded)
- **Deployment infrastructure**
  - Created `netlify.toml` configuration for automatic deployment
  - Function path: `/api/transcript-proxy` (redirects to `/.netlify/functions/fetch-transcript`)
  - Created `NETLIFY_PROXY_SETUP.md` with complete deployment instructions
  - Added `youtube-transcript` package to dependencies
  - Includes CLI deployment and GitHub integration methods
- **Production-ready solution**
  - Free tier supports 125K requests/month (sufficient for typical usage)
  - Serverless functions with global distribution
  - Works in production environments where cloud IPs are blocked
  - Successfully pushed to GitHub repository for Netlify deployment

### October 26, 2025 (Session 8 - Video Sort, Enhanced Export & Concurrent Analysis)
- **Implemented video sort dropdown with 3 options**
  - Added sort dropdown with "Recently added" (default), "Newest published", and "Oldest published"
  - "Recently added" sorts by when videos were added to database (createdAt)
  - "Newest/Oldest published" sorts by YouTube publish date (publishedAt)
  - Fixed issue where re-adding existing videos didn't update createdAt timestamp
  - When re-adding existing videos, createdAt is updated to current time
  - Videos now correctly appear at top of "Recently added" list when manually re-added
  - Client-side sorting with proper handling of both timestamp fields
  - Test ID: select-sort-order
- **Enabled concurrent transcript analysis**
  - Users can now analyze multiple videos simultaneously
  - Changed from single `analyzingVideoId` to `Set<string>` to track multiple concurrent analyses
  - Each video shows independent "Analyzing..." state while processing
  - Multiple Python analysis scripts can run concurrently on backend
  - Significantly improves workflow efficiency when processing multiple videos
- **Enhanced export all insights format**
  - Export now includes ALL elite framework fields in structured markdown format
  - New fields: From the Transcript (blockquote), Why It Matters, Actionable Steps (numbered list)
  - New fields: RICE Score (table format), Tools Needed (comma-separated), Example Prompt (code blocks)
  - New field: When to Apply (weekTieIn) for timing guidance
  - Export format properly structures insights with 8 sections per insight
  - Verified with curl that all fields are properly formatted
- **Both features tested end-to-end**
  - Video sort: Successfully tested switching between newest/oldest, proper sorting confirmed
  - Export all: Successfully exported 51 insights with all elite fields included
  - All API endpoints return 200 OK responses

### October 26, 2025 (Session 7 - Channel Deletion & Export All Insights)
- **Implemented channel deletion with cascade delete**
  - Added DELETE /api/channels/:id endpoint that deletes channel and all related content
  - Cascade delete logic: transcripts → insights → videos → channel (prevents orphaned records)
  - Frontend ChannelCard component has delete button with AlertDialog confirmation
  - Confirmation dialog prevents accidental deletions by requiring explicit user confirmation
  - Delete mutation invalidates /api/channels, /api/videos, and /api/insights query cache
  - Success toast shows confirmation message with deleted channel name
- **Implemented export all insights functionality**
  - Added POST /api/export/all-insights endpoint to export all insights across all channels
  - Single markdown file contains insights from all channels with executive summary
  - Export format includes: total insights count, channel count, insights by video, insights grouped by category
  - Frontend Insights page has "Export All" button (visible when insights exist)
  - Button triggers download with success toast showing total insight count
  - File naming: all_pm_insights_[timestamp].md
- **Both features tested end-to-end with Playwright**
  - Channel deletion: Successfully deleted channel with cascade, confirmed UI updates
  - Export all: Successfully downloaded markdown file with all 26 insights
  - AlertDialog confirmation works as expected
  - All API endpoints return 200 OK responses
- **Technical implementation**
  - Backend uses manual cascade delete (not database constraints) for better control
  - Frontend uses TanStack Query mutations with proper cache invalidation
  - AlertDialog component from shadcn/ui for deletion confirmation
  - Export downloads file using Blob API with Content-Disposition header
