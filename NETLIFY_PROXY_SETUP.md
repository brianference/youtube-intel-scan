# Netlify Proxy Setup Guide

## Overview

This solution uses a **Netlify Function** to proxy YouTube transcript requests, bypassing Replit's blocked IPs.

### Why This Works
- ✅ Netlify has different IP addresses than Replit
- ✅ Netlify's IPs may not be blocked by YouTube
- ✅ Free tier available (125K requests/month)
- ✅ Works in Replit's containerized environment (unlike Tor)
- ✅ Fast and reliable

---

## Setup Instructions

### Step 1: Deploy to Netlify

#### Option A: Deploy from GitHub (Recommended)

1. **Push this repo to GitHub** (if not already done):
   ```bash
   git add netlify/ netlify.toml package.json
   git commit -m "Add Netlify Function for transcript proxy"
   git push origin main
   ```

2. **Go to Netlify**: https://app.netlify.com/

3. **Click "Add new site" → "Import an existing project"**

4. **Connect to GitHub** and select your `youtube-intel-scan` repository

5. **Configure build settings**:
   - Build command: `npm install`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

6. **Click "Deploy site"**

7. **Your site will be deployed** at something like:
   `https://your-site-name.netlify.app`

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

---

### Step 2: Test the Netlify Function

Once deployed, test your function:

**Test URL format:**
```
https://your-site-name.netlify.app/api/transcript-proxy?videoId=jNQXAC9IVRw&languages=en
```

**Example:**
```bash
curl "https://your-site-name.netlify.app/api/transcript-proxy?videoId=jNQXAC9IVRw&languages=en"
```

**Expected response:**
```json
{
  "videoId": "jNQXAC9IVRw",
  "language": "English",
  "languageCode": "en",
  "isGenerated": false,
  "snippets": [
    {
      "text": "Welcome to...",
      "start": 0.0,
      "duration": 2.5
    }
  ],
  "fullText": "Welcome to YouTube..."
}
```

---

### Step 3: Configure Replit to Use Netlify Proxy

#### In Replit Secrets (or Environment Variables):

Add two secrets:

1. **USE_NETLIFY_PROXY**
   - Value: `true`

2. **NETLIFY_PROXY_URL**
   - Value: `https://your-site-name.netlify.app`
   - (Replace with your actual Netlify site URL)

#### Or edit `.replit` file:

```toml
[env]
PORT = "5000"
USE_NETLIFY_PROXY = "true"
NETLIFY_PROXY_URL = "https://your-site-name.netlify.app"
```

---

### Step 4: Deploy and Test

1. **Deploy to Replit production**

2. **Test at**: https://ai-pm-youtube.replit.app/videos

3. **Try downloading a transcript**

4. **Check logs** for:
   ```
   INFO - Using Netlify proxy for video <VIDEO_ID>
   INFO - Fetching via Netlify proxy: https://your-site-name.netlify.app/api/transcript-proxy
   INFO - Successfully fetched transcript for <VIDEO_ID>
   ```

---

## How It Works

### The Flow

```
User Request (Replit)
    ↓
Python Script checks USE_NETLIFY_PROXY
    ↓
Makes HTTP request to Netlify Function
    ↓
Netlify Function fetches from YouTube
    ↓
Returns transcript to Python Script
    ↓
Returns to user
```

### Why This Bypasses Blocking

1. **Different IP pool**: Netlify uses different IP addresses than Replit
2. **Better reputation**: Netlify's IPs may not be on YouTube's blocklist
3. **Separation of concerns**: YouTube sees Netlify, not Replit

---

## Troubleshooting

### Problem: 404 Error

**Symptoms:**
```
Failed to load resource: the server responded with a status of 404
```

**Solutions:**
1. Verify Netlify Function is deployed:
   - Go to https://app.netlify.com/sites/your-site-name/functions
   - You should see `fetch-transcript` listed

2. Check the URL format:
   - Should be: `/api/transcript-proxy` (not `/.netlify/functions/fetch-transcript`)
   - The `netlify.toml` redirect handles this

3. Test directly:
   ```bash
   curl "https://your-site-name.netlify.app/api/transcript-proxy?videoId=jNQXAC9IVRw"
   ```

