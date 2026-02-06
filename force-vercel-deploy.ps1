# Vercel Force Redeploy Script
# This will force a complete rebuild without cache

Write-Host "🔄 Forcing Vercel redeploy without cache..." -ForegroundColor Yellow

# Option 1: Remove .vercel folder (forces complete rebuild)
if (Test-Path ".vercel") {
    Write-Host "🗑️ Removing .vercel cache folder..." -ForegroundColor Cyan
    Remove-Item -Path ".vercel" -Recurse -Force
}

# Option 2: Redeploy to production
Write-Host "🚀 Deploying to production..." -ForegroundColor Cyan
vercel --prod --force

Write-Host "✅ Deployment complete! Wait 2 minutes then test." -ForegroundColor Green
Write-Host "🌐 Site: https://cricket-booking-peach.vercel.app" -ForegroundColor Green
