param([string]$msg = "chore: auto-sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
Write-Host "Staging all changes..."
git add .
Write-Host "Committing: $msg"
git commit -m $msg
Write-Host "Pushing to origin..."
git push origin HEAD
Write-Host "Done!"
