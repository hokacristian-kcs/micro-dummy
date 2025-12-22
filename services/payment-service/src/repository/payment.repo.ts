import { db } from '../db/index.js';
import { payments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const paymentRepo = {
  create: async (userId: string, amount: number, method: 'qris' | 'transfer') => {
    const [payment] = await db.insert(payments).values({ userId, amount: String(amount), method }).returning();
    return payment;
  },
  updateStatus: async (id: string, status: 'pending' | 'success' | 'failed', externalRef?: string) => {
    const [payment] = await db.update(payments).set({ status, externalRef }).where(eq(payments.id, id)).returning();
    return payment;
  },
  findByUserId: async (userId: string) => {
    return db.select().from(payments).where(eq(payments.userId, userId));
  },
};
