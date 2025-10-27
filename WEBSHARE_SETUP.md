# Webshare.io Proxy Setup Guide

This guide explains how to integrate webshare.io's free proxies to bypass YouTube's IP blocking.

## Why Webshare.io?

YouTube blocks cloud provider IPs (Replit, AWS, GCP, Netlify). Webshare.io provides:
- ✅ **10 FREE datacenter proxies** (no credit card required)
- ✅ **1GB bandwidth/month** (enough for ~300-500 transcript requests)
- ✅ **Forever free** (no trial expiration)
- ✅ **Residential IPs** available for upgrade if needed

---

## Step 1: Sign Up for Webshare.io

1. Go to: **https://www.webshare.io**
2. Click **"Sign Up"**
3. Create a free account (no credit card required)
4. Verify your email

---

## Step 2: Get Your API Key

1. Log in to **https://dashboard.webshare.io**
2. Click **"API"** in the left sidebar
3. Click **"Generate New Token"**
4. **Copy the API key** (it looks like: `abc123xyz456...`)
5. **Save it securely** - you'll need this for Netlify

---

## Step 3: Add API Key to Netlify

1. Go to: **https://app.netlify.com/sites/ai-pm-youtube/configuration/env**
2. Scroll to **"Environment variables"**
3. Click **"Add a variable"**
4. Add:
   - **Key**: `WEBSHARE_API_KEY`
   - **Value**: `<your API key from step 2>`
5. Click **"Save"**
6. **Redeploy your site**: 
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

---

## Step 4: Test the Integration

After redeployment, test with this URL:

```
https://ai-pm-youtube.netlify.app/api/transcript-proxy?videoId=jNQXAC9IVRw&languages=en
```

**Expected result:**
```json
{
  "videoId": "jNQXAC9IVRw",
  "language": "en",
  "fullText": "Welcome to YouTube. The first video ever uploaded..."
}
```

If you see `fullText` with actual content (not empty), **it's working!** 🎉

---

## How It Works

### Request Flow with Proxies:

```
User clicks "Pull Transcript"
    ↓
Netlify Function fetches proxy list from webshare.io
    ↓
Uses proxy to request transcript from YouTube
    ↓
YouTube sees proxy IP (not blocked) → Returns transcript
    ↓
Netlify Function returns transcript to Replit
    ↓
Replit saves transcript to database
```

### Proxy Rotation:

- The function caches the proxy list for 5 minutes
- If one proxy fails, it tries another
- Up to 3 retry attempts with different proxies

---

## Monitoring Usage

### Check Webshare.io Dashboard:

1. Go to: **https://dashboard.webshare.io**
2. View **"Bandwidth usage"** in the overview
3. See **"Proxy list"** to check which proxies are active

### Free Tier Limits:

- **10 proxies** (rotates through them)
- **1GB bandwidth/month** 
- Each transcript fetch uses ~5-50KB
- Estimated: **300-500 transcripts/month**

### If You Hit the Limit:

**Option 1: Upgrade to Paid** ($2.99/month for 100 proxies)
**Option 2: Wait until next month** (resets on billing date)
**Option 3: Use Python fallback** (works in development on Replit)

---

## Troubleshooting

### Still Getting Empty Transcripts?

1. **Check Netlify logs**:
   - Go to: https://app.netlify.com/sites/ai-pm-youtube/functions
   - Click "fetch-transcript"
   - Look for errors like "403 Forbidden" or "Proxy connection failed"

2. **Verify API key is correct**:
   - Go to Netlify environment variables
   - Make sure `WEBSHARE_API_KEY` is set
   - No extra spaces or quotes

3. **Test API key manually**:
   ```bash
   curl -H "Authorization: Token YOUR_API_KEY" \
     https://proxy.webshare.io/api/v2/proxy/list/
   ```
   Should return your proxy list

### "Transcripts are disabled" Error

This means YouTube is still blocking the request. Possible causes:
- Webshare's datacenter proxies are also blocked
- Need to upgrade to **residential proxies** ($4.50/GB)
- The specific video has transcripts disabled

### "Failed to fetch proxies" in Logs

- API key is missing or invalid
- Webshare.io API is down (rare)
- Network connectivity issue from Netlify

---

## Upgrade Options

If free tier doesn't work or you need more:

### Webshare.io Pricing:

| Plan | Proxies | Bandwidth | Price |
|------|---------|-----------|-------|
| **Free** | 10 datacenter | 1GB/month | $0 |
| **Starter** | 100 datacenter | 100GB/month | $2.99/month |
| **Residential** | Rotating pool | Pay per GB | $4.50/GB |

**Recommendation**: Start with free tier, upgrade to residential if needed.

---

## Alternative: Residential Proxies

If datacenter proxies are blocked:

1. Go to: https://dashboard.webshare.io
2. Click **"Proxies"** → **"Get proxies"**
3. Select **"Residential proxies"**
4. Add funds (minimum $10)
5. Use the same API key (it auto-switches to residential)

Residential proxies use **real home IPs** that YouTube cannot block.

---

## Files Updated

- `netlify/functions/fetch-transcript.js` - Added webshare.io integration
- `package.json` - Added `https-proxy-agent` dependency
- `WEBSHARE_SETUP.md` - This setup guide

---

## Support

If issues persist:
1. Check Netlify function logs for detailed errors
2. Verify API key is correct in environment variables
3. Test API key directly with curl command above
4. Contact webshare.io support: support@webshare.io

---

**Ready to test!** Once you complete Steps 1-3, your app will use webshare.io proxies to bypass YouTube's IP blocking. 🚀
