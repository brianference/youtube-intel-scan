import { useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { VideoCard } from "@/components/VideoCard";
import { ChannelInput } from "@/components/ChannelInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, CheckCircle2, Clock, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// TODO: Remove mock functionality
const mockVideos = [
  {
    id: "1",
    title: "Product Management Fundamentals: Building Your First Roadmap",
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    analyzed: true,
    channelName: "PM School",
  },
  {
    id: "2",
    title: "Advanced Product Discovery Techniques for 2025",
    publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    analyzed: false,
    channelName: "Product Leaders",
  },
  {
    id: "3",
    title: "OKRs vs KPIs: What Product Managers Need to Know",
    publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    analyzed: true,
    channelName: "Tech Strategy",
  },
  {
    id: "4",
    title: "User Research Methods That Actually Work",
    publishedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    analyzed: false,
    channelName: "PM School",
  },
  {
    id: "5",
    title: "How to Run Effective Sprint Planning Meetings",
    publishedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    analyzed: true,
    channelName: "Product Leaders",
  },
  {
    id: "6",
    title: "Building a Data-Driven Product Culture",
    publishedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    analyzed: false,
    channelName: "Tech Strategy",
  },
];

export default function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videos, setVideos] = useState(mockVideos);
  const { toast } = useToast();

  const handleAnalyze = (url: string) => {
    setIsAnalyzing(true);
    setProgress(10);

    // TODO: Remove mock functionality - simulate analysis
    setTimeout(() => {
      setProgress(50);
      setTimeout(() => {
        setProgress(100);
        toast({
          title: "Channel analyzed",
          description: `Found ${videos.length} videos, ${videos.filter(v => !v.analyzed).length} new`,
        });
        setTimeout(() => {
          setIsAnalyzing(false);
          setProgress(0);
        }, 500);
      }, 1000);
    }, 1500);
  };

  const analyzedCount = videos.filter(v => v.analyzed).length;
  const pendingCount = videos.filter(v => !v.analyzed).length;

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
        <StatsCard title="Total Videos" value={videos.length} icon={Video} description="Across channels" />
        <StatsCard title="Analyzed" value={analyzedCount} icon={CheckCircle2} description={`${Math.round((analyzedCount / videos.length) * 100)}%`} />
        <StatsCard title="Pending" value={pendingCount} icon={Clock} description={`${Math.round((pendingCount / videos.length) * 100)}%`} />
      </div>

      {/* Input Section */}
      <ChannelInput
        onAnalyze={handleAnalyze}
        isLoading={isAnalyzing}
        progress={progress}
      />

      {/* Video List */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Videos Found</h2>
            <Badge variant="secondary" className="text-sm">
              {pendingCount} new videos
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                {...video}
                onClick={() => console.log('Video clicked:', video.id)}
              />
            ))}
          </div>

          <Button className="w-full" size="lg" data-testid="button-download-analyze">
            <Download className="mr-2 h-4 w-4" />
            Download & Analyze New Videos
          </Button>
        </div>
      )}
    </div>
  );
}
