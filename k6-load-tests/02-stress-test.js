/**
 * 💪 STRESS TEST - Find Breaking Point
 *
 * Purpose: Gradually increase load to find system limits
 * Load: 0 → 500 Virtual Users (gradual ramp)
 * Duration: 10 minutes
 *
 * ⚠️ WARNING: This WILL likely crash your services!
 * Expected behavior: Find the VU count where services start failing
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { config } from './config.js';
import {
  randomEmail,
  randomName,
  randomAmount,
  randomPaymentMethod,
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
    { duration: '1m', target: 50 },    // Ramp to 50 VUs (warm up)
    { duration: '2m', target: 100 },   // Ramp to 100 VUs
    { duration: '2m', target: 200 },   // Ramp to 200 VUs
    { duration: '2m', target: 350 },   // Ramp to 350 VUs
    { duration: '2m', target: 500 },   // Ramp to 500 VUs (peak stress)
    { duration: '1m', target: 500 },   // Hold at 500 VUs
    { duration: '2m', target: 0 },     // Ramp down (recovery test)
  ],

  thresholds: {
    // More lenient thresholds - we expect failures
    http_req_failed: ['rate<0.30'],        // Less than 30% failures
    http_req_duration: ['p(95)<10000'],    // 95% under 10s (very lenient)
    http_req_duration: ['p(99)<20000'],    // 99% under 20s
  },

  tags: {
    test_type: 'stress',
  },
};

// Track breaking point
let breakingPointDetected = false;
let breakingPointVUs = 0;

export default function () {
  const BASE_URL_USER = config.services.user;
  const BASE_URL_WALLET = config.services.wallet;
  const BASE_URL_PAYMENT = config.services.payment;

  // ========================================
  // PRIMARY ATTACK VECTOR: User Registration Flow
  // This triggers User Service → Wallet Service cascade
  // ========================================

  const createUserPayload = JSON.stringify({
    email: randomEmail(),
    name: randomName(),
  });

  const createUserRes = http.post(
    `${BASE_URL_USER}/api/users`,
    createUserPayload,
    {
      headers: config.headers,
      tags: { name: 'CreateUser_Stress', type: 'critical' },
      timeout: '30s', // Give it time before k6 times out
    }
  );

  const userSuccess = checkSuccess(createUserRes, 'Stress:CreateUser');

  // Check for cascading failure
  if (!userSuccess) {
    const isCascading = checkForCascadingFailure(createUserRes, 'user-service');

    if (isCascading && !breakingPointDetected) {
      breakingPointDetected = true;
      breakingPointVUs = __VU; // Current virtual user count
      console.error(`🔴 BREAKING POINT DETECTED at ~${breakingPointVUs} VUs`);
      console.error(`   User Service failing due to Wallet Service dependency`);
    }

    logError(createUserRes, 'User Creation Failed');
  }

  let userId = null;
  if (userSuccess) {
    const userData = safeParseJSON(createUserRes);
    userId = userData?.data?.id;
  }

  sleep(0.5); // Minimal think time for stress

  // ========================================
  // SECONDARY ATTACK: Wallet Topup FIRST
  // Topup wallet before payment to ensure sufficient balance
  // ========================================

  if (userId) {
    const topupPayload = JSON.stringify({
      amount: randomAmount(100000, 500000), // Topup 100k-500k to ensure sufficient balance
    });

    const topupRes = http.post(
      `${BASE_URL_WALLET}/api/wallets/${userId}/topup`,
      topupPayload,
      {
        headers: config.headers,
        tags: { name: 'TopupWallet_Stress', type: 'critical' },
        timeout: '30s',
      }
    );

    const topupSuccess = checkSuccess(topupRes, 'Stress:Topup');

    if (!topupSuccess) {
      checkForCascadingFailure(topupRes, 'wallet-service');
      logError(topupRes, 'Wallet Topup Failed');

      if (!breakingPointDetected) {
        breakingPointDetected = true;
        breakingPointVUs = __VU;
        console.error(`🔴 BREAKING POINT: Wallet Service failing at ~${breakingPointVUs} VUs`);
      }
    }

    sleep(0.5);
  }

  // ========================================
  // TERTIARY ATTACK: Payment Processing
  // Tests Payment → Wallet → Notification cascade
  // ========================================

  if (userId) {
    const paymentPayload = JSON.stringify({
      userId: userId,
      amount: randomAmount(50000, 200000), // Payment 50k-200k (should have sufficient balance now)
      method: randomPaymentMethod(),
    });

    const paymentRes = http.post(
      `${BASE_URL_PAYMENT}/api/payments`,
      paymentPayload,
      {
        headers: config.headers,
        tags: { name: 'CreatePayment_Stress', type: 'critical' },
        timeout: '30s',
      }
    );

    const paymentSuccess = checkSuccess(paymentRes, 'Stress:CreatePayment');

    if (!paymentSuccess) {
      checkForCascadingFailure(paymentRes, 'payment-service');
      logError(paymentRes, 'Payment Failed');
    }
  }

  sleep(1);
}

// Custom teardown to report breaking point
export function customTeardown(data) {
  teardown(data);

  if (breakingPointDetected) {
    console.log('\n========================================');
    console.log('🔴 STRESS TEST RESULTS:');
    console.log(`   Breaking Point: ~${breakingPointVUs} Virtual Users`);
    console.log('   Services started cascading failures');
    console.log('   Recommendation: Implement rate limiting & circuit breakers');
    console.log('========================================\n');
  } else {
    console.log('\n========================================');
    console.log('✅ STRESS TEST RESULTS:');
    console.log('   No breaking point detected at 500 VUs');
    console.log('   Services handled stress well!');
    console.log('========================================\n');
  }
}

export { setup };
export { customTeardown as teardown };
