#!/bin/bash
# Setup script for Tor proxy on Replit

echo "Setting up Tor proxy..."

# Install Tor if not already installed
if ! command -v tor &> /dev/null; then
    echo "Installing Tor..."

    # For Replit (Nix-based)
    if [ -f ".replit" ]; then
        echo "Detected Replit environment"
        # Replit uses Nix, so we need to use nix-env
        nix-env -iA nixpkgs.tor
    else
        # For other Debian/Ubuntu-based systems
        sudo apt-get update
        sudo apt-get install -y tor
    fi
else
    echo "Tor is already installed"
fi

# Create Tor configuration directory
mkdir -p .tor

# Create Tor configuration file
cat > .tor/torrc << 'EOF'
# Tor configuration for YouTube Intel Scan

# SOCKS proxy port
SOCKSPort 9050

# Control port for circuit refresh
ControlPort 9051

# Allow control without authentication (safe since it's local)
CookieAuthentication 0

# Faster circuit building
CircuitBuildTimeout 5
LearnCircuitBuildTimeout 0

# Use more entry guards for better reliability
NumEntryGuards 8

# Data directory
DataDirectory .tor/data

# Log configuration
Log notice file .tor/tor.log

# Use only fast and stable nodes
StrictNodes 0
EOF

# Create data directory
mkdir -p .tor/data

echo "Tor configuration created at .tor/torrc"
echo ""
echo "To start Tor, run: ./start-tor.sh"
echo "To enable Tor proxy in the app, set environment variable: USE_TOR_PROXY=true"
