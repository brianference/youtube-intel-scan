import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { VideoCard } from "@/components/VideoCard";
import { ChannelInput } from "@/components/ChannelInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, CheckCircle2, Clock, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Video as VideoType } from "@shared/schema";

export default function Dashboard() {
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const { data: videos = [], isLoading: videosLoading } = useQuery<VideoType[]>({
    queryKey: ['/api/videos'],
  });

  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ['/api/channels'],
  });

  const addChannelMutation = useMutation({
    mutationFn: async (url: string) => {
      setProgress(10);
      const response = await apiRequest('POST', '/api/channels', { url });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Channel analyzed",
        description: `Found ${data.videos.length} videos from ${data.channel.name}`,
      });
      setTimeout(() => setProgress(0), 500);
    },
    onError: (error: any) => {
      setProgress(0);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze channel",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = (url: string) => {
    addChannelMutation.mutate(url);
  };

  const analyzedCount = videos.filter(v => v.analyzed).length;
  const pendingCount = videos.filter(v => !v.analyzed).length;
  const hasTranscriptCount = videos.filter(v => v.transcriptDownloaded).length;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          <span>AI-Powered PM Insights</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold">
          YouTube Transcript Analyzer
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Extract actionable product management insights from YouTube channels.
          Learn strategies, frameworks, and best practices from industry leaders.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard 
          title="Total Videos" 
          value={videosLoading ? "..." : videos.length} 
          icon={Video} 
          description={`Across ${channels.length} ${channels.length === 1 ? 'channel' : 'channels'}`} 
        />
        <StatsCard 
          title="Analyzed" 
          value={videosLoading ? "..." : analyzedCount} 
          icon={CheckCircle2} 
          description={videos.length > 0 ? `${Math.round((analyzedCount / videos.length) * 100)}%` : "0%"} 
        />
        <StatsCard 
          title="Transcripts" 
          value={videosLoading ? "..." : hasTranscriptCount} 
          icon={Clock} 
          description={`${pendingCount} pending analysis`} 
        />
      </div>

      {/* Input Section */}
      <ChannelInput
        onAnalyze={handleAnalyze}
        isLoading={addChannelMutation.isPending}
        progress={progress}
      />

      {/* Video List */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">All Videos ({videos.length})</h2>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {pendingCount} ready to analyze
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[700px] pr-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  publishedAt={video.publishedAt.toString()}
                  analyzed={video.analyzed}
                  onClick={() => console.log('Video clicked:', video.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {videos.length === 0 && !videosLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter a YouTube channel URL above to start analyzing product management content.
          </p>
        </div>
      )}
    </div>
  );
}
