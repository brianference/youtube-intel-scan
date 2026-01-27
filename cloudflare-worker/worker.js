/**
 * Cloudflare Worker - YouTube Transcript Proxy
 * Deploy this to Cloudflare Workers (free tier: 100k requests/day)
 *
 * This bypasses YouTube's IP blocking since Cloudflare IPs are not blocked.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route: /youtube-page?videoId=xxx
      if (path === '/youtube-page') {
        const videoId = url.searchParams.get('videoId');
        if (!videoId) {
          return jsonResponse({ error: 'videoId required' }, 400);
        }
        return await fetchYouTubePage(videoId);
      }

      // Route: /youtube-transcript?url=xxx
      if (path === '/youtube-transcript') {
        const transcriptUrl = url.searchParams.get('url');
        if (!transcriptUrl) {
          return jsonResponse({ error: 'url required' }, 400);
        }
        return await fetchTranscript(transcriptUrl);
      }

      // Route: /innertube (POST)
      if (path === '/innertube' && request.method === 'POST') {
        const body = await request.json();
        return await fetchInnertube(body.videoId, body.context);
      }

      // Health check
      if (path === '/' || path === '/health') {
        return jsonResponse({
          status: 'ok',
          service: 'youtube-transcript-proxy',
          endpoints: ['/youtube-page', '/youtube-transcript', '/innertube']
        });
      }

      return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message || 'Internal error' }, 500);
    }
  },
};

async function fetchYouTubePage(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    return jsonResponse({ error: `YouTube returned ${response.status}` }, response.status);
  }

  const html = await response.text();

  // Check for consent/login page
  if (html.includes('accounts.google.com/ServiceLogin') || html.includes('consent.youtube.com')) {
    return jsonResponse({ error: 'YouTube consent page detected' }, 403);
  }

  return new Response(html, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

async function fetchTranscript(transcriptUrl) {
  // Validate URL
  if (!transcriptUrl.includes('youtube.com') && !transcriptUrl.includes('googlevideo.com')) {
    return jsonResponse({ error: 'Invalid transcript URL' }, 400);
  }

  const response = await fetch(transcriptUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/xml,application/xml,*/*',
    },
  });

  if (!response.ok) {
    return jsonResponse({ error: `Transcript fetch failed: ${response.status}` }, response.status);
  }

  const xml = await response.text();

  return new Response(xml, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/xml; charset=utf-8',
    },
  });
}

async function fetchInnertube(videoId, context) {
  if (!videoId) {
    return jsonResponse({ error: 'videoId required' }, 400);
  }

  const payload = {
    context: context || {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
        hl: 'en',
        gl: 'US',
      },
    },
    videoId: videoId,
  };

  const response = await fetch(
    'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    return jsonResponse({ error: `Innertube API returned ${response.status}` }, response.status);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}
