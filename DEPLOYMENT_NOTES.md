# Deployment Notes - YouTube Transcript IP Blocking Fix

## Recent Changes (2025-10-27)

### Problem
YouTube blocks transcript requests from cloud hosting providers (Replit, AWS, etc.), causing 500 errors in production while working fine in preview environments.

### Solution Implemented
Combined approach with two improvements:

1. **Phase 1: Better Error Handling & Retry Logic**
2. **Phase 2: Tor Proxy Support (Optional)**

---

## Phase 1: Error Handling Improvements ✅

### Changes Made

**File: `server/python/fetch_transcripts.py`**

1. **Fixed 500 → 400 Error Issue**
   - Script now exits with code 0 even on errors
   - Node.js can properly parse error JSON
   - Users see proper 400 errors instead of generic 500s

2. **Enhanced Logging**
   - All transcript attempts logged to stderr
   - IP blocking events tracked
   - Success/failure rates visible in logs

3. **Improved Retry Logic**
   - Increased from 3 to 5 retries
   - Longer delays: 5s, 10s, 20s, 40s, 80s (with jitter)
   - Better error messages for users

### Benefits
- Users see clear error messages
- Better visibility into blocking frequency
- More resilient to temporary blocks
- No code changes needed to deploy

---

## Phase 2: Tor Proxy Support (Optional) ✅

### What is Tor?
Tor provides free rotating IP addresses through a volunteer network, bypassing YouTube's cloud IP blocking.

### Setup Required

#### On Your Development Machine

1. **Install Tor**
   ```bash
   ./setup-tor.sh
   ```

2. **Start Tor**
   ```bash
   ./start-tor.sh
   ```

3. **Install Python Dependencies**
   ```bash
   pip install -e .
   ```

4. **Enable Tor in App**
   ```bash
   export USE_TOR_PROXY=true
   ```

5. **Check Status**
   ```bash
   ./check-tor.sh
   ```

#### On Replit Production

**Option A: Using Replit Secrets (Recommended)**
1. Go to Replit project settings
2. Add Secret: `USE_TOR_PROXY` = `true`
3. Deploy

**Option B: Using .replit file**
Edit `.replit`:
```toml
[env]
USE_TOR_PROXY = "true"
```

**Important**: Tor must be installed and running before the app starts.

### Tor Pros & Cons

**Pros:**
- ✅ Free solution
- ✅ Rotating IPs automatically
- ✅ No subscription required
- ✅ Easy to set up

**Cons:**
- ❌ Slower (adds 1-3 seconds latency)
- ❌ Less reliable (~60-80% success rate)
- ❌ Some exit nodes may be blocked

---

## Testing The Fix

### Test Error Handling (Works Now)
The error handling improvements work immediately without Tor:

```bash
# The app should now show proper error messages instead of 500 errors
# Users will see: "YouTube is blocking requests from this server..."
```

### Test Tor Proxy
```bash
# 1. Start Tor
./start-tor.sh

# 2. Check it's working
./check-tor.sh

# 3. Enable in app
export USE_TOR_PROXY=true

# 4. Start app and test transcript fetch
npm run dev
```

### Verify Logs
Check stderr for log messages:
```
INFO - Using Tor proxy for video <VIDEO_ID>
INFO - Fetching transcript for <VIDEO_ID> (attempt 1/5)
INFO - Successfully fetched transcript for <VIDEO_ID>
```

Or on failure:
```
WARNING - Request blocked on attempt 1/5 for video <VIDEO_ID>
INFO - Refreshing Tor circuit to get new IP...
INFO - Tor circuit refreshed successfully
INFO - Retrying in 7.2s...
```

---

## Deployment Strategy

### Recommended Approach

**Stage 1: Deploy Error Handling Only** (Now)
- Deploy current changes
- Monitor error messages
- See if blocking is constant or intermittent

**Stage 2: Enable Tor if Needed** (If Stage 1 isn't enough)
- Set up Tor on Replit
- Set `USE_TOR_PROXY=true`
- Monitor success rate

**Stage 3: Consider Paid Proxies** (If Tor insufficient)
- If Tor success rate < 60%
- Or if speed is critical
- Residential proxies: $5-10/month

---

## Monitoring

### Key Metrics to Track

1. **Error Rate**
   - Count of "Request blocked" errors
   - Percentage of failed transcript fetches

2. **Retry Attempts**
   - Average retries per request
   - Success rate by attempt number

3. **Tor Performance** (if enabled)
   - Success rate with Tor
   - Average latency
   - Circuit refresh frequency

### Log Analysis
```bash
# Count blocking events
grep "Request blocked" stderr.log | wc -l

# Check success rate
grep "Successfully fetched" stderr.log | wc -l

# View recent Tor activity
tail -f .tor/tor.log
```

---

## Rollback Plan

If issues occur:

1. **Disable Tor**
   ```bash
   export USE_TOR_PROXY=false
   ```

2. **Stop Tor Service**
   ```bash
   ./stop-tor.sh
   ```

3. **Revert Code** (if needed)
   ```bash
   git revert HEAD
   ```

The error handling improvements are safe and have no downside.

---

## Alternative Solutions

### If Tor Doesn't Work

**Option 1: Residential Proxies** ($5-10/month)
- Webshare (recommended)
- Smartproxy
- Oxylabs

**Option 2: Retry with Longer Delays**
- Increase delays to minutes
- Works if blocking is temporary

**Option 3: Rate Limiting**
- Queue transcript requests
- Process during off-peak hours

---

## Files Modified

| File | Changes |
|------|---------|
| `server/python/fetch_transcripts.py` | Added Tor support, better logging, fixed error handling |
| `pyproject.toml` | Added `requests[socks]` dependency |
| `.replit` | Added `USE_TOR_PROXY` environment variable |
| `setup-tor.sh` | New: Tor installation script |
| `start-tor.sh` | New: Start Tor daemon |
| `stop-tor.sh` | New: Stop Tor daemon |
| `check-tor.sh` | New: Status check script |
| `TOR_SETUP.md` | New: Tor documentation |
| `DEPLOYMENT_NOTES.md` | New: This file |

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `USE_TOR_PROXY` | `false` | No | Enable Tor proxy for YouTube requests |
| `TOR_CONTROL_PASSWORD` | _(none)_ | No | Password for Tor control port |
| `PORT` | `5000` | Yes | Application port |
| `YOUTUBE_API_KEY` | _(required)_ | Yes | YouTube Data API key |

---

## Support & Troubleshooting

### Common Issues

**Issue: Still getting 500 errors**
- Check that code is deployed
- Verify Python script exits with code 0
- Check Node.js error handling

**Issue: Tor won't start**
- Check logs: `cat .tor/tor.log`
- Verify ports available: `netstat -tuln | grep 905`
- Check permissions on `.tor/` directory

**Issue: Transcripts still blocked with Tor**
- Tor exit node may be blocked
- Try refreshing circuit: `pkill -HUP tor`
- Check success rate - may need residential proxies

**Issue: Slow response times**
- This is normal with Tor (1-3s overhead)
- Consider caching transcript results
- For production, use residential proxies

### Getting Help

1. Check logs: `.tor/tor.log` and application stderr
2. Run diagnostics: `./check-tor.sh`
3. Test Tor connection manually:
   ```bash
   curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org
   ```

---

## Next Steps

1. ✅ Deploy error handling improvements
2. ⏳ Monitor blocking frequency for 24-48 hours
3. ⏳ Enable Tor if blocking is consistent
4. ⏳ Evaluate need for residential proxies based on metrics

---

## Questions?

See `TOR_SETUP.md` for detailed Tor documentation.
