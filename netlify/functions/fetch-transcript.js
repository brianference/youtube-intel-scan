// Netlify Function to proxy YouTube transcript requests
// This runs on Netlify's infrastructure, bypassing Replit's blocked IPs

const { YoutubeTranscript } = require('youtube-transcript');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Get parameters from query string or body
    const params = event.httpMethod === 'GET'
      ? event.queryStringParameters
      : JSON.parse(event.body || '{}');

    const { videoId, languages } = params;

    if (!videoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Video ID is required' }),
      };
    }

    console.log(`Fetching transcript for video: ${videoId}`);

    // Parse languages parameter
    const languageCodes = languages ? languages.split(',') : ['en'];

    // Fetch transcript using youtube-transcript library
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: languageCodes[0],
    });

    if (!transcript || transcript.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No transcript found for this video' }),
      };
    }

    // Format response to match your Python script's format
    const fullText = transcript.map(item => item.text).join(' ');
    const snippets = transcript.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert ms to seconds
      duration: item.duration / 1000,
    }));

    const result = {
      videoId: videoId,
      language: 'English', // youtube-transcript doesn't provide language info
      languageCode: languageCodes[0],
      isGenerated: false, // youtube-transcript doesn't provide this info
      snippets: snippets,
      fullText: fullText,
    };

    console.log(`Successfully fetched transcript: ${fullText.length} characters`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Error fetching transcript:', error);

    let errorMessage = 'Failed to fetch transcript';
    let statusCode = 500;

    // Map common errors
    if (error.message && error.message.includes('Could not find video')) {
      errorMessage = 'Video not found';
      statusCode = 404;
    } else if (error.message && error.message.includes('Transcript is disabled')) {
      errorMessage = 'Transcripts are disabled for this video';
      statusCode = 400;
    } else if (error.message && error.message.includes('No transcripts available')) {
      errorMessage = 'No transcript found for this video';
      statusCode = 404;
    }

    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        details: error.message
      }),
    };
  }
};
