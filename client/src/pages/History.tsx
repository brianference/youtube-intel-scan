import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { History as HistoryIcon, CheckCircle2, XCircle, Clock, Download, Sparkles, Video as VideoIcon } from "lucide-react";
import type { Video, Channel } from "@shared/schema";

interface ActivityItem {
  id: string;
  type: 'channel_scan' | 'transcript_download' | 'analysis';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  details?: string;
}

export default function History() {
  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // Build activity timeline from data
  const activities: ActivityItem[] = [];

  // Add channel scans
  channels.forEach(channel => {
    if (channel.lastScanned) {
      activities.push({
        id: `scan-${channel.id}`,
        type: 'channel_scan',
        title: 'Channel Scanned',
        description: `Scanned ${channel.name} for new videos`,
        timestamp: new Date(channel.lastScanned),
        status: 'success',
        details: `Found ${videos.filter(v => v.channelId === channel.channelId).length} videos`,
      });
    }
  });

  // Add transcript downloads
  videos
    .filter(v => v.transcriptDownloaded)
    .forEach(video => {
      activities.push({
        id: `transcript-${video.id}`,
        type: 'transcript_download',
        title: 'Transcript Downloaded',
        description: video.title,
        timestamp: new Date(video.publishedAt), // Using publishedAt as proxy since we don't track download time
        status: 'success',
      });
    });

  // Add analyses
  videos
    .filter(v => v.analyzed)
    .forEach(video => {
      activities.push({
        id: `analysis-${video.id}`,
        type: 'analysis',
        title: 'Video Analyzed',
        description: video.title,
        timestamp: new Date(video.publishedAt), // Using publishedAt as proxy
        status: 'success',
      });
    });

  // Sort by timestamp descending (most recent first)
  const sortedActivities = activities.sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'channel_scan':
        return <VideoIcon className="h-4 w-4" />;
      case 'transcript_download':
        return <Download className="h-4 w-4" />;
      case 'analysis':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return null;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Activity History</h1>
        <p className="text-muted-foreground mt-1">
          Track all processing activities, scans, downloads, and analyses
        </p>
      </div>

      {/* Stats */}
      {sortedActivities.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Channels Scanned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {channels.filter(c => c.lastScanned).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Videos Discovered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {videos.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transcripts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {videos.filter(v => v.transcriptDownloaded).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {videos.filter(v => v.analyzed).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Timeline */}
      {sortedActivities.length > 0 ? (
        <div className="space-y-3">
          {sortedActivities.slice(0, 50).map((activity) => (
            <Card key={activity.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="shrink-0">
                        <span className="flex items-center gap-1">
                          {getActivityIcon(activity.type)}
                          <span className="text-xs">
                            {activity.type.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </span>
                        </span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-0.5">{activity.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {activity.description}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.details}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={HistoryIcon}
          title="No activity yet"
          description="Start by adding a YouTube channel and scanning for videos. All processing activities will be tracked here."
        />
      )}
    </div>
  );
}
