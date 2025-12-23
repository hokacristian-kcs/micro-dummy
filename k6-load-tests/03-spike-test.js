/**
 * ⚡ SPIKE TEST - Sudden Traffic Surge
 *
 * Purpose: Simulate sudden viral traffic (e.g., trending on social media)
 * Load: 50 → 500 Virtual Users (INSTANT spike)
 * Duration: 5 minutes
 *
 * ⚠️ EXTREME WARNING: This is the most brutal test!
 * Simulates: Product launch, viral post, DDoS attack, Black Friday traffic
 * Expected: Immediate cascading failures & crashes
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { config } from './config.js';
import {
  randomEmail,
  randomName,
  randomAmount,
  randomPaymentMethod,
  randomUUID,
  checkSuccess,
  checkForCascadingFailure,
  logError,
  safeParseJSON,
  setup,
  teardown,
} from './utils.js';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 50 },    // Normal traffic baseline
    { duration: '0s', target: 500 },    // 🔥 INSTANT SPIKE to 500 VUs
    { duration: '3m', target: 500 },    // Hold spike for 3 minutes
    { duration: '30s', target: 50 },    // Sudden drop
    { duration: '30s', target: 0 },     // Recovery
  ],

  thresholds: {
    // Very lenient - we expect massive failures
    http_req_failed: ['rate<0.50'],        // Less than 50% failures (ambitious)
    http_req_duration: ['p(90)<15000'],    // 90% under 15s
    http_req_duration: ['p(99)<30000'],    // 99% under 30s (half-minute!)
  },

  tags: {
    test_type: 'spike',
  },
};

// Failure tracking
let immediateFailures = 0;
let timeoutFailures = 0;
let cascadeFailures = 0;
let totalRequests = 0;

export default function () {
  totalRequests++;

  const BASE_URL_USER = config.services.user;
  const BASE_URL_WALLET = config.services.wallet;
  const BASE_URL_PAYMENT = config.services.payment;
  const BASE_URL_CREDIT = config.services.credit;

  // ========================================
  // ATTACK 1: Flood User Registration
  // Most likely to trigger cascading failure
  // ========================================

  const createUserPayload = JSON.stringify({
    email: randomEmail(),
    name: randomName(),
  });

  const startTime = Date.now();

  const createUserRes = http.post(
    `${BASE_URL_USER}/api/users`,
    createUserPayload,
    {
      headers: config.headers,
      tags: { name: 'SpikeTest_CreateUser', type: 'critical' },
      timeout: '45s', // Longer timeout for spike
    }
  );

  const responseTime = Date.now() - startTime;

  // Check for different failure types
  if (createUserRes.status === 0) {
    // Connection refused / timeout
    immediateFailures++;
    console.error(`💥 IMMEDIATE FAILURE: Connection refused (total: ${immediateFailures})`);
  } else if (responseTime > 10000) {
    // Slow response (>10s)
    timeoutFailures++;
    console.warn(`⏱️ TIMEOUT: Response took ${responseTime}ms`);
  } else if (createUserRes.status >= 500) {
    // Server error
    const isCascading = checkForCascadingFailure(createUserRes, 'user-service');
    if (isCascading) {
      cascadeFailures++;
      console.error(`🔗 CASCADE FAILURE: User→Wallet dependency broken (total: ${cascadeFailures})`);
    }
  }

  const userSuccess = checkSuccess(createUserRes, 'Spike:CreateUser');
  let userId = null;

  if (userSuccess) {
    const userData = safeParseJSON(createUserRes);
    userId = userData?.data?.id;
  }

  // No think time - continuous bombardment
  sleep(0.1);

  // ========================================
  // ATTACK 2: Hammer Payment Endpoint
  // Tests the complex 3-service chain
  // ========================================

  const paymentPayload = JSON.stringify({
    userId: userId || randomUUID(), // Use random UUID if user creation failed
    amount: randomAmount(100000, 500000),
    method: randomPaymentMethod(),
  });

  const paymentRes = http.post(
    `${BASE_URL_PAYMENT}/api/payments`,
    paymentPayload,
    {
      headers: config.headers,
      tags: { name: 'SpikeTest_Payment', type: 'critical' },
      timeout: '45s',
    }
  );

  if (!checkSuccess(paymentRes, 'Spike:Payment')) {
    checkForCascadingFailure(paymentRes, 'payment-service');
  }

  sleep(0.1);

  // ========================================
  // ATTACK 3: Concurrent Credit Applications
  // Another multi-service operation
  // ========================================

  const creditPayload = JSON.stringify({
    userId: userId || randomUUID(),
    amount: randomAmount(500000, 5000000),
    term: 12,
  });

  const creditRes = http.post(
    `${BASE_URL_CREDIT}/api/credits`,
    creditPayload,
    {
      headers: config.headers,
      tags: { name: 'SpikeTest_Credit', type: 'critical' },
      timeout: '45s',
    }
  );

  if (!checkSuccess(creditRes, 'Spike:Credit')) {
    checkForCascadingFailure(creditRes, 'credit-service');
  }

  // ========================================
  // ATTACK 4: Direct Wallet Hammering
  // Target the central bottleneck
  // ========================================

  if (userId) {
    const deductPayload = JSON.stringify({
      amount: randomAmount(10000, 50000),
    });

    const deductRes = http.post(
      `${BASE_URL_WALLET}/api/wallets/${userId}/deduct`,
      deductPayload,
      {
        headers: config.headers,
        tags: { name: 'SpikeTest_WalletDeduct', type: 'critical' },
        timeout: '45s',
      }
    );

    if (!checkSuccess(deductRes, 'Spike:Deduct')) {
      checkForCascadingFailure(deductRes, 'wallet-service');
    }
  }

  sleep(0.2); // Minimal pause
}

// Custom teardown with detailed failure analysis
export function customTeardown(data) {
  teardown(data);

  console.log('\n========================================');
  console.log('⚡ SPIKE TEST RESULTS:');
  console.log('========================================');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`\n🔴 Failure Breakdown:`);
  console.log(`   Connection Refused: ${immediateFailures}`);
  console.log(`   Timeouts (>10s): ${timeoutFailures}`);
  console.log(`   Cascading Failures: ${cascadeFailures}`);

  const totalFailures = immediateFailures + timeoutFailures + cascadeFailures;
  const failureRate = ((totalFailures / totalRequests) * 100).toFixed(2);

  console.log(`\n📊 Overall Failure Rate: ${failureRate}%`);

  if (failureRate > 10) {
    console.log('\n⚠️ VERDICT: System cannot handle traffic spikes');
    console.log('   URGENT RECOMMENDATIONS:');
    console.log('   1. Implement request queuing (Redis/RabbitMQ)');
    console.log('   2. Add auto-scaling (Vercel should do this, but check limits)');
    console.log('   3. Implement circuit breakers');
    console.log('   4. Add CDN caching for read-heavy endpoints');
    console.log('   5. Database connection pooling');
  } else {
    console.log('\n✅ VERDICT: System handled spike reasonably well!');
  }

  console.log('========================================\n');
}

export { setup };
export { customTeardown as teardown };
