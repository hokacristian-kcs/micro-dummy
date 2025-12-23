// k6 Load Test Configuration
// ⚠️ PRODUCTION TESTING - Update URLs dengan deployed Vercel URLs Anda

export const config = {
  // 🔴 GANTI dengan actual Vercel deployment URLs
  services: {
    user: __ENV.USER_SERVICE_URL || 'https://your-user-service.vercel.app',
    wallet: __ENV.WALLET_SERVICE_URL || 'https://your-wallet-service.vercel.app',
    payment: __ENV.PAYMENT_SERVICE_URL || 'https://your-payment-service.vercel.app',
    notification: __ENV.NOTIFICATION_SERVICE_URL || 'https://your-notification-service.vercel.app',
    credit: __ENV.CREDIT_SERVICE_URL || 'https://your-credit-service.vercel.app',
  },

  // Test thresholds - Auto-fail conditions
  thresholds: {
    // HTTP failures should be less than 5%
    http_req_failed: ['rate<0.05'],

    // 95% of requests should complete within 2 seconds
    http_req_duration: ['p(95)<2000'],

    // 99% of requests should complete within 5 seconds
    'http_req_duration{type:critical}': ['p(99)<5000'],
  },

  // Request headers
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-load-test/1.0',
  },

  // Test data limits
  limits: {
    maxAmount: 10000000, // 10 juta rupiah
    minAmount: 10000,    // 10 ribu rupiah
  },

  // Tags for filtering results
  tags: {
    environment: 'production',
    test_type: 'load_test',
  },
};

// Shared test configuration
export const options = {
  // Disable SSL verification for faster tests (optional)
  insecureSkipTLSVerify: true,

  // Connection reuse for realistic traffic
  noConnectionReuse: false,

  // Batch requests (helps with performance)
  batch: 10,
  batchPerHost: 5,
};
