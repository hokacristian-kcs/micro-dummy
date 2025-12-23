# ⚡ Quick Start Guide - 5 Minutes to Attack

Fastest way to start load testing your production services.

## Step 1: Install k6 (2 minutes)

**macOS:**
```bash
brew install k6
```

**Ubuntu:**
```bash
curl -s https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xvz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
```

**Windows:**
```powershell
choco install k6
```

Verify:
```bash
k6 version
```

---

## Step 2: Set Service URLs (1 minute)

Find your Vercel URLs from: https://vercel.com/dashboard

**Option A: Export directly**
```bash
export USER_SERVICE_URL=https://your-user-service.vercel.app
export WALLET_SERVICE_URL=https://your-wallet-service.vercel.app
export PAYMENT_SERVICE_URL=https://your-payment-service.vercel.app
export NOTIFICATION_SERVICE_URL=https://your-notification-service.vercel.app
export CREDIT_SERVICE_URL=https://your-credit-service.vercel.app
```

**Option B: Use .env file**
```bash
cp .env.example .env
# Edit .env with your URLs
nano .env  # or use your favorite editor
```

---

## Step 3: Run Your First Test (2 minutes)

### Start with Smoke Test (ALWAYS!)

```bash
cd k6-load-tests
./run-all-tests.sh smoke
```

**Expected output if services are healthy:**
```
✅ Create User: status is 200 or 201
✅ Get Users: status is 200 or 201
✅ Get Wallet: status is 200 or 201
...
✅ smoke-test completed
```

**If you see errors:**
```
❌ ERROR [Create User]:
   Status: 500
   Body: {"error":"Wallet service unavailable"}
```
→ Your services have the cascading failure vulnerability!

---

## Step 4: Run Brutal Tests (Optional)

⚠️ **Only if you want to prove vulnerabilities or crash your services**

```bash
# Stress Test - Find breaking point (10 min)
./run-all-tests.sh stress

# Spike Test - Instant 500 VUs (5 min) - EXTREME!
./run-all-tests.sh spike

# Cascading Failure Test - Prove the bug (5 min) - EXTREME!
./run-all-tests.sh cascade
```

---

## What to Look For

### ✅ Healthy Service
```
http_req_failed: 0.12%
http_req_duration: p(95)=1.2s
```

### ⚠️ Service Under Pressure
```
http_req_failed: 8.5%
http_req_duration: p(95)=4.2s
```

### 🔴 Service Failing
```
http_req_failed: 45.2%
http_req_duration: p(95)=25.4s
💥 IMMEDIATE FAILURE: Connection refused
🔗 CASCADE FAILURE: User→Wallet dependency broken
```

---

## Quick Fixes for Common Issues

### Issue: "k6: command not found"
**Fix:** Install k6 (see Step 1)

### Issue: "Service URLs not set"
**Fix:** Run the export commands (see Step 2)

### Issue: All requests failing immediately
**Fix:**
1. Check URLs are correct
2. Verify services are deployed: `curl $USER_SERVICE_URL/api/users`
3. Check Vercel dashboard for service status

### Issue: Tests too slow/expensive
**Fix:** Edit test files and reduce VU counts:
```javascript
// In 02-stress-test.js, change:
{ duration: '2m', target: 500 }
// To:
{ duration: '2m', target: 100 }
```

---

## One-Line Commands

```bash
# Install k6 (macOS)
brew install k6

# Set URLs (replace with your actual URLs!)
export USER_SERVICE_URL=https://your-user-service.vercel.app WALLET_SERVICE_URL=https://your-wallet-service.vercel.app PAYMENT_SERVICE_URL=https://your-payment-service.vercel.app NOTIFICATION_SERVICE_URL=https://your-notification-service.vercel.app CREDIT_SERVICE_URL=https://your-credit-service.vercel.app

# Run smoke test
cd k6-load-tests && ./run-all-tests.sh smoke
```

---

## What's Next?

After running tests:

1. **Check Results:**
   ```bash
   ls -la results/
   cat results/*/smoke-test-summary.json | jq
   ```

2. **Read Full Documentation:**
   ```bash
   cat README.md
   ```

3. **Implement Fixes:**
   - Add fetch timeouts (5s)
   - Implement rate limiting (100 req/min)
   - Configure DB connection pooling
   - Add circuit breakers

4. **Re-test:**
   ```bash
   ./run-all-tests.sh smoke
   # Should see improved metrics!
   ```

---

## Need Help?

- Full docs: `README.md`
- k6 documentation: https://k6.io/docs/
- Service configuration: `config.js`
- Test scripts: `01-smoke-test.js`, `02-stress-test.js`, etc.

**Ready? Let's break some services! 🔥**
