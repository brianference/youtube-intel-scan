#!/usr/bin/env python3
"""
Analyze video transcript and extract elite product management insights using Claude
"""
import os
import sys
import json
from anthropic import Anthropic

ELITE_INSIGHT_EXTRACTION_PROMPT = """You are an elite AI Product Management Analyst, certified in Pragmatic Institute methodologies and experienced in extracting hyper-actionable insights from PM content.

Your mission: Analyze this PM video/podcast transcript to extract structured, actionable insights suitable for product managers at any level - from new PMs to experienced practitioners.

Framework Rules:
- Be comprehensive yet concise: Extract 5-10 high-quality insights
- Prioritize actionability: Every insight must include concrete next steps
- Use RICE scoring: Rank insights by Reach, Impact, Confidence, Effort (scale 1-10)
- Include examples: Provide specific prompts, templates, or tools for each insight
- Map to learning stages: Indicate when to apply (Week 1, Week 2-4, Ongoing, etc.)

VIDEO TITLE: {title}

TRANSCRIPT:
{transcript}

For each insight, extract and structure the following:

1. **Insight Title** (1-2 sentences): Clear, actionable takeaway
2. **Category**: Product Strategy, User Research, Metrics & KPIs, Roadmapping, Stakeholder Management, Product Discovery, AI/Technical Skills, Agile/Scrum, Leadership, New AI PM, Career Development, Communication & Writing, or Design Thinking
3. **Transcript Nugget** (1-3 sentences): Direct quote or paraphrased evidence from the transcript
4. **Why It Matters**: Explain the business/career impact (2-3 sentences)
5. **Actionable Steps**: 3-5 concrete steps to implement this insight
6. **RICE Score**: Assign numerical scores (1-10) for:
   - Reach: How many PMs/situations does this apply to?
   - Impact: How much does it improve outcomes?
   - Confidence: How certain are you this works?
   - Effort: How easy is it to implement? (10 = very easy, 1 = very hard)
7. **Tools Needed**: List specific tools, frameworks, or resources
8. **Example Prompt/Template**: Provide a copy-paste ready example if applicable
9. **Week Tie-In**: When to apply (Week 1, Week 2-4, Month 2-3, Ongoing)

Focus on:
- Frameworks and methodologies with step-by-step application
- Best practices with concrete examples
- Tactical advice that can be implemented immediately
- Mental models for product decisions with decision trees
- Common pitfalls with how to avoid them
- Tool-specific workflows (prompting, AI agents, analytics platforms)

Return your analysis as a JSON array with this exact structure:
[
  {{
    "insight": "The main insight or lesson (1-2 sentences)",
    "category": "Product Strategy",
    "transcriptNugget": "Direct quote or paraphrased evidence from transcript",
    "whyItMatters": "Why this is important for PMs (2-3 sentences explaining impact)",
    "actionableSteps": [
      "Step 1: Specific action with context",
      "Step 2: Next action with example",
      "Step 3: Follow-up or validation step"
    ],
    "riceScore": {{
      "reach": 8,
      "impact": 9,
      "confidence": 7,
      "effort": 9,
      "total": 33
    }},
    "toolsNeeded": ["Claude/ChatGPT", "Notion", "Spreadsheet"],
    "examplePrompt": "Optional: Provide a ready-to-use prompt, template, or example if applicable. Leave empty if not applicable.",
    "weekTieIn": "Week 1"
  }},
  ...
]

IMPORTANT: 
- Calculate total RICE score as: (reach * impact * confidence) / effort
- Higher total = higher priority insight
- Return ONLY the JSON array, no other text
- Ensure all fields are present (use null for optional fields like examplePrompt if not applicable)
- actionableSteps must be an array with at least 3 items
- toolsNeeded must be an array (can be empty if no specific tools)
"""

def analyze_transcript(video_title, transcript_text):
    """Analyze transcript and extract elite PM insights using Claude"""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return {'error': 'ANTHROPIC_API_KEY environment variable not set'}
    
    try:
        client = Anthropic(api_key=api_key)
        
        # Truncate transcript if too long (Claude has token limits)
        # Using a larger limit since we want comprehensive analysis
        max_chars = 80000
        if len(transcript_text) > max_chars:
            transcript_text = transcript_text[:max_chars] + "\n\n[Transcript truncated due to length...]"
        
        # Create prompt
        prompt = ELITE_INSIGHT_EXTRACTION_PROMPT.format(
            title=video_title,
            transcript=transcript_text
        )
        
        # Call Claude with higher token limit for comprehensive analysis
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,  # Increased for richer insights
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
        
        # Validate and calculate RICE totals
        for insight in insights:
            if 'riceScore' in insight and insight['riceScore']:
                rice = insight['riceScore']
                if all(k in rice for k in ['reach', 'impact', 'confidence', 'effort']):
                    # Calculate total: (R * I * C) / E
                    rice['total'] = (rice['reach'] * rice['impact'] * rice['confidence']) / max(rice['effort'], 1)
        
        return {
            'insights': insights,
            'model': 'claude-sonnet-4-20250514',
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
