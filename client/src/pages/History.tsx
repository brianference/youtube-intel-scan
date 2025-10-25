import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { InsightCard } from "@/components/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History as HistoryIcon, Search, Filter, Download } from "lucide-react";
import type { Insight, Video } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface InsightWithVideo extends Insight {
  video?: Video;
}

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: insights = [], isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: ['/api/insights'],
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['/api/channels'],
  });

  // Enrich insights with video data
  const [enrichedInsights, setEnrichedInsights] = useState<InsightWithVideo[]>([]);

  useEffect(() => {
    if (insights.length > 0 && videos.length > 0) {
      const enriched = insights.map(insight => {
        const video = videos.find(v => v.videoId === insight.videoId);
        return { ...insight, video };
      });
      setEnrichedInsights(enriched);
    } else {
      setEnrichedInsights([]);
    }
  }, [insights, videos]);

  const categories = Array.from(new Set(insights.map(i => i.category).filter(Boolean))) as string[];

  const filteredInsights = enrichedInsights.filter(insight => {
    const matchesSearch = insight.insight.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         insight.video?.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || insight.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExport = async () => {
    if (channels.length === 0) {
      toast({
        title: "No channels",
        description: "Add and analyze channels first to export insights",
        variant: "destructive",
      });
      return;
    }

    // Export first channel for now
    const channelId = channels[0].id;
    
    try {
      const response = await fetch(`/api/export/channel/${channelId}`, {
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
      a.download = `insights_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Insights exported to markdown file",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export insights",
        variant: "destructive",
      });
    }
  };

  const getChannelName = (videoId: string) => {
    const video = videos.find(v => v.videoId === videoId);
    if (!video) return "Unknown Channel";
    const channel = channels.find((c: any) => c.channelId === video.channelId);
    return channel?.name || "Unknown Channel";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Insight History</h1>
          <p className="text-muted-foreground mt-1">
            Browse and search through all extracted product management insights
          </p>
        </div>
        {insights.length > 0 && (
          <Button onClick={handleExport} data-testid="button-export-insights">
            <Download className="mr-2 h-4 w-4" />
            Export
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

      {/* Insights Timeline */}
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
          icon={HistoryIcon}
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
