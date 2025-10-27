# Netlify Proxy Setup for YouTube Transcripts

This guide explains how to deploy the Netlify Function proxy to bypass YouTube's cloud IP blocking.

## Why Netlify?

YouTube blocks requests from known cloud provider IPs (Replit, AWS, GCP, etc.). By routing transcript requests through Netlify's serverless Functions, you get:
- ✅ Different IP pool (not blocked like Replit)
- ✅ Free tier (up to 3 million requests/month)
- ✅ Automatic retries with exponential backoff
- ✅ CORS support for direct API access
- ✅ Seamless fallback to local Python script

## Setup Instructions

### 1. Deploy to Netlify

**Option A: Deploy via Netlify CLI (Recommended)**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy the Function
netlify deploy --prod

# Note the deployment URL (e.g., https://your-app.netlify.app)
```

**Option B: Deploy via GitHub**

1. Push your code to GitHub (already done!)
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repository: `brianference/youtube-intel-scan`
5. Netlify will auto-detect the `netlify.toml` configuration
6. Click "Deploy site"

### 2. Get Your Function URL

After deployment, your Netlify Function will be available at:
```
https://YOUR-NETLIFY-SITE.netlify.app/api/transcript-proxy
```

For example:
```
https://youtube-intel-scan.netlify.app/api/transcript-proxy
```

### 3. Add Environment Variable to Replit

1. Open **Replit Secrets** (🔒 lock icon)
2. Click **"+ New secret"**
3. Add:
   - **Key**: `NETLIFY_FUNCTION_URL`
   - **Value**: `https://YOUR-NETLIFY-SITE.netlify.app/api/transcript-proxy`
4. Click "Add secret"

### 4. Restart Your Replit App

After adding the secret, restart the workflow:
- The app will now use Netlify for transcript fetching
- Falls back to Python if Netlify fails

## How It Works

### Request Flow

```
User clicks "Pull Transcript"
    ↓
Replit Backend checks NETLIFY_FUNCTION_URL
    ↓
If set → Call Netlify Edge Function
    ↓
Netlify fetches transcript from YouTube
    ↓
Success → Return transcript
    ↓
Failure → Fallback to Python script
```

### Retry Logic

The Netlify Function includes smart retry logic:
- **3 automatic retries** with exponential backoff
- **Delays**: 3 seconds → 6 seconds
- **Logging**: All attempts logged to Netlify function logs

## Testing the Setup

### 1. Test Function Directly

```bash
curl "https://YOUR-NETLIFY-SITE.netlify.app/api/transcript-proxy?videoId=dQw4w9WgXcQ&languages=en"
```

You should get a JSON response with transcript data.

### 2. Test via Your App

1. Go to your Replit app
2. Add a YouTube video
3. Click "Pull Transcript"
4. Check the Replit console logs - you should see:
   ```
   Fetching transcript via Netlify proxy: [videoId]
   Successfully fetched transcript via Netlify for [videoId]
   ```

### 3. Monitor Netlify Logs

View logs in Netlify dashboard:
1. Go to netlify.com → Your site
2. Click "Functions" tab
3. Click "fetch-transcript"
4. View real-time logs

## Troubleshooting

### Function Not Found (404)

**Check netlify.toml configuration:**
```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/transcript-proxy"
  to = "/.netlify/functions/fetch-transcript"
  status = 200
```

**Verify file exists:**
```
netlify/functions/fetch-transcript.js
```

### Netlify Still Getting Blocked

If Netlify's IPs are also blocked:
- Consider using a residential proxy service (Webshare, Smartproxy)
- Or implement client-side transcript fetching

### Transcripts Timing Out

Netlify Functions have a 10-second timeout on the free tier:
- Most transcripts fetch in < 5 seconds
- If needed, upgrade to Pro for 26-second timeout

## Cost & Limits

**Netlify Free Tier:**
- ✅ 125,000 Function requests/month
- ✅ 100 GB bandwidth
- ✅ Automatic HTTPS
- ✅ Global CDN

**For YouTube Intel Scan usage:**
- ~10-50 transcripts/day = 300-1500/month
- Well within free tier limits

## Files

- `netlify/functions/fetch-transcript.js` - Netlify Function code (Node.js)
- `netlify.toml` - Netlify configuration
- `server/routes.ts` - Backend integration (lines 275-297)
- `package.json` - Contains `youtube-transcript` dependency

## Alternative: Residential Proxies

If Netlify doesn't work, consider paid residential proxies:
- **Webshare** - $5-10/month (recommended)
- **Smartproxy** - Similar pricing
- **Brightdata** - More expensive but reliable

## Support

If issues persist:
1. Check Netlify function logs
2. Verify `NETLIFY_FUNCTION_URL` secret is set correctly
3. Test the Edge Function URL directly with curl
4. Check Replit console logs for fallback messages
