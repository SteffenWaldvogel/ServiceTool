#!/bin/bash
MSG=${1:-"chore: auto-sync $(date '+%Y-%m-%d %H:%M')"}
echo "Staging all changes..."
git add .
echo "Committing: $MSG"
git commit -m "$MSG"
echo "Pushing to origin..."
git push origin HEAD
echo "Done!"
