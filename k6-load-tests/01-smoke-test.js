/**
 * 🧪 SMOKE TEST - Baseline Verification
 *
 * Purpose: Verify all endpoints work under minimal load
 * Load: 10 Virtual Users (VUs)
 * Duration: 1 minute
 *
 * This test should ALWAYS pass. If it fails, don't run brutal tests.
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
  thinkTime,
  safeParseJSON,
  setup,
  teardown,
} from './utils.js';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 VUs
    { duration: '40s', target: 10 },  // Stay at 10 VUs
    { duration: '10s', target: 0 },   // Ramp down to 0
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'],        // Less than 1% failures
    http_req_duration: ['p(95)<2000'],     // 95% under 2s
    http_req_duration: ['p(99)<3000'],     // 99% under 3s
  },

  tags: {
    test_type: 'smoke',
  },
};

// Global state to store created user IDs
let createdUserIds = [];

// Test scenario
export default function () {
  const BASE_URL_USER = config.services.user;
  const BASE_URL_WALLET = config.services.wallet;
  const BASE_URL_PAYMENT = config.services.payment;
  const BASE_URL_NOTIFICATION = config.services.notification;
  const BASE_URL_CREDIT = config.services.credit;

  // ========================================
  // 1. Test User Service
  // ========================================

  // Create User
  const createUserPayload = JSON.stringify({
    email: randomEmail(),
    name: randomName(),
  });

  const createUserRes = http.post(
    `${BASE_URL_USER}/api/users`,
    createUserPayload,
    { headers: config.headers, tags: { name: 'CreateUser' } }
  );

  const userCreated = checkSuccess(createUserRes, 'Create User');
  let userId = null;

  if (userCreated) {
    const userData = safeParseJSON(createUserRes);
    userId = userData?.data?.id;
    if (userId) {
      createdUserIds.push(userId);
      console.log(`✅ User created: ${userId}`);
    }
  }

  thinkTime(1, 2);

  // Get Users
  const getUsersRes = http.get(
    `${BASE_URL_USER}/api/users`,
    { headers: config.headers, tags: { name: 'GetUsers' } }
  );
  checkSuccess(getUsersRes, 'Get Users');

  thinkTime(1, 2);

  // ========================================
  // 2. Test Wallet Service
  // ========================================

  if (userId) {
    // Get Wallet by User ID
    const getWalletRes = http.get(
      `${BASE_URL_WALLET}/api/wallets/user/${userId}`,
      { headers: config.headers, tags: { name: 'GetWallet' } }
    );
    checkSuccess(getWalletRes, 'Get Wallet');

    thinkTime(1, 2);

    // Top up Wallet
    const topupPayload = JSON.stringify({
      amount: randomAmount(50000, 500000),
    });

    const topupRes = http.post(
      `${BASE_URL_WALLET}/api/wallets/${userId}/topup`,
      topupPayload,
      { headers: config.headers, tags: { name: 'TopupWallet' } }
    );
    checkSuccess(topupRes, 'Topup Wallet');

    thinkTime(1, 2);
  }

  // ========================================
  // 3. Test Payment Service
  // ========================================

  if (userId) {
    const paymentPayload = JSON.stringify({
      userId: userId,
      amount: randomAmount(10000, 100000),
      method: randomPaymentMethod(),
    });

    const paymentRes = http.post(
      `${BASE_URL_PAYMENT}/api/payments`,
      paymentPayload,
      { headers: config.headers, tags: { name: 'CreatePayment' } }
    );
    checkSuccess(paymentRes, 'Create Payment');

    thinkTime(1, 2);

    // Get Payments
    const getPaymentsRes = http.get(
      `${BASE_URL_PAYMENT}/api/payments`,
      { headers: config.headers, tags: { name: 'GetPayments' } }
    );
    checkSuccess(getPaymentsRes, 'Get Payments');

    thinkTime(1, 2);
  }

  // ========================================
  // 4. Test Credit Service
  // ========================================

  if (userId) {
    const creditPayload = JSON.stringify({
      userId: userId,
      amount: randomAmount(100000, 1000000),
      term: 12, // 12 months
    });

    const creditRes = http.post(
      `${BASE_URL_CREDIT}/api/credits`,
      creditPayload,
      { headers: config.headers, tags: { name: 'CreateCredit' } }
    );
    checkSuccess(creditRes, 'Create Credit');

    thinkTime(1, 2);

    // Get Credits
    const getCreditsRes = http.get(
      `${BASE_URL_CREDIT}/api/credits`,
      { headers: config.headers, tags: { name: 'GetCredits' } }
    );
    checkSuccess(getCreditsRes, 'Get Credits');

    thinkTime(1, 2);
  }

  // ========================================
  // 5. Test Notification Service
  // ========================================

  const notificationPayload = JSON.stringify({
    userId: userId || 'test-user-id',
    message: `Smoke test notification at ${new Date().toISOString()}`,
    type: 'info',
  });

  const notificationRes = http.post(
    `${BASE_URL_NOTIFICATION}/api/notifications`,
    notificationPayload,
    { headers: config.headers, tags: { name: 'CreateNotification' } }
  );
  checkSuccess(notificationRes, 'Create Notification');

  sleep(1);
}

// Setup and teardown
export { setup, teardown };
