import { creditRepo } from '../repository/credit.repo.js';
import { SERVICES, callService } from '../../../../shared/service-client.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('CREDIT-SERVICE');

export const creditUsecase = {
  apply: async (userId: string, amount: number) => {
    log.info('Applying credit', { userId, amount });
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    const credit = await creditRepo.create(userId, amount, dueDate);
    log.info('Credit created', { creditId: credit.id, dueDate });
    
    // Topup wallet with credit amount
    log.debug('Topup wallet with credit', { userId, amount });
    await callService(`${SERVICES.WALLET}/wallets/${userId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    
    await callService(`${SERVICES.NOTIFICATION}/notifications`, {
      method: 'POST',
      body: JSON.stringify({ userId, title: 'Kredit Disetujui', message: `Kredit Rp${amount} telah masuk ke wallet` }),
    });
    log.info('Credit approved and wallet topped up', { creditId: credit.id });
    return credit;
  },
  payCredit: async (userId: string, creditId: string, amount: number) => {
    log.info('Paying credit', { userId, creditId, amount });
    
    // Deduct from wallet
    log.debug('Deducting wallet for credit payment', { userId, amount });
    await callService(`${SERVICES.WALLET}/wallets/${userId}/deduct`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    
    const credit = await creditRepo.updateStatus(creditId, 'paid');
    log.info('Credit paid', { creditId });
    
    await callService(`${SERVICES.NOTIFICATION}/notifications`, {
      method: 'POST',
      body: JSON.stringify({ userId, title: 'Kredit Lunas', message: `Pembayaran kredit Rp${amount} berhasil` }),
    });
    return credit;
  },
  getCredits: async (userId: string) => {
    log.debug('Getting user credits', { userId });
    return creditRepo.findByUserId(userId);
  },
};
