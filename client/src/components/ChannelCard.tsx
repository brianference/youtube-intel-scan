import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Video, Users, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChannelCardProps {
  id: string;
  name: string;
  avatarUrl?: string;
  videoCount: number;
  lastScanned?: string;
  subscriberCount?: string;
  onScan?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ChannelCard({
  id,
  name,
  avatarUrl,
  videoCount,
  lastScanned,
  subscriberCount,
  onScan,
  onView,
  onDelete,
  isDeleting = false,
}: ChannelCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover-elevate" data-testid={`card-channel-${id}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <h3 className="text-xl font-semibold" data-testid={`text-channel-name-${id}`}>
          {name}
        </h3>
        {subscriberCount && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Users className="h-3 w-3" />
            {subscriberCount}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Video className="h-4 w-4" />
            Videos
          </span>
          <span className="font-medium">{videoCount}</span>
        </div>
        
        {lastScanned && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last scan
            </span>
            <span className="font-medium text-xs">
              {formatDistanceToNow(new Date(lastScanned), { addSuffix: true })}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={onScan}
            data-testid={`button-scan-${id}`}
          >
            Scan
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onView}
            data-testid={`button-view-${id}`}
          >
            View
          </Button>
        </div>

        {onDelete && (
          <>
            <Button
              variant="destructive"
              className="w-full"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              data-testid={`button-delete-${id}`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Channel"}
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{name}</strong> and all associated videos, transcripts, and insights. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid={`button-cancel-delete-${id}`}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete();
                      setShowDeleteDialog(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid={`button-confirm-delete-${id}`}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
