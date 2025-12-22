import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, numeric, timestamp } from 'drizzle-orm/pg-core';
import { eq, sql as dsql } from 'drizzle-orm';

// Schema
const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// DB
const sql = neon(process.env.WALLET_DB_URL!);
const db = drizzle(sql);

// Logger
const log = (level: string, msg: string, data?: unknown) => {
  console.log(`[${new Date().toISOString()}] [${level}] [WALLET-SERVICE] ${msg}`, data ? JSON.stringify(data) : '');
};

// Service Client
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

const app = new Hono().basePath('/api');

app.post('/wallets', async (c) => {
  try {
    const { userId } = await c.req.json();
    log('INFO', 'Creating wallet', { userId });
    const [wallet] = await db.insert(wallets).values({ userId }).returning();
    log('INFO', 'Wallet created', { walletId: wallet.id });
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log('ERROR', 'POST /wallets failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/wallets/:userId', async (c) => {
  try {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, c.req.param('userId')));
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log('ERROR', 'GET /wallets/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/wallets/:userId/topup', async (c) => {
  try {
    const { amount } = await c.req.json();
    const userId = c.req.param('userId');
    log('INFO', 'Processing topup', { userId, amount });
    
    const [wallet] = await db.update(wallets)
      .set({ balance: dsql`${wallets.balance} + ${amount}` })
      .where(eq(wallets.userId, userId))
      .returning();
    
    log('INFO', 'Topup success', { userId, newBalance: wallet.balance });
    
    await fetch(`${NOTIFICATION_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title: 'Top Up Berhasil', message: `Saldo bertambah Rp${amount}` }),
    });
    
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log('ERROR', 'POST /wallets/:userId/topup failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.post('/wallets/:userId/deduct', async (c) => {
  try {
    const { amount } = await c.req.json();
    const userId = c.req.param('userId');
    log('INFO', 'Processing deduction', { userId, amount });
    
    const [current] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    if (!current || Number(current.balance) < amount) {
      log('WARN', 'Insufficient balance', { userId, amount, balance: current?.balance });
      return c.json({ success: false, error: 'Insufficient balance' }, 400);
    }
    
    const [wallet] = await db.update(wallets)
      .set({ balance: dsql`${wallets.balance} - ${amount}` })
      .where(eq(wallets.userId, userId))
      .returning();
    
    log('INFO', 'Deduction success', { userId, newBalance: wallet.balance });
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log('ERROR', 'POST /wallets/:userId/deduct failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
