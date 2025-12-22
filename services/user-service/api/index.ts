import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

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

// Logger
const log = (level: string, msg: string, data?: unknown) => {
  console.log(`[${new Date().toISOString()}] [${level}] [USER-SERVICE] ${msg}`, data ? JSON.stringify(data) : '');
};

// Service Client
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';

const app = new Hono().basePath('/api');

app.post('/users', async (c) => {
  try {
    const { email, name } = await c.req.json();
    log('INFO', 'Registering user', { email, name });
    
    const [user] = await db.insert(users).values({ email, name }).returning();
    log('INFO', 'User created', { userId: user.id });
    
    // Create wallet
    await fetch(`${WALLET_URL}/api/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    log('INFO', 'Wallet created for user', { userId: user.id });
    
    return c.json({ success: true, data: user });
  } catch (e: any) {
    log('ERROR', 'POST /users failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/users/:id', async (c) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, c.req.param('id')));
    return c.json({ success: true, data: user });
  } catch (e: any) {
    log('ERROR', 'GET /users/:id failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/users', async (c) => {
  try {
    const allUsers = await db.select().from(users);
    return c.json({ success: true, data: allUsers });
  } catch (e: any) {
    log('ERROR', 'GET /users failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
