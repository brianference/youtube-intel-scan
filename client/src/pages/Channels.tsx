import { useState } from "react";
import { ChannelCard } from "@/components/ChannelCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// TODO: Remove mock functionality
const mockChannels = [
  {
    id: "1",
    name: "PM School",
    videoCount: 42,
    lastScanned: new Date(Date.now() - 3 * 86400000).toISOString(),
    subscriberCount: "125K subscribers",
  },
  {
    id: "2",
    name: "Product Leaders",
    videoCount: 67,
    lastScanned: new Date(Date.now() - 7 * 86400000).toISOString(),
    subscriberCount: "89K subscribers",
  },
  {
    id: "3",
    name: "Tech Strategy",
    videoCount: 34,
    lastScanned: new Date(Date.now() - 1 * 86400000).toISOString(),
    subscriberCount: "56K subscribers",
  },
  {
    id: "4",
    name: "Product Management Insider",
    videoCount: 28,
    lastScanned: new Date(Date.now() - 5 * 86400000).toISOString(),
    subscriberCount: "45K subscribers",
  },
  {
    id: "5",
    name: "Agile PM",
    videoCount: 51,
    lastScanned: new Date(Date.now() - 2 * 86400000).toISOString(),
    subscriberCount: "72K subscribers",
  },
];

export default function Channels() {
  const [channels] = useState(mockChannels);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScan = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    toast({
      title: "Scanning channel",
      description: `Starting scan for ${channel?.name}...`,
    });
    console.log('Scan channel:', channelId);
  };

  const handleView = (channelId: string) => {
    console.log('View channel:', channelId);
  };

  const handleAddChannel = () => {
    console.log('Add channel clicked');
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
        <Button onClick={handleAddChannel} data-testid="button-add-channel">
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
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
      {filteredChannels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              {...channel}
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
          onAction={handleAddChannel}
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
