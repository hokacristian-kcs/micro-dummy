import { Hono } from 'hono';
import { walletUsecase } from '../usecase/wallet.usecase.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('WALLET-SERVICE');
export const walletHandler = new Hono();

walletHandler.post('/wallets', async (c) => {
  try {
    const { userId } = await c.req.json();
    const wallet = await walletUsecase.create(userId);
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log.error('POST /wallets failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

walletHandler.get('/wallets/:userId', async (c) => {
  try {
    const wallet = await walletUsecase.getBalance(c.req.param('userId'));
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log.error('GET /wallets/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

walletHandler.post('/wallets/:userId/topup', async (c) => {
  try {
    const { amount } = await c.req.json();
    const wallet = await walletUsecase.topup(c.req.param('userId'), amount);
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log.error('POST /wallets/:userId/topup failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

walletHandler.post('/wallets/:userId/deduct', async (c) => {
  try {
    const { amount } = await c.req.json();
    const wallet = await walletUsecase.deduct(c.req.param('userId'), amount);
    return c.json({ success: true, data: wallet });
  } catch (e: any) {
    log.error('POST /wallets/:userId/deduct failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});
