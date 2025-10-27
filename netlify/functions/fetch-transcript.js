// Cache for proxy list (to avoid hitting webshare API on every request)
let proxyCache = {
  proxies: [],
  lastFetched: 0,
  ttl: 300000, // Cache for 5 minutes
};

// Fetch proxies from webshare.io API
async function getWebshareProxies() {
  const apiKey = process.env.WEBSHARE_API_KEY;
  
  if (!apiKey) {
    console.log('No WEBSHARE_API_KEY found - skipping proxy');
    return [];
  }

  // Return cached proxies if still valid
  const now = Date.now();
  if (proxyCache.proxies.length > 0 && (now - proxyCache.lastFetched) < proxyCache.ttl) {
    console.log(`Using cached proxies (${proxyCache.proxies.length} available)`);
    return proxyCache.proxies;
  }

  try {
    console.log('Fetching proxy list from webshare.io...');
    const response = await fetch('https://proxy.webshare.io/api/v2/proxy/list/', {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Webshare API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const proxies = data.results.map(proxy => ({
      url: `http://${proxy.username}:${proxy.password}@${proxy.proxy_address}:${proxy.port}`,
      host: proxy.proxy_address,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    }));

    console.log(`Fetched ${proxies.length} proxies from webshare.io`);
    
    // Update cache
    proxyCache = {
      proxies,
      lastFetched: now,
      ttl: proxyCache.ttl,
    };

    return proxies;
  } catch (error) {
    console.error('Error fetching webshare proxies:', error.message);
    return [];
  }
}

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
    // Dynamic import for ES modules
    const { Innertube } = await import('youtubei.js');
    const { HttpsProxyAgent } = await import('https-proxy-agent');

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

    // Get proxies from webshare.io
    const proxies = await getWebshareProxies();
    const maxRetries = proxies.length > 0 ? Math.min(3, proxies.length) : 1;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let fetchOptions = {};

        // Use proxy if available
        if (proxies.length > 0) {
          const proxy = proxies[attempt % proxies.length];
          const proxyAgent = new HttpsProxyAgent(proxy.url);
          fetchOptions = { 
            fetch: (input, init) => {
              return fetch(input, {
                ...init,
                agent: proxyAgent
              });
            }
          };
          console.log(`Attempt ${attempt + 1}/${maxRetries} using proxy: ${proxy.host}:${proxy.port}`);
        } else {
          console.log(`Attempt ${attempt + 1}/${maxRetries} without proxy (set WEBSHARE_API_KEY to use proxies)`);
        }

        // Initialize Innertube with proxy
        const youtube = await Innertube.create(fetchOptions);
        
        // Get video info and transcript
        const info = await youtube.getInfo(videoId);
        const transcriptData = await info.getTranscript();
        
        if (!transcriptData || !transcriptData.transcript) {
          throw new Error('No transcript available for this video');
        }

        // Extract transcript content
        const transcript = transcriptData.transcript.content;
        const segments = transcript.body.initial_segments;

        if (!segments || segments.length === 0) {
          throw new Error('Transcript is disabled for this video');
        }

        // Format to match Python script output
        const snippets = segments.map(segment => ({
          text: segment.snippet.text,
          start: segment.start_ms / 1000, // Convert ms to seconds
          duration: segment.end_ms / 1000 - segment.start_ms / 1000,
        }));

        const fullText = snippets.map(s => s.text).join(' ');

        const result = {
          videoId,
          language: languages,
          languageCode: languages.split(',')[0],
          isGenerated: true,
          snippets,
          fullText,
        };

        console.log(
          `Successfully fetched transcript for ${videoId} (${snippets.length} snippets, ${fullText.length} chars)`
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
          // Short delay before next attempt (1 second)
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
