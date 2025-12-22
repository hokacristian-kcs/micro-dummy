import { pgTable, uuid, numeric, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const creditStatusEnum = pgEnum('credit_status', ['active', 'paid', 'overdue']);

export const credits = pgTable('credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: creditStatusEnum('status').notNull().default('active'),
  dueDate: timestamp('due_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
