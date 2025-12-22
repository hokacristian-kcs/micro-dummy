import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const notificationRepo = {
  create: async (userId: string, title: string, message: string) => {
    const [notif] = await db.insert(notifications).values({ userId, title, message }).returning();
    return notif;
  },
  findByUserId: async (userId: string) => {
    return db.select().from(notifications).where(eq(notifications.userId, userId));
  },
  markAsRead: async (id: string) => {
    const [notif] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return notif;
  },
};
