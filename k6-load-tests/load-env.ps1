# Load .env file into PowerShell environment
# Usage: .\load-env.ps1

$envFile = ".\.env"

if (Test-Path $envFile) {
    Write-Host "📂 Loading environment variables from .env file..." -ForegroundColor Cyan

    Get-Content $envFile | ForEach-Object {
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
            Write-Host "  ✓ $name = $value" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "✅ Environment variables loaded successfully!" -ForegroundColor Green
    Write-Host ""

} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Create .env file from .env.example:" -ForegroundColor Yellow
    Write-Host "  copy .env.example .env" -ForegroundColor Cyan
    exit 1
}
