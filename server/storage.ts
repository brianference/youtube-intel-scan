import {
  type Channel,
  type InsertChannel,
  type Video,
  type InsertVideo,
  type Transcript,
  type InsertTranscript,
  type Insight,
  type InsertInsight,
  channels,
  videos,
  transcripts,
  insights,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Channels
  getChannel(id: string): Promise<Channel | undefined>;
  getChannelByChannelId(channelId: string): Promise<Channel | undefined>;
  getAllChannels(): Promise<Channel[]>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: string, updates: Partial<InsertChannel>): Promise<Channel | undefined>;

  // Videos
  getVideo(id: string): Promise<Video | undefined>;
  getVideoByVideoId(videoId: string): Promise<Video | undefined>;
  getVideosByChannelId(channelId: string): Promise<Video[]>;
  getAllVideos(): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  
  // Transcripts
  getTranscript(id: string): Promise<Transcript | undefined>;
  getTranscriptByVideoId(videoId: string): Promise<Transcript | undefined>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;

  // Insights
  getInsight(id: string): Promise<Insight | undefined>;
  getInsightsByVideoId(videoId: string): Promise<Insight[]>;
  getAllInsights(): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
}

export class MemStorage implements IStorage {
  private channels: Map<string, Channel>;
  private videos: Map<string, Video>;
  private transcripts: Map<string, Transcript>;
  private insights: Map<string, Insight>;

  constructor() {
    this.channels = new Map();
    this.videos = new Map();
    this.transcripts = new Map();
    this.insights = new Map();
  }

  // Channels
  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    return Array.from(this.channels.values()).find(
      (channel) => channel.channelId === channelId,
    );
  }

  async getAllChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = {
      id,
      channelId: insertChannel.channelId,
      name: insertChannel.name,
      description: insertChannel.description ?? null,
      thumbnailUrl: insertChannel.thumbnailUrl ?? null,
      subscriberCount: insertChannel.subscriberCount ?? null,
      videoCount: insertChannel.videoCount ?? null,
      lastScanned: insertChannel.lastScanned ?? null,
      createdAt: new Date(),
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannel(id: string, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;
    
    const updated = { ...channel, ...updates };
    this.channels.set(id, updated);
    return updated;
  }

  // Videos
  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideoByVideoId(videoId: string): Promise<Video | undefined> {
    return Array.from(this.videos.values()).find(
      (video) => video.videoId === videoId,
    );
  }

  async getVideosByChannelId(channelId: string): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(
      (video) => video.channelId === channelId,
    );
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
    );
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = {
      id,
      videoId: insertVideo.videoId,
      channelId: insertVideo.channelId,
      title: insertVideo.title,
      description: insertVideo.description ?? null,
      publishedAt: insertVideo.publishedAt,
      thumbnailUrl: insertVideo.thumbnailUrl ?? null,
      duration: insertVideo.duration ?? null,
      viewCount: insertVideo.viewCount ?? null,
      hasTranscript: false,
      transcriptDownloaded: false,
      analyzed: false,
      createdAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updated = { ...video, ...updates };
    this.videos.set(id, updated);
    return updated;
  }

  // Transcripts
  async getTranscript(id: string): Promise<Transcript | undefined> {
    return this.transcripts.get(id);
  }

  async getTranscriptByVideoId(videoId: string): Promise<Transcript | undefined> {
    return Array.from(this.transcripts.values()).find(
      (transcript) => transcript.videoId === videoId,
    );
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const id = randomUUID();
    const transcript: Transcript = {
      id,
      videoId: insertTranscript.videoId,
      language: insertTranscript.language,
      languageCode: insertTranscript.languageCode,
      isGenerated: insertTranscript.isGenerated ?? false,
      snippets: insertTranscript.snippets,
      fullText: insertTranscript.fullText,
      createdAt: new Date(),
    };
    this.transcripts.set(id, transcript);
    return transcript;
  }

  // Insights
  async getInsight(id: string): Promise<Insight | undefined> {
    return this.insights.get(id);
  }

  async getInsightsByVideoId(videoId: string): Promise<Insight[]> {
    return Array.from(this.insights.values()).filter(
      (insight) => insight.videoId === videoId,
    );
  }

  async getAllInsights(): Promise<Insight[]> {
    return Array.from(this.insights.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const id = randomUUID();
    const insight: Insight = {
      id,
      videoId: insertInsight.videoId,
      insight: insertInsight.insight,
      category: insertInsight.category ?? null,
      context: insertInsight.context ?? null,
      timestamp: insertInsight.timestamp ?? null,
      createdAt: new Date(),
    };
    this.insights.set(id, insight);
    return insight;
  }
}

export class DbStorage implements IStorage {
  // Channels
  async getChannel(id: string): Promise<Channel | undefined> {
    const result = await db.query.channels.findFirst({
      where: eq(channels.id, id),
    });
    return result;
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    const result = await db.query.channels.findFirst({
      where: eq(channels.channelId, channelId),
    });
    return result;
  }

  async getAllChannels(): Promise<Channel[]> {
    return await db.query.channels.findMany();
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db.insert(channels).values(insertChannel).returning();
    return channel;
  }

  async updateChannel(id: string, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const [updated] = await db
      .update(channels)
      .set(updates)
      .where(eq(channels.id, id))
      .returning();
    return updated;
  }

  // Videos
  async getVideo(id: string): Promise<Video | undefined> {
    const result = await db.query.videos.findFirst({
      where: eq(videos.id, id),
    });
    return result;
  }

  async getVideoByVideoId(videoId: string): Promise<Video | undefined> {
    const result = await db.query.videos.findFirst({
      where: eq(videos.videoId, videoId),
    });
    return result;
  }

  async getVideosByChannelId(channelId: string): Promise<Video[]> {
    return await db.query.videos.findMany({
      where: eq(videos.channelId, channelId),
      orderBy: [desc(videos.publishedAt)],
    });
  }

  async getAllVideos(): Promise<Video[]> {
    return await db.query.videos.findMany({
      orderBy: [desc(videos.publishedAt)],
    });
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(insertVideo).returning();
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const [updated] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  // Transcripts
  async getTranscript(id: string): Promise<Transcript | undefined> {
    const result = await db.query.transcripts.findFirst({
      where: eq(transcripts.id, id),
    });
    return result;
  }

  async getTranscriptByVideoId(videoId: string): Promise<Transcript | undefined> {
    const result = await db.query.transcripts.findFirst({
      where: eq(transcripts.videoId, videoId),
    });
    return result;
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const [transcript] = await db.insert(transcripts).values(insertTranscript).returning();
    return transcript;
  }

  // Insights
  async getInsight(id: string): Promise<Insight | undefined> {
    const result = await db.query.insights.findFirst({
      where: eq(insights.id, id),
    });
    return result;
  }

  async getInsightsByVideoId(videoId: string): Promise<Insight[]> {
    return await db.query.insights.findMany({
      where: eq(insights.videoId, videoId),
    });
  }

  async getAllInsights(): Promise<Insight[]> {
    return await db.query.insights.findMany({
      orderBy: [desc(insights.createdAt)],
    });
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const [insight] = await db.insert(insights).values(insertInsight).returning();
    return insight;
  }
}

// Use database storage
export const storage = new DbStorage();
