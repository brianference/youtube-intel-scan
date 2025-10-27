#!/usr/bin/env python3
"""
Fetch transcript for a YouTube video using youtube-transcript-api with Tor proxy support
"""
import sys
import json
import time
import random
import os
import logging
from datetime import datetime
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    RequestBlocked,
    YouTubeRequestFailed
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)

def refresh_tor_circuit():
    """Request a new Tor circuit (new IP address)"""
    try:
        import socket
        import struct

        # Connect to Tor control port
        control_port = 9051
        control_password = os.environ.get('TOR_CONTROL_PASSWORD', '')

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(('127.0.0.1', control_port))

        # Authenticate
        if control_password:
            sock.send(f'AUTHENTICATE "{control_password}"\r\n'.encode())
        else:
            sock.send(b'AUTHENTICATE\r\n')

        response = sock.recv(1024)

        if b'250' in response:
            # Send NEWNYM signal to get new circuit
            sock.send(b'SIGNAL NEWNYM\r\n')
            response = sock.recv(1024)

            if b'250' in response:
                logging.info("Tor circuit refreshed successfully")
                time.sleep(2)  # Wait for new circuit to be established
                return True

        sock.close()
        return False
    except Exception as e:
        logging.warning(f"Failed to refresh Tor circuit: {e}")
        return False

def get_proxies():
    """Get proxy configuration for requests"""
    use_tor = os.environ.get('USE_TOR_PROXY', 'false').lower() == 'true'

    if use_tor:
        # Tor SOCKS5 proxy on default port
        return {
            'http': 'socks5h://127.0.0.1:9050',
            'https': 'socks5h://127.0.0.1:9050'
        }
    return None

def fetch_transcript_with_retry(video_id, languages=['en'], max_retries=5):
    """Fetch transcript with exponential backoff retry on rate limits and Tor support"""
    base_delay = 5  # Start with 5 seconds
    use_tor = os.environ.get('USE_TOR_PROXY', 'false').lower() == 'true'

    if use_tor:
        logging.info(f"Using Tor proxy for video {video_id}")

    for attempt in range(max_retries):
        try:
            # Get proxy configuration
            proxies = get_proxies()

            # Create API instance with proxy support
            if proxies:
                import requests
                session = requests.Session()
                session.proxies.update(proxies)
                api = YouTubeTranscriptApi(http_client=session)
            else:
                api = YouTubeTranscriptApi()

            logging.info(f"Fetching transcript for {video_id} (attempt {attempt + 1}/{max_retries})")

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

            logging.info(f"Successfully fetched transcript for {video_id}")
            return result

        except RequestBlocked as e:
            logging.warning(f"Request blocked on attempt {attempt + 1}/{max_retries} for video {video_id}")

            # On last attempt, give up
            if attempt == max_retries - 1:
                error_msg = f'YouTube is blocking requests from this server. This usually happens when using cloud hosting. The transcript cannot be retrieved at this time.'
                logging.error(f"Final failure for {video_id}: {error_msg}")
                return {'error': error_msg}

            # If using Tor, try refreshing the circuit
            if use_tor:
                logging.info("Refreshing Tor circuit to get new IP...")
                refresh_tor_circuit()

            # Calculate delay with exponential backoff and jitter
            delay = base_delay * (2 ** attempt)  # 5s, 10s, 20s, 40s, 80s
            jitter = random.uniform(0, 3)  # Add 0-3 seconds of randomness
            total_delay = delay + jitter

            logging.info(f'Retrying in {total_delay:.1f}s...')
            time.sleep(total_delay)
            continue

        except TranscriptsDisabled:
            error_msg = 'Transcripts are disabled for this video'
            logging.error(f"{error_msg} - {video_id}")
            return {'error': error_msg}
        except NoTranscriptFound:
            error_msg = 'No transcript found for this video'
            logging.error(f"{error_msg} - {video_id}")
            return {'error': error_msg}
        except VideoUnavailable:
            error_msg = 'Video is unavailable'
            logging.error(f"{error_msg} - {video_id}")
            return {'error': error_msg}
        except YouTubeRequestFailed as e:
            error_msg = f'YouTube request failed: {str(e)}'
            logging.error(f"{error_msg} - {video_id}")
            return {'error': error_msg}
        except Exception as e:
            error_msg = f'Unexpected error: {str(e)}'
            logging.error(f"{error_msg} - {video_id}", exc_info=True)
            return {'error': error_msg}

    # Should never reach here
    error_msg = 'Failed to fetch transcript after all retries'
    logging.error(f"{error_msg} - {video_id}")
    return {'error': error_msg}

def fetch_transcript(video_id, languages=['en']):
    """Fetch transcript for a video (wrapper for compatibility)"""
    return fetch_transcript_with_retry(video_id, languages)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Video ID required'}))
        sys.exit(0)  # Exit with 0 so Node.js can parse the JSON error

    video_id = sys.argv[1]
    languages = sys.argv[2].split(',') if len(sys.argv) > 2 else ['en']

    logging.info(f"Starting transcript fetch for video {video_id}")
    result = fetch_transcript(video_id, languages)

    # Always print valid JSON
    print(json.dumps(result, indent=2))

    # Exit with 0 even on errors so Node.js can properly parse the error JSON
    # The Node.js code checks for the 'error' field in the response
    sys.exit(0)

if __name__ == '__main__':
    main()
