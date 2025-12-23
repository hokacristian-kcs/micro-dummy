# k6 Load Test Runner - PowerShell Version for Windows
# Usage: .\run-all-tests.ps1 [test-name]
# Example: .\run-all-tests.ps1 smoke

##########################################################
# WARNING: Running all tests will BRUTAL attack your
# production services.
##########################################################

param(
    [Parameter(Position=0)]
    [ValidateSet('smoke', 'stress', 'spike', 'cascade', 'all', '')]
    [string]$TestName = ''
)

# Auto-load .env file if it exists
if (Test-Path ".\.env") {
    Write-Host "📂 Loading environment variables from .env file..." -ForegroundColor Cyan

    Get-Content ".\.env" | ForEach-Object {
        # Skip empty lines and comments
        if ($_ -match '^\s*$' -or $_ -match '^\s*#') {
            return
        }

        # Parse KEY=VALUE
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()

            # Remove quotes if present
            $value = $value -replace '^[''"]|[''"]$', ''

            # Set environment variable
            Set-Item -Path "env:$name" -Value $value
        }
    }

    Write-Host "✅ Environment variables loaded from .env" -ForegroundColor Green
}

# Check if k6 is installed
try {
    $k6Version = k6 version 2>$null
    Write-Host "✓ k6 is installed: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "❌ k6 is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install k6 for Windows:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install k6" -ForegroundColor Cyan
    Write-Host "  Option 2: Download from https://k6.io/docs/getting-started/installation/" -ForegroundColor Cyan
    Write-Host "  Option 3: winget install k6" -ForegroundColor Cyan
    exit 1
}

# Check if service URLs are configured
Write-Host ""
Write-Host "🔍 Checking service URL configuration..." -ForegroundColor Blue

if (-not $env:USER_SERVICE_URL) {
    Write-Host "⚠️  USER_SERVICE_URL not set in environment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Set your Vercel URLs before running tests:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host '$env:USER_SERVICE_URL = "https://your-user-service.vercel.app"' -ForegroundColor Cyan
    Write-Host '$env:WALLET_SERVICE_URL = "https://your-wallet-service.vercel.app"' -ForegroundColor Cyan
    Write-Host '$env:PAYMENT_SERVICE_URL = "https://your-payment-service.vercel.app"' -ForegroundColor Cyan
    Write-Host '$env:NOTIFICATION_SERVICE_URL = "https://your-notification-service.vercel.app"' -ForegroundColor Cyan
    Write-Host '$env:CREDIT_SERVICE_URL = "https://your-credit-service.vercel.app"' -ForegroundColor Cyan
    Write-Host ""

    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 1
    }
}

# Create results directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$resultsDir = ".\results\$timestamp"
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

Write-Host "📁 Results will be saved to: $resultsDir" -ForegroundColor Green
Write-Host ""

##########################################################
# Function to run a single test
##########################################################
function Run-K6Test {
    param(
        [string]$TestDisplayName,
        [string]$TestFile,
        [string]$Severity
    )

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host "🧪 Running: $TestDisplayName" -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""

    if ($Severity -eq "EXTREME") {
        Write-Host "⚠️⚠️⚠️  EXTREME WARNING  ⚠️⚠️⚠️" -ForegroundColor Red
        Write-Host "This test will likely CRASH your services!" -ForegroundColor Red
        Write-Host ""

        $confirm = Read-Host "Are you SURE you want to continue? (yes/NO)"
        if ($confirm -ne 'yes') {
            Write-Host "Skipped $TestDisplayName" -ForegroundColor Yellow
            return
        }
    }

    # Run k6 test
    $testNameSlug = $TestDisplayName -replace ' ', '-'
    $jsonOutput = "$resultsDir\$testNameSlug-results.json"
    $summaryOutput = "$resultsDir\$testNameSlug-summary.json"

    Write-Host "🚀 Starting test..." -ForegroundColor Cyan

    k6 run $TestFile --out "json=$jsonOutput" --summary-export="$summaryOutput"

    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ $TestDisplayName completed" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ $TestDisplayName failed (exit code: $exitCode)" -ForegroundColor Red
        Write-Host "Check results in: $resultsDir" -ForegroundColor Yellow

        if ($Severity -ne "NORMAL") {
            $continueTests = Read-Host "Continue with remaining tests? (y/N)"
            if ($continueTests -ne 'y' -and $continueTests -ne 'Y') {
                exit 1
            }
        }
    }

    # Cooldown period
    if ($Severity -eq "EXTREME" -or $Severity -eq "HIGH") {
        Write-Host "⏳ Cooling down for 30 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    } else {
        Start-Sleep -Seconds 5
    }
}

##########################################################
# Main execution
##########################################################

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║         k6 Load Test Suite - Production Attack       ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Show usage if no test name provided
if ($TestName -eq '') {
    Write-Host "Usage: .\run-all-tests.ps1 [test-name]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available tests:" -ForegroundColor Cyan
    Write-Host "  smoke    - Baseline verification (10 VUs, 1 min)" -ForegroundColor White
    Write-Host "  stress   - Gradual load increase (0→500 VUs, 10 min)" -ForegroundColor White
    Write-Host "  spike    - Instant traffic surge (500 VUs instant, 5 min)" -ForegroundColor White
    Write-Host "  cascade  - Prove cascading failures (300 VUs focused, 5 min)" -ForegroundColor White
    Write-Host "  all      - Run all tests sequentially" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\run-all-tests.ps1 smoke" -ForegroundColor Gray
    Write-Host "  .\run-all-tests.ps1 all" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Execute tests based on parameter
switch ($TestName) {
    'smoke' {
        Run-K6Test -TestDisplayName "smoke-test" -TestFile ".\01-smoke-test.js" -Severity "NORMAL"
    }
    'stress' {
        Run-K6Test -TestDisplayName "stress-test" -TestFile ".\02-stress-test.js" -Severity "HIGH"
    }
    'spike' {
        Run-K6Test -TestDisplayName "spike-test" -TestFile ".\03-spike-test.js" -Severity "EXTREME"
    }
    'cascade' {
        Run-K6Test -TestDisplayName "cascading-failure-test" -TestFile ".\04-cascading-failure-test.js" -Severity "EXTREME"
    }
    'all' {
        Run-K6Test -TestDisplayName "smoke-test" -TestFile ".\01-smoke-test.js" -Severity "NORMAL"
        Run-K6Test -TestDisplayName "stress-test" -TestFile ".\02-stress-test.js" -Severity "HIGH"
        Run-K6Test -TestDisplayName "spike-test" -TestFile ".\03-spike-test.js" -Severity "EXTREME"
        Run-K6Test -TestDisplayName "cascading-failure-test" -TestFile ".\04-cascading-failure-test.js" -Severity "EXTREME"
    }
}

##########################################################
# Final summary
##########################################################

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 Test suite completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Results location: $resultsDir" -ForegroundColor Blue
Write-Host ""
Write-Host "To view detailed results:" -ForegroundColor Cyan
Write-Host "  Get-Content $resultsDir\*-summary.json | ConvertFrom-Json" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  Don't forget to check your cloud provider bills!" -ForegroundColor Yellow
Write-Host "⚠️  Monitor your Vercel and Neon usage dashboards" -ForegroundColor Yellow
Write-Host ""
