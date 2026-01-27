/**
 * Client-side YouTube Transcript Fetcher
 * Fetches transcripts directly from the user's browser (bypassing cloud IP blocks)
 *
 * Includes rate limiting and retry logic to prevent throttling
 */

interface TranscriptSnippet {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptResult {
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  snippets: TranscriptSnippet[];
  fullText: string;
}

interface CaptionTrack {
  baseUrl: string;
  name: { simpleText: string };
  languageCode: string;
  isTranslatable: boolean;
  kind?: string; // 'asr' for auto-generated
}

// Rate limiting configuration
const RATE_LIMIT = {
  minDelayBetweenRequests: 2000, // 2 seconds minimum between requests
  maxRetries: 3,
  baseRetryDelay: 3000, // 3 seconds base delay for retries
  maxRetryDelay: 30000, // 30 seconds max delay
};

// Track last request time for rate limiting
let lastRequestTime = 0;
const requestQueue: Array<() => void> = [];
let isProcessingQueue = false;

/**
 * Wait for rate limit before making request
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT.minDelayBetweenRequests) {
    const waitTime = RATE_LIMIT.minDelayBetweenRequests - timeSinceLastRequest;
    console.log(`[TranscriptFetcher] Rate limiting: waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  lastRequestTime = Date.now();
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay calculation
 */
function getRetryDelay(attempt: number): number {
  const delay = RATE_LIMIT.baseRetryDelay * Math.pow(2, attempt);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, RATE_LIMIT.maxRetryDelay);
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RATE_LIMIT.maxRetries; attempt++) {
    try {
      await waitForRateLimit();

      const response = await fetch(url, options);

      // Check for rate limiting response
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : getRetryDelay(attempt);
        console.warn(`[TranscriptFetcher] Rate limited (429). Waiting ${waitTime}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
        await sleep(waitTime);
        continue;
      }

      // Check for server errors that might be temporary
      if (response.status >= 500) {
        const waitTime = getRetryDelay(attempt);
        console.warn(`[TranscriptFetcher] Server error (${response.status}). Waiting ${waitTime}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
        await sleep(waitTime);
        continue;
      }

      return response;

    } catch (error: any) {
      lastError = error;

      // Network errors - retry with backoff
      if (error.name === 'TypeError' || error.message.includes('network')) {
        const waitTime = getRetryDelay(attempt);
        console.warn(`[TranscriptFetcher] Network error. Waiting ${waitTime}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
        await sleep(waitTime);
        continue;
      }

      // Other errors - don't retry
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(urlOrId: string): string | null {
  // If it's already just an ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  // Try to parse as URL
  try {
    const url = new URL(urlOrId);

    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }
  } catch {
    // Not a valid URL
  }

  return null;
}

/**
 * Fetch transcript directly from YouTube
 * This works from the browser because it uses the user's IP (not blocked like cloud IPs)
 */
export async function fetchTranscriptClientSide(videoId: string, preferredLanguages: string[] = ['en']): Promise<TranscriptResult> {
  console.log(`[TranscriptFetcher] Starting fetch for video: ${videoId}`);

  try {
    // Step 1: Fetch the YouTube video page to get caption data
    // We use our backend proxy since YouTube doesn't allow direct CORS requests
    console.log(`[TranscriptFetcher] Fetching video page metadata...`);
    const response = await fetchWithRetry(`/api/proxy/youtube-page?videoId=${videoId}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch video page: ${response.status} - ${errorText}`);
    }

    const html = await response.text();

    // Step 2: Extract caption tracks from the page
    const captionTracks = extractCaptionTracks(html);

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('No captions available for this video. The video may not have subtitles enabled.');
    }

    console.log(`[TranscriptFetcher] Found ${captionTracks.length} caption track(s)`);

    // Step 3: Find the best caption track (prefer manual over auto-generated)
    const selectedTrack = selectBestCaptionTrack(captionTracks, preferredLanguages);

    if (!selectedTrack) {
      throw new Error(`No captions found for languages: ${preferredLanguages.join(', ')}`);
    }

    console.log(`[TranscriptFetcher] Selected track: ${selectedTrack.languageCode} (${selectedTrack.kind === 'asr' ? 'auto-generated' : 'manual'})`);

    // Step 4: Fetch the actual transcript XML
    // Add small delay between page fetch and transcript fetch
    await sleep(500);

    console.log(`[TranscriptFetcher] Fetching transcript content...`);
    const transcriptResponse = await fetchWithRetry(`/api/proxy/youtube-transcript?url=${encodeURIComponent(selectedTrack.baseUrl)}`);

    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript content');
    }

    const transcriptXml = await transcriptResponse.text();

    // Step 5: Parse the transcript XML
    const snippets = parseTranscriptXml(transcriptXml);

    if (snippets.length === 0) {
      throw new Error('Transcript was empty or could not be parsed');
    }

    // Step 6: Build the full text
    const fullText = snippets.map(s => s.text).join(' ');

    console.log(`[TranscriptFetcher] Successfully fetched transcript: ${snippets.length} snippets, ${fullText.length} characters`);

    return {
      videoId,
      language: selectedTrack.name?.simpleText || selectedTrack.languageCode,
      languageCode: selectedTrack.languageCode,
      isGenerated: selectedTrack.kind === 'asr',
      snippets,
      fullText,
    };

  } catch (error: any) {
    console.error('[TranscriptFetcher] Fetch failed:', error);
    throw new Error(error.message || 'Failed to fetch transcript');
  }
}

/**
 * Extract caption track information from YouTube page HTML
 */
function extractCaptionTracks(html: string): CaptionTrack[] {
  try {
    // Look for the captions data in the page
    const captionsRegex = /"captions":\s*(\{[\s\S]*?"captionTracks":\s*\[[\s\S]*?\][\s\S]*?\})/;
    const match = html.match(captionsRegex);

    if (!match) {
      // Try alternative pattern
      const altRegex = /captionTracks":\s*(\[[\s\S]*?\])/;
      const altMatch = html.match(altRegex);

      if (altMatch) {
        try {
          return JSON.parse(altMatch[1]);
        } catch {
          return [];
        }
      }
      return [];
    }

    try {
      const captionsData = JSON.parse(match[1]);
      return captionsData.playerCaptionsTracklistRenderer?.captionTracks || [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Select the best caption track based on language preference
 */
function selectBestCaptionTrack(tracks: CaptionTrack[], preferredLanguages: string[]): CaptionTrack | null {
  // First, try to find a manual caption in preferred languages
  for (const lang of preferredLanguages) {
    const manualTrack = tracks.find(
      t => t.languageCode.startsWith(lang) && t.kind !== 'asr'
    );
    if (manualTrack) return manualTrack;
  }

  // Fall back to auto-generated in preferred languages
  for (const lang of preferredLanguages) {
    const autoTrack = tracks.find(
      t => t.languageCode.startsWith(lang) && t.kind === 'asr'
    );
    if (autoTrack) return autoTrack;
  }

  // Fall back to any manual caption
  const anyManual = tracks.find(t => t.kind !== 'asr');
  if (anyManual) return anyManual;

  // Fall back to any caption
  return tracks[0] || null;
}

/**
 * Parse YouTube's transcript XML format
 */
function parseTranscriptXml(xml: string): TranscriptSnippet[] {
  const snippets: TranscriptSnippet[] = [];

  // Parse XML using DOMParser (browser-native)
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const textElements = doc.querySelectorAll('text');

  textElements.forEach(element => {
    const start = parseFloat(element.getAttribute('start') || '0');
    const duration = parseFloat(element.getAttribute('dur') || '0');
    const text = decodeHtmlEntities(element.textContent || '');

    if (text.trim()) {
      snippets.push({ text: text.trim(), start, duration });
    }
  });

  return snippets;
}

/**
 * Decode HTML entities in transcript text
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * BACKUP METHOD: Fetch transcript via YouTube's innertube API
 * This is YouTube's internal API used by their mobile/TV apps
 */
export async function fetchTranscriptViaInnertube(videoId: string, preferredLanguages: string[] = ['en']): Promise<TranscriptResult> {
  console.log(`[TranscriptFetcher:Innertube] Starting innertube fetch for video: ${videoId}`);

  try {
    await waitForRateLimit();

    // Innertube API endpoint for getting video info
    const innertubePayload = {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.00.00',
          hl: 'en',
          gl: 'US',
        },
      },
      videoId: videoId,
    };

    // Use proxy to avoid CORS
    const response = await fetchWithRetry('/api/proxy/innertube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(innertubePayload),
    });

    if (!response.ok) {
      throw new Error(`Innertube API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract captions from innertube response
    const captions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      throw new Error('No captions found via innertube API');
    }

    console.log(`[TranscriptFetcher:Innertube] Found ${captions.length} caption track(s)`);

    // Select best track
    const selectedTrack = selectBestCaptionTrack(captions, preferredLanguages);

    if (!selectedTrack) {
      throw new Error(`No captions found for languages: ${preferredLanguages.join(', ')}`);
    }

    console.log(`[TranscriptFetcher:Innertube] Selected track: ${selectedTrack.languageCode}`);

    // Fetch transcript XML
    await sleep(500);
    const transcriptResponse = await fetchWithRetry(`/api/proxy/youtube-transcript?url=${encodeURIComponent(selectedTrack.baseUrl)}`);

    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript content via innertube');
    }

    const transcriptXml = await transcriptResponse.text();
    const snippets = parseTranscriptXml(transcriptXml);

    if (snippets.length === 0) {
      throw new Error('Transcript was empty or could not be parsed');
    }

    const fullText = snippets.map(s => s.text).join(' ');

    console.log(`[TranscriptFetcher:Innertube] Successfully fetched: ${snippets.length} snippets`);

    return {
      videoId,
      language: selectedTrack.name?.simpleText || selectedTrack.languageCode,
      languageCode: selectedTrack.languageCode,
      isGenerated: selectedTrack.kind === 'asr',
      snippets,
      fullText,
    };

  } catch (error: any) {
    console.error('[TranscriptFetcher:Innertube] Fetch failed:', error);
    throw new Error(error.message || 'Innertube fetch failed');
  }
}

