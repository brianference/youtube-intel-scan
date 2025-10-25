#!/usr/bin/env python3
"""
Fetch a single video's metadata from YouTube using the YouTube Data API v3
"""
import os
import sys
import json
import re
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

def parse_iso8601_duration(duration):
    """Parse ISO 8601 duration format (e.g., PT1H2M10S) and return seconds"""
    if not duration:
        return 0
    
    # Extract hours, minutes, seconds using regex
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    return hours * 3600 + minutes * 60 + seconds

def extract_video_id(url_or_id):
    """Extract video ID from various YouTube URL formats"""
    # If it's already a video ID (11 characters)
    if len(url_or_id) == 11 and not '/' in url_or_id:
        return url_or_id
    
    # Handle various URL formats
    if 'youtube.com' in url_or_id or 'youtu.be' in url_or_id:
        # youtu.be/VIDEO_ID
        if 'youtu.be/' in url_or_id:
            return url_or_id.split('youtu.be/')[1].split('?')[0].split('&')[0]
        # youtube.com/watch?v=VIDEO_ID
        elif 'watch?v=' in url_or_id:
            return url_or_id.split('watch?v=')[1].split('&')[0]
        # youtube.com/embed/VIDEO_ID
        elif '/embed/' in url_or_id:
            return url_or_id.split('/embed/')[1].split('?')[0]
        # youtube.com/v/VIDEO_ID
        elif '/v/' in url_or_id:
            return url_or_id.split('/v/')[1].split('?')[0]
    
    return url_or_id

def get_video_info(youtube, video_id):
    """Get video information by ID"""
    try:
        response = youtube.videos().list(
            part='snippet,contentDetails,statistics',
            id=video_id
        ).execute()
        
        if not response.get('items'):
            return None
        
        video = response['items'][0]
        snippet = video['snippet']
        content_details = video['contentDetails']
        statistics = video['statistics']
        
        # Check duration - exclude shorts (< 2 minutes)
        duration = content_details.get('duration', '')
        duration_seconds = parse_iso8601_duration(duration)
        
        if duration_seconds < 120:
            return {
                'error': 'Video is too short (less than 2 minutes). Shorts are not supported.'
            }
        
        return {
            'videoId': video['id'],
            'channelId': snippet['channelId'],
            'channelTitle': snippet['channelTitle'],
            'title': snippet['title'],
            'description': snippet.get('description', ''),
            'publishedAt': snippet['publishedAt'],
            'thumbnailUrl': snippet['thumbnails'].get('high', {}).get('url', ''),
            'duration': duration,
            'viewCount': statistics.get('viewCount', '0'),
        }
    except HttpError as e:
        print(f"Error fetching video info: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Video URL or ID required'}))
        sys.exit(1)
    
    video_input = sys.argv[1]
    
    api_key = os.environ.get('YOUTUBE_API_KEY')
    if not api_key:
        print(json.dumps({'error': 'YOUTUBE_API_KEY environment variable not set'}))
        sys.exit(1)
    
    try:
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        # Extract video ID
        video_id = extract_video_id(video_input)
        
        # Get video info
        video_info = get_video_info(youtube, video_id)
        if not video_info:
            print(json.dumps({'error': 'Video not found'}))
            sys.exit(1)
        
        if 'error' in video_info:
            print(json.dumps(video_info))
            sys.exit(1)
        
        # Return result
        print(json.dumps(video_info, indent=2))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
