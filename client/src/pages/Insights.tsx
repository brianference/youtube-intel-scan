import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { InsightCard } from "@/components/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Search, Filter, Download, X } from "lucide-react";
import type { Insight, Video, Channel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface InsightWithVideo extends Insight {
  video?: Video;
}

export default function Insights() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();
  
  // Parse video filter from URL query parameter
  const videoFilter = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('video') || null;
  }, [search]);

  const { data: insights = [], isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: ['/api/insights'],
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // Enrich insights with video data
  const enrichedInsights = useMemo(() => {
    if (insights.length > 0 && videos.length > 0) {
      return insights.map(insight => {
        const video = videos.find(v => v.videoId === insight.videoId);
        return { ...insight, video };
      });
    }
    return [];
  }, [insights, videos]);

  const categories = Array.from(new Set(insights.map(i => i.category).filter(Boolean))) as string[];

  const filteredInsights = enrichedInsights.filter(insight => {
    const matchesSearch = insight.insight.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         insight.video?.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || insight.category === categoryFilter;
    const matchesVideo = !videoFilter || insight.videoId === videoFilter;
    return matchesSearch && matchesCategory && matchesVideo;
  });
  
  // Get the video title for display when filtering
  const filteredVideoTitle = videoFilter ? videos.find(v => v.videoId === videoFilter)?.title : null;
  
  const clearVideoFilter = () => {
    setLocation('/insights');
  };

  const handleExport = async () => {
    if (insights.length === 0) {
      toast({
        title: "No insights",
        description: "Analyze some videos first to export insights",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/export/all-insights', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export insights');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_pm_insights_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `Exported ${insights.length} insights to markdown file`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export insights",
        variant: "destructive",
      });
    }
  };

  const handleExportVideoInsights = async (videoId: string) => {
    try {
      const response = await fetch(`/api/export/video-insights/${videoId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export video insights');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_insights_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `Exported insights for this video to markdown file`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export video insights",
        variant: "destructive",
      });
    }
  };

  const getChannelName = (videoId: string) => {
    const video = videos.find(v => v.videoId === videoId);
    if (!video) return "Unknown Channel";
    const channel = channels.find(c => c.channelId === video.channelId);
    return channel?.name || "Unknown Channel";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">PM Insights</h1>
          <p className="text-muted-foreground mt-1">
            Browse and search through all extracted product management insights
          </p>
        </div>
        {insights.length > 0 && (
          <Button onClick={handleExport} data-testid="button-export-insights">
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        )}
      </div>

      {/* Filters */}
      {insights.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search insights, videos, or channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-insights"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="All categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Video Filter Indicator */}
      {videoFilter && filteredVideoTitle && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">Showing insights for:</span>
          <span className="text-sm font-medium truncate flex-1">{filteredVideoTitle}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportVideoInsights(videoFilter)}
            data-testid="button-export-video-insights"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearVideoFilter}
            data-testid="button-clear-video-filter"
          >
            <X className="h-4 w-4" />
            Clear filter
          </Button>
        </div>
      )}

      {/* Insights List */}
      {insightsLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      ) : filteredInsights.length > 0 ? (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              id={insight.id}
              insight={insight.insight}
              videoTitle={insight.video?.title || "Unknown Video"}
              channelName={getChannelName(insight.videoId)}
              timestamp={insight.createdAt.toString()}
              category={insight.category || undefined}
              // Elite framework fields
              transcriptNugget={insight.transcriptNugget}
              whyItMatters={insight.whyItMatters}
              actionableSteps={insight.actionableSteps}
              riceScore={insight.riceScore}
              toolsNeeded={insight.toolsNeeded}
              examplePrompt={insight.examplePrompt}
              weekTieIn={insight.weekTieIn}
              onViewVideo={() => {
                if (insight.videoId) {
                  window.open(`https://www.youtube.com/watch?v=${insight.videoId}`, '_blank');
                }
              }}
            />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="Once you analyze YouTube videos, extracted product management insights will appear here for easy reference and learning."
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No insights found"
          description={`No insights match your current filters. Try adjusting your search or category selection.`}
        />
      )}
    </div>
  );
}
