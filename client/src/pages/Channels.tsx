import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChannelCard } from "@/components/ChannelCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Channel } from "@shared/schema";

export default function Channels() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  const addChannelMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/channels', { url });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      setDialogOpen(false);
      setChannelUrl("");
      toast({
        title: "Channel added",
        description: `Added ${data.channel.name} with ${data.videos.length} videos`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add channel",
        variant: "destructive",
      });
    },
  });

  const scanChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiRequest('POST', `/api/channels/${channelId}/scan`, undefined);
      return await response.json();
    },
    onSuccess: (data: any, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      const channel = channels.find(c => c.id === channelId);
      toast({
        title: "Scan complete",
        description: data.newVideos > 0 
          ? `Found ${data.newVideos} new videos` 
          : "No new videos found",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scan channel",
        variant: "destructive",
      });
    },
  });

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScan = (channelId: string) => {
    scanChannelMutation.mutate(channelId);
  };

  const handleView = (channelId: string) => {
    setLocation(`/videos?channelId=${channelId}`);
  };

  const handleAddChannel = () => {
    if (channelUrl) {
      addChannelMutation.mutate(channelUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Channels</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track YouTube channels for analysis
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-channel">
              <Plus className="mr-2 h-4 w-4" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add YouTube Channel</DialogTitle>
              <DialogDescription>
                Enter a YouTube channel URL to start analyzing videos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="https://youtube.com/@channel-name"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                data-testid="input-add-channel-url"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setChannelUrl("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddChannel}
                disabled={!channelUrl || addChannelMutation.isPending}
                data-testid="button-submit-channel"
              >
                {addChannelMutation.isPending ? "Adding..." : "Add Channel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      {channels.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-channels"
          />
        </div>
      )}

      {/* Channel Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading channels...</p>
        </div>
      ) : filteredChannels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              id={channel.id}
              name={channel.name}
              avatarUrl={channel.thumbnailUrl || undefined}
              videoCount={parseInt(channel.videoCount || "0")}
              lastScanned={channel.lastScanned?.toString()}
              subscriberCount={channel.subscriberCount 
                ? `${parseInt(channel.subscriberCount).toLocaleString()} subscribers`
                : undefined
              }
              onScan={() => handleScan(channel.id)}
              onView={() => handleView(channel.id)}
            />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No channels yet"
          description="Start by adding a YouTube channel to analyze product management content and extract insights."
          actionLabel="Add Your First Channel"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No channels found"
          description={`No channels match "${searchQuery}". Try a different search term.`}
        />
      )}
    </div>
  );
}
