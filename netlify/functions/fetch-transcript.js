const { YoutubeTranscript } = require('youtube-transcript');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const videoId = event.queryStringParameters?.videoId;
    const languages = event.queryStringParameters?.languages || 'en';

    if (!videoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'videoId parameter is required' }),
      };
    }

    console.log(`Fetching transcript for video: ${videoId}`);

    // Fetch transcript with retry logic
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: languages.split(',')[0],
        });

        // Format response to match Python script output
        const fullText = transcript.map((t) => t.text).join(' ');

        const result = {
          videoId,
          language: languages,
          languageCode: languages.split(',')[0],
          isGenerated: true,
          snippets: transcript.map((t) => ({
            text: t.text,
            start: t.offset / 1000, // Convert ms to seconds
            duration: t.duration / 1000,
          })),
          fullText,
        };

        console.log(
          `Successfully fetched transcript for ${videoId} (${transcript.length} snippets)`
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result),
        };
      } catch (err) {
        lastError = err;
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, err.message);

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 3s, 6s
          const delay = 3000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Failed to fetch transcript after retries';

    // Check for specific error types
    if (errorMessage.includes('Transcript is disabled') || errorMessage.includes('disabled')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Transcripts are disabled for this video' }),
      };
    } else if (errorMessage.includes('No transcript') || errorMessage.includes('not available')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No transcript found for this video' }),
      };
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('Video unavailable')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Video is unavailable' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Failed to fetch transcript: ${errorMessage}`,
      }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Server error: ${error.message}`,
      }),
    };
  }
};
