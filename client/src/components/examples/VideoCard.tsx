import { VideoCard } from "../VideoCard";

export default function VideoCardExample() {
  const videos = [
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
      publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      analyzed: false,
      channelName: "Product Leaders",
    },
    {
      id: "3",
      title: "OKRs vs KPIs: What Product Managers Need to Know",
      publishedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      analyzed: true,
      channelName: "Tech Strategy",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          {...video}
          onClick={() => console.log('Video clicked:', video.id)}
        />
      ))}
    </div>
  );
}
