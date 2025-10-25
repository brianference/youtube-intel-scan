#!/usr/bin/env python3
"""
Fetch transcript for a YouTube video using youtube-transcript-api
"""
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    TooManyRequests,
    YouTubeRequestFailed
)

def fetch_transcript(video_id, languages=['en']):
    """Fetch transcript for a video"""
    try:
        # Get transcript
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Try to find transcript in requested languages
        transcript = None
        for lang in languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                break
            except:
                continue
        
        # If no match, get any available transcript
        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(languages)
            except:
                # Get first available transcript
                for t in transcript_list:
                    transcript = t
                    break
        
        if not transcript:
            return {'error': 'No transcript available'}
        
        # Fetch the transcript data
        transcript_data = transcript.fetch()
        
        # Format response
        result = {
            'videoId': video_id,
            'language': transcript.language,
            'languageCode': transcript.language_code,
            'isGenerated': transcript.is_generated,
            'snippets': transcript_data,
            'fullText': ' '.join([entry['text'] for entry in transcript_data])
        }
        
        return result
        
    except TranscriptsDisabled:
        return {'error': 'Transcripts are disabled for this video'}
    except NoTranscriptFound:
        return {'error': 'No transcript found for this video'}
    except VideoUnavailable:
        return {'error': 'Video is unavailable'}
    except TooManyRequests:
        return {'error': 'Too many requests. Please try again later.'}
    except YouTubeRequestFailed as e:
        return {'error': f'YouTube request failed: {str(e)}'}
    except Exception as e:
        return {'error': f'Unexpected error: {str(e)}'}

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
