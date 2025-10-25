import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  id: string;
  title: string;
  publishedAt: string;
  analyzed: boolean;
  channelName?: string;
  onClick?: () => void;
}

export function VideoCard({ id, title, publishedAt, analyzed, channelName, onClick }: VideoCardProps) {
  const publishDate = new Date(publishedAt);
  
  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`card-video-${id}`}
    >
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm line-clamp-2 flex-1">
            {title}
          </CardTitle>
          {analyzed ? (
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" data-testid="icon-analyzed" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" data-testid="icon-pending" />
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(publishDate, { addSuffix: true })}</span>
        </div>

        {channelName && (
          <p className="text-xs text-muted-foreground">
            {channelName}
          </p>
        )}
        
        <Badge
          variant={analyzed ? "secondary" : "default"}
          className="w-fit text-xs"
          data-testid={`badge-status-${analyzed ? 'analyzed' : 'pending'}`}
        >
          {analyzed ? "Analyzed" : "Ready"}
        </Badge>
      </CardHeader>
    </Card>
  );
}
