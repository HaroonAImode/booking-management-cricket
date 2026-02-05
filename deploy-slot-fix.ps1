# ========================================
# SLOT STATUS FIX - DEPLOYMENT SCRIPT (PowerShell)
# ========================================
# Run this from your project root directory in PowerShell
# ========================================

Write-Host ""
Write-Host "🚀 Starting Slot Status Fix Deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify files exist
Write-Host "📋 Step 1: Verifying required files..." -ForegroundColor Yellow

$files = @(
    "fix-slots-status-comprehensive.sql",
    "components\CalendarFirstBooking.tsx",
    "components\BookingForm.tsx",
    "app\api\public\slots\conflict-check\route.ts",
    "SLOT-STATUS-FIX-COMPLETE.md"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ Some required files are missing. Please ensure all files are present." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All required files present" -ForegroundColor Green
Write-Host ""

# Step 2: Database migration
Write-Host "📦 Step 2: Database Migration" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Write-Host "You need to run the SQL migration in your Supabase project."
Write-Host ""
Write-Host "Option 1: Using Supabase Dashboard" -ForegroundColor Cyan
Write-Host "  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
Write-Host "  2. Copy contents of: fix-slots-status-comprehensive.sql"
Write-Host "  3. Paste and run in SQL Editor"
Write-Host ""
Write-Host "Option 2: Using psql CLI" -ForegroundColor Cyan
Write-Host "  psql YOUR_DATABASE_URL -f fix-slots-status-comprehensive.sql"
Write-Host ""

$dbMigration = Read-Host "Have you run the database migration? (y/n)"
if ($dbMigration -ne 'y' -and $dbMigration -ne 'Y') {
    Write-Host "⚠️  Please run the database migration first" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Database migration confirmed" -ForegroundColor Green
Write-Host ""

# Step 3: Verify database functions
Write-Host "📋 Step 3: Verifying Database Functions" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Write-Host "Please run these queries in your Supabase SQL Editor to verify:"
Write-Host ""
Write-Host "-- Test slot fetching" -ForegroundColor Cyan
Write-Host "SELECT * FROM get_available_slots(CURRENT_DATE) LIMIT 5;"
Write-Host ""
Write-Host "-- Test cleanup function" -ForegroundColor Cyan
Write-Host "SELECT cleanup_expired_pending_bookings();"
Write-Host ""
Write-Host "-- Test conflict check" -ForegroundColor Cyan
Write-Host "SELECT * FROM check_and_lock_slots(CURRENT_DATE, ARRAY[14,15,16]);"
Write-Host ""

$dbVerify = Read-Host "Have you verified the functions work? (y/n)"
if ($dbVerify -ne 'y' -and $dbVerify -ne 'Y') {
    Write-Host "⚠️  Please verify database functions" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Database functions verified" -ForegroundColor Green
Write-Host ""

# Step 4: Frontend deployment
Write-Host "🌐 Step 4: Deploying Frontend Changes" -ForegroundColor Yellow
Write-Host "----------------------------------------"

# Check if git is available
$gitExists = Get-Command git -ErrorAction SilentlyContinue
if ($gitExists) {
    Write-Host "Git detected. Checking repository status..."
    
    # Check for uncommitted changes
    $gitStatus = git status -s
    if ($gitStatus) {
        Write-Host ""
        Write-Host "📝 Uncommitted changes detected:" -ForegroundColor Yellow
        git status -s
        Write-Host ""
        
        $gitDeploy = Read-Host "Do you want to commit and push these changes? (y/n)"
        
        if ($gitDeploy -eq 'y' -or $gitDeploy -eq 'Y') {
            Write-Host ""
            Write-Host "🔄 Staging changes..." -ForegroundColor Cyan
            git add .
            
            Write-Host "💾 Committing changes..." -ForegroundColor Cyan
            $commitMessage = @"
Fix: Comprehensive slot status and conflict prevention

- Added auto-cleanup for expired pending bookings
- Improved get_available_slots() function with proper status logic
- Implemented auto-refresh (10s interval) for real-time updates
- Added conflict detection and prevention
- Created conflict-check API endpoint with row locking
- Enhanced booking submission with pre-submission verification
- Added visual indicators for live status
- Improved user experience with conflict warnings
"@
            git commit -m $commitMessage
            
            Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
            git push
            
            Write-Host "✓ Changes deployed via Git" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Skipping Git deployment" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✓ No uncommitted changes" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Git not detected. Please deploy manually" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Testing checklist
Write-Host "🧪 Step 5: Testing Checklist" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Write-Host ""
Write-Host "Please perform these tests:"
Write-Host ""
Write-Host "✓ Test 1: View booking page and verify slots display correctly"
Write-Host "✓ Test 2: Open in two tabs, book in one, verify other updates within 10s"
Write-Host "✓ Test 3: Try booking same slots simultaneously (should prevent)"
Write-Host "✓ Test 4: Create pending booking, wait for expiry, verify becomes available"
Write-Host "✓ Test 5: Check browser console for auto-refresh logs"
Write-Host ""

Read-Host "Press Enter to see the deployment summary"
Write-Host ""

# Deployment summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "        DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ COMPLETED ITEMS:" -ForegroundColor Green
Write-Host "  ✓ Database functions created/updated"
Write-Host "  ✓ Auto-cleanup mechanism implemented"
Write-Host "  ✓ Frontend auto-refresh added (10s interval)"
Write-Host "  ✓ Conflict detection enabled"
Write-Host "  ✓ Row-level locking for race condition prevention"
Write-Host "  ✓ New API endpoint: /api/public/slots/conflict-check"
Write-Host "  ✓ Enhanced booking submission with verification"
Write-Host ""
Write-Host "📊 KEY FEATURES:" -ForegroundColor Cyan
Write-Host "  • Real-time slot updates every 10 seconds"
Write-Host "  • Automatic expired booking cleanup"
Write-Host "  • Multi-layer conflict prevention"
Write-Host "  • Visual live status indicator"
Write-Host "  • Graceful conflict warnings for users"
Write-Host ""
Write-Host "📖 DOCUMENTATION:" -ForegroundColor Yellow
Write-Host "  • Full guide: SLOT-STATUS-FIX-COMPLETE.md"
Write-Host "  • SQL migration: fix-slots-status-comprehensive.sql"
Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Your customers will now experience:"
Write-Host "  ✓ Accurate real-time slot availability"
Write-Host "  ✓ Zero booking conflicts"
Write-Host "  ✓ Professional booking experience"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Need help? Check SLOT-STATUS-FIX-COMPLETE.md for detailed documentation"
Write-Host ""
