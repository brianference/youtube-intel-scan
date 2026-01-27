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
