# k6 Load Testing Suite - Microservices Architecture

⚠️ **PRODUCTION TESTING WARNING** ⚠️

This test suite is designed to **brutally attack your production services** and **prove vulnerabilities**. Running these tests WILL likely crash your services and impact real users.

## 📋 Test Suite Overview

| Test | VUs | Duration | Severity | Purpose |
|------|-----|----------|----------|---------|
| 🧪 **Smoke Test** | 10 | 1 min | ✅ Safe | Verify endpoints work |
| 💪 **Stress Test** | 0→500 | 10 min | ⚠️ High | Find breaking point |
| ⚡ **Spike Test** | →500 instant | 5 min | 🔴 EXTREME | Simulate viral traffic |
| 🔗 **Cascade Test** | 300 | 5 min | 🔴 EXTREME | Prove service dependencies |

---

## 🚀 Quick Start

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

**Verify installation:**
```bash
k6 version
```

---

### 2. Configure Service URLs

Set your deployed Vercel service URLs as environment variables:

```bash
export USER_SERVICE_URL=https://your-user-service.vercel.app
export WALLET_SERVICE_URL=https://your-wallet-service.vercel.app
export PAYMENT_SERVICE_URL=https://your-payment-service.vercel.app
export NOTIFICATION_SERVICE_URL=https://your-notification-service.vercel.app
export CREDIT_SERVICE_URL=https://your-credit-service.vercel.app
```

**Pro tip:** Add these to your `.bashrc` or `.zshrc`:
```bash
echo 'export USER_SERVICE_URL=https://your-user-service.vercel.app' >> ~/.bashrc
# ... repeat for all services
source ~/.bashrc
```

---

### 3. Run Tests

**Option A: Use the test runner script (Recommended)**

```bash
cd k6-load-tests

# Run smoke test first (always start here!)
./run-all-tests.sh smoke

# If smoke passes, run stress test
./run-all-tests.sh stress

# Run spike test (extreme!)
./run-all-tests.sh spike

# Run cascading failure test (extreme!)
./run-all-tests.sh cascade

# Run ALL tests sequentially (VERY dangerous!)
./run-all-tests.sh all
```

**Option B: Run tests manually**

```bash
# Smoke test
k6 run 01-smoke-test.js

# Stress test with custom VU limit
k6 run 02-stress-test.js -e MAX_VUS=300

# Spike test with HTML report
k6 run 03-spike-test.js --out html=spike-report.html

# Cascading failure test
k6 run 04-cascading-failure-test.js
```

---

## 📊 Test Descriptions

### 🧪 Test 1: Smoke Test (Baseline)

**File:** `01-smoke-test.js`

**Purpose:** Verify all endpoints work under minimal load

**Load Profile:**
- 5 VUs for 10s (ramp up)
- 10 VUs for 40s (steady)
- 0 VUs for 10s (ramp down)

**Endpoints Tested:**
- ✅ POST /api/users (User registration)
- ✅ GET /api/users
- ✅ GET /api/wallets/user/:userId
- ✅ POST /api/wallets/:userId/topup
- ✅ POST /api/payments
- ✅ GET /api/payments
- ✅ POST /api/credits
- ✅ GET /api/credits
- ✅ POST /api/notifications

**Success Criteria:**
- < 1% request failures
- 95% of requests complete in < 2s
- All 5 services respond successfully

**When to Run:** ALWAYS run this first. If this fails, DO NOT run brutal tests.

---

### 💪 Test 2: Stress Test (Breaking Point)

**File:** `02-stress-test.js`

**Purpose:** Gradually increase load to find system limits

**Load Profile:**
```
0s   → 50 VUs   (1 min)
1m   → 100 VUs  (2 min)
3m   → 200 VUs  (2 min)
5m   → 350 VUs  (2 min)
7m   → 500 VUs  (2 min)
9m   → 500 VUs  (1 min hold)
10m  → 0 VUs    (2 min ramp down)
```

**What It Tests:**
- User Registration flow (User → Wallet cascade)
- Payment processing (Payment → Wallet → Notification)
- Direct wallet operations

**Success Criteria:**
- < 30% request failures
- 95% of requests complete in < 10s
- System recovers after load decreases

**Expected Results:**
- Breaking point detected between 100-300 VUs
- Cascading failures when Wallet Service is overwhelmed
- Database connection pool exhaustion

**Metrics to Watch:**
- Response times (will spike at breaking point)
- Error rate by service
- Database connection count (if monitoring enabled)

---

### ⚡ Test 3: Spike Test (Instant Traffic Surge)

**File:** `03-spike-test.js`