---

### Problem: "Transcripts are disabled for this video"

**Symptoms:**
```json
{"error":"Transcripts are disabled for this video"}
```

**Solutions:**
1. This is a **legitimate error** for that specific video
2. Try a different video that you know has transcripts
3. Test with a known-good video ID: `jNQXAC9IVRw`

---

### Problem: Empty transcript

**Symptoms:**
```json
{"videoId":"...","fullText":""}
```

**Solutions:**
1. Check Netlify Function logs:
   - Go to https://app.netlify.com/sites/your-site-name/functions
   - Click on `fetch-transcript`
   - View real-time logs

2. Verify `youtube-transcript` package is installed:
   - Check `package.json` includes: `"youtube-transcript": "^1.2.1"`
   - Redeploy if needed

---

### Problem: CORS errors

**Symptoms:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solutions:**
1. CORS should be configured in `netlify/functions/fetch-transcript.js`
2. Check headers include:
   ```javascript
   'Access-Control-Allow-Origin': '*'
   ```

3. If restricting origins, update to:
   ```javascript
   'Access-Control-Allow-Origin': 'https://ai-pm-youtube.replit.app'
   ```

---

### Problem: Netlify still getting blocked

**Symptoms:**
Same blocking errors even with Netlify proxy

**Solutions:**
1. **Try residential proxies** through Netlify:
   - Add proxy service (Webshare, etc.) to Netlify Function
   - Update function to use the proxy

2. **Rate limiting**:
   - Add delays between requests
   - Implement request queuing

3. **Fallback strategy**:
   - Try Netlify first
   - Fall back to direct request
   - Show clear error messages

---

## Cost

### Netlify Free Tier

- ✅ 125,000 function requests/month
- ✅ 100 GB bandwidth/month
- ✅ Perfect for moderate usage

### Upgrade if Needed

- **Pro Plan**: $19/month
  - 2M function requests/month
  - 400 GB bandwidth/month

---

## Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `USE_NETLIFY_PROXY` | Yes | `true` | Enable Netlify proxy |
| `NETLIFY_PROXY_URL` | Yes | `https://your-site.netlify.app` | Your Netlify site URL |
| `USE_TOR_PROXY` | No | `false` | Disable Tor (not compatible with Replit) |

---

## Monitoring

### Check Netlify Function Usage

1. Go to: https://app.netlify.com/sites/your-site-name/functions
2. View function invocations
3. Monitor usage against free tier limits

### Check Netlify Logs

Real-time logs show:
- Each request
- Success/failure
- Error details

---

## Next Steps After Setup

1. ✅ Deploy Netlify Function
2. ✅ Test the function URL directly
3. ✅ Configure Replit environment variables
4. ✅ Deploy to Replit production
5. ✅ Test transcript downloads
6. ✅ Monitor success rate

### If Success Rate < 90%

Consider adding a residential proxy to the Netlify Function:
- Sign up for Webshare ($3-10/month)
- Add proxy support to `fetch-transcript.js`
- Update environment variables

---

## Files

| File | Purpose |
|------|---------|
| `netlify/functions/fetch-transcript.js` | Netlify Function code |
| `netlify.toml` | Netlify configuration |
| `package.json` | Dependencies (includes youtube-transcript) |
| `server/python/fetch_transcripts.py` | Updated to support Netlify proxy |
| `NETLIFY_PROXY_SETUP.md` | This guide |

---

## Support

If you encounter issues:

1. **Test the Netlify Function directly** with curl
2. **Check Netlify Function logs** for errors
3. **Verify environment variables** in Replit
4. **Check Python logs** in Replit for connection errors

---

## Success Checklist

- [ ] Netlify site deployed
- [ ] Netlify Function accessible at `/api/transcript-proxy`
- [ ] Test URL returns transcript JSON
- [ ] `USE_NETLIFY_PROXY=true` in Replit
- [ ] `NETLIFY_PROXY_URL` set in Replit
- [ ] Replit app deployed
- [ ] Transcript downloads working in production
- [ ] Monitoring Netlify function usage

Once all checked, you should have 70-90% success rate! 🎉
