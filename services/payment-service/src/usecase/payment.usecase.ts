import { paymentRepo } from '../repository/payment.repo.js';
import { SERVICES, callService } from '../../../../shared/service-client.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('PAYMENT-SERVICE');

// Simulasi BNI API
const simulateBNI = async (amount: number, method: string) => {
  log.debug('Calling BNI API', { amount, method });
  await new Promise((r) => setTimeout(r, 500));
  log.info('BNI API response success');
  return { success: true, ref: `BNI-${Date.now()}` };
};

export const paymentUsecase = {
  // Bayar sesuatu (saldo berkurang)
  pay: async (userId: string, amount: number, method: 'qris' | 'transfer') => {
    log.info('Processing payment', { userId, amount, method });
    
    // Deduct wallet dulu
    log.debug('Deducting wallet balance', { userId, amount });
    const deductRes = await callService(`${SERVICES.WALLET}/wallets/${userId}/deduct`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    
    if (!deductRes.success) {
      log.error('Payment failed - insufficient balance', { userId, amount });
      return { success: false, error: 'Saldo tidak cukup' };
    }

    const payment = await paymentRepo.create(userId, amount, method);
    log.info('Payment record created', { paymentId: payment.id });
    
    // Call BNI System
    const bniResult = await simulateBNI(amount, method);
    
    if (bniResult.success) {
      await paymentRepo.updateStatus(payment.id, 'success', bniResult.ref);
      log.info('Payment success', { paymentId: payment.id, bniRef: bniResult.ref });
      
      await callService(`${SERVICES.NOTIFICATION}/notifications`, {
        method: 'POST',
        body: JSON.stringify({ userId, title: 'Pembayaran Berhasil', message: `Pembayaran Rp${amount} via ${method} berhasil. Saldo berkurang.` }),
      });
      return { ...payment, status: 'success' };
    }
    
    // Refund jika gagal
    log.warn('BNI failed, refunding', { paymentId: payment.id });
    await callService(`${SERVICES.WALLET}/wallets/${userId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    await paymentRepo.updateStatus(payment.id, 'failed');
    log.error('Payment failed', { paymentId: payment.id });
    return { ...payment, status: 'failed' };
  },
  getHistory: async (userId: string) => {
    log.debug('Getting payment history', { userId });
    return paymentRepo.findByUserId(userId);
  },
};
