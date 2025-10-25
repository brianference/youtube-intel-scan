import { EmptyState } from "../EmptyState";
import { Video } from "lucide-react";

export default function EmptyStateExample() {
  return (
    <EmptyState
      icon={Video}
      title="No videos found"
      description="Start by analyzing a YouTube channel to discover product management insights from video transcripts."
      actionLabel="Add Channel"
      onAction={() => console.log('Add channel clicked')}
    />
  );
}
