#!/bin/bash
# Stop Tor proxy service

echo "Stopping Tor proxy..."

if pgrep -x "tor" > /dev/null; then
    pkill -x tor
    sleep 2

    if pgrep -x "tor" > /dev/null; then
        echo "✗ Failed to stop Tor gracefully, forcing..."
        pkill -9 -x tor
        sleep 1
    fi

    if ! pgrep -x "tor" > /dev/null; then
        echo "✓ Tor stopped successfully"
    else
        echo "✗ Failed to stop Tor"
        exit 1
    fi
else
    echo "Tor is not running"
fi
