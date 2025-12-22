import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { sendLog, dynatraceMiddleware } from '../dynatrace.js';

// Schema
const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// DB
const sql = neon(process.env.USER_DB_URL!);
const db = drizzle(sql);

const WALLET_URL = process.env.WALLET_SERVICE_URL;

const app = new Hono().basePath('/api');
app.use('*', dynatraceMiddleware('user-service'));

app.post('/users', async (c) => {
  try {
    const { email, name } = await c.req.json();
    await sendLog('INFO', 'user-service', 'Registering user', { email, name });
    
    const [user] = await db.insert(users).values({ email, name }).returning();
    await sendLog('INFO', 'user-service', 'User created', { userId: user.id });
    
    // Create wallet
    if (WALLET_URL) {
      try {
        await sendLog('INFO', 'user-service', 'Creating wallet', { userId: user.id, walletUrl: WALLET_URL });
        const res = await fetch(`${WALLET_URL}/api/wallets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        await sendLog('INFO', 'user-service', 'Wallet response', { status: res.status, data });
      } catch (fetchErr: any) {
        await sendLog('ERROR', 'user-service', 'Wallet fetch failed', { error: fetchErr.message, walletUrl: WALLET_URL });
      }
    } else {
      await sendLog('WARN', 'user-service', 'WALLET_SERVICE_URL not set');
    }
    
    return c.json({ success: true, data: user });
  } catch (e: any) {
    await sendLog('ERROR', 'user-service', 'POST /users failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/users/:id', async (c) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, c.req.param('id')));
    return c.json({ success: true, data: user });
  } catch (e: any) {
    await sendLog('ERROR', 'user-service', 'GET /users/:id failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/users', async (c) => {
  try {
    const allUsers = await db.select().from(users);
    return c.json({ success: true, data: allUsers });
  } catch (e: any) {
    await sendLog('ERROR', 'user-service', 'GET /users failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
