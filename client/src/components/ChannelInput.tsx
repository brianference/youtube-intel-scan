import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Youtube, Sparkles, Download } from "lucide-react";

interface ChannelInputProps {
  onAnalyze?: (url: string) => void;
  isLoading?: boolean;
  progress?: number;
}

export function ChannelInput({ onAnalyze, isLoading = false, progress = 0 }: ChannelInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (url && onAnalyze) {
      onAnalyze(url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-primary" />
          Analyze Channel
        </CardTitle>
        <CardDescription>
          Enter a YouTube channel URL to start analyzing transcripts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Input
            placeholder="https://youtube.com/@channel-name"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-12 text-base"
            disabled={isLoading}
            data-testid="input-channel-url"
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !url}
            className="h-12 px-6"
            data-testid="button-analyze"
          >
            {isLoading ? (
              <>
                <Download className="mr-2 h-4 w-4 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" data-testid="progress-analysis" />
            <p className="text-sm text-muted-foreground">
              {progress < 50 ? "Fetching channel data..." : "Loading video list..."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
