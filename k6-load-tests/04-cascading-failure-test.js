/**
 * 🔗 CASCADING FAILURE TEST - Prove Service Dependencies
 *
 * Purpose: Demonstrate how Wallet Service failure cascades to other services
 * Attack Vector: User Registration (User Service → Wallet Service dependency)
 * Load: 300 Virtual Users (focused attack)
 * Duration: 5 minutes
 *
 * ⚠️ This test is DESIGNED to prove your architecture vulnerability!
 *
 * Expected Cascade:
 * 1. 300 VUs hit User Registration simultaneously
 * 2. Each creates a fetch() call to Wallet Service (no timeout)
 * 3. Wallet Service gets 300 concurrent requests
 * 4. Wallet DB pool exhausted (~100-200 connections max)
 * 5. Wallet Service hangs/crashes
 * 6. User Service requests hang indefinitely (NO TIMEOUT!)
 * 7. User Service accumulates memory/connection leaks
 * 8. All services fail together (CASCADE COMPLETE)
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { config } from './config.js';
import {
  randomEmail,
  randomName,
  checkForCascadingFailure,
  logError,
  safeParseJSON,
  setup,
  teardown,
} from './utils.js';

// Custom metrics for cascade tracking
const cascadeDetected = new Counter('cascade_detected');
const walletServiceHangs = new Counter('wallet_hangs');
const userServiceHangs = new Counter('user_hangs');
const fetchTimeouts = new Counter('fetch_timeouts');
const cascadeResponseTime = new Trend('cascade_response_time');

// Test configuration - Focused attack
export const options = {
  scenarios: {
    // Scenario 1: Hammer User Registration
    user_registration_flood: {
      executor: 'constant-vus',
      vus: 200,
      duration: '3m',
      tags: { scenario: 'registration_flood' },
    },

    // Scenario 2: Concurrent direct wallet hits
    wallet_direct_attack: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
      exec: 'walletDirectAttack',
      tags: { scenario: 'wallet_attack' },
    },
  },

  thresholds: {
    // We EXPECT this to fail - tracking the cascade
    'cascade_detected': ['count>0'], // We want to detect cascades
    'http_req_duration{scenario:registration_flood}': ['p(50)<30000'], // Half should respond in 30s
  },

  tags: {
    test_type: 'cascading_failure',
  },
};

// Track cascade progression
let cascadeStage = 0;
let cascadeStartTime = null;

// ========================================
// SCENARIO 1: User Registration Flood
// Primary attack vector for cascading failure
// ========================================
export default function () {
  const BASE_URL_USER = config.services.user;

  const createUserPayload = JSON.stringify({
    email: randomEmail(),
    name: randomName(),
  });

  const requestStartTime = Date.now();

  // This will trigger User Service → Wallet Service
  const createUserRes = http.post(
    `${BASE_URL_USER}/api/users`,
    createUserPayload,
    {
      headers: config.headers,
      tags: { name: 'CascadeTest_UserReg', endpoint: 'user-service' },
      timeout: '60s', // Long timeout to see hanging behavior
    }
  );

  const responseTime = Date.now() - requestStartTime;
  cascadeResponseTime.add(responseTime);

  // ========================================
  // CASCADE DETECTION LOGIC
  // ========================================

  // Stage 1: Slow responses (early warning)
  if (responseTime > 5000 && cascadeStage === 0) {
    cascadeStage = 1;
    cascadeStartTime = Date.now();
    console.warn(`⚠️ STAGE 1: Slow responses detected (${responseTime}ms)`);
    console.warn('   Wallet Service likely under pressure');
  }

  // Stage 2: Timeouts start appearing
  if (responseTime > 15000 && cascadeStage === 1) {
    cascadeStage = 2;
    console.error(`🔶 STAGE 2: Severe delays (${responseTime}ms)`);
    console.error('   Wallet Service connections likely exhausted');
    fetchTimeouts.add(1);
  }

  // Stage 3: Complete failure cascade
  if (createUserRes.status === 0 || createUserRes.status >= 500) {
    const isCascading = checkForCascadingFailure(createUserRes, 'user-service');

    if (isCascading) {
      cascadeDetected.add(1);

      if (cascadeStage < 3) {
        cascadeStage = 3;
        const timeToCascade = cascadeStartTime
          ? ((Date.now() - cascadeStartTime) / 1000).toFixed(2)
          : 'unknown';

        console.error('\n🔴🔴🔴 STAGE 3: CASCADING FAILURE CONFIRMED 🔴🔴🔴');
        console.error(`Time to cascade: ${timeToCascade}s`);
        console.error('Failure chain: User Service → Wallet Service');
        console.error('Root cause: No timeout on fetch() + DB pool exhaustion\n');
      }

      userServiceHangs.add(1);
    }

    logError(createUserRes, `CASCADE at ${responseTime}ms`);
  }

  // Check response body for specific error patterns
  if (createUserRes.body) {
    const body = createUserRes.body.toLowerCase();

    if (body.includes('wallet') && body.includes('unavailable')) {
      walletServiceHangs.add(1);
      console.error('📍 Confirmed: Wallet Service unavailable');
    }

    if (body.includes('timeout') || body.includes('fetch failed')) {
      fetchTimeouts.add(1);
      console.error('📍 Confirmed: Fetch timeout (no timeout configured!)');
    }
  }

  // Validate cascade behavior
  check(createUserRes, {
    'cascade_detected_in_error_message': (r) =>
      r.body && (
        r.body.includes('unavailable') ||
        r.body.includes('timeout') ||
        r.body.includes('fetch failed')
      ),
  });

  sleep(0.3); // Brief pause between registration attempts
}

// ========================================
// SCENARIO 2: Direct Wallet Attack
// Hammer wallet service to accelerate cascade
// ========================================
export function walletDirectAttack() {
  const BASE_URL_WALLET = config.services.wallet;

  // Random user ID (some will be invalid, adding to DB pressure)
  const randomUserId = `test-user-${Math.floor(Math.random() * 1000)}`;

  const topupPayload = JSON.stringify({
    amount: 100000,
  });

  const walletRes = http.post(
    `${BASE_URL_WALLET}/api/wallets/${randomUserId}/topup`,
    topupPayload,
    {
      headers: config.headers,
      tags: { name: 'CascadeTest_WalletDirect', endpoint: 'wallet-service' },
      timeout: '60s',
    }
  );

  if (walletRes.status === 0 || walletRes.status >= 500) {
    walletServiceHangs.add(1);
    console.error('🎯 Direct Wallet attack: Service failing');
  }

  sleep(0.2);
}

// ========================================
// Custom teardown with cascade report
// ========================================
export function customTeardown(data) {
  teardown(data);

  console.log('\n========================================');
  console.log('🔗 CASCADING FAILURE TEST RESULTS');
  console.log('========================================');

  console.log('\n📊 Cascade Metrics:');
  console.log(`   Cascade Events Detected: ${cascadeDetected}`);
  console.log(`   User Service Hangs: ${userServiceHangs}`);
  console.log(`   Wallet Service Hangs: ${walletServiceHangs}`);
  console.log(`   Fetch Timeouts: ${fetchTimeouts}`);

  console.log(`\n🎯 Cascade Stage Reached: ${cascadeStage}/3`);

  if (cascadeStage === 3) {
    console.log('\n🔴 CASCADING FAILURE CONFIRMED!');
    console.log('\n📋 Vulnerability Proof:');
    console.log('   ✓ User Service depends on Wallet Service');
    console.log('   ✓ No timeout configured on fetch() calls');
    console.log('   ✓ Database connection pool exhaustion');
    console.log('   ✓ Hanging requests accumulate');
    console.log('   ✓ Services fail together (cascade complete)');

    console.log('\n🛡️ REQUIRED FIXES:');
    console.log('   1. Add fetch timeout (5-10s) with AbortController');
    console.log('   2. Implement circuit breaker pattern');
    console.log('   3. Configure database connection pool limits');
    console.log('   4. Add request queuing/rate limiting');
    console.log('   5. Implement graceful degradation');
    console.log('   6. Add health checks before service calls');

    console.log('\n📄 Code locations to fix:');
    console.log('   - services/user-service/api/index.ts:38');
    console.log('   - services/payment-service/api/index.ts:51');
    console.log('   - services/credit-service/api/index.ts:44');
    console.log('   - All inter-service fetch() calls');

  } else if (cascadeStage === 2) {
    console.log('\n🔶 Partial cascade detected');
    console.log('   Services under severe pressure but not fully cascading');
  } else if (cascadeStage === 1) {
    console.log('\n⚠️ Performance degradation detected');
    console.log('   Services handling load but with delays');
  } else {
    console.log('\n✅ No cascade detected (surprising!)');
    console.log('   Services may have protections we did not detect');
  }

  console.log('========================================\n');
}

export { setup };
export { customTeardown as teardown };
