# Test if PostgREST can see the function
# Run this in PowerShell

$body = @{
    p_customer_name = "Test Customer"
    p_booking_date = "2026-02-20"
    p_total_hours = 1
    p_total_amount = 1500
    p_advance_payment = 500
    p_advance_payment_method = "cash"
    p_advance_payment_proof = "test-proof"
    p_slots = @(
        @{
            slot_hour = 10
            slot_time = "10:00:00"
            slot_date = "2026-02-20"
            is_night_rate = $false
            hourly_rate = 1500
        }
    )
    p_customer_phone = "03001234567"
    p_customer_notes = "test booking"
} | ConvertTo-Json -Depth 10

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50aXRkc2tyY3V3Z3F3endoamttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzczMDQsImV4cCI6MjA4NDE1MzMwNH0.4S6IFTngJUUFsTjJMOlv5DxWLtAGmdpGwUJDl_viIgA"
}

try {
    Write-Host "Testing function via REST API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod `
        -Uri "https://ntitdskrcuwgqwzwhjkm.supabase.co/rest/v1/rpc/create_booking_with_slots" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ SUCCESS! Function is accessible via REST API" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 404) {
        Write-Host "❌ FAILED: 404 - Function not found in PostgREST schema cache" -ForegroundColor Red
        Write-Host "PostgREST cache has NOT refreshed yet" -ForegroundColor Red
        Write-Host "" 
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Wait 10 minutes total since running EMERGENCY-FIX-BOOKING-FUNCTION.sql"
        Write-Host "2. If >10 minutes, contact Supabase Support for manual PostgREST restart"
        Write-Host "3. Support URL: https://supabase.com/dashboard/support"
    } else {
        Write-Host "❌ ERROR: HTTP $statusCode" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}
