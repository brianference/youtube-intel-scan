import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";

interface VideoInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function VideoInput({ onSubmit, isLoading }: VideoInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      setUrl("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <CardTitle>Analyze Video</CardTitle>
        </div>
        <CardDescription>
          Enter a YouTube video URL to extract PM insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            data-testid="input-video-url"
          />
          <Button type="submit" disabled={isLoading || !url.trim()} data-testid="button-add-video">
            {isLoading ? "Adding..." : "Add Video"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
