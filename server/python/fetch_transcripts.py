#!/usr/bin/env python3
"""
Fetch transcript for a YouTube video using youtube-transcript-api
"""
import sys
import json
import time
import random
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    RequestBlocked,
    YouTubeRequestFailed
)

def fetch_transcript_with_retry(video_id, languages=['en'], max_retries=3):
    """Fetch transcript with exponential backoff retry on rate limits"""
    base_delay = 3  # Start with 3 seconds
    
    for attempt in range(max_retries):
        try:
            # Create API instance
            api = YouTubeTranscriptApi()
            
            # Fetch transcript
            transcript = api.fetch(video_id, languages=languages, preserve_formatting=False)
            
            # Convert snippets to dicts
            snippets_list = []
            texts = []
            for snippet in transcript.snippets:
                snippet_dict = {
                    'text': snippet.text,
                    'start': snippet.start,
                    'duration': snippet.duration
                }
                snippets_list.append(snippet_dict)
                texts.append(snippet.text)
            
            # Format response
            result = {
                'videoId': video_id,
                'language': transcript.language,
                'languageCode': transcript.language_code,
                'isGenerated': transcript.is_generated,
                'snippets': snippets_list,
                'fullText': ' '.join(texts)
            }
            
            return result
            
        except RequestBlocked:
            # On last attempt, give up
            if attempt == max_retries - 1:
                return {
                    'error': f'Request blocked by YouTube after {max_retries} attempts. Please wait 15-30 minutes before trying again.'
                }
            
            # Calculate delay with exponential backoff and jitter
            delay = base_delay * (2 ** attempt)  # 3s, 6s, 12s
            jitter = random.uniform(0, 2)  # Add 0-2 seconds of randomness
            total_delay = delay + jitter
            
            print(f'Rate limited. Retrying in {total_delay:.1f}s (attempt {attempt + 1}/{max_retries})...', file=sys.stderr)
            time.sleep(total_delay)
            continue
            
        except TranscriptsDisabled:
            return {'error': 'Transcripts are disabled for this video'}
        except NoTranscriptFound:
            return {'error': 'No transcript found for this video'}
        except VideoUnavailable:
            return {'error': 'Video is unavailable'}
        except YouTubeRequestFailed as e:
            return {'error': f'YouTube request failed: {str(e)}'}
        except Exception as e:
            return {'error': f'Unexpected error: {str(e)}'}
    
    # Should never reach here
    return {'error': 'Failed to fetch transcript after retries'}

def fetch_transcript(video_id, languages=['en']):
    """Fetch transcript for a video (wrapper for compatibility)"""
    return fetch_transcript_with_retry(video_id, languages)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Video ID required'}))
        sys.exit(1)
    
    video_id = sys.argv[1]
    languages = sys.argv[2].split(',') if len(sys.argv) > 2 else ['en']
    
    result = fetch_transcript(video_id, languages)
    print(json.dumps(result, indent=2))
    
    if 'error' in result:
        sys.exit(1)

if __name__ == '__main__':
    main()
