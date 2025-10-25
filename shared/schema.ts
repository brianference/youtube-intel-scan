import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: text("channel_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  subscriberCount: text("subscriber_count"),
  videoCount: text("video_count"),
  lastScanned: timestamp("last_scanned"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id").notNull().unique(),
  channelId: text("channel_id").notNull().references(() => channels.channelId),
  title: text("title").notNull(),
  description: text("description"),
  publishedAt: timestamp("published_at").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: text("duration"),
  viewCount: text("view_count"),
  hasTranscript: boolean("has_transcript").default(false).notNull(),
  transcriptDownloaded: boolean("transcript_downloaded").default(false).notNull(),
  analyzed: boolean("analyzed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transcripts = pgTable("transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id").notNull().unique().references(() => videos.videoId),
  language: text("language").notNull(),
  languageCode: text("language_code").notNull(),
  isGenerated: boolean("is_generated").default(false).notNull(),
  snippets: jsonb("snippets").notNull().$type<Array<{
    text: string;
    start: number;
    duration: number;
  }>>(),
  fullText: text("full_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insights = pgTable("insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id").notNull().references(() => videos.videoId),
  insight: text("insight").notNull(),
  category: text("category"),
  context: text("context"),
  timestamp: text("timestamp"),
  // Elite framework fields
  transcriptNugget: text("transcript_nugget"),
  whyItMatters: text("why_it_matters"),
  actionableSteps: jsonb("actionable_steps").$type<string[]>(),
  riceScore: jsonb("rice_score").$type<{
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    total?: number;
  }>(),
  toolsNeeded: jsonb("tools_needed").$type<string[]>(),
  examplePrompt: text("example_prompt"),
  weekTieIn: text("week_tie_in"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
  hasTranscript: true,
  transcriptDownloaded: true,
  analyzed: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({
  id: true,
  createdAt: true,
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insights.$inferSelect;
