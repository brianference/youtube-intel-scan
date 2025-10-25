import { useState } from "react";
import { InsightCard } from "@/components/InsightCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History as HistoryIcon, Search, Filter } from "lucide-react";

// TODO: Remove mock functionality
const mockInsights = [
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
  {
    id: "3",
    insight: "The best user research happens when you observe what people do, not what they say. Watch their actions, their hesitations, their workarounds. That's where the real insights live.",
    videoTitle: "User Research Methods That Work",
    channelName: "PM School",
    timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
    category: "User Research",
  },
  {
    id: "4",
    insight: "A good product roadmap is a strategic communication tool, not a feature wish list. It should articulate why you're building something, not just what you're building.",
    videoTitle: "Building Better Roadmaps",
    channelName: "Tech Strategy",
    timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
    category: "Product Strategy",
  },
  {
    id: "5",
    insight: "Data tells you what's happening. User research tells you why. You need both to make informed product decisions. One without the other is incomplete.",
    videoTitle: "Data-Driven Product Development",
    channelName: "Product Leaders",
    timestamp: new Date(Date.now() - 14 * 86400000).toISOString(),
    category: "User Research",
  },
];

export default function History() {
  const [insights] = useState(mockInsights);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = Array.from(new Set(insights.map(i => i.category)));

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.insight.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         insight.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         insight.channelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || insight.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Insight History</h1>
        <p className="text-muted-foreground mt-1">
          Browse and search through all extracted product management insights
        </p>
      </div>

      {/* Filters */}
      {insights.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search insights, videos, or channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-insights"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="All categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Insights Timeline */}
      {filteredInsights.length > 0 ? (
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              {...insight}
              onViewVideo={() => console.log('View video:', insight.id)}
            />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No insights yet"
          description="Once you analyze YouTube videos, extracted product management insights will appear here for easy reference and learning."
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No insights found"
          description={`No insights match your current filters. Try adjusting your search or category selection.`}
        />
      )}

      {filteredInsights.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" data-testid="button-load-more">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
