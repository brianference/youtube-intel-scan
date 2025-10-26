import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { VideoCard } from "@/components/VideoCard";
import { VideoInput } from "@/components/VideoInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Sparkles, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Video, Channel } from "@shared/schema";

export default function Videos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("recently-added");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [analyzingVideoIds, setAnalyzingVideoIds] = useState<Set<string>>(new Set());
  const [urlKey, setUrlKey] = useState(0); // Force re-render on URL changes
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Listen for navigation events to trigger re-renders
  useEffect(() => {
    const handleNavigation = () => {
      setUrlKey(prev => prev + 1);
    };
    
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // Also update urlKey when location changes (for programmatic navigation)
  useEffect(() => {
    setUrlKey(prev => prev + 1);
  }, [location]);

  // Derive channelFilter from URL params - use useMemo to ensure fresh reads
  const channelFilter = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('channelId');
  }, [urlKey, location]); // Re-compute when URL changes

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: channelFilter ? ['/api/videos', channelFilter] : ['/api/videos'],
    queryFn: async () => {
      const url = channelFilter 
        ? `/api/videos?channelId=${channelFilter}` 
        : '/api/videos';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    },
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  const addVideoMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/videos', { url });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video added",
        description: `Added: ${data.video.title}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add video",
        variant: "destructive",
      });
    },
  });

  const downloadTranscriptMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest('POST', `/api/videos/${videoId}/transcript`, undefined);
      return await response.json();
    },
    onMutate: (videoId: string) => {
      setDownloadingVideoId(videoId);
    },
    onSuccess: (data: any) => {
      setDownloadingVideoId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Transcript downloaded",
        description: `Transcript available in ${data.transcript.language}`,
      });
    },
    onError: (error: any) => {
      setDownloadingVideoId(null);
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
    onMutate: (videoId: string) => {
      setAnalyzingVideoIds(prev => new Set([...Array.from(prev), videoId]));
    },
    onSuccess: (data: any, videoId: string) => {
      setAnalyzingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      toast({
        title: "Analysis complete",
        description: `Extracted ${data.insights.length} insights`,
      });
      setSelectedVideo(null);
    },
    onError: (error: any, videoId: string) => {
      setAnalyzingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
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

  const handleExportTranscript = async (videoId: string, title: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/transcript/export`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export transcript');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `transcript_${filename}_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Transcript exported to markdown file",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export transcript",
        variant: "destructive",
      });
    }
  };

  const filteredVideos = videos
    .filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "analyzed" && video.analyzed) ||
        (statusFilter === "with-transcript" && video.transcriptDownloaded && !video.analyzed) ||
        (statusFilter === "no-transcript" && !video.transcriptDownloaded);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === "recently-added") {
        // Sort by when added to database (createdAt)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Most recently added first
      } else {
        // Sort by YouTube publish date (publishedAt)
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        
        if (sortOrder === "newest") {
          return dateB - dateA; // Newest first
        } else {
          return dateA - dateB; // Oldest first
        }
      }
    });

  const stats = {
    total: videos.length,
    analyzed: videos.filter(v => v.analyzed).length,
    withTranscript: videos.filter(v => v.transcriptDownloaded && !v.analyzed).length,
    noTranscript: videos.filter(v => !v.transcriptDownloaded).length,
  };

  const currentChannel = channelFilter 
    ? channels.find(c => c.channelId === channelFilter)
    : null;

  const clearChannelFilter = () => {
    setLocation('/videos');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Videos</h1>
          <p className="text-muted-foreground mt-1">
            Download transcripts and analyze videos for product management insights
          </p>
        </div>
        {currentChannel && (
          <Button
            variant="outline"
            onClick={clearChannelFilter}
            data-testid="button-clear-channel-filter"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filter
          </Button>
        )}
      </div>

      {/* Channel Filter Banner */}
      {currentChannel && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Showing videos from: <strong>{currentChannel.name}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Single Video */}
      <VideoInput
        onSubmit={(url) => addVideoMutation.mutate(url)}
        isLoading={addVideoMutation.isPending}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all" 
          onClick={() => setStatusFilter("all")}
          data-testid="stat-card-total"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all" 
          onClick={() => setStatusFilter("analyzed")}
          data-testid="stat-card-analyzed"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.analyzed}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all" 
          onClick={() => setStatusFilter("with-transcript")}
          data-testid="stat-card-ready"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.withTranscript}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all" 
          onClick={() => setStatusFilter("no-transcript")}
          data-testid="stat-card-pending"
        >
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
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-order">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recently-added">Recently added</SelectItem>
              <SelectItem value="newest">Newest published</SelectItem>
              <SelectItem value="oldest">Oldest published</SelectItem>
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
            <Card key={video.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-tight">{video.title}</CardTitle>
                  {video.analyzed ? (
                    <Badge variant="default" className="shrink-0">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Analyzed
                    </Badge>
                  ) : video.transcriptDownloaded ? (
                    <Badge variant="secondary" className="shrink-0 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(video.publishedAt).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {!video.transcriptDownloaded ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownloadTranscript(video.id)}
                    disabled={downloadingVideoId === video.id}
                    data-testid={`button-download-transcript-${video.id}`}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    {downloadingVideoId === video.id ? "Pulling..." : "Pull Transcript"}
                  </Button>
                ) : !video.analyzed ? (
                  <>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAnalyze(video.id)}
                      disabled={analyzingVideoIds.has(video.id)}
                      data-testid={`button-analyze-${video.id}`}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {analyzingVideoIds.has(video.id) ? "Analyzing..." : "Analyze Transcript"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleExportTranscript(video.id, video.title)}
                      data-testid={`button-export-transcript-${video.id}`}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Export Transcript
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Completed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleExportTranscript(video.id, video.title)}
                      data-testid={`button-export-transcript-${video.id}`}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Export Transcript
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
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
