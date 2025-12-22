import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

// Schema
const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// DB
const sql = neon(process.env.NOTIFICATION_DB_URL!);
const db = drizzle(sql);

// Logger
const log = (level: string, msg: string, data?: unknown) => {
  console.log(`[${new Date().toISOString()}] [${level}] [NOTIFICATION-SERVICE] ${msg}`, data ? JSON.stringify(data) : '');
};

const app = new Hono().basePath('/api');

app.post('/notifications', async (c) => {
  try {
    const { userId, title, message } = await c.req.json();
    log('INFO', 'Sending notification', { userId, title });
    const [notif] = await db.insert(notifications).values({ userId, title, message }).returning();
    log('INFO', 'Notification sent', { notifId: notif.id });
    return c.json({ success: true, data: notif });
  } catch (e: any) {
    log('ERROR', 'POST /notifications failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/notifications/:userId', async (c) => {
  try {
    const list = await db.select().from(notifications).where(eq(notifications.userId, c.req.param('userId')));
    return c.json({ success: true, data: list });
  } catch (e: any) {
    log('ERROR', 'GET /notifications/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.patch('/notifications/:id/read', async (c) => {
  try {
    const [notif] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, c.req.param('id'))).returning();
    return c.json({ success: true, data: notif });
  } catch (e: any) {
    log('ERROR', 'PATCH /notifications/:id/read failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
