import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Quote, ExternalLink, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InsightCardProps {
  id: string;
  insight: string;
  videoTitle: string;
  channelName: string;
  timestamp: string;
  category?: string;
  onViewVideo?: () => void;
}

export function InsightCard({
  id,
  insight,
  videoTitle,
  channelName,
  timestamp,
  category,
  onViewVideo,
}: InsightCardProps) {
  const extractDate = new Date(timestamp);

  return (
    <Card className="p-6 border-l-4 border-l-accent" data-testid={`card-insight-${id}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Quote className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
          <div className="flex-1 space-y-2">
            <p className="text-base leading-relaxed" data-testid="text-insight-content">
              {insight}
            </p>
            
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{videoTitle}</span>
              <span>•</span>
              <span>{channelName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(extractDate, { addSuffix: true })}
              </span>
            </div>

            {category && (
              <Badge variant="secondary" className="mt-2">
                {category}
              </Badge>
            )}
          </div>
        </div>

        {onViewVideo && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={onViewVideo}
            data-testid="button-view-video"
          >
            View Video
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}
