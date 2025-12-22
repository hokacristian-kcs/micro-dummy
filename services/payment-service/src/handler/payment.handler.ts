import { Hono } from 'hono';
import { paymentUsecase } from '../usecase/payment.usecase.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('PAYMENT-SERVICE');
export const paymentHandler = new Hono();

paymentHandler.post('/payments', async (c) => {
  try {
    const { userId, amount, method } = await c.req.json();
    const payment = await paymentUsecase.pay(userId, amount, method);
    return c.json({ success: true, data: payment });
  } catch (e: any) {
    log.error('POST /payments failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

paymentHandler.get('/payments/:userId', async (c) => {
  try {
    const payments = await paymentUsecase.getHistory(c.req.param('userId'));
    return c.json({ success: true, data: payments });
  } catch (e: any) {
    log.error('GET /payments/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});
