import { Hono } from 'hono';
import { creditUsecase } from '../usecase/credit.usecase.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('CREDIT-SERVICE');
export const creditHandler = new Hono();

creditHandler.post('/credits', async (c) => {
  try {
    const { userId, amount } = await c.req.json();
    const credit = await creditUsecase.apply(userId, amount);
    return c.json({ success: true, data: credit });
  } catch (e: any) {
    log.error('POST /credits failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

creditHandler.post('/credits/:id/pay', async (c) => {
  try {
    const { userId, amount } = await c.req.json();
    const credit = await creditUsecase.payCredit(userId, c.req.param('id'), amount);
    return c.json({ success: true, data: credit });
  } catch (e: any) {
    log.error('POST /credits/:id/pay failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

creditHandler.get('/credits/:userId', async (c) => {
  try {
    const credits = await creditUsecase.getCredits(c.req.param('userId'));
    return c.json({ success: true, data: credits });
  } catch (e: any) {
    log.error('GET /credits/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});
