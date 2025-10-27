# Quick Git Deployment Guide

## 🚀 How to Push to GitHub

This project is connected to: `brianference/youtube-intel-scan`

### The Commands (Copy & Paste These)

```bash
# Step 1: Add all changes
git add .

# Step 2: Commit with a descriptive message
git commit -m "Your commit message here"

# Step 3: Push to GitHub
git push $GIT_URL
```

### ⚠️ Important Notes

- **DO NOT** use `git push origin main` (will fail with authentication error)
- **ALWAYS** use `git push $GIT_URL` (uses your stored GitHub token)
- The `$GIT_URL` secret is already configured in Replit Secrets
- This is the ONLY method that works for this project

### Common Workflows

**Quick push of all changes:**
```bash
git add . && git commit -m "Quick update" && git push $GIT_URL
```

**Push specific files:**
```bash
git add file1.ts file2.ts && git commit -m "Updated specific files" && git push $GIT_URL
```

**Check what's changed before committing:**
```bash
git status
git diff
```

### Why $GIT_URL?

- Contains your GitHub Personal Access Token
- Bypasses password authentication (which GitHub disabled)
- Stored securely in Replit Secrets
- Format: `https://username:token@github.com/user/repo`

---

## 📦 Deploy to Netlify After Pushing

Once your code is on GitHub, deploy to Netlify:

1. Go to: https://app.netlify.com
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select: `brianference/youtube-intel-scan`
5. Click "Deploy site" (netlify.toml auto-detected)
6. Get your URL: `https://your-site.netlify.app`
7. Add secret in Replit:
   - Key: `NETLIFY_FUNCTION_URL`
   - Value: `https://your-site.netlify.app/api/transcript-proxy`

See `NETLIFY_PROXY_SETUP.md` for detailed instructions.
