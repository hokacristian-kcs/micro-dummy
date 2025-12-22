import { db } from '../db/index.js';
import { wallets } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export const walletRepo = {
  create: async (userId: string) => {
    const [wallet] = await db.insert(wallets).values({ userId }).returning();
    return wallet;
  },
  findByUserId: async (userId: string) => {
    return db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
  },
  updateBalance: async (userId: string, amount: number) => {
    const [wallet] = await db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}` })
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet;
  },
};
