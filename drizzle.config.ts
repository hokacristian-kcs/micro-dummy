import { defineConfig } from 'drizzle-kit';

const service = process.env.SERVICE;
const dbUrls: Record<string, string> = {
  user: process.env.USER_DB_URL!,
  wallet: process.env.WALLET_DB_URL!,
  payment: process.env.PAYMENT_DB_URL!,
  notification: process.env.NOTIFICATION_DB_URL!,
  credit: process.env.CREDIT_DB_URL!,
};

export default defineConfig({
  schema: `./services/${service}-service/src/db/schema.ts`,
  out: `./drizzle/${service}`,
  dialect: 'postgresql',
  dbCredentials: { url: dbUrls[service!] },
});
