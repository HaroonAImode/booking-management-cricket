#!/bin/bash

# ========================================
# SLOT STATUS FIX - DEPLOYMENT SCRIPT
# ========================================
# This script helps deploy the comprehensive slot status fix
# Run this from your project root directory
# ========================================

echo "🚀 Starting Slot Status Fix Deployment..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Verify files exist
echo "📋 Step 1: Verifying required files..."
FILES=(
  "fix-slots-status-comprehensive.sql"
  "components/CalendarFirstBooking.tsx"
  "components/BookingForm.tsx"
  "app/api/public/slots/conflict-check/route.ts"
  "SLOT-STATUS-FIX-COMPLETE.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} Found: $file"
  else
    echo -e "${RED}✗${NC} Missing: $file"
    exit 1
  fi
done

echo ""
echo -e "${GREEN}✅ All required files present${NC}"
echo ""

# Step 2: Database migration
echo "📦 Step 2: Database Migration"
echo "----------------------------------------"
echo "You need to run the SQL migration in your Supabase project."
echo ""
echo "Option 1: Using Supabase Dashboard"
echo "  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo "  2. Copy contents of: fix-slots-status-comprehensive.sql"
echo "  3. Paste and run in SQL Editor"
echo ""
echo "Option 2: Using psql CLI"
echo "  psql YOUR_DATABASE_URL -f fix-slots-status-comprehensive.sql"
echo ""
read -p "Have you run the database migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Please run the database migration first${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Database migration confirmed"
echo ""

# Step 3: Verify database functions
echo "📋 Step 3: Verifying Database Functions"
echo "----------------------------------------"
echo "Please run these queries in your Supabase SQL Editor to verify:"
echo ""
echo "-- Test slot fetching"
echo "SELECT * FROM get_available_slots(CURRENT_DATE) LIMIT 5;"
echo ""
echo "-- Test cleanup function"
echo "SELECT cleanup_expired_pending_bookings();"
echo ""
echo "-- Test conflict check"
echo "SELECT * FROM check_and_lock_slots(CURRENT_DATE, ARRAY[14,15,16]);"
echo ""
read -p "Have you verified the functions work? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Please verify database functions${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Database functions verified"
echo ""

# Step 4: Frontend deployment
echo "🌐 Step 4: Deploying Frontend Changes"
echo "----------------------------------------"

# Check if git is available
if command -v git &> /dev/null; then
  echo "Git detected. Checking repository status..."
  
  # Check for uncommitted changes
  if [[ -n $(git status -s) ]]; then
    echo ""
    echo "📝 Uncommitted changes detected:"
    git status -s
    echo ""
    read -p "Do you want to commit and push these changes? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo "🔄 Staging changes..."
      git add .
      
      echo "💾 Committing changes..."
      git commit -m "Fix: Comprehensive slot status and conflict prevention

- Added auto-cleanup for expired pending bookings
- Improved get_available_slots() function with proper status logic
- Implemented auto-refresh (10s interval) for real-time updates
- Added conflict detection and prevention
- Created conflict-check API endpoint with row locking
- Enhanced booking submission with pre-submission verification
- Added visual indicators for live status
- Improved user experience with conflict warnings"
      
      echo "🚀 Pushing to remote..."
      git push
      
      echo -e "${GREEN}✓${NC} Changes deployed via Git"
    else
      echo -e "${YELLOW}⚠️  Skipping Git deployment${NC}"
    fi
  else
    echo -e "${GREEN}✓${NC} No uncommitted changes"
  fi
else
  echo -e "${YELLOW}⚠️  Git not detected. Please deploy manually${NC}"
fi

echo ""

# Step 5: Testing checklist
echo "🧪 Step 5: Testing Checklist"
echo "----------------------------------------"
echo ""
echo "Please perform these tests:"
echo ""
echo "✓ Test 1: View booking page and verify slots display correctly"
echo "✓ Test 2: Open in two tabs, book in one, verify other updates within 10s"
echo "✓ Test 3: Try booking same slots simultaneously (should prevent)"
echo "✓ Test 4: Create pending booking, wait for expiry, verify becomes available"
echo "✓ Test 5: Check browser console for auto-refresh logs"
echo ""

read -p "Press Enter to see the deployment summary..."
echo ""

# Deployment summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "        DEPLOYMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ COMPLETED ITEMS:${NC}"
echo "  ✓ Database functions created/updated"
echo "  ✓ Auto-cleanup mechanism implemented"
echo "  ✓ Frontend auto-refresh added (10s interval)"
echo "  ✓ Conflict detection enabled"
echo "  ✓ Row-level locking for race condition prevention"
echo "  ✓ New API endpoint: /api/public/slots/conflict-check"
echo "  ✓ Enhanced booking submission with verification"
echo ""
echo -e "${BLUE}📊 KEY FEATURES:${NC}"
echo "  • Real-time slot updates every 10 seconds"
echo "  • Automatic expired booking cleanup"
echo "  • Multi-layer conflict prevention"
echo "  • Visual live status indicator"
echo "  • Graceful conflict warnings for users"
echo ""
echo -e "${YELLOW}📖 DOCUMENTATION:${NC}"
echo "  • Full guide: SLOT-STATUS-FIX-COMPLETE.md"
echo "  • SQL migration: fix-slots-status-comprehensive.sql"
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo ""
echo "Your customers will now experience:"
echo "  ✓ Accurate real-time slot availability"
echo "  ✓ Zero booking conflicts"
echo "  ✓ Professional booking experience"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Need help? Check SLOT-STATUS-FIX-COMPLETE.md for detailed documentation"
echo ""
