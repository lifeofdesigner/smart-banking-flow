#!/usr/bin/env sh

set -e

echo "Building project..."
npm run build

echo
echo "Upload reminder:"
echo "Upload the contents of the dist/ folder to your cPanel public web directory."

echo
echo "Files changed in the last commit:"
git diff-tree --no-commit-id --name-only -r HEAD
