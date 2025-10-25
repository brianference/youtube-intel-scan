import { InsightCard } from "../InsightCard";

export default function InsightCardExample() {
  const insights = [
    {
      id: "1",
      insight: "Product-market fit isn't a one-time achievement. It's a continuous journey of adaptation as your market evolves. The key is building feedback loops that tell you when you're drifting away from fit.",
      videoTitle: "The Truth About Product-Market Fit",
      channelName: "PM School",
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
      category: "Product Strategy",
    },
    {
      id: "2",
      insight: "Don't confuse outputs with outcomes. Shipping features is an output. Changing user behavior is an outcome. Your OKRs should always focus on outcomes.",
      videoTitle: "OKRs for Product Managers",
      channelName: "Product Leaders",
      timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      category: "Metrics & KPIs",
    },
  ];

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          {...insight}
          onViewVideo={() => console.log('View video:', insight.id)}
        />
      ))}
    </div>
  );
}
