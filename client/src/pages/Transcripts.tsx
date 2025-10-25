import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Search, Download, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Video } from "@shared/schema";

export default function Transcripts() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const videosWithTranscripts = videos.filter(v => v.transcriptDownloaded);

  const filteredVideos = videosWithTranscripts.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Transcripts</h1>
        <p className="text-muted-foreground mt-1">
          Browse and export downloaded video transcripts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videosWithTranscripts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {videosWithTranscripts.filter(v => v.analyzed).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready to Analyze</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {videosWithTranscripts.filter(v => !v.analyzed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {videosWithTranscripts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-transcripts"
          />
        </div>
      )}

      {/* Transcripts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading transcripts...</p>
        </div>
      ) : filteredVideos.length > 0 ? (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {filteredVideos.map((video) => (
              <Card key={video.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-2">{video.title}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {new Date(video.publishedAt).toLocaleDateString()}
                        </p>
                        {video.analyzed && (
                          <Badge variant="default" className="text-xs">
                            Analyzed
                          </Badge>
                        )}
                        {video.transcriptLanguage && (
                          <Badge variant="outline" className="text-xs">
                            {video.transcriptLanguage}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportTranscript(video.id, video.title)}
                      data-testid={`button-export-transcript-${video.id}`}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Export Transcript
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                      data-testid={`button-view-video-${video.id}`}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : videosWithTranscripts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No transcripts yet"
          description="Download transcripts from the Videos page to view and export them here."
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No transcripts found"
          description="No transcripts match your search query."
        />
      )}
    </div>
  );
}
