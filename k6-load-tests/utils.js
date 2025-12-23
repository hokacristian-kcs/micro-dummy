import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const successRate = new Rate('success');
export const responseTime = new Trend('response_time');
export const requestCounter = new Counter('requests_total');

// Error tracking by service
export const userServiceErrors = new Counter('user_service_errors');
export const walletServiceErrors = new Counter('wallet_service_errors');
export const paymentServiceErrors = new Counter('payment_service_errors');
export const notificationServiceErrors = new Counter('notification_service_errors');
export const creditServiceErrors = new Counter('credit_service_errors');

// ========================================
// TEST DATA GENERATORS
// ========================================

/**
 * Generate random email for user registration
 */
export function randomEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `loadtest_${timestamp}_${random}@k6test.com`;
}

/**
 * Generate random username
 */
export function randomUsername() {
  const adjectives = ['swift', 'brave', 'clever', 'wise', 'bold', 'fierce', 'calm', 'bright'];
  const nouns = ['tiger', 'eagle', 'lion', 'wolf', 'bear', 'hawk', 'fox', 'shark'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}_${noun}_${num}`;
}

/**
 * Generate random name (for user registration)
 */
export function randomName() {
  const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Generate random amount within limits
 */
export function randomAmount(min = 10000, max = 1000000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random payment method
 */
export function randomPaymentMethod() {
  const methods = ['credit_card', 'bank_transfer', 'e_wallet', 'cash'];
  return methods[Math.floor(Math.random() * methods.length)];
}

/**
 * Generate random UUID (for userId if needed)
 */
export function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Standard checks for successful response
 */
export function checkSuccess(response, testName) {
  const result = check(response, {
    [`${testName}: status is 200 or 201`]: (r) => r.status === 200 || r.status === 201,
    [`${testName}: response has body`]: (r) => r.body && r.body.length > 0,
    [`${testName}: response time < 3s`]: (r) => r.timings.duration < 3000,
  });

  // Update metrics
  errorRate.add(!result);
  successRate.add(result);
  responseTime.add(response.timings.duration);
  requestCounter.add(1);

  return result;
}

/**
 * Check for specific error patterns (cascading failures)
 */
export function checkForCascadingFailure(response, serviceName) {
  const body = response.body;
  const isCascading =
    response.status >= 500 &&
    (body.includes('unavailable') ||
     body.includes('timeout') ||
     body.includes('fetch failed'));

  if (isCascading) {
    console.warn(`⚠️ CASCADING FAILURE DETECTED in ${serviceName}: ${response.status} - ${body}`);

    // Track by service
    switch(serviceName) {
      case 'user-service':
        userServiceErrors.add(1);
        break;
      case 'wallet-service':
        walletServiceErrors.add(1);
        break;
      case 'payment-service':
        paymentServiceErrors.add(1);
        break;
      case 'notification-service':
        notificationServiceErrors.add(1);
        break;
      case 'credit-service':
        creditServiceErrors.add(1);
        break;
    }
  }

  return isCascading;
}

/**
 * Enhanced error logging
 */
export function logError(response, context) {
  console.error(`❌ ERROR [${context}]:`);
  console.error(`   Status: ${response.status}`);
  console.error(`   Body: ${response.body ? response.body.substring(0, 200) : 'empty'}`);
  console.error(`   Duration: ${response.timings.duration}ms`);
}

/**
 * Think time - realistic user delay
 */
export function thinkTime(min = 1, max = 3) {
  sleep(min + Math.random() * (max - min));
}

/**
 * Parse JSON safely
 */
export function safeParseJSON(response) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    console.error(`Failed to parse JSON: ${response.body}`);
    return null;
  }
}

// ========================================
// SCENARIO HELPERS
// ========================================

/**
 * Print test summary
 */
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };

  // Also save to JSON file
  summary['summary.json'] = JSON.stringify(data);

  return summary;
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('🚀 Starting k6 load test...');
  console.log('⚠️  Testing PRODUCTION services');
  console.log('⏰ Start time:', new Date().toISOString());
  return {
    startTime: Date.now(),
  };
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('✅ Test completed');
  console.log(`⏱️  Total duration: ${duration.toFixed(2)}s`);
  console.log('⏰ End time:', new Date().toISOString());
}
