# Tor Proxy Setup for YouTube Intel Scan

This guide explains how to set up and use Tor proxy to bypass YouTube's IP blocking on cloud servers.

## Why Tor?

YouTube blocks requests from known cloud provider IPs (AWS, GCP, Azure, Replit, etc.) to prevent bot traffic. Tor provides:
- **Free rotating IP addresses** through the Tor network
- **Automatic circuit refresh** on failures
- **No subscription required**

## Setup Instructions

### 1. Install Tor

Run the setup script:
```bash
./setup-tor.sh
```

This will:
- Install Tor (if not already installed)
- Create Tor configuration at `.tor/torrc`
- Set up data directory at `.tor/data`

### 2. Start Tor

```bash
./start-tor.sh
```

This starts the Tor daemon with:
- SOCKS proxy on `127.0.0.1:9050`
- Control port on `127.0.0.1:9051` (for circuit refresh)

### 3. Enable Tor in the Application

Set the environment variable:
```bash
export USE_TOR_PROXY=true
```

Or add it to your `.env` file or Replit Secrets:
```
USE_TOR_PROXY=true
```

### 4. Install Python Dependencies

```bash
pip install -e .
```

This installs `requests[socks]` which is required for SOCKS proxy support.

## Usage

### Check Tor Status
```bash
./check-tor.sh
```

This shows:
- Whether Tor is running
- Port status
- Current exit IP
- Recent logs

### Stop Tor
```bash
./stop-tor.sh
```

### View Tor Logs
```bash
tail -f .tor/tor.log
```

## How It Works

When `USE_TOR_PROXY=true`:

1. **Request Routing**: All YouTube transcript requests go through Tor's SOCKS proxy
2. **Circuit Refresh**: On IP blocks, the system requests a new Tor circuit (new exit IP)
3. **Retry Logic**: Exponential backoff with 5 retries (5s, 10s, 20s, 40s, 80s delays)
4. **Logging**: All attempts and failures are logged to stderr

## Limitations

- **Slower**: Tor adds latency (typically 1-3 seconds per request)
- **Less Reliable**: Some Tor exit nodes may also be blocked by YouTube
- **Success Rate**: ~60-80% depending on exit node quality

## Troubleshooting

### Tor won't start
Check the log:
```bash
cat .tor/tor.log
```

Common issues:
- Ports already in use (9050 or 9051)
- Insufficient permissions
- Network connectivity issues

### Transcripts still failing
1. Verify Tor is running: `./check-tor.sh`
2. Check environment variable: `echo $USE_TOR_PROXY`
3. View application logs for retry attempts
4. Try manually refreshing circuit: `pkill -HUP tor`

### Tor is slow
- This is normal - Tor routes through 3+ relay nodes
- Consider using residential proxies for production ($5-10/month)

## Alternative: Residential Proxies

For production use, consider paid residential proxies:
- **Webshare**: Recommended by library maintainers
- **Smartproxy**, **Oxylabs**: Other reliable options
- **Cost**: $5-10 per GB

These provide:
- Faster speeds
- Higher reliability
- Better IP reputation

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_TOR_PROXY` | `false` | Enable Tor proxy |
| `TOR_CONTROL_PASSWORD` | _(none)_ | Tor control port password (optional) |

## Files

- `.tor/torrc` - Tor configuration
- `.tor/data/` - Tor data directory
- `.tor/tor.log` - Tor logs
- `setup-tor.sh` - Installation script
- `start-tor.sh` - Start Tor daemon
- `stop-tor.sh` - Stop Tor daemon
- `check-tor.sh` - Check status and test connection

## Security Notes

- Tor control port (9051) is configured without authentication
- This is safe since it only listens on localhost (127.0.0.1)
- If exposing to network, set `TOR_CONTROL_PASSWORD`

## For Replit Deployment

Add to your `.replit` file or Replit Secrets:
```toml
[env]
USE_TOR_PROXY = "true"
```

And ensure Tor starts before the application:
```toml
[deployment]
run = ["sh", "-c", "./start-tor.sh && npm run start"]
```

## Support

If issues persist:
1. Check logs: `.tor/tor.log` and application stderr
2. Verify connectivity: `./check-tor.sh`
3. Test Tor circuit: `curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org`
