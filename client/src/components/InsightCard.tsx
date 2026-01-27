import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Quote, 
  ExternalLink, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Target,
  CheckCircle2,
  Zap,
  Copy
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Insight } from "@shared/schema";

interface InsightCardProps {
  id: string;
  insight: string;
  videoTitle: string;
  channelName: string;
  timestamp: string;
  category?: string;
  onViewVideo?: () => void;
  // Elite framework fields
  transcriptNugget?: string | null;
  whyItMatters?: string | null;
  actionableSteps?: string[] | null;
  riceScore?: {
    reach: number;
    impact: number;
    confidence: number;
    effort: number;
    total?: number;
  } | null;
  toolsNeeded?: string[] | null;
  examplePrompt?: string | null;
}

export function InsightCard({
  id,
  insight,
  videoTitle,
  channelName,
  timestamp,
  category,
  onViewVideo,
  transcriptNugget,
  whyItMatters,
  actionableSteps,
  riceScore,
  toolsNeeded,
  examplePrompt,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const extractDate = new Date(timestamp);

  // Check if this is an elite insight (has rich data)
  const isEliteInsight = Boolean(
    transcriptNugget || 
    whyItMatters || 
    actionableSteps || 
    riceScore || 
    toolsNeeded || 
    examplePrompt
  );

  const handleCopyPrompt = async () => {
    if (examplePrompt) {
      await navigator.clipboard.writeText(examplePrompt);
      toast({
        title: "Copied!",
        description: "Example prompt copied to clipboard",
      });
    }
  };

  const getRiceScoreColor = (score: number, type: 'reach' | 'impact' | 'confidence' | 'effort') => {
    if (type === 'effort') {
      // For effort, higher is better (easier)
      if (score >= 8) return "bg-green-500/10 text-green-700 dark:text-green-400";
      if (score >= 5) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    } else {
      // For reach, impact, confidence - higher is better
      if (score >= 8) return "bg-green-500/10 text-green-700 dark:text-green-400";
      if (score >= 5) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    }
  };

  const getPriorityBadge = (total?: number) => {
    if (!total) return null;
    if (total >= 400) return { label: "Critical Priority", color: "bg-red-500/10 text-red-700 dark:text-red-400" };
    if (total >= 200) return { label: "High Priority", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400" };
    if (total >= 100) return { label: "Medium Priority", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" };
    return { label: "Low Priority", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" };
  };

  return (
    <Card className="overflow-hidden" data-testid={`card-insight-${id}`}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {category && (
                  <Badge variant="secondary" className="shrink-0">
                    {category}
                  </Badge>
                )}
                {riceScore?.total && (
                  <Badge className={`shrink-0 ${getPriorityBadge(riceScore.total)?.color}`}>
                    <Zap className="mr-1 h-3 w-3" />
                    {getPriorityBadge(riceScore.total)?.label}
                  </Badge>
                )}
              </div>
              
              <p className="font-medium leading-relaxed" data-testid="text-insight-content">
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
            </div>

            {isEliteInsight && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                data-testid="button-expand-insight"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expandable Elite Content */}
      {isEliteInsight && isExpanded && (
        <CardContent className="pt-0 space-y-4 border-t">
          {/* RICE Scores */}
          {riceScore && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Impact Score
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className={`p-2 rounded-md ${getRiceScoreColor(riceScore.reach, 'reach')}`}>
                  <div className="text-xs font-medium">Reach</div>
                  <div className="text-lg font-bold">{riceScore.reach}/10</div>
                </div>
                <div className={`p-2 rounded-md ${getRiceScoreColor(riceScore.impact, 'impact')}`}>
                  <div className="text-xs font-medium">Impact</div>
                  <div className="text-lg font-bold">{riceScore.impact}/10</div>
                </div>
                <div className={`p-2 rounded-md ${getRiceScoreColor(riceScore.confidence, 'confidence')}`}>
                  <div className="text-xs font-medium">Confidence</div>
                  <div className="text-lg font-bold">{riceScore.confidence}/10</div>
                </div>
                <div className={`p-2 rounded-md ${getRiceScoreColor(riceScore.effort, 'effort')}`}>
                  <div className="text-xs font-medium">Effort</div>
                  <div className="text-lg font-bold">{riceScore.effort}/10</div>
                </div>
                {riceScore.total && (
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <div className="text-xs font-medium">Total</div>
                    <div className="text-lg font-bold">{Math.round(riceScore.total)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transcript Nugget */}
          {transcriptNugget && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Quote className="h-4 w-4" />
                From the Transcript
              </h4>
              <div className="pl-4 border-l-2 border-accent">
                <p className="text-sm italic text-muted-foreground">{transcriptNugget}</p>
              </div>
            </div>
          )}

          {/* Why It Matters */}
          {whyItMatters && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Why It Matters
              </h4>
              <p className="text-sm leading-relaxed">{whyItMatters}</p>
            </div>
          )}

          {/* Actionable Steps */}
          {actionableSteps && actionableSteps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Actionable Steps
              </h4>
              <ol className="space-y-2 list-decimal list-inside">
                {actionableSteps.map((step, index) => (
                  <li key={index} className="text-sm leading-relaxed">
                    <span className="ml-2">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tools Needed */}
          {toolsNeeded && toolsNeeded.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Tools & Resources</h4>
              <div className="flex flex-wrap gap-2">
                {toolsNeeded.map((tool, index) => (
                  <Badge key={index} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Example Prompt */}
          {examplePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Example Prompt / Template</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  data-testid="button-copy-prompt"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-xs whitespace-pre-wrap font-mono">{examplePrompt}</pre>
              </div>
            </div>
          )}

          {/* Actions */}
          {onViewVideo && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onViewVideo}
                data-testid="button-view-video"
              >
                View Source Video
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {/* Legacy View for non-elite insights */}
      {!isEliteInsight && onViewVideo && (
        <CardContent className="pt-0">
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
        </CardContent>
      )}
    </Card>
  );
}
