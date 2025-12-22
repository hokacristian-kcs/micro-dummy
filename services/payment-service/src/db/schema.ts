import { pgTable, uuid, numeric, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);
export const paymentMethodEnum = pgEnum('payment_method', ['qris', 'transfer']);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  externalRef: text('external_ref'),
  createdAt: timestamp('created_at').defaultNow(),
});
