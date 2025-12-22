import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, numeric, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { sendLog, dynatraceMiddleware } from '../dynatrace.js';

// Schema
const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);
const paymentMethodEnum = pgEnum('payment_method', ['qris', 'transfer']);

const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  externalRef: text('external_ref'),
  createdAt: timestamp('created_at').defaultNow(),
});

// DB
const sql = neon(process.env.PAYMENT_DB_URL!);
const db = drizzle(sql);

// Service URLs
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

// Simulasi BNI
const simulateBNI = async () => {
  await new Promise((r) => setTimeout(r, 300));
  return { success: true, ref: `BNI-${Date.now()}` };
};

const app = new Hono().basePath('/api');
app.use('*', dynatraceMiddleware('payment-service'));

app.post('/payments', async (c) => {
  try {
    const { userId, amount, method } = await c.req.json();
    await sendLog('INFO', 'payment-service', 'Processing payment', { userId, amount, method });
    
    const deductRes = await fetch(`${WALLET_URL}/api/wallets/${userId}/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const deductData = await deductRes.json();
    
    if (!deductData.success) {
      await sendLog('ERROR', 'payment-service', 'Insufficient balance', { userId, amount });
      return c.json({ success: false, error: 'Saldo tidak cukup' }, 400);
    }
    
    const [payment] = await db.insert(payments).values({ userId, amount: String(amount), method }).returning();
    await sendLog('INFO', 'payment-service', 'Payment created', { paymentId: payment.id });
    
    const bni = await simulateBNI();
    
    if (bni.success) {
      await sql`UPDATE payments SET status = 'success', external_ref = ${bni.ref} WHERE id = ${payment.id}`;
      await sendLog('INFO', 'payment-service', 'Payment success', { paymentId: payment.id, bniRef: bni.ref });
      
      await fetch(`${NOTIFICATION_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: 'Pembayaran Berhasil', message: `Pembayaran Rp${amount} via ${method} berhasil` }),
      });
      
      return c.json({ success: true, data: { ...payment, status: 'success' } });
    }
    
    await fetch(`${WALLET_URL}/api/wallets/${userId}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    await sql`UPDATE payments SET status = 'failed' WHERE id = ${payment.id}`;
    
    return c.json({ success: false, error: 'Payment failed' }, 500);
  } catch (e: any) {
    await sendLog('ERROR', 'payment-service', 'POST /payments failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/payments/:userId', async (c) => {
  try {
    const list = await db.select().from(payments).where(eq(payments.userId, c.req.param('userId')));
    return c.json({ success: true, data: list });
  } catch (e: any) {
    await sendLog('ERROR', 'payment-service', 'GET /payments/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
