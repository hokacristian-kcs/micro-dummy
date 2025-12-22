import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const userRepo = {
  create: async (email: string, name: string) => {
    const [user] = await db.insert(users).values({ email, name }).returning();
    return user;
  },
  findById: async (id: string) => {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },
  findAll: async () => {
    return db.select().from(users);
  },
};
