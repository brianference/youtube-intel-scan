import { YoutubeTranscript } from "https://esm.sh/youtube-transcript@1.2.1";

export default async (request: Request) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers, status: 200 });
  }

  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const languages = url.searchParams.get("languages") || "en";

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "videoId parameter is required" }),
        { status: 400, headers }
      );
    }

    console.log(`Fetching transcript for video: ${videoId}`);

    // Fetch transcript with retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(
          videoId,
          {
            lang: languages.split(",")[0],
          }
        );

        // Format response
        const fullText = transcript.map((t: any) => t.text).join(" ");

        const result = {
          videoId,
          language: languages,
          languageCode: languages.split(",")[0],
          isGenerated: true,
          snippets: transcript.map((t: any) => ({
            text: t.text,
            start: t.offset / 1000, // Convert ms to seconds
            duration: t.duration / 1000,
          })),
          fullText,
        };

        console.log(
          `Successfully fetched transcript for ${videoId} (${transcript.length} snippets)`
        );

        return new Response(JSON.stringify(result), {
          status: 200,
          headers,
        });
      } catch (err: any) {
        lastError = err;
        console.error(
          `Attempt ${attempt + 1}/${maxRetries} failed:`,
          err.message
        );

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 3s, 6s
          const delay = 3000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage =
      lastError?.message || "Failed to fetch transcript after retries";

    // Check for specific error types
    if (errorMessage.includes("Transcript is disabled")) {
      return new Response(
        JSON.stringify({ error: "Transcripts are disabled for this video" }),
        { status: 404, headers }
      );
    } else if (errorMessage.includes("No transcript found")) {
      return new Response(
        JSON.stringify({ error: "No transcript found for this video" }),
        { status: 404, headers }
      );
    } else if (errorMessage.includes("Video unavailable")) {
      return new Response(
        JSON.stringify({ error: "Video is unavailable" }),
        { status: 404, headers }
      );
    }

    return new Response(
      JSON.stringify({
        error: `Failed to fetch transcript: ${errorMessage}`,
      }),
      { status: 500, headers }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: `Server error: ${error.message}`,
      }),
      { status: 500, headers }
    );
  }
};
