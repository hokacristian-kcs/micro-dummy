import { db } from '../db/index.js';
import { credits } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const creditRepo = {
  create: async (userId: string, amount: number, dueDate: Date) => {
    const [credit] = await db.insert(credits).values({ userId, amount: String(amount), dueDate }).returning();
    return credit;
  },
  findByUserId: async (userId: string) => {
    return db.select().from(credits).where(eq(credits.userId, userId));
  },
  updateStatus: async (id: string, status: 'active' | 'paid' | 'overdue') => {
    const [credit] = await db.update(credits).set({ status }).where(eq(credits.id, id)).returning();
    return credit;
  },
};
