import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spawn } from "child_process";
import { insertChannelSchema, insertVideoSchema, insertTranscriptSchema, insertInsightSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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
        reject(new Error(stderr || `Python script exited with code ${code}`));
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
        return res.json({ video: existingVideo, message: 'Video already exists' });
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

      // Fetch transcript
      const languages = req.body.languages || 'en';
      const { stdout } = await runPythonScript('fetch_transcripts.py', [video.videoId, languages]);
      const result = JSON.parse(stdout);

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

  const httpServer = createServer(app);
  return httpServer;
}
