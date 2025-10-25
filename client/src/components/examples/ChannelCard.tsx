import { ChannelCard } from "../ChannelCard";

export default function ChannelCardExample() {
  const channels = [
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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <ChannelCard
          key={channel.id}
          {...channel}
          onScan={() => console.log('Scan channel:', channel.id)}
          onView={() => console.log('View channel:', channel.id)}
        />
      ))}
    </div>
  );
}
