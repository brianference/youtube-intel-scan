#!/bin/bash
# Start Tor proxy service

echo "Starting Tor proxy..."

# Check if Tor is installed
if ! command -v tor &> /dev/null; then
    echo "ERROR: Tor is not installed. Please run ./setup-tor.sh first"
    exit 1
fi

# Check if Tor is already running
if pgrep -x "tor" > /dev/null; then
    echo "Tor is already running"
    echo "PID: $(pgrep -x tor)"
else
    # Start Tor with our configuration
    echo "Starting Tor daemon..."
    tor -f .tor/torrc &

    # Wait for Tor to start
    sleep 5

    # Check if Tor started successfully
    if pgrep -x "tor" > /dev/null; then
        echo "✓ Tor started successfully"
        echo "PID: $(pgrep -x tor)"
        echo ""
        echo "SOCKS proxy: 127.0.0.1:9050"
        echo "Control port: 127.0.0.1:9051"
        echo ""
        echo "To enable in the app, set: USE_TOR_PROXY=true"
    else
        echo "✗ Failed to start Tor"
        echo "Check logs at: .tor/tor.log"
        exit 1
    fi
fi
