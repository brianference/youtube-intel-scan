#!/bin/bash
# Check Tor proxy status

echo "Checking Tor status..."
echo ""

if pgrep -x "tor" > /dev/null; then
    echo "✓ Tor is running"
    echo "PID: $(pgrep -x tor)"
    echo ""

    # Check if SOCKS port is listening
    if netstat -tuln 2>/dev/null | grep -q ":9050 " || ss -tuln 2>/dev/null | grep -q ":9050 "; then
        echo "✓ SOCKS proxy listening on 127.0.0.1:9050"
    else
        echo "✗ SOCKS proxy port 9050 not listening"
    fi

    # Check if control port is listening
    if netstat -tuln 2>/dev/null | grep -q ":9051 " || ss -tuln 2>/dev/null | grep -q ":9051 "; then
        echo "✓ Control port listening on 127.0.0.1:9051"
    else
        echo "✗ Control port 9051 not listening"
    fi

    echo ""
    echo "Environment variable USE_TOR_PROXY: ${USE_TOR_PROXY:-not set}"

    # Test connection through Tor
    echo ""
    echo "Testing connection through Tor..."
    if command -v curl &> /dev/null; then
        TOR_IP=$(curl -s --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip 2>/dev/null | grep -o '"IsTor":[^,]*' | cut -d':' -f2)
        if [ "$TOR_IP" = "true" ]; then
            echo "✓ Successfully connected through Tor network"
            CURRENT_IP=$(curl -s --socks5-hostname 127.0.0.1:9050 https://api.ipify.org 2>/dev/null)
            echo "Current Tor exit IP: $CURRENT_IP"
        else
            echo "✗ Connection through Tor failed"
        fi
    else
        echo "(curl not available to test connection)"
    fi

    echo ""
    if [ -f ".tor/tor.log" ]; then
        echo "Recent log entries:"
        tail -n 5 .tor/tor.log
    fi
else
    echo "✗ Tor is not running"
    echo ""
    echo "To start Tor, run: ./start-tor.sh"
    echo "To set up Tor, run: ./setup-tor.sh"
fi