**Purpose:** Simulate sudden viral traffic (e.g., product launch, viral post)

**Load Profile:**
```
0s   → 50 VUs   (10s normal)
10s  → 500 VUs  (INSTANT spike!)
10s  → 500 VUs  (3 min hold)
3m10s→ 50 VUs   (30s sudden drop)
3m40s→ 0 VUs    (30s ramp down)
```

**Attack Vectors:**
- User registration flooding (triggers cascade)
- Payment processing bombardment
- Credit application flood
- Direct wallet hammering

**Success Criteria:**
- < 50% request failures (very lenient)
- 90% of requests complete in < 15s

**Expected Results:**
- 🔴 Immediate cascading failures
- 🔴 Connection refused errors
- 🔴 Timeout errors (>10s response times)
- 🔴 Services crash or become unresponsive

**This is the MOST BRUTAL test!**

---

### 🔗 Test 4: Cascading Failure Test (Proof of Concept)

**File:** `04-cascading-failure-test.js`

**Purpose:** PROVE the cascading failure vulnerability in your architecture

**Load Profile:**
- **Scenario 1:** 200 VUs hammering User Registration (3 min)
- **Scenario 2:** 100 VUs hammering Wallet Service directly (3 min)
- Both scenarios run **in parallel**

**The Cascade Chain:**
```
1. 200 VUs → User Service (/api/users)
2. Each triggers fetch() to Wallet Service (NO TIMEOUT!)
3. Wallet Service gets 200 concurrent requests
4. Wallet DB pool exhausted (~100-200 connections)
5. Wallet Service hangs/crashes
6. User Service requests hang indefinitely
7. User Service accumulates hanging connections
8. Memory leak → OOM crash
9. CASCADE COMPLETE ☠️
```

**Detection Stages:**
- **Stage 1:** Slow responses (>5s) - Early warning
- **Stage 2:** Severe delays (>15s) - DB pool exhausted
- **Stage 3:** Complete cascade - Services failing together

**Success Criteria:**
- We WANT to detect cascading failures
- Goal: Prove the vulnerability exists

**Expected Output:**
```
⚠️ STAGE 1: Slow responses detected (6245ms)
   Wallet Service likely under pressure

🔶 STAGE 2: Severe delays (17891ms)
   Wallet Service connections likely exhausted

🔴🔴🔴 STAGE 3: CASCADING FAILURE CONFIRMED 🔴🔴🔴
Time to cascade: 43.21s
Failure chain: User Service → Wallet Service
Root cause: No timeout on fetch() + DB pool exhaustion
```

---

## 📈 Understanding Results

### k6 Output Metrics

```
http_req_duration..........: avg=1.2s  min=234ms med=890ms max=15s  p(90)=2.1s p(95)=3.4s
http_req_failed............: 12.43% ✓ 1243 ✗ 8757
http_reqs..................: 10000  166.67/s
```

**Key Metrics:**
- `http_req_duration`: Response times (lower is better)
  - `p(95)`: 95% of requests completed within this time
  - `p(99)`: 99% of requests completed within this time
- `http_req_failed`: Percentage of failed requests
- `http_reqs`: Total requests and requests per second
- `vus`: Virtual users (concurrent users)

### Success vs Failure

**✅ Healthy System:**
```
http_req_failed: 0.5%     (< 1% failures)
p(95): 1.2s               (< 2s)
p(99): 2.1s               (< 5s)
```

**⚠️ Under Pressure:**
```
http_req_failed: 8.5%     (5-10% failures)
p(95): 4.2s               (2-5s)
p(99): 12.3s              (5-15s)
```

**🔴 System Failing:**
```
http_req_failed: 45.2%    (> 30% failures)
p(95): 25.4s              (> 20s)
p(99): timeout            (requests hanging)
```

---

## 🛡️ What to Fix After Testing

Based on your test results, you'll need to implement:

### 1. **Fetch Timeouts** (CRITICAL)

**Current vulnerable code:**
```typescript
// ❌ NO TIMEOUT!
const res = await fetch(`${WALLET_URL}/api/wallets`, {
  method: 'POST',
  body: JSON.stringify({ userId }),
});
```

**Fixed code:**
```typescript
// ✅ WITH TIMEOUT
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

try {
  const res = await fetch(`${WALLET_URL}/api/wallets`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
} catch (err) {
  if (err.name === 'AbortError') {
    console.error('Wallet service timeout');
    // Handle timeout - return fallback or error
  }
}
```

