import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spawn } from "child_process";
import { insertChannelSchema, insertVideoSchema, insertTranscriptSchema, insertInsightSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { HttpsProxyAgent } from "https-proxy-agent";

// Optional residential proxy support via environment variable
// Format: http://user:pass@proxy.example.com:port
const RESIDENTIAL_PROXY = process.env.RESIDENTIAL_PROXY_URL;

// Rate limiting for proxy requests
const proxyRateLimiter = {
  lastRequestTime: 0,
  minDelay: 1500, // 1.5 seconds between requests
  requestCount: 0,
  resetTime: Date.now(),
  maxRequestsPerMinute: 20,
};

async function waitForProxyRateLimit(): Promise<void> {
  const now = Date.now();

  // Reset counter every minute
  if (now - proxyRateLimiter.resetTime > 60000) {
    proxyRateLimiter.requestCount = 0;
    proxyRateLimiter.resetTime = now;
  }

  // Check if we've exceeded rate limit
  if (proxyRateLimiter.requestCount >= proxyRateLimiter.maxRequestsPerMinute) {
    const waitTime = 60000 - (now - proxyRateLimiter.resetTime);
    console.log(`[ProxyRateLimit] Max requests reached, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    proxyRateLimiter.requestCount = 0;
    proxyRateLimiter.resetTime = Date.now();
  }

  // Enforce minimum delay between requests
  const timeSinceLastRequest = now - proxyRateLimiter.lastRequestTime;
  if (timeSinceLastRequest < proxyRateLimiter.minDelay) {
    const waitTime = proxyRateLimiter.minDelay - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  proxyRateLimiter.lastRequestTime = Date.now();
  proxyRateLimiter.requestCount++;
}

// Simple in-memory cache for YouTube responses (5 minute TTL)
const proxyCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedResponse(key: string): string | null {
  const cached = proxyCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[ProxyCache] Cache hit for ${key.substring(0, 50)}...`);
    return cached.data;
  }
  proxyCache.delete(key);
  return null;
}

function setCachedResponse(key: string, data: string): void {
  // Limit cache size
  if (proxyCache.size > 100) {
    const oldestKey = proxyCache.keys().next().value;
    if (oldestKey) proxyCache.delete(oldestKey);
  }
  proxyCache.set(key, { data, timestamp: Date.now() });
}

// Helper function to run Python scripts
function runPythonScript(scriptName: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [`server/python/${scriptName}`, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        // Check if stdout contains JSON error before rejecting
        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            reject(new Error(result.error));
            return;
          }
        } catch (e) {
          // Not JSON, use stderr or default message
        }
        reject(new Error(stderr || stdout || `Python script exited with code ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/channels - List all channels
  app.get("/api/channels", async (req, res) => {
    try {
      const channels = await storage.getAllChannels();
      res.json(channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });

  // POST /api/channels - Add a new channel and fetch its videos
  app.post("/api/channels", async (req, res) => {
    try {
      // Validate input
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'Channel URL is required' });
      }

      // Run Python script to fetch channel info and videos
      const { stdout } = await runPythonScript('fetch_channel_videos.py', [url, '50']);
      const result = JSON.parse(stdout);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      // Check if channel already exists
      const existingChannel = await storage.getChannelByChannelId(result.channel.channelId);
      
      let channel;
      if (existingChannel) {
        // Update existing channel
        channel = await storage.updateChannel(existingChannel.id, {
          ...result.channel,
          lastScanned: new Date(),
        });
      } else {
        // Create new channel
        const validatedChannel = insertChannelSchema.parse({
          ...result.channel,
          lastScanned: new Date(),
        });
        channel = await storage.createChannel(validatedChannel);
      }

      // Add videos
      const videos = [];
      for (const videoData of result.videos) {
        const existingVideo = await storage.getVideoByVideoId(videoData.videoId);
        if (!existingVideo) {
          const validatedVideo = insertVideoSchema.parse({
            ...videoData,
            publishedAt: new Date(videoData.publishedAt),
          });
          const video = await storage.createVideo(validatedVideo);
          videos.push(video);
        } else {
          videos.push(existingVideo);
        }
      }

      res.json({ channel, videos });
    } catch (error: any) {
      console.error('Error adding channel:', error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: error.message || 'Failed to add channel' });
    }
  });

  // POST /api/channels/:id/scan - Scan a channel for new videos
  app.post("/api/channels/:id/scan", async (req, res) => {
    try {
      const channel = await storage.getChannel(req.params.id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Fetch videos
      const { stdout } = await runPythonScript('fetch_channel_videos.py', [channel.channelId, '50']);
      const result = JSON.parse(stdout);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      // Update channel
      await storage.updateChannel(channel.id, {
        lastScanned: new Date(),
      });

      // Add new videos
      const videos = [];
      for (const videoData of result.videos) {
        const existingVideo = await storage.getVideoByVideoId(videoData.videoId);
        if (!existingVideo) {
          const validatedVideo = insertVideoSchema.parse({
            ...videoData,
            publishedAt: new Date(videoData.publishedAt),
          });
          const video = await storage.createVideo(validatedVideo);
          videos.push(video);
        }
      }

      res.json({ newVideos: videos.length, videos });
    } catch (error: any) {
      console.error('Error scanning channel:', error);
      res.status(500).json({ error: error.message || 'Failed to scan channel' });
    }
  });

  // DELETE /api/channels/:id - Delete a channel and its videos, transcripts, and insights
  app.delete("/api/channels/:id", async (req, res) => {
    try {
      const channel = await storage.getChannel(req.params.id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      await storage.deleteChannel(req.params.id);
      res.json({ message: 'Channel deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      res.status(500).json({ error: error.message || 'Failed to delete channel' });
    }
  });

  // POST /api/videos - Add a single video by URL
  app.post("/api/videos", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'Video URL is required' });
      }

      // Fetch video metadata
      const { stdout } = await runPythonScript('fetch_single_video.py', [url]);
      const result = JSON.parse(stdout);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      // Check if video already exists
      const existingVideo = await storage.getVideoByVideoId(result.videoId);
      if (existingVideo) {
        // Update createdAt to reflect when it was re-added
        const updatedVideo = await storage.updateVideo(existingVideo.id, {
          createdAt: new Date(),
        });
        return res.json({ video: updatedVideo, message: 'Video already exists - moved to top of Recently Added' });
      }

      // Check if channel exists, if not create it
      let channel = await storage.getChannelByChannelId(result.channelId);
      if (!channel) {
        const newChannel = insertChannelSchema.parse({
          channelId: result.channelId,
          name: result.channelTitle,
          description: '',
        });
        channel = await storage.createChannel(newChannel);
      }

      // Create video with properly converted data
      const validatedVideo = insertVideoSchema.parse({
        videoId: result.videoId,
        channelId: result.channelId,
        title: result.title,
        description: result.description,
        publishedAt: new Date(result.publishedAt),
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        viewCount: result.viewCount,
      });
      const video = await storage.createVideo(validatedVideo);

      res.json({ video });
    } catch (error: any) {
      console.error('Error adding video:', error);
      res.status(500).json({ error: error.message || 'Failed to add video' });
    }
  });

  // GET /api/videos - List all videos
  app.get("/api/videos", async (req, res) => {
    try {
      const { channelId } = req.query;
      
      let videos;
      if (channelId && typeof channelId === 'string') {
        videos = await storage.getVideosByChannelId(channelId);
      } else {
        videos = await storage.getAllVideos();
      }
      
      res.json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  });

  // POST /api/videos/:id/transcript - Download transcript for a video
  app.post("/api/videos/:id/transcript", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Check if transcript already exists
      const existingTranscript = await storage.getTranscriptByVideoId(video.videoId);
      if (existingTranscript) {
        return res.json({ transcript: existingTranscript, message: 'Transcript already exists' });
      }

      // Fetch transcript - try Netlify proxy first, fall back to Python
      const languages = req.body.languages || 'en';
      let result;

      // Try Netlify Edge Function first (if configured)
      const netlifyUrl = process.env.NETLIFY_FUNCTION_URL;
      if (netlifyUrl) {
        try {
          console.log(`Fetching transcript via Netlify proxy: ${video.videoId}`);
          const response = await fetch(
            `${netlifyUrl}?videoId=${encodeURIComponent(video.videoId)}&languages=${encodeURIComponent(languages)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );

          if (response.ok) {
            result = await response.json();
            console.log(`Successfully fetched transcript via Netlify for ${video.videoId}`);
          } else {
            const error = await response.json();
            console.warn(`Netlify proxy failed (${response.status}): ${error.error}. Falling back to Python.`);
            result = null;
          }
        } catch (error: any) {
          console.warn(`Netlify proxy error: ${error.message}. Falling back to Python.`);
          result = null;
        }
      }

      // Fallback to Python script if Netlify didn't work
      if (!result) {
        console.log(`Fetching transcript via Python script: ${video.videoId}`);
        const { stdout } = await runPythonScript('fetch_transcripts.py', [video.videoId, languages]);
        result = JSON.parse(stdout);
      }

      if (result.error) {
        // Update video to mark that transcript is not available
        await storage.updateVideo(video.id, { hasTranscript: false });
        return res.status(400).json({ error: result.error });
      }

      // Save transcript
      const validatedTranscript = insertTranscriptSchema.parse(result);
      const transcript = await storage.createTranscript(validatedTranscript);

      // Update video
      await storage.updateVideo(video.id, {
        hasTranscript: true,
        transcriptDownloaded: true,
      });

      res.json({ transcript });
    } catch (error: any) {
      console.error('Error downloading transcript:', error);
      res.status(500).json({ error: error.message || 'Failed to download transcript' });
    }
  });

  // POST /api/videos/:id/transcript/export - Export transcript as markdown
  app.post("/api/videos/:id/transcript/export", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const transcript = await storage.getTranscriptByVideoId(video.videoId);
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      // Create markdown content
      const markdown = `# ${video.title}

**Published:** ${new Date(video.publishedAt).toLocaleDateString()}  
**Language:** ${transcript.language}  
**Video URL:** https://www.youtube.com/watch?v=${video.videoId}

---

## Transcript

${transcript.fullText}

---

*Exported from YouTube Intel Scan on ${new Date().toLocaleDateString()}*
`;

      // Send as downloadable file
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="transcript_${video.videoId}.md"`);
      res.send(markdown);
    } catch (error: any) {
      console.error('Error exporting transcript:', error);
      res.status(500).json({ error: error.message || 'Failed to export transcript' });
    }
  });

  // POST /api/videos/:id/analyze - Analyze video and extract insights
  app.post("/api/videos/:id/analyze", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Get transcript
      const transcript = await storage.getTranscriptByVideoId(video.videoId);
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript not available. Please download transcript first.' });
      }

      // Check if already analyzed
      const existingInsights = await storage.getInsightsByVideoId(video.videoId);
      if (existingInsights.length > 0) {
        return res.json({ insights: existingInsights, message: 'Video already analyzed' });
      }

      // Analyze with Claude
      const { stdout } = await runPythonScript('analyze_insights.py', [
        video.title,
        transcript.fullText,
      ]);
      const result = JSON.parse(stdout);

      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      // Save insights with elite framework fields
      const insights = [];
      for (const insightData of result.insights) {
        const validatedInsight = insertInsightSchema.parse({
          videoId: video.videoId,
          insight: insightData.insight,
          category: insightData.category || null,
          context: insightData.context || null,
          timestamp: null,
          // Elite framework fields
          transcriptNugget: insightData.transcriptNugget || null,
          whyItMatters: insightData.whyItMatters || null,
          actionableSteps: insightData.actionableSteps || null,
          riceScore: insightData.riceScore || null,
          toolsNeeded: insightData.toolsNeeded || null,
          examplePrompt: insightData.examplePrompt || null,
          weekTieIn: insightData.weekTieIn || null,
        });
        const insight = await storage.createInsight(validatedInsight);
        insights.push(insight);
      }

      // Update video
      await storage.updateVideo(video.id, { analyzed: true });

      res.json({ insights, tokensUsed: result.tokensUsed });
    } catch (error: any) {
      console.error('Error analyzing video:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze video' });
    }
  });

  // GET /api/insights - List all insights
  app.get("/api/insights", async (req, res) => {
    try {
      const { videoId } = req.query;
      
      let insights;
      if (videoId && typeof videoId === 'string') {
        insights = await storage.getInsightsByVideoId(videoId);
      } else {
        insights = await storage.getAllInsights();
      }
      
      res.json(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  });

  // POST /api/export/channel/:id - Export channel insights as markdown
  app.post("/api/export/channel/:id", async (req, res) => {
    try {
      const channel = await storage.getChannel(req.params.id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Get all videos for this channel
      const videos = await storage.getVideosByChannelId(channel.channelId);
      
      // Get insights for all videos
      const allInsights = [];
      for (const video of videos) {
        const insights = await storage.getInsightsByVideoId(video.videoId);
        if (insights.length > 0) {
          allInsights.push({
            video,
            insights,
          });
        }
      }

      // Generate markdown
      let markdown = `# ${channel.name} - Product Management Insights\n\n`;
      markdown += `**Channel:** ${channel.name}\n`;
      markdown += `**Total Videos Analyzed:** ${allInsights.length}\n`;
      markdown += `**Export Date:** ${new Date().toLocaleDateString()}\n\n`;
      markdown += `---\n\n`;

      markdown += `## Executive Summary\n\n`;
      const totalInsights = allInsights.reduce((sum, item) => sum + item.insights.length, 0);
      markdown += `This document contains ${totalInsights} product management insights extracted from ${allInsights.length} videos on the ${channel.name} YouTube channel.\n\n`;

      // Group insights by category
      const insightsByCategory: Record<string, any[]> = {};
      allInsights.forEach(({ insights }) => {
        insights.forEach(insight => {
          const category = insight.category || 'Other';
          if (!insightsByCategory[category]) {
            insightsByCategory[category] = [];
          }
          insightsByCategory[category].push(insight);
        });
      });

      markdown += `### Insights by Category\n\n`;
      Object.entries(insightsByCategory).forEach(([category, insights]) => {
        markdown += `- **${category}:** ${insights.length} insights\n`;
      });
      markdown += `\n---\n\n`;

      // Add insights by video
      markdown += `## Insights by Video\n\n`;
      allInsights.forEach(({ video, insights }) => {
        markdown += `### ${video.title}\n\n`;
        markdown += `**Published:** ${video.publishedAt.toLocaleDateString()}\n`;
        markdown += `**Video ID:** ${video.videoId}\n`;
        markdown += `**YouTube Link:** https://www.youtube.com/watch?v=${video.videoId}\n\n`;

        insights.forEach((insight, index) => {
          markdown += `#### Insight ${index + 1}${insight.category ? ` - ${insight.category}` : ''}\n\n`;
          markdown += `${insight.insight}\n\n`;
          if (insight.context) {
            markdown += `*Context:* ${insight.context}\n\n`;
          }
        });

        markdown += `---\n\n`;
      });

      // Add insights grouped by category
      markdown += `## Insights Grouped by Category\n\n`;
      Object.entries(insightsByCategory).forEach(([category, insights]) => {
        markdown += `### ${category}\n\n`;
        insights.forEach((insight, index) => {
          markdown += `${index + 1}. ${insight.insight}\n\n`;
        });
        markdown += `\n`;
      });

      // Send as downloadable file
      const filename = `${channel.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_insights_${Date.now()}.md`;
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(markdown);
    } catch (error: any) {
      console.error('Error exporting insights:', error);
      res.status(500).json({ error: error.message || 'Failed to export insights' });
    }
  });

  // POST /api/export/all-insights - Export all insights as markdown
  app.post("/api/export/all-insights", async (req, res) => {
    try {
      // Get all insights
      const allInsights = await storage.getAllInsights();
      
      if (allInsights.length === 0) {
        return res.status(404).json({ error: 'No insights found' });
      }

      // Get all videos and channels to build the complete report
      const videos = await storage.getAllVideos();
      const channels = await storage.getAllChannels();
      
      // Create a map for quick lookups
      const videoMap = new Map(videos.map(v => [v.videoId, v]));
      const channelMap = new Map(channels.map(c => [c.channelId, c]));

      // Generate markdown
      let markdown = `# All Product Management Insights\n\n`;
      markdown += `**Total Insights:** ${allInsights.length}\n`;
      markdown += `**Total Channels:** ${channels.length}\n`;
      markdown += `**Total Videos Analyzed:** ${videos.filter(v => v.analyzed).length}\n`;
      markdown += `**Export Date:** ${new Date().toLocaleDateString()}\n\n`;
      markdown += `---\n\n`;

      // Group insights by category
      const insightsByCategory: Record<string, any[]> = {};
      allInsights.forEach(insight => {
        const category = insight.category || 'Other';
        if (!insightsByCategory[category]) {
          insightsByCategory[category] = [];
        }
        insightsByCategory[category].push(insight);
      });

      markdown += `## Insights by Category\n\n`;
      Object.entries(insightsByCategory).forEach(([category, insights]) => {
        markdown += `- **${category}:** ${insights.length} insights\n`;
      });
      markdown += `\n---\n\n`;

      // Group insights by video
      const insightsByVideo: Record<string, any[]> = {};
      allInsights.forEach(insight => {
        if (!insightsByVideo[insight.videoId]) {
          insightsByVideo[insight.videoId] = [];
        }
        insightsByVideo[insight.videoId].push(insight);
      });

      // Add insights by video
      markdown += `## Insights by Video\n\n`;
      Object.entries(insightsByVideo).forEach(([videoId, insights]) => {
        const video = videoMap.get(videoId);
        if (video) {
          const channel = channelMap.get(video.channelId);
          markdown += `### ${video.title}\n\n`;
          if (channel) {
            markdown += `**Channel:** ${channel.name}\n`;
          }
          markdown += `**Published:** ${video.publishedAt.toLocaleDateString()}\n`;
          markdown += `**YouTube Link:** https://www.youtube.com/watch?v=${video.videoId}\n\n`;

          insights.forEach((insight, index) => {
            markdown += `#### Insight ${index + 1}${insight.category ? ` - ${insight.category}` : ''}\n\n`;
            markdown += `**${insight.insight}**\n\n`;
            
            // From the transcript
            if (insight.transcriptNugget) {
              markdown += `##### From the Transcript\n\n`;
              markdown += `> ${insight.transcriptNugget}\n\n`;
            }
            
            // Why it matters
            if (insight.whyItMatters) {
              markdown += `##### Why It Matters\n\n`;
              markdown += `${insight.whyItMatters}\n\n`;
            }
            
            // Actionable steps
            if (insight.actionableSteps) {
              markdown += `##### Actionable Steps\n\n`;
              try {
                const steps = JSON.parse(insight.actionableSteps);
                if (Array.isArray(steps)) {
                  steps.forEach((step, i) => {
                    markdown += `${i + 1}. ${step}\n`;
                  });
                  markdown += `\n`;
                }
              } catch {
                markdown += `${insight.actionableSteps}\n\n`;
              }
            }
            
            // RICE Score
            if (insight.riceScore) {
              try {
                const rice = JSON.parse(insight.riceScore);
                markdown += `##### RICE Score\n\n`;
                markdown += `- **Reach:** ${rice.reach || 'N/A'}\n`;
                markdown += `- **Impact:** ${rice.impact || 'N/A'}\n`;
                markdown += `- **Confidence:** ${rice.confidence || 'N/A'}\n`;
                markdown += `- **Effort:** ${rice.effort || 'N/A'}\n`;
                if (rice.total) {
                  markdown += `- **Total:** ${rice.total}\n`;
                }
                markdown += `\n`;
              } catch {
                // Skip if invalid JSON
              }
            }
            
            // Tools needed
            if (insight.toolsNeeded) {
              try {
                const tools = JSON.parse(insight.toolsNeeded);
                if (Array.isArray(tools) && tools.length > 0) {
                  markdown += `##### Tools Needed\n\n`;
                  markdown += `${tools.join(', ')}\n\n`;
                }
              } catch {
                markdown += `##### Tools Needed\n\n${insight.toolsNeeded}\n\n`;
              }
            }
            
            // Example prompt/template
            if (insight.examplePrompt) {
              markdown += `##### Example Prompt/Template\n\n`;
              markdown += `\`\`\`\n${insight.examplePrompt}\n\`\`\`\n\n`;
            }
            
            // Week tie-in
            if (insight.weekTieIn) {
              markdown += `##### When to Apply\n\n`;
              markdown += `${insight.weekTieIn}\n\n`;
            }
            
            markdown += `---\n\n`;
          });

          markdown += `\n`;
        }
      });

      // Add insights grouped by category (summary view)
      markdown += `## All Insights Grouped by Category (Summary)\n\n`;
      Object.entries(insightsByCategory).forEach(([category, insights]) => {
        markdown += `### ${category}\n\n`;
        insights.forEach((insight, index) => {
          markdown += `${index + 1}. **${insight.insight}**`;
          if (insight.weekTieIn) {
            markdown += ` _(${insight.weekTieIn})_`;
          }
          markdown += `\n\n`;
        });
        markdown += `\n`;
      });

      // Send as downloadable file
      const filename = `all_pm_insights_${Date.now()}.md`;
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(markdown);
    } catch (error: any) {
      console.error('Error exporting all insights:', error);
      res.status(500).json({ error: error.message || 'Failed to export all insights' });
    }
  });

  // ============================================================================
  // CLIENT-SIDE TRANSCRIPT FETCHING SUPPORT
  // These endpoints act as CORS proxies to allow browser-based transcript fetching
  // ============================================================================

  // GET /api/proxy/youtube-page - Fetch YouTube video page for caption extraction
  app.get("/api/proxy/youtube-page", async (req, res) => {
    try {
      const { videoId } = req.query;

      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ error: 'videoId query parameter is required' });
      }

      // Check cache first
      const cacheKey = `page:${videoId}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.send(cached);
      }

      // Rate limit
      await waitForProxyRateLimit();

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`[ProxyYouTube] Fetching video page: ${videoId}`);

      const fetchOptions: RequestInit = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      };

      // Use residential proxy if configured
      if (RESIDENTIAL_PROXY) {
        console.log(`[ProxyYouTube] Using residential proxy`);
        const agent = new HttpsProxyAgent(RESIDENTIAL_PROXY);
        (fetchOptions as any).agent = agent;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error(`[ProxyYouTube] YouTube returned ${response.status}`);
        return res.status(response.status).json({ error: `YouTube returned ${response.status}` });
      }

      const html = await response.text();

      // Verify we got valid YouTube page (not a block/captcha page)
      if (html.includes('accounts.google.com/ServiceLogin') || html.includes('consent.youtube.com')) {
        console.error('[ProxyYouTube] YouTube returned consent/login page - IP may be flagged');
        return res.status(403).json({ error: 'YouTube requires consent/login - try again later or use residential proxy' });
      }

      // Cache the response
      setCachedResponse(cacheKey, html);

      res.send(html);
    } catch (error: any) {
      console.error('[ProxyYouTube] Error fetching video page:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch video page' });
    }
  });

  // GET /api/proxy/youtube-transcript - Fetch transcript XML from YouTube
  app.get("/api/proxy/youtube-transcript", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url query parameter is required' });
      }

      // Validate URL is a YouTube timedtext URL
      if (!url.includes('youtube.com') && !url.includes('googlevideo.com')) {
        return res.status(400).json({ error: 'Invalid transcript URL' });
      }

      // Check cache first
      const cacheKey = `transcript:${url}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.type('text/xml').send(cached);
      }

      // Rate limit
      await waitForProxyRateLimit();

      console.log(`[ProxyYouTube] Fetching transcript from: ${url.substring(0, 80)}...`);

      const fetchOptions: RequestInit = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/xml,application/xml,*/*',
        },
      };

      // Use residential proxy if configured
      if (RESIDENTIAL_PROXY) {
        const agent = new HttpsProxyAgent(RESIDENTIAL_PROXY);
        (fetchOptions as any).agent = agent;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error(`[ProxyYouTube] Transcript fetch returned ${response.status}`);
        return res.status(response.status).json({ error: `Failed to fetch transcript: ${response.status}` });
      }

      const xml = await response.text();

      // Cache the response
      setCachedResponse(cacheKey, xml);

      res.type('text/xml').send(xml);
    } catch (error: any) {
      console.error('[ProxyYouTube] Error fetching transcript:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch transcript' });
    }
  });

  // POST /api/videos/:id/transcript/store - Store a client-fetched transcript
  app.post("/api/videos/:id/transcript/store", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Validate the transcript data from the client
      const { videoId, language, languageCode, isGenerated, snippets, fullText } = req.body;

      if (!videoId || !language || !languageCode || !snippets || !fullText) {
        return res.status(400).json({ error: 'Missing required transcript fields' });
      }

      // Verify videoId matches
      if (videoId !== video.videoId) {
        return res.status(400).json({ error: 'Video ID mismatch' });
      }

      // Check if transcript already exists
      const existingTranscript = await storage.getTranscriptByVideoId(video.videoId);
      if (existingTranscript) {
        return res.json({ transcript: existingTranscript, message: 'Transcript already exists' });
      }

      // Validate snippets structure
      if (!Array.isArray(snippets) || snippets.length === 0) {
        return res.status(400).json({ error: 'Invalid snippets array' });
      }

      // Save transcript
      const validatedTranscript = insertTranscriptSchema.parse({
        videoId,
        language,
        languageCode,
        isGenerated: isGenerated || false,
        snippets,
        fullText,
      });

      const transcript = await storage.createTranscript(validatedTranscript);

      // Update video
      await storage.updateVideo(video.id, {
        hasTranscript: true,
        transcriptDownloaded: true,
      });

      console.log(`[TranscriptStore] Stored client-fetched transcript for ${videoId}: ${snippets.length} snippets`);

      res.json({ transcript, message: 'Transcript stored successfully' });
    } catch (error: any) {
      console.error('[TranscriptStore] Error storing transcript:', error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      res.status(500).json({ error: error.message || 'Failed to store transcript' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
