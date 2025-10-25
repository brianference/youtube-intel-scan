import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Sparkles, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Video } from "@shared/schema";

export default function Videos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { toast } = useToast();

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ['/api/channels'],
  });

  const downloadTranscriptMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest('POST', `/api/videos/${videoId}/transcript`, undefined);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Transcript downloaded",
        description: `Transcript available in ${data.transcript.language}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download transcript",
        variant: "destructive",
      });
    },
  });

  const analyzeVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest('POST', `/api/videos/${videoId}/analyze`, undefined);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      toast({
        title: "Analysis complete",
        description: `Extracted ${data.insights.length} insights`,
      });
      setSelectedVideo(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze video",
        variant: "destructive",
      });
    },
  });

  const handleDownloadTranscript = (videoId: string) => {
    downloadTranscriptMutation.mutate(videoId);
  };

  const handleAnalyze = (videoId: string) => {
    analyzeVideoMutation.mutate(videoId);
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "analyzed" && video.analyzed) ||
      (statusFilter === "with-transcript" && video.transcriptDownloaded && !video.analyzed) ||
      (statusFilter === "no-transcript" && !video.transcriptDownloaded);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: videos.length,
    analyzed: videos.filter(v => v.analyzed).length,
    withTranscript: videos.filter(v => v.transcriptDownloaded && !v.analyzed).length,
    noTranscript: videos.filter(v => !v.transcriptDownloaded).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Videos</h1>
        <p className="text-muted-foreground mt-1">
          Download transcripts and analyze videos for product management insights
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.analyzed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.withTranscript}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.noTranscript}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {videos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-videos"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="All videos" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All videos</SelectItem>
              <SelectItem value="analyzed">Analyzed</SelectItem>
              <SelectItem value="with-transcript">Ready to analyze</SelectItem>
              <SelectItem value="no-transcript">No transcript</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Video Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <div key={video.id} className="space-y-2">
              <VideoCard
                id={video.id}
                title={video.title}
                publishedAt={video.publishedAt.toString()}
                analyzed={video.analyzed}
                onClick={() => setSelectedVideo(video)}
              />
              {selectedVideo?.id === video.id && (
                <div className="flex gap-2">
                  {!video.transcriptDownloaded ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownloadTranscript(video.id)}
                      disabled={downloadTranscriptMutation.isPending}
                      data-testid="button-download-transcript"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      {downloadTranscriptMutation.isPending ? "Downloading..." : "Download Transcript"}
                    </Button>
                  ) : !video.analyzed ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAnalyze(video.id)}
                      disabled={analyzeVideoMutation.isPending}
                      data-testid="button-analyze-video"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {analyzeVideoMutation.isPending ? "Analyzing..." : "Analyze"}
                    </Button>
                  ) : (
                    <Badge className="flex-1 justify-center">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Analyzed
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No videos found</p>
        </div>
      )}
    </div>
  );
}