**Files to fix:**
- `services/user-service/api/index.ts:38`
- `services/payment-service/api/index.ts:51, 78, 93`
- `services/credit-service/api/index.ts:44, 57, 87, 108`
- `services/wallet-service/api/index.ts:64`
- `services/notification-service/api/index.ts:64`

---

### 2. **Rate Limiting** (CRITICAL)

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
});

app.use(async (c, next) => {
  const identifier = c.req.header('x-forwarded-for') || 'anonymous';
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await next();
});
```

---

### 3. **Circuit Breaker Pattern** (HIGH PRIORITY)

```typescript
import CircuitBreaker from 'opossum';

const walletServiceBreaker = new CircuitBreaker(
  async (userId: string) => {
    return fetch(`${WALLET_URL}/api/wallets/${userId}`);
  },
  {
    timeout: 5000,          // 5s timeout
    errorThresholdPercentage: 50,  // Open after 50% failures
    resetTimeout: 30000,    // Try again after 30s
  }
);

// Usage
try {
  const wallet = await walletServiceBreaker.fire(userId);
} catch (err) {
  // Circuit is open - service is down
  return fallbackResponse();
}
```

---

### 4. **Database Connection Pooling** (CRITICAL)

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: {
    poolSize: 20,           // Max 20 connections
    idleTimeout: 30,        // Close idle after 30s
    connectionTimeout: 10,  // Connection timeout 10s
  },
});

const db = drizzle(sql, {
  // Enable connection pooling
  pool: {
    max: 20,
    min: 5,
    idle: 30000,
  },
});
```

---

### 5. **Request Queuing** (MEDIUM PRIORITY)

For non-critical operations, use a queue:

```typescript
import { Queue } from 'bullmq';

const notificationQueue = new Queue('notifications', {
  connection: { host: 'redis', port: 6379 },
});

// Instead of immediate fetch:
await notificationQueue.add('send', {
  userId,
  message,
  type,
});
```

---

## 📁 Results Analysis

After running tests, check the `results/` directory:

```bash
# View JSON results
cat results/20241223_143022/smoke-test-summary.json | jq

# Extract key metrics
cat results/*/stress-test-summary.json | jq '.metrics.http_req_duration'

# Check error rates
cat results/*/spike-test-summary.json | jq '.metrics.http_req_failed'
```

---

## ⚙️ Advanced Usage

### Custom VU Limits

```bash
k6 run 02-stress-test.js -e MAX_VUS=300
```

### Output to InfluxDB + Grafana

```bash
k6 run 01-smoke-test.js --out influxdb=http://localhost:8086/k6
```

### Run in Cloud (k6 Cloud)

```bash
k6 cloud login
k6 cloud 03-spike-test.js
```

### Distributed Testing

```bash
# Run on multiple machines
k6 run --execution-mode distributed 03-spike-test.js
```

---

## 🔧 Troubleshooting

### "k6: command not found"
- Install k6 (see Quick Start section)

### "No service URLs configured"
- Set environment variables (see step 2)
- Or edit `config.js` directly with your URLs

### "Connection refused" errors
- Check if services are actually deployed
- Verify URLs are correct
- Check Vercel deployment status

### Tests always pass (no failures detected)
- You might already have protections we didn't detect
- Try increasing VU count
- Check if Vercel has built-in rate limiting

### "Too expensive" (high cloud bills)
- Run tests in staging/development first
- Start with smoke test only
- Reduce VU counts in test configs
- Monitor Vercel/Neon usage dashboards

---

## 📞 Support

If you encounter issues:

1. Check k6 documentation: https://k6.io/docs/
2. Verify service URLs are correct
3. Start with smoke test before brutal tests
4. Check cloud provider dashboards for quotas/limits

---

## 🎯 Test Strategy Recommendations

### Before Production Testing:

1. ✅ Run smoke test in staging first
2. ✅ Set up monitoring (Dynatrace, Grafana, etc.)
3. ✅ Have rollback plan ready
4. ✅ Test during low-traffic hours
5. ✅ Alert your team

### Safe Testing Order:

```bash
# Day 1: Baseline
./run-all-tests.sh smoke

# Day 2: If smoke passes
./run-all-tests.sh stress

# Day 3: Controlled chaos (optional)
./run-all-tests.sh cascade

# Day 4: Only if you're brave
./run-all-tests.sh spike
```

---

## ⚠️ Final Warning

These tests **WILL** crash your production services if vulnerabilities exist. Always:

- ✅ Test in staging first
- ✅ Have monitoring enabled
- ✅ Run during low-traffic periods
- ✅ Have a rollback plan
- ✅ Alert your team beforehand
- ✅ Watch cloud provider costs

**Good luck! 🚀**
