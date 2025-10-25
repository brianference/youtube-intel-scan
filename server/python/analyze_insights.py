#!/usr/bin/env python3
"""
Analyze video transcript and extract product management insights using Claude
"""
import os
import sys
import json
from anthropic import Anthropic

INSIGHT_EXTRACTION_PROMPT = """You are an expert product management analyst. Your task is to extract actionable product management insights from YouTube video transcripts.

Analyze the following video transcript and extract 3-7 key product management insights. For each insight:

1. Extract a clear, actionable insight (1-3 sentences)
2. Categorize it (Product Strategy, User Research, Metrics & KPIs, Roadmapping, Stakeholder Management, Product Discovery, Agile/Scrum, or Other)
3. Provide brief context if helpful

Focus on:
- Frameworks and methodologies
- Best practices and lessons learned
- Strategic thinking patterns
- Common pitfalls to avoid
- Tactical advice and tips
- Mental models for product decisions

VIDEO TITLE: {title}

TRANSCRIPT:
{transcript}

Return your analysis as a JSON array with this structure:
[
  {{
    "insight": "The specific insight or lesson",
    "category": "Product Strategy",
    "context": "Optional additional context"
  }},
  ...
]

Return ONLY the JSON array, no other text."""

def analyze_transcript(video_title, transcript_text):
    """Analyze transcript and extract PM insights using Claude"""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return {'error': 'ANTHROPIC_API_KEY environment variable not set'}
    
    try:
        client = Anthropic(api_key=api_key)
        
        # Truncate transcript if too long (Claude has token limits)
        max_chars = 50000
        if len(transcript_text) > max_chars:
            transcript_text = transcript_text[:max_chars] + "\n\n[Transcript truncated due to length...]"
        
        # Create prompt
        prompt = INSIGHT_EXTRACTION_PROMPT.format(
            title=video_title,
            transcript=transcript_text
        )
        
        # Call Claude
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse response
        response_text = message.content[0].text
        
        # Extract JSON from response (handle markdown code blocks)
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        insights = json.loads(response_text)
        
        return {
            'insights': insights,
            'model': 'claude-3-5-sonnet-20241022',
            'tokensUsed': message.usage.input_tokens + message.usage.output_tokens
        }
        
    except json.JSONDecodeError as e:
        return {'error': f'Failed to parse Claude response as JSON: {str(e)}', 'rawResponse': response_text}
    except Exception as e:
        return {'error': f'Error analyzing transcript: {str(e)}'}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Video title and transcript required'}))
        sys.exit(1)
    
    video_title = sys.argv[1]
    transcript_text = sys.argv[2]
    
    result = analyze_transcript(video_title, transcript_text)
    print(json.dumps(result, indent=2))
    
    if 'error' in result:
        sys.exit(1)

if __name__ == '__main__':
    main()
