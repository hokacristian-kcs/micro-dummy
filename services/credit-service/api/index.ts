import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

// Schema
const creditStatusEnum = pgEnum('credit_status', ['active', 'paid', 'overdue']);

const credits = pgTable('credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: creditStatusEnum('status').notNull().default('active'),
  dueDate: timestamp('due_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// DB
const sql = neon(process.env.CREDIT_DB_URL!);
const db = drizzle(sql);

// Logger
const log = (level: string, msg: string, data?: unknown) => {
  console.log(`[${new Date().toISOString()}] [${level}] [CREDIT-SERVICE] ${msg}`, data ? JSON.stringify(data) : '');
};

// Service URLs
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const app = new Hono().basePath('/api');

app.post('/credits', async (c) => {
  try {
    const { userId, amount } = await c.req.json();
    log('INFO', 'Applying credit', { userId, amount });
    
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    const [credit] = await db.insert(credits).values({ userId, amount: String(amount), dueDate }).returning();
    log('INFO', 'Credit created', { creditId: credit.id });
    
    // Topup wallet
    await fetch(`${WALLET_URL}/api/wallets/${userId}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    
    await fetch(`${NOTIFICATION_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title: 'Kredit Disetujui', message: `Kredit Rp${amount} telah masuk ke wallet` }),
    });
    
    return c.json({ success: true, data: credit });
  } catch (e: any) {
    log('ERROR', 'POST /credits failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/credits/:id/pay', async (c) => {
  try {
    const { userId, amount } = await c.req.json();
    const creditId = c.req.param('id');
    log('INFO', 'Paying credit', { userId, creditId, amount });
    
    // Deduct wallet
    const res = await fetch(`${WALLET_URL}/api/wallets/${userId}/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    
    if (!data.success) {
      return c.json({ success: false, error: 'Saldo tidak cukup' }, 400);
    }
    
    const [credit] = await db.update(credits).set({ status: 'paid' }).where(eq(credits.id, creditId)).returning();
    log('INFO', 'Credit paid', { creditId });
    
    await fetch(`${NOTIFICATION_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title: 'Kredit Lunas', message: `Pembayaran kredit Rp${amount} berhasil` }),
    });
    
    return c.json({ success: true, data: credit });
  } catch (e: any) {
    log('ERROR', 'POST /credits/:id/pay failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/credits/:userId', async (c) => {
  try {
    const list = await db.select().from(credits).where(eq(credits.userId, c.req.param('userId')));
    return c.json({ success: true, data: list });
  } catch (e: any) {
    log('ERROR', 'GET /credits/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
