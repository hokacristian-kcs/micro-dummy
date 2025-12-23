# 🪟 Windows Setup Guide - k6 Load Testing

Quick setup guide untuk Windows users dengan PowerShell.

---

## Step 1: Install k6 (Choose One)

### Option A: Using Chocolatey (Recommended)

```powershell
# Install Chocolatey if you don't have it
# See: https://chocolatey.org/install

# Install k6
choco install k6
```

### Option B: Using winget

```powershell
winget install k6
```

### Option C: Manual Download

1. Download dari: https://github.com/grafana/k6/releases/latest
2. Download file: `k6-vX.XX.X-windows-amd64.zip`
3. Extract ke folder (misal: `C:\k6`)
4. Add ke PATH:
   ```powershell
   $env:Path += ";C:\k6"
   # Atau permanent:
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\k6", "User")
   ```

### Verify Installation

```powershell
k6 version
```

Expected output:
```
k6 v0.47.0 (2023-10-10T12:00:00+0000/v0.47.0-0-gXXXXXXX, go1.21.1, windows/amd64)
```

---

## Step 2: Set Service URLs

**GANTI dengan actual Vercel deployment URLs Anda!**

```powershell
# Set untuk session sekarang
$env:USER_SERVICE_URL = "https://your-user-service.vercel.app"
$env:WALLET_SERVICE_URL = "https://your-wallet-service.vercel.app"
$env:PAYMENT_SERVICE_URL = "https://your-payment-service.vercel.app"
$env:NOTIFICATION_SERVICE_URL = "https://your-notification-service.vercel.app"
$env:CREDIT_SERVICE_URL = "https://your-credit-service.vercel.app"
```

### Make URLs Permanent (Optional)

```powershell
# Set permanent environment variables
[Environment]::SetEnvironmentVariable("USER_SERVICE_URL", "https://your-user-service.vercel.app", "User")
[Environment]::SetEnvironmentVariable("WALLET_SERVICE_URL", "https://your-wallet-service.vercel.app", "User")
[Environment]::SetEnvironmentVariable("PAYMENT_SERVICE_URL", "https://your-payment-service.vercel.app", "User")
[Environment]::SetEnvironmentVariable("NOTIFICATION_SERVICE_URL", "https://your-notification-service.vercel.app", "User")
[Environment]::SetEnvironmentVariable("CREDIT_SERVICE_URL", "https://your-credit-service.vercel.app", "User")

# Restart PowerShell after this
```

---

## Step 3: Enable PowerShell Script Execution

PowerShell default setting block scripts. Enable execution:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set to allow scripts (choose one)
# Option A: Allow for current user (Recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Option B: Bypass for this session only
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

---

## Step 4: Run Tests

Navigate ke k6-load-tests folder:

```powershell
cd k6-load-tests
```

### Run dengan PowerShell Script (.ps1)

```powershell
# Smoke test (ALWAYS start here!)
.\run-all-tests.ps1 smoke

# Stress test
.\run-all-tests.ps1 stress

# Spike test (EXTREME!)
.\run-all-tests.ps1 spike

# Cascading failure test
.\run-all-tests.ps1 cascade

# Run ALL tests
.\run-all-tests.ps1 all
```

### Or Run k6 Directly (Without Script)

```powershell
# Smoke test
k6 run .\01-smoke-test.js

# Stress test
k6 run .\02-stress-test.js

# Spike test
k6 run .\03-spike-test.js

# Cascading failure test
k6 run .\04-cascading-failure-test.js
```

---

## 🔧 Troubleshooting

### Issue: "k6: command not found"

**Fix 1:** Close and reopen PowerShell after installation

**Fix 2:** Check if k6 is in PATH:
```powershell
$env:Path -split ';' | Select-String k6
```

**Fix 3:** Add k6 manually to PATH:
```powershell
$k6Path = "C:\path\to\k6"  # Change this
$env:Path += ";$k6Path"
```

---

### Issue: "Scripts are disabled on this system"

**Error:**
```
.\run-all-tests.ps1 : File cannot be loaded because running scripts is disabled
```

**Fix:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run script again.

---

### Issue: "Service URLs not set"

**Fix:** Set environment variables (see Step 2 above)

**Verify:**
```powershell
echo $env:USER_SERVICE_URL
echo $env:WALLET_SERVICE_URL
```

---

### Issue: Script runs but no output

**Possible causes:**
1. k6 not installed → Run `k6 version`
2. Wrong directory → Make sure you're in `k6-load-tests` folder
3. Service URLs not set → Check env vars

**Debug:**
```powershell
# Check current directory
pwd

# Check if test files exist
ls *.js

# Check k6 installation
k6 version

# Run with verbose output
k6 run .\01-smoke-test.js --verbose
```

---

### Issue: Tests fail immediately

**Check services are deployed:**
```powershell
# Test if service URL is reachable
curl $env:USER_SERVICE_URL/api/users

# Or with Invoke-WebRequest
Invoke-WebRequest -Uri "$env:USER_SERVICE_URL/api/users" -Method GET
```

---

## 📊 View Results

After running tests, results are saved in `results\` folder:

```powershell
# List all results
ls .\results\

# View latest summary
$latest = ls .\results\ | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-Content ".\results\$latest\smoke-test-summary.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Or use jq if installed (choco install jq)
cat .\results\*\smoke-test-summary.json | jq
```

---

## 🚀 Quick Command Reference

```powershell
# Install k6
choco install k6

# Set URLs (REPLACE WITH YOUR ACTUAL URLs!)
$env:USER_SERVICE_URL = "https://your-user-service.vercel.app"
$env:WALLET_SERVICE_URL = "https://your-wallet-service.vercel.app"
$env:PAYMENT_SERVICE_URL = "https://your-payment-service.vercel.app"
$env:NOTIFICATION_SERVICE_URL = "https://your-notification-service.vercel.app"
$env:CREDIT_SERVICE_URL = "https://your-credit-service.vercel.app"

# Enable scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Navigate to tests
cd k6-load-tests

# Run smoke test
.\run-all-tests.ps1 smoke
```

---

## ℹ️ Alternative: Use WSL (Windows Subsystem for Linux)

If you prefer bash:

```powershell
# Install WSL
wsl --install

# Restart computer

# Open WSL (Ubuntu)
wsl

# Install k6 in WSL
curl -s https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xvz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

# Navigate to project (Windows drive is at /mnt/)
cd /mnt/d/KERJAAN/dummy/k6-load-tests

# Run bash script
./run-all-tests.sh smoke
```

---

## 📚 More Help

- Full documentation: `README.md`
- Quick start guide: `QUICKSTART.md`
- k6 Windows docs: https://k6.io/docs/getting-started/installation/#windows

**Happy Testing! 🔥**
