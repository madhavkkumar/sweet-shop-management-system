#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 Push to GitHub Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if GitHub repo URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub repository URL"
    echo ""
    echo "Usage: ./push-to-github.sh https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    echo ""
    echo "Or follow these steps:"
    echo ""
    echo "1. Go to https://github.com/new"
    echo "2. Create a new repository (make it PUBLIC)"
    echo "3. Copy the repository URL"
    echo "4. Run this script with the URL:"
    echo "   ./push-to-github.sh https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    exit 1
fi

REPO_URL=$1

echo "📋 Repository URL: $REPO_URL"
echo ""

# Remove existing remote if any
git remote remove origin 2>/dev/null

# Add remote
echo "➕ Adding remote..."
git remote add origin "$REPO_URL"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🔗 Your repository is now available at:"
    echo "   ${REPO_URL%.git}"
    echo ""
    echo "📝 Next step: Update README.md with your repository link"
else
    echo ""
    echo "❌ Error pushing to GitHub"
    echo "   Please check:"
    echo "   1. Your GitHub repository URL is correct"
    echo "   2. You have push access to the repository"
    echo "   3. You're authenticated with GitHub"
    exit 1
fi

