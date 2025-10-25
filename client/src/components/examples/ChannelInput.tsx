import { ChannelInput } from "../ChannelInput";
import { useState } from "react";

export default function ChannelInputExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = (url: string) => {
    console.log('Analyzing channel:', url);
    setIsLoading(true);
    setProgress(10);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsLoading(false);
            setProgress(0);
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <ChannelInput
      onAnalyze={handleAnalyze}
      isLoading={isLoading}
      progress={progress}
    />
  );
}
