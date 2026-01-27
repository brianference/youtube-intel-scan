#!/bin/bash
# Run this script in your Replit workspace to apply the client-side transcript changes

echo "Applying client-side transcript fetching changes..."

# Backup existing files
cp client/src/pages/Videos.tsx client/src/pages/Videos.tsx.bak 2>/dev/null
cp server/routes.ts server/routes.ts.bak 2>/dev/null

# The changes have been committed to git, so pull from origin
echo "Fetching latest changes from GitHub..."

# Try to pull using GIT_URL if set
if [ -n "$GIT_URL" ]; then
  git fetch "$GIT_URL" main
  git merge FETCH_HEAD -m "Merge client-side transcript fetching"
  echo "Changes applied successfully!"
else
  echo "GIT_URL not set. Please run:"
  echo "  git fetch \$GIT_URL main && git merge FETCH_HEAD"
fi

echo ""
echo "After applying, restart your Replit app to test."