/**
 * BACKUP METHOD: Fetch transcript via YouTube Data API v3
 * Requires YOUTUBE_API_KEY environment variable on server
 */
export async function fetchTranscriptViaYouTubeAPI(videoId: string, preferredLanguages: string[] = ['en']): Promise<TranscriptResult> {
  console.log(`[TranscriptFetcher:YouTubeAPI] Starting YouTube API fetch for video: ${videoId}`);

  try {
    await waitForRateLimit();

    // Call server endpoint that uses YouTube Data API
    const response = await fetchWithRetry(`/api/proxy/youtube-captions-api?videoId=${videoId}&languages=${preferredLanguages.join(',')}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `YouTube API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.snippets || data.snippets.length === 0) {
      throw new Error('No transcript data returned from YouTube API');
    }

    console.log(`[TranscriptFetcher:YouTubeAPI] Successfully fetched: ${data.snippets.length} snippets`);

    return {
      videoId,
      language: data.language || 'English',
      languageCode: data.languageCode || 'en',
      isGenerated: data.isGenerated || false,
      snippets: data.snippets,
      fullText: data.fullText || data.snippets.map((s: TranscriptSnippet) => s.text).join(' '),
    };

  } catch (error: any) {
    console.error('[TranscriptFetcher:YouTubeAPI] Fetch failed:', error);
    throw new Error(error.message || 'YouTube API fetch failed');
  }
}

/**
 * Master fetch function with multiple fallbacks
 * Order: 1) Client-side page scrape, 2) Innertube API, 3) YouTube Data API
 */
export async function fetchTranscriptWithFallbacks(videoId: string, preferredLanguages: string[] = ['en']): Promise<TranscriptResult> {
  const methods = [
    { name: 'client-side', fn: () => fetchTranscriptClientSide(videoId, preferredLanguages) },
    { name: 'innertube', fn: () => fetchTranscriptViaInnertube(videoId, preferredLanguages) },
    { name: 'youtube-api', fn: () => fetchTranscriptViaYouTubeAPI(videoId, preferredLanguages) },
  ];

  let lastError: Error | null = null;

  for (const method of methods) {
    try {
      console.log(`[TranscriptFetcher] Trying method: ${method.name}`);
      const result = await method.fn();
      console.log(`[TranscriptFetcher] Success with method: ${method.name}`);
      return result;
    } catch (error: any) {
      console.warn(`[TranscriptFetcher] Method ${method.name} failed: ${error.message}`);
      lastError = error;
      // Add delay before trying next method
      await sleep(1000);
    }
  }

  throw lastError || new Error('All transcript fetch methods failed');
}
