#!/usr/bin/env python3
"""
Fetch videos from a YouTube channel using the YouTube Data API v3
"""
import os
import sys
import json
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

def extract_channel_id(url_or_id):
    """Extract channel ID from various URL formats or return as-is if already an ID"""
    if url_or_id.startswith('UC') and len(url_or_id) == 24:
        return url_or_id
    
    # Handle @username format
    if url_or_id.startswith('@'):
        return url_or_id[1:]
    
    # Handle various URL formats
    if 'youtube.com' in url_or_id or 'youtu.be' in url_or_id:
        if '/channel/' in url_or_id:
            return url_or_id.split('/channel/')[1].split('/')[0].split('?')[0]
        elif '/@' in url_or_id:
            return url_or_id.split('/@')[1].split('/')[0].split('?')[0]
        elif '/c/' in url_or_id:
            return url_or_id.split('/c/')[1].split('/')[0].split('?')[0]
    
    return url_or_id

def get_channel_info(youtube, channel_identifier):
    """Get channel information by ID or username"""
    try:
        # Try as channel ID first
        if channel_identifier.startswith('UC'):
            response = youtube.channels().list(
                part='snippet,statistics',
                id=channel_identifier,
                maxResults=1
            ).execute()
        else:
            # Try as username/handle
            response = youtube.channels().list(
                part='snippet,statistics',
                forHandle=channel_identifier,
                maxResults=1
            ).execute()
        
        if not response.get('items'):
            return None
        
        channel = response['items'][0]
        return {
            'channelId': channel['id'],
            'name': channel['snippet']['title'],
            'description': channel['snippet'].get('description', ''),
            'thumbnailUrl': channel['snippet']['thumbnails'].get('high', {}).get('url', ''),
            'subscriberCount': channel['statistics'].get('subscriberCount', '0'),
            'videoCount': channel['statistics'].get('videoCount', '0'),
        }
    except HttpError as e:
        print(f"Error fetching channel info: {e}", file=sys.stderr)
        return None

def get_channel_videos(youtube, channel_id, max_results=50):
    """Fetch recent videos from a channel"""
    try:
        # Get uploads playlist ID
        channel_response = youtube.channels().list(
            part='contentDetails',
            id=channel_id,
            maxResults=1
        ).execute()
        
        if not channel_response.get('items'):
            return []
        
        uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # Get videos from uploads playlist
        videos = []
        next_page_token = None
        
        while len(videos) < max_results:
            playlist_response = youtube.playlistItems().list(
                part='snippet,contentDetails',
                playlistId=uploads_playlist_id,
                maxResults=min(50, max_results - len(videos)),
                pageToken=next_page_token
            ).execute()
            
            for item in playlist_response.get('items', []):
                video_id = item['contentDetails']['videoId']
                snippet = item['snippet']
                
                videos.append({
                    'videoId': video_id,
                    'channelId': channel_id,
                    'title': snippet['title'],
                    'description': snippet.get('description', ''),
                    'publishedAt': snippet['publishedAt'],
                    'thumbnailUrl': snippet['thumbnails'].get('high', {}).get('url', ''),
                })
            
            next_page_token = playlist_response.get('nextPageToken')
            if not next_page_token:
                break
        
        # Get additional video details (duration, view count)
        if videos:
            video_ids = [v['videoId'] for v in videos]
            videos_response = youtube.videos().list(
                part='contentDetails,statistics',
                id=','.join(video_ids)
            ).execute()
            
            video_details = {item['id']: item for item in videos_response.get('items', [])}
            
            for video in videos:
                details = video_details.get(video['videoId'], {})
                video['duration'] = details.get('contentDetails', {}).get('duration', '')
                video['viewCount'] = details.get('statistics', {}).get('viewCount', '0')
        
        return videos
    
    except HttpError as e:
        print(f"Error fetching videos: {e}", file=sys.stderr)
        return []

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Channel URL or ID required'}))
        sys.exit(1)
    
    channel_input = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    
    api_key = os.environ.get('YOUTUBE_API_KEY')
    if not api_key:
        print(json.dumps({'error': 'YOUTUBE_API_KEY environment variable not set'}))
        sys.exit(1)
    
    try:
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        # Extract and resolve channel ID
        channel_identifier = extract_channel_id(channel_input)
        
        # Get channel info
        channel_info = get_channel_info(youtube, channel_identifier)
        if not channel_info:
            print(json.dumps({'error': 'Channel not found'}))
            sys.exit(1)
        
        # Get videos
        videos = get_channel_videos(youtube, channel_info['channelId'], max_results)
        
        # Return result
        result = {
            'channel': channel_info,
            'videos': videos
        }
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
